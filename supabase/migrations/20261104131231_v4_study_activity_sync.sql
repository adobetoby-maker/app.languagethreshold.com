-- Separate from profiles.data so older website clients cannot overwrite phone history.
create table public.study_activity_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  seconds jsonb not null default '{}' check (jsonb_typeof(seconds)='object'),
  lessons jsonb not null default '{}' check (jsonb_typeof(lessons)='object'),
  practice_days jsonb not null default '[]' check (jsonb_typeof(practice_days)='array'),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);
alter table public.study_activity_devices enable row level security;
revoke all on public.study_activity_devices from public, anon;
grant select, insert, update, delete on public.study_activity_devices to authenticated;
grant select on public.study_activity_devices to service_role;
create policy study_activity_owner on public.study_activity_devices to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.sync_study_activity(p_device_id uuid, p_seconds jsonb, p_lessons jsonb, p_practice_days jsonb default '[]')
returns setof public.study_activity_devices
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  if jsonb_typeof(p_practice_days) <> 'array' or pg_column_size(p_practice_days) > 100000 then raise exception 'Invalid practice days'; end if;
  if exists(select 1 from jsonb_array_elements_text(p_practice_days) d where d !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Invalid practice date'; end if;
  if jsonb_typeof(p_seconds) <> 'object' or jsonb_typeof(p_lessons) <> 'object'
    or pg_column_size(p_seconds) > 100000 or pg_column_size(p_lessons) > 1000000 then
    raise exception 'Invalid study activity';
  end if;
  if exists(select 1 from jsonb_each(p_seconds) e where e.key !~ '^\d{4}-\d{2}-\d{2}$'
    or jsonb_typeof(e.value) <> 'number' or (e.value::text)::numeric < 0 or (e.value::text)::numeric > 86400)
    or exists(select 1 from jsonb_each_text(p_lessons) e where length(e.key) > 240 or e.value !~ '^\d{4}-\d{2}-\d{2}$') then
    raise exception 'Invalid study values';
  end if;
  insert into public.study_activity_devices(user_id,device_id,seconds,lessons,practice_days)
  values(auth.uid(),p_device_id,p_seconds,p_lessons,p_practice_days)
  on conflict(user_id,device_id) do update set
    seconds=(select coalesce(jsonb_object_agg(k,v),'{}') from
      (select key k,max(value::numeric) v from
       (select * from jsonb_each_text(public.study_activity_devices.seconds)
        union all select * from jsonb_each_text(excluded.seconds)) x group by key) y),
    lessons=(select coalesce(jsonb_object_agg(k,v),'{}') from
      (select key k,min(value) v from
       (select * from jsonb_each_text(public.study_activity_devices.lessons)
        union all select * from jsonb_each_text(excluded.lessons)) x group by key) y),
    practice_days=(select coalesce(jsonb_agg(d),'[]') from
      (select distinct jsonb_array_elements_text(public.study_activity_devices.practice_days || excluded.practice_days) d) days),
    updated_at=now();
  return query select * from public.study_activity_devices where user_id=auth.uid();
end; $$;
revoke all on function public.sync_study_activity(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.sync_study_activity(uuid,jsonb,jsonb,jsonb) to authenticated;

create table public.study_activity_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_minutes integer not null default 10 check (goal_minutes in (5,10,15,20))
);
alter table public.study_activity_preferences enable row level security;
revoke all on public.study_activity_preferences from public,anon;
grant select,insert,update,delete on public.study_activity_preferences to authenticated;
grant select on public.study_activity_preferences to service_role;
create policy study_goal_owner on public.study_activity_preferences to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
