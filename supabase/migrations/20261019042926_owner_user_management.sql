-- Owner-only account directory and complimentary access. No learner content is returned.
create table public.platform_user_grants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null unique references public.team_organizations(id),
  reason text not null check (length(reason) between 3 and 500),
  granted_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.platform_user_grants enable row level security;
revoke all on public.platform_user_grants from public, anon, authenticated;
grant all on public.platform_user_grants to service_role;

create index platform_activity_user_time_idx on public.platform_activity_intervals(user_id,started_at desc);

-- Auth users live outside the exposed schema. Only the server service role may call this
-- narrow projection, after the API verifies the platform owner's current identity.
create function public.platform_user_directory(p_search text default '', p_page integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service access required'; end if;
  if p_page < 0 or p_page > 100000 or length(p_search)>160 then raise exception 'Invalid directory query'; end if;
  with matched as (
    select u.id,u.email,u.created_at,u.last_sign_in_at,u.email_confirmed_at,u.banned_until,
      left(coalesce(u.raw_user_meta_data->>'display_name',u.raw_user_meta_data->>'full_name',''),120) as display_name
    from auth.users u where u.deleted_at is null and
    (p_search='' or position(lower(p_search) in lower(coalesce(u.email,'') || ' ' || coalesce(u.raw_user_meta_data->>'display_name','') || ' ' || coalesce(u.raw_user_meta_data->>'full_name','')))>0)
  ), page as (select * from matched order by created_at desc,id limit 50 offset p_page*50),
  usage as (select a.user_id,sum(a.active_seconds) as active_seconds,count(distinct (a.started_at at time zone 'UTC')::date) as active_days,max(a.started_at) as last_practice_at
    from public.platform_activity_intervals a join page p on p.id=a.user_id where a.started_at>=now()-interval '30 days' group by a.user_id)
  select jsonb_build_object('total',(select count(*) from matched),'page',p_page,'pageSize',50,'users',coalesce((select jsonb_agg(jsonb_build_object(
    'id',p.id,'email',p.email,'displayName',p.display_name,'createdAt',p.created_at,'lastSignInAt',p.last_sign_in_at,'confirmed',p.email_confirmed_at is not null,
    'bannedUntil',p.banned_until,'subscriptionStatus',case when profile.data->>'subscription_status' in ('active','trialing','past_due','canceled','paused','unpaid','incomplete') then profile.data->>'subscription_status' else 'none' end,'activeSeconds30d',coalesce(a.active_seconds,0),'activeDays30d',coalesce(a.active_days,0),'lastPracticeAt',a.last_practice_at,
    'freeUntil',e.period_end,'freeActive',coalesce(e.status='manual' and e.period_end>now(),false)
  ) order by p.created_at desc,p.id) from page p left join public.profiles profile on profile.id=p.id left join usage a on a.user_id=p.id left join public.platform_user_grants g on g.user_id=p.id left join public.team_entitlements e on e.organization_id=g.organization_id),'[]'::jsonb)) into result;
  return result;
end $$;
revoke all on function public.platform_user_directory(text,integer) from public,anon,authenticated;
grant execute on function public.platform_user_directory(text,integer) to service_role;

create function public.platform_find_user(p_email text) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service access required'; end if;
  return (select id from auth.users where lower(email)=lower(p_email) and deleted_at is null limit 1);
end $$;
revoke all on function public.platform_find_user(text) from public,anon,authenticated;
grant execute on function public.platform_find_user(text) to service_role;

create function public.platform_user_usage(p_user uuid) returns jsonb
language sql security invoker set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(s) order by s.active_seconds desc),'[]'::jsonb) from (
    select module_id,activity,sum(active_seconds) as active_seconds,count(distinct (started_at at time zone 'UTC')::date) as active_days,max(started_at) as last_practice_at
    from public.platform_activity_intervals where user_id=p_user and started_at>=now()-interval '30 days' group by module_id,activity order by sum(active_seconds) desc limit 200
  ) s;
