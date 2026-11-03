-- Linked owner CRM/contact and staff-offer records contain the customer's email. They must
-- disappear with the account instead of becoming unlinked personal-data orphans.
-- Session revocation was previously an optional owner migration. Include it in this required
-- deletion guard so hard deletion cannot silently leave a refresh session active.
create or replace function public.platform_revoke_user_sessions(p_user uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service access required'; end if;
  if p_user is null then raise exception 'User required'; end if;
  if exists(select 1 from public.platform_admin_roles where user_id=p_user and role='owner') then
    raise exception 'Platform owner sessions cannot be revoked here';
  end if;
  delete from auth.sessions where user_id=p_user;
  get diagnostics removed = row_count;
  return removed;
end $$;
revoke all on function public.platform_revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.platform_revoke_user_sessions(uuid) to service_role;

alter table public.owner_crm_contacts drop constraint if exists owner_crm_contacts_user_id_fkey;
alter table public.owner_crm_contacts add constraint owner_crm_contacts_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.staff_coupon_recipients drop constraint if exists staff_coupon_recipients_user_id_fkey;
alter table public.staff_coupon_recipients add constraint staff_coupon_recipients_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- A target's invitation operation is an owner-side delivery receipt, not learner content.
-- Keep the receipt without a link to a deleted account.
alter table public.platform_owner_operations drop constraint if exists platform_owner_operations_target_user_id_fkey;
alter table public.platform_owner_operations add constraint platform_owner_operations_target_user_id_fkey
  foreign key (target_user_id) references auth.users(id) on delete set null;

-- Report every blocking reference dynamically, including future NO ACTION/RESTRICT FKs.
-- Deletion must fail closed when a new table starts depending on auth.users.
create function public.platform_scrub_account_before_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Remove owner activity metadata that could retain the deleted UUID or email. This also
  -- clears an account's own audit-actor FK before the auth row is removed.
  delete from public.platform_audit_events e
   where e.actor_user_id=old.id
      or position(old.id::text in e.detail::text)>0
      or (old.email is not null and position(lower(old.email) in lower(e.detail::text))>0);
  if old.email is not null then
    delete from public.owner_crm_contacts where lower(email)=lower(old.email);
    delete from public.staff_coupon_recipients where lower(email)=lower(old.email);
  end if;
  return old;
end $$;
create trigger platform_account_deletion_scrub
before delete on auth.users for each row
execute function public.platform_scrub_account_before_delete();

create function public.platform_account_deletion_blockers(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare fk record; n bigint; result jsonb := '[]'::jsonb;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service access required'; end if;
  if exists(select 1 from public.assessment_enrollments where user_id=p_user) then
    result := result || jsonb_build_array('Official assessment records need a retention decision');
  end if;
  if exists(select 1 from public.profiles where id=p_user and
    coalesce(data->>'subscription_id','') <> '') then
    result := result || jsonb_build_array('A Stripe subscription must be cancelled or transferred first');
  end if;
  if exists(select 1 from storage.objects o where to_jsonb(o)->>'owner_id'=p_user::text) then
    result := result || jsonb_build_array('Owned storage objects must be removed first');
  end if;
  if exists(select 1 from pg_constraint c where c.contype='f'
    and c.confrelid='auth.users'::regclass and cardinality(c.conkey)<>1) then
    result := result || jsonb_build_array('A composite user relationship needs deletion review');
  end if;
  for fk in
    select c.conrelid::regclass as table_name, a.attname as column_name
    from pg_constraint c
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
    where c.contype='f' and c.confrelid='auth.users'::regclass
      and c.confdeltype in ('a','r','d') and cardinality(c.conkey)=1
      and c.conrelid <> 'public.platform_audit_events'::regclass
  loop
    execute format('select count(*) from %s where %I=$1', fk.table_name, fk.column_name)
      into n using p_user;
    if n>0 then result := result || jsonb_build_array(
      format('%s.%s has %s protected reference(s)',fk.table_name,fk.column_name,n)); end if;
  end loop;
  return result;
end $$;
revoke all on function public.platform_account_deletion_blockers(uuid)
  from public, anon, authenticated;
grant execute on function public.platform_account_deletion_blockers(uuid) to service_role;
