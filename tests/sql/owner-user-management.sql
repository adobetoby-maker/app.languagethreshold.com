\set ON_ERROR_STOP on
begin;
-- Named local QA database only. All fixtures, DDL and mutations roll back.
create schema auth;
create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz,email_confirmed_at timestamptz,banned_until timestamptz,raw_user_meta_data jsonb default '{}',deleted_at timestamptz);
create table public.profiles(id uuid primary key,data jsonb default '{}');
create table public.platform_admin_roles(user_id uuid primary key,role text);
create table public.team_organizations(id uuid primary key,name text not null,owner_user_id uuid not null references auth.users,billing_email text not null);
create table public.team_entitlements(organization_id uuid primary key references public.team_organizations,seat_limit integer,term text,status text,period_end timestamptz,stripe_customer_id text,stripe_subscription_id text,updated_at timestamptz default now());
create table public.team_members(organization_id uuid references public.team_organizations,user_id uuid references auth.users,display_name text,role text,status text,unique(organization_id,user_id));
create table public.platform_audit_events(actor_user_id uuid,action text,organization_id uuid,detail jsonb);
create table public.platform_activity_intervals(user_id uuid references auth.users,module_id text,activity text,active_seconds int,started_at timestamptz);
do $$begin
if not exists(select 1 from pg_roles where rolname='anon')then create role anon nologin;end if;
if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated nologin;end if;
if not exists(select 1 from pg_roles where rolname='service_role')then create role service_role nologin;end if;
end$$;
\ir ../../supabase/migrations/20261019042926_owner_user_management.sql
create function pg_temp.expect_error(sql_text text,expected text) returns void language plpgsql as $$begin begin execute sql_text; exception when others then if sqlerrm not like '%'||expected||'%'then raise exception 'Expected %, got %',expected,sqlerrm;end if;return;end;raise exception 'Expected error %',expected;end$$;
insert into auth.users(id,email,raw_user_meta_data) values('10000000-0000-4000-8000-000000000001','owner@example.invalid','{"secret":"must-not-leak"}'),('10000000-0000-4000-8000-000000000002','tester@example.invalid','{"display_name":"QA Tester","secret":"must-not-leak"}');
insert into public.profiles values('10000000-0000-4000-8000-000000000002','{"subscription_status":"active","private_conversation":"must-not-leak"}');
insert into public.platform_admin_roles values('10000000-0000-4000-8000-000000000001','owner');
insert into public.platform_activity_intervals values('10000000-0000-4000-8000-000000000002','core','see',30,now()),('10000000-0000-4000-8000-000000000002','core','see',20,now()-interval '1 hour'),('10000000-0000-4000-8000-000000000002','roofing','hear',10,now()-interval '35 days');
set local request.jwt.claim.role='service_role';
do $$declare r jsonb;o uuid;again uuid;begin
 r:=public.platform_user_directory('qa tester',0);
 if (r->>'total')::int<>1 or r->'users'->0->>'email'<>'tester@example.invalid' or (r->'users'->0->>'activeSeconds30d')::int<>50 then raise exception 'Directory search or independent usage failed';end if;
 if r::text like '%must-not-leak%' or r->'users'->0->>'subscriptionStatus'<>'active' then raise exception 'Projection leak/plan omission';end if;
 if jsonb_array_length(public.platform_user_usage('10000000-0000-4000-8000-000000000002'))<>1 then raise exception 'Usage window failed';end if;
 o:=public.platform_grant_user('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',now()+interval '1 year','QA testing');
 again:=public.platform_grant_user('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',now()+interval '2 years','Extended QA testing');
 if o<>again or (select count(*) from public.team_organizations)<>1 or (select seat_limit from public.team_entitlements where organization_id=o)<>1 then raise exception 'Grant retry duplicated access';end if;
 if not (public.platform_user_directory('tester',0)->'users'->0->>'freeActive')::boolean then raise exception 'Free grant not surfaced';end if;
 if (select data->>'subscription_status' from public.profiles limit 1)<>'active' then raise exception 'Paid personal profile overwritten';end if;
 if not public.platform_claim_password_invite('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003') then raise exception 'Initial invite denied';end if;
 if public.platform_claim_password_invite('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004') then raise exception 'Cooldown bypassed with new request ID';end if;
 update public.team_entitlements set stripe_subscription_id='sub_fixture' where organization_id=o;
end$$;
select pg_temp.expect_error($x$select public.platform_grant_user('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',now()+interval '1 year','QA testing')$x$,'Paid billing');
select pg_temp.expect_error($x$select public.platform_grant_user('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',now()+interval '1 year','QA testing')$x$,'Owner access');
select pg_temp.expect_error($x$select public.platform_grant_user('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',now()-interval '1 day','QA testing')$x$,'Invalid grant');
-- Paging must reach beyond the initial fifty; literal wildcard search is not a SQL pattern.
insert into auth.users(id,email)select gen_random_uuid(),'page-'||g||'@example.invalid' from generate_series(1,55)g;
do $$declare r jsonb;begin r:=public.platform_user_directory('page-',1);if (r->>'total')::int<>55 or jsonb_array_length(r->'users')<>5 then raise exception 'Paging truncates accounts';end if;if (public.platform_user_directory('%',0)->>'total')::int<>0 then raise exception 'Wildcard escaped projection';end if;end$$;
set local request.jwt.claim.role='authenticated';
select pg_temp.expect_error($x$select public.platform_user_directory('',0)$x$,'Service access');
set local role authenticated;
select pg_temp.expect_error($x$select * from public.platform_user_grants$x$,'permission denied');
select pg_temp.expect_error($x$select public.platform_user_directory('',0)$x$,'permission denied');
select pg_temp.expect_error($x$select public.platform_grant_user('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',now()+interval '1 year','Testing')$x$,'permission denied');
reset role;
rollback;
\echo 'Owner directory, privacy projection, paging, grant retries, paid protection, cooldown and client denial passed (rolled back).'
