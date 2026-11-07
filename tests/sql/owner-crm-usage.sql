\set ON_ERROR_STOP on
begin;
create extension if not exists pgcrypto;
create schema auth;
create schema storage;
create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
select set_config('request.jwt.claim.role','service_role',true);
create table auth.users(
 id uuid primary key,email text,deleted_at timestamptz,email_confirmed_at timestamptz,
 banned_until timestamptz
);
create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id) on delete cascade);
create table storage.objects(id uuid primary key,owner_id text);
do $$begin
 if not exists(select 1 from pg_roles where rolname='anon')then create role anon nologin;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated nologin;end if;
 if not exists(select 1 from pg_roles where rolname='service_role')then create role service_role nologin;end if;
end$$;
create table public.platform_admin_roles(user_id uuid references auth.users(id),role text);
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,data jsonb default '{}'::jsonb);
create table public.assessment_enrollments(user_id uuid references auth.users(id) on delete cascade);
create table public.owner_crm_contacts(id uuid primary key,email text,user_id uuid unique references auth.users(id) on delete set null);
create table public.staff_coupon_recipients(email text primary key,user_id uuid unique references auth.users(id) on delete set null);
create table public.platform_owner_operations(id uuid primary key,actor_id uuid references auth.users(id),target_user_id uuid references auth.users(id));
create table public.platform_audit_events(id bigserial primary key,actor_user_id uuid references auth.users(id),detail jsonb default '{}'::jsonb);
\ir ../../supabase/migrations/20261019052951_customer_communications_referrals.sql
\ir ../../supabase/migrations/20261103031652_api_usage_events.sql
\ir ../../supabase/migrations/20261103032218_customer_email_campaigns.sql
\ir ../../supabase/migrations/20261103032442_owner_account_deletion_guard.sql
insert into auth.users(id,email,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001','owner@example.test',now()),
 ('10000000-0000-4000-8000-000000000002','learner@example.test',now()),
 ('10000000-0000-4000-8000-000000000003','child@kids.languagethreshold.app',now()),
 ('10000000-0000-4000-8000-000000000004','unsub@example.test',now()),
 ('10000000-0000-4000-8000-000000000005','unconfirmed@example.test',null);
insert into public.platform_admin_roles values('10000000-0000-4000-8000-000000000001','owner');
insert into public.customer_email_preferences(user_id,unsubscribed_at) values('10000000-0000-4000-8000-000000000004',now());
do $$begin
 if public.customer_campaign_eligible_count()<>1 then raise exception 'Campaign audience leaked'; end if;
 if public.customer_prepare_campaign('10000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001','Test','Hello',true)<>1
 then raise exception 'Campaign snapshot count'; end if;
 if (select count(*) from public.customer_email_messages where campaign_id='20000000-0000-4000-8000-000000000001')<>1
 then raise exception 'Campaign snapshot rows'; end if;
 if (select recipient_email from public.customer_email_messages where campaign_id='20000000-0000-4000-8000-000000000001')<>'learner@example.test'
 then raise exception 'Campaign recipient mismatch'; end if;
 if (select calls from public.api_usage_summary('10000000-0000-4000-8000-000000000002') limit 1) is not null
 then raise exception 'Unexpected metering row'; end if;
end$$;
insert into public.api_usage_events(user_id,provider,request_status,cost_ceiling_micro_usd)
 values('10000000-0000-4000-8000-000000000002','anthropic','accepted',123);
insert into public.owner_crm_contacts values('30000000-0000-4000-8000-000000000001','learner@example.test','10000000-0000-4000-8000-000000000002');
insert into public.staff_coupon_recipients values('learner@example.test','10000000-0000-4000-8000-000000000002');
insert into public.platform_owner_operations values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
insert into public.platform_audit_events(actor_user_id,detail)
 values('10000000-0000-4000-8000-000000000001','{"userId":"10000000-0000-4000-8000-000000000002","email":"learner@example.test"}');
do $$begin
 if public.platform_account_deletion_blockers('10000000-0000-4000-8000-000000000002')<>'[]'::jsonb
 then raise exception 'Unexpected deletion blocker'; end if;
end$$;
insert into auth.sessions values('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
do $$begin
 if public.platform_revoke_user_sessions('10000000-0000-4000-8000-000000000002')<>1
 then raise exception 'Session revocation failed'; end if;
end$$;
delete from auth.users where id='10000000-0000-4000-8000-000000000002';
do $$begin
 if exists(select 1 from public.api_usage_events) or exists(select 1 from public.owner_crm_contacts)
 or exists(select 1 from public.staff_coupon_recipients) or exists(select 1 from public.platform_audit_events)
 or exists(select 1 from public.customer_email_messages where user_id='10000000-0000-4000-8000-000000000002')
 then raise exception 'Deleted customer data remained'; end if;
 if (select target_user_id from public.platform_owner_operations limit 1) is not null
 then raise exception 'Operation target remained'; end if;
end$$;
insert into auth.users(id,email,email_confirmed_at)
 values('10000000-0000-4000-8000-000000000006','protected@example.test',now());
insert into public.profiles(id,data) values
 ('10000000-0000-4000-8000-000000000006','{"subscription_id":"sub_fixture"}');
insert into public.assessment_enrollments values('10000000-0000-4000-8000-000000000006');
insert into storage.objects values('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000006');
create table public.future_customer_reference(user_id uuid references auth.users(id));
insert into public.future_customer_reference values('10000000-0000-4000-8000-000000000006');
do $$declare blockers jsonb;
begin
 blockers:=public.platform_account_deletion_blockers('10000000-0000-4000-8000-000000000006');
 if jsonb_array_length(blockers)<4 then raise exception 'Deletion blockers missed protected records: %',blockers; end if;
 if has_table_privilege('authenticated','public.api_usage_events','select')
 or has_function_privilege('authenticated','public.customer_prepare_campaign(uuid,uuid,text,text,boolean)','execute')
 or has_function_privilege('authenticated','public.platform_account_deletion_blockers(uuid)','execute')
 then raise exception 'Browser privilege leak'; end if;
end$$;
rollback;
\echo 'Owner CRM usage, campaign audience, and account erasure SQL passed (rolled back).'