$$;
revoke all on function public.platform_user_usage(uuid) from public,anon,authenticated;
grant execute on function public.platform_user_usage(uuid) to service_role;

-- Serialize grants for the same learner; retrying the same end date cannot add time/seats.
-- Complimentary personal seats are isolated from paid or shared company subscriptions.
create function public.platform_grant_user(p_actor uuid,p_user uuid,p_until timestamptz,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare org uuid; label text;
begin
  if coalesce(auth.role(),'') <> 'service_role' or not exists(select 1 from public.platform_admin_roles where user_id=p_actor and role='owner') then raise exception 'Owner access required'; end if;
  if p_until is null or p_reason is null or p_until<=now() or p_until>now()+interval '5 years' or length(trim(p_reason)) not between 3 and 500 then raise exception 'Invalid grant'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  select left(coalesce(email,'Learner'),85) into label from auth.users where id=p_user and deleted_at is null;
  if not found then raise exception 'User not found'; end if;
  select organization_id into org from public.platform_user_grants where user_id=p_user;
  if org is null then
    org:=gen_random_uuid();
    insert into public.team_organizations(id,name,owner_user_id,billing_email) values(org,'Complimentary access — '||label,p_actor,label);
    insert into public.team_entitlements(organization_id,seat_limit,term,status,period_end) values(org,1,'annual','manual',p_until);
    insert into public.team_members(organization_id,user_id,display_name,role,status) values(org,p_user,label,'learner','active');
    insert into public.platform_user_grants(user_id,organization_id,reason,granted_by) values(p_user,org,trim(p_reason),p_actor);
  else
    if exists(select 1 from public.team_entitlements where organization_id=org and (stripe_subscription_id is not null or stripe_customer_id is not null)) then raise exception 'Paid billing must be managed through Stripe'; end if;
    update public.team_entitlements set status='manual',seat_limit=1,period_end=p_until,updated_at=now() where organization_id=org;
    update public.platform_user_grants set reason=trim(p_reason),granted_by=p_actor,updated_at=now() where user_id=p_user;
    update public.team_members set status='active' where organization_id=org and user_id=p_user and role='learner';
  end if;
  insert into public.platform_audit_events(actor_user_id,action,organization_id,detail) values(p_actor,'user.free_access',org,jsonb_build_object('userId',p_user,'periodEnd',p_until,'reason',trim(p_reason)));
  return org;
end $$;
revoke all on function public.platform_grant_user(uuid,uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.platform_grant_user(uuid,uuid,timestamptz,text) to service_role;

-- An accepted operation is never automatically resent after a timeout or page reload.
create table public.platform_owner_operations (
  id uuid primary key,
  actor_id uuid not null references auth.users(id),
  target_user_id uuid references auth.users(id),
  action text not null,
  status text not null default 'started',
  created_at timestamptz not null default now()
);
alter table public.platform_owner_operations enable row level security;
revoke all on public.platform_owner_operations from public,anon,authenticated;
grant all on public.platform_owner_operations to service_role;

create index platform_owner_operations_target_idx on public.platform_owner_operations(target_user_id,created_at desc);
create index platform_owner_operations_actor_idx on public.platform_owner_operations(actor_id,created_at desc);
create index platform_user_grants_actor_idx on public.platform_user_grants(granted_by);
-- A recipient cooldown applies across tabs and fresh request IDs, not just one button click.
create function public.platform_claim_password_invite(p_actor uuid,p_user uuid,p_request uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,1));
  if exists(select 1 from public.platform_owner_operations where target_user_id=p_user and action='password_invite' and created_at>now()-interval '60 seconds') then return false; end if;
  insert into public.platform_owner_operations(id,actor_id,target_user_id,action) values(p_request,p_actor,p_user,'password_invite');
  return true;
end $$;
revoke all on function public.platform_claim_password_invite(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.platform_claim_password_invite(uuid,uuid,uuid) to service_role;
