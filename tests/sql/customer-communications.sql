\set ON_ERROR_STOP on
begin;
create schema auth;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz,created_at timestamptz default now(),deleted_at timestamptz);
do $$begin
if not exists(select 1 from pg_roles where rolname='anon')then create role anon nologin;end if;
if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated nologin;end if;
if not exists(select 1 from pg_roles where rolname='service_role')then create role service_role nologin;end if;
end$$;
\ir ../../supabase/migrations/20261019052951_customer_communications_referrals.sql
insert into auth.users(id,email_confirmed_at,created_at) values
('10000000-0000-4000-8000-000000000001',now(),now()-interval '1 year'),
('10000000-0000-4000-8000-000000000002',now(),now()),
('10000000-0000-4000-8000-000000000003',null,now()),
('10000000-0000-4000-8000-000000000004',now(),now()-interval '1 year');
insert into public.customer_referral_links(user_id,code,created_at) values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',now()-interval '1 hour');
insert into public.customer_email_messages(id,user_id,actor_id,subject,body) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','QA','QA'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','QA','QA');
do $$begin
 if public.customer_claim_referral('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001') then raise exception 'Self referral';end if;
 if public.customer_claim_referral('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001') then raise exception 'Unconfirmed referral';end if;
 if public.customer_claim_referral('10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001') then raise exception 'Existing referral';end if;
 if not public.customer_claim_referral('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001') then raise exception 'New referral missing';end if;
 if public.customer_claim_referral('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001') then raise exception 'Duplicate referral';end if;
 if not public.customer_claim_email('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001') then raise exception 'First claim missing';end if;
 if public.customer_claim_email('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001') then raise exception 'Duplicate send';end if;
 if public.customer_claim_email('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001') then raise exception 'Cooldown failed';end if;
end$$;
update public.customer_email_messages set attempted_at=now()-interval '2 minutes';
insert into public.customer_email_preferences(user_id,unsubscribed_at) values('10000000-0000-4000-8000-000000000002',now());
do $$begin
 if public.customer_claim_email('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001') then raise exception 'Suppression failed';end if;
 if has_table_privilege('authenticated','public.customer_email_messages','select') or has_table_privilege('anon','public.customer_referral_links','select') or has_function_privilege('authenticated','public.customer_claim_referral(uuid,uuid)','execute') then raise exception 'Browser privilege leak';end if;
end$$;
rollback;
\echo 'Referral attribution, deduplication, email claim/cooldown, suppression, and browser denial passed (rolled back).'
