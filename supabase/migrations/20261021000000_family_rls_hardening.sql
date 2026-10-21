-- Family groups / members: own-family access only (owner or joined member), no anonymous
-- reads or inserts. Joining by family code + last name moves server-side into a
-- signed-in-only RPC so codes and member rosters are never readable by the public.
-- Also closes match_queue, which no client reads or writes.

-- Members who join through the RPC are linked to their account so they can see their family.
alter table public.family_members
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists family_members_group_user_key
  on public.family_members(group_id, user_id) where user_id is not null;

create or replace function public.family_group_owned(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.family_groups g
    where g.id = p_group_id and g.owner_user_id = auth.uid()
  );
$$;

create or replace function public.family_group_access(p_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.family_group_owned(p_group_id)
    or exists (
      select 1 from public.family_members m
      where m.group_id = p_group_id and m.user_id = auth.uid()
    );
$$;

revoke all on function public.family_group_owned(uuid) from public, anon;
revoke all on function public.family_group_access(uuid) from public, anon;
grant execute on function public.family_group_owned(uuid) to authenticated, service_role;
grant execute on function public.family_group_access(uuid) to authenticated, service_role;

-- family_groups ------------------------------------------------------------
drop policy if exists "Family groups are viewable by everyone" on public.family_groups;
drop policy if exists "Family group owner or member can view" on public.family_groups;
create policy "Family group owner or member can view"
  on public.family_groups for select to authenticated
  using (owner_user_id = auth.uid() or public.family_group_access(id));

-- family_members -----------------------------------------------------------
drop policy if exists "Family members are viewable by everyone" on public.family_members;
drop policy if exists "Anyone can join a family group" on public.family_members;
drop policy if exists "Family owner or member can view members" on public.family_members;
drop policy if exists "Group owner can add members" on public.family_members;

create policy "Family owner or member can view members"
  on public.family_members for select to authenticated
  using (public.family_group_access(group_id));

-- The owner seeds their own entries; everyone else joins through join_family_group().
create policy "Group owner can add members"
  on public.family_members for insert to authenticated
  with check (
    public.family_group_owned(group_id)
    and (user_id is null or user_id = auth.uid())
  );

revoke all on public.family_groups from anon;
revoke all on public.family_members from anon;

-- Join by code + last name. Both must match; a mismatch reveals nothing about the code.
create or replace function public.join_family_group(
  p_family_code text,
  p_last_name text,
  p_display_name text,
  p_relationship text default 'family',
  p_hometown_city text default null,
  p_hometown_country text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_group public.family_groups%rowtype;
  v_name text := left(btrim(coalesce(p_display_name, '')), 60);
begin
  if v_uid is null then
    raise exception 'Sign in to join a family group.' using errcode = '42501';
  end if;
  if v_name = '' then
    raise exception 'Enter your name to join.' using errcode = '22023';
  end if;

  select g.* into v_group
  from public.family_groups g
  where g.family_code = upper(btrim(coalesce(p_family_code, '')))
    and lower(btrim(g.last_name)) = lower(btrim(coalesce(p_last_name, '')));
  if not found then
    raise exception 'No family group matches that code and last name.' using errcode = 'P0002';
  end if;

  if v_group.owner_user_id <> v_uid and not exists (
    select 1 from public.family_members m where m.group_id = v_group.id and m.user_id = v_uid
  ) then
    insert into public.family_members (
      group_id, user_id, display_name, relationship, hometown_city, hometown_country
    ) values (
      v_group.id,
      v_uid,
      v_name,
      left(coalesce(nullif(btrim(p_relationship), ''), 'family'), 40),
      nullif(left(btrim(coalesce(p_hometown_city, '')), 80), ''),
      nullif(left(btrim(coalesce(p_hometown_country, '')), 80), '')
    );
  end if;

  return jsonb_build_object('groupId', v_group.id, 'lastName', v_group.last_name);
end;
$$;

revoke all on function public.join_family_group(text, text, text, text, text, text)
  from public, anon;
grant execute on function public.join_family_group(text, text, text, text, text, text)
  to authenticated, service_role;

-- match_queue: unused by every client (app + LinguaLens share this project). Remove the
-- open select/update policies and all client-role access; service_role is unaffected.
drop policy if exists "queue_insert" on public.match_queue;
drop policy if exists "queue_select" on public.match_queue;
drop policy if exists "queue_update" on public.match_queue;
drop policy if exists "queue_delete" on public.match_queue;
revoke all on public.match_queue from anon, authenticated;
