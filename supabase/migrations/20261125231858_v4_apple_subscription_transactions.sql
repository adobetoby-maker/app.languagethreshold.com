-- Apple and web subscriptions have independent lifecycles. Only the signed-event handler writes here.
create table public.v4_apple_subscriptions (
  environment text not null check (environment in ('Production','Sandbox')),
  original_id text not null,
  owner_id uuid not null,
  product_id text not null check (product_id in (
    'com.languagethreshold.core60v4.individual.monthly','com.languagethreshold.core60v4.individual.annual',
    'com.languagethreshold.core60v4.family.monthly','com.languagethreshold.core60v4.family.annual')),
  purchased_at timestamptz not null,
  signed_at timestamptz not null,
  expires_at timestamptz not null,
  revoked boolean not null,
  primary key (environment, original_id)
);
alter table public.v4_apple_subscriptions enable row level security;
revoke all on public.v4_apple_subscriptions from public, anon, authenticated;
grant select, insert, update on public.v4_apple_subscriptions to service_role;
create index v4_apple_owner on public.v4_apple_subscriptions(owner_id, environment, expires_at);

create function public.record_v4_apple_transaction(
  p_environment text, p_original_id text, p_owner_id uuid, p_product_id text,
  p_purchased_at timestamptz, p_signed_at timestamptz, p_expires_at timestamptz, p_revoked boolean
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.v4_apple_subscriptions as prior
    values (p_environment,p_original_id,p_owner_id,p_product_id,p_purchased_at,p_signed_at,p_expires_at,p_revoked)
  on conflict (environment, original_id) do update set
    product_id=excluded.product_id, purchased_at=excluded.purchased_at, signed_at=excluded.signed_at,
    expires_at=excluded.expires_at, revoked=excluded.revoked
  where prior.owner_id=excluded.owner_id
    and (prior.purchased_at,prior.signed_at) < (excluded.purchased_at,excluded.signed_at);
  if exists (select from public.v4_apple_subscriptions where environment=p_environment
      and original_id=p_original_id and owner_id<>p_owner_id) then
    raise exception 'Purchase already belongs to another account';
  end if;
end $$;
revoke all on function public.record_v4_apple_transaction(text,text,uuid,text,timestamptz,timestamptz,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.record_v4_apple_transaction(text,text,uuid,text,timestamptz,timestamptz,timestamptz,boolean) to service_role;

-- The primary account and its first five provisioned family profiles can use a Family plan.
-- Parent linkage is stored by the service in auth.users.raw_app_meta_data, never user_metadata.
create schema if not exists v4_billing;
revoke all on schema v4_billing from public;
grant usage on schema v4_billing to authenticated, service_role;
create function v4_billing.access_for(p_user uuid, p_environment text)
returns table(product_id text,expires_at timestamptz,is_family_member boolean)
language sql stable security definer set search_path='' as $$
  with parent as (
    select raw_app_meta_data->>'parent_id' as parent_id from auth.users
    where id=p_user and raw_app_meta_data->>'is_kid'='true'
  ), eligible_children as (
    select u.id from auth.users u join parent p on u.raw_app_meta_data->>'parent_id'=p.parent_id
    where u.raw_app_meta_data->>'is_kid'='true' order by u.created_at,u.id limit 5
  )
  select s.product_id,s.expires_at,s.owner_id<>p_user
  from public.v4_apple_subscriptions s
  where s.environment=p_environment and not s.revoked and s.expires_at>now()
    and (s.owner_id=p_user or (s.product_id like '%.family.%'
      and s.owner_id::text=(select parent_id from parent) and p_user in (select id from eligible_children)))
  order by (s.product_id like '%.family.%') desc,s.expires_at desc limit 1;
$$;
revoke all on function v4_billing.access_for(uuid,text) from public,anon,authenticated;
grant execute on function v4_billing.access_for(uuid,text) to service_role;

create function public.v4_apple_account_access(p_user uuid,p_environment text)
returns table(product_id text,expires_at timestamptz,is_family_member boolean)
language sql stable security invoker set search_path='' as $$
 select * from v4_billing.access_for(p_user,p_environment);
$$;
revoke all on function public.v4_apple_account_access(uuid,text) from public,anon,authenticated;
grant execute on function public.v4_apple_account_access(uuid,text) to service_role;
-- Authenticated clients may only read their own effective production entitlement.
create function v4_billing.my_plan() returns table(product_id text,expires_at timestamptz,is_family_member boolean)
language sql stable security definer set search_path='' as $$
 select * from v4_billing.access_for((select auth.uid()),'Production');
$$;
revoke all on function v4_billing.my_plan() from public,anon;
grant execute on function v4_billing.my_plan() to authenticated;
create function public.my_v4_apple_plan() returns table(product_id text,expires_at timestamptz,is_family_member boolean)
language sql stable security invoker set search_path='' as $$ select * from v4_billing.my_plan(); $$;
revoke all on function public.my_v4_apple_plan() from public,anon;
grant execute on function public.my_v4_apple_plan() to authenticated;

-- Enforce five child profiles for an Apple Family account during concurrent account creation.
create function v4_billing.limit_family_profiles() returns trigger language plpgsql security definer set search_path='' as $$
declare parent text := new.raw_app_meta_data->>'parent_id';
begin
  if parent is null or new.raw_app_meta_data->>'is_kid' is distinct from 'true' then return new; end if;
  if not exists (select from public.v4_apple_subscriptions s where s.owner_id::text=parent and
    s.environment='Production' and s.product_id like '%.family.%' and not s.revoked and s.expires_at>now()) then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(parent,7419));
  if (select count(*) from auth.users where raw_app_meta_data->>'parent_id'=parent and raw_app_meta_data->>'is_kid'='true') >= 5 then
    raise exception 'Family profile limit reached';
  end if;
  return new;
end $$;
revoke all on function v4_billing.limit_family_profiles() from public,anon,authenticated;
create trigger v4_apple_family_limit before insert on auth.users for each row
  when (new.raw_app_meta_data->>'is_kid'='true') execute function v4_billing.limit_family_profiles();

-- Serve the signed-in parent's roster through a narrow definer in the private schema, without granting auth.users access to API roles.
create function v4_billing.roster(p_parent uuid) returns table(id uuid,username text)
language sql stable security definer set search_path='' as $$
 select u.id,split_part(u.email,'@',1) from auth.users u where u.raw_app_meta_data->>'parent_id'=p_parent::text and u.raw_app_meta_data->>'is_kid'='true' order by u.created_at,u.id;
$$;
revoke all on function v4_billing.roster(uuid) from public,anon,authenticated;
grant execute on function v4_billing.roster(uuid) to service_role;
create or replace function public.v4_family_roster(p_parent uuid) returns table(id uuid,username text)
language sql stable security invoker set search_path='' as $$ select * from v4_billing.roster(p_parent); $$;
revoke all on function public.v4_family_roster(uuid) from public,anon,authenticated;
grant execute on function public.v4_family_roster(uuid) to service_role;
