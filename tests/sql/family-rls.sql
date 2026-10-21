\set ON_ERROR_STOP on
begin;
-- Named local QA database only. All fixtures, DDL and mutations roll back.
create schema auth;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.mission_pins(id uuid primary key default gen_random_uuid(),user_id uuid);
create function public.update_updated_at_column() returns trigger language plpgsql as $$begin new.updated_at:=now();return new;end$$;
do $$begin
if not exists(select 1 from pg_roles where rolname='anon')then create role anon nologin;end if;
if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated nologin;end if;
if not exists(select 1 from pg_roles where rolname='service_role')then create role service_role nologin;end if;
end$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
\ir ../../supabase/migrations/20260426223537_2d1ecd26-5416-48f5-913b-67f6712fbe9d.sql
\ir ../../supabase/migrations/20260604000000_create_match_queue.sql
-- Mirror Supabase's default client-role table grants before the hardening runs.
grant all on public.family_groups,public.family_members,public.match_queue to anon,authenticated,service_role;
\ir ../../supabase/migrations/20261021000000_family_rls_hardening.sql
create function pg_temp.expect_error(sql_text text,expected text) returns void language plpgsql as $$begin begin execute sql_text; exception when others then if sqlerrm not like '%'||expected||'%'then raise exception 'Expected %, got %',expected,sqlerrm;end if;return;end;raise exception 'Expected error %',expected;end$$;
grant execute on function pg_temp.expect_error(text,text) to anon,authenticated;

-- owner A, joiner B, outsider C
insert into auth.users values('20000000-0000-4000-8000-00000000000a','a@example.invalid'),('20000000-0000-4000-8000-00000000000b','b@example.invalid'),('20000000-0000-4000-8000-00000000000c','c@example.invalid');
insert into public.family_groups(id,owner_user_id,family_code,last_name) values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-00000000000a','SMITH-AB12','Smith'),('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-00000000000c','JONES-ZZ99','Jones');
insert into public.family_members(group_id,display_name,relationship,is_missionary) values('30000000-0000-4000-8000-000000000001','Elder Smith','Missionary',true);
insert into public.match_queue(user_id,username,language) values('20000000-0000-4000-8000-00000000000c','c','Spanish');

-- Anonymous: no rows, no inserts, no join RPC, no match_queue.
set local role anon;
select pg_temp.expect_error($x$select * from public.family_groups$x$,'permission denied');
select pg_temp.expect_error($x$select * from public.family_members$x$,'permission denied');
select pg_temp.expect_error($x$insert into public.family_members(group_id,display_name) values('30000000-0000-4000-8000-000000000001','Intruder')$x$,'permission denied');
select pg_temp.expect_error($x$select public.join_family_group('SMITH-AB12','Smith','Intruder')$x$,'permission denied');
select pg_temp.expect_error($x$select * from public.match_queue$x$,'permission denied');
reset role;

-- Outsider B before joining sees nothing and cannot insert directly.
set local role authenticated;
set local request.jwt.claim.sub='20000000-0000-4000-8000-00000000000b';
do $$begin
 if (select count(*) from public.family_groups)<>0 or (select count(*) from public.family_members)<>0 then raise exception 'Outsider can read family data';end if;
end$$;
select pg_temp.expect_error($x$insert into public.family_members(group_id,display_name) values('30000000-0000-4000-8000-000000000001','Direct')$x$,'row-level security');
select pg_temp.expect_error($x$select public.join_family_group('SMITH-AB12','Wrong','Mom B')$x$,'No family group matches');
select pg_temp.expect_error($x$select public.join_family_group('SMITH-0000','Smith','Mom B')$x$,'No family group matches');
select pg_temp.expect_error($x$select * from public.match_queue$x$,'permission denied');
-- Join with code + last name (case/space tolerant), idempotent, then own family is visible.
do $$declare r jsonb;begin
 r:=public.join_family_group(' smith-ab12 ',' SMITH ','Mom B','Mom','Provo','USA');
 if r->>'groupId'<>'30000000-0000-4000-8000-000000000001' or r->>'lastName'<>'Smith' then raise exception 'Join result wrong: %',r;end if;
 perform public.join_family_group('SMITH-AB12','Smith','Mom B again');
 if (select count(*) from public.family_groups)<>1 then raise exception 'Member cannot see exactly own group';end if;
 if (select count(*) from public.family_members)<>2 then raise exception 'Member roster wrong or duplicate join';end if;
 if exists(select 1 from public.family_members where group_id='30000000-0000-4000-8000-000000000002') then raise exception 'Foreign family visible';end if;
end$$;
select pg_temp.expect_error($x$select public.join_family_group('JONES-ZZ99','Smith','Mismatch')$x$,'No family group matches');
-- A member cannot remove others (only the owner can).
delete from public.family_members where display_name='Elder Smith';
reset role;
do $$begin if not exists(select 1 from public.family_members where display_name='Elder Smith') then raise exception 'Member deleted another member';end if;end$$;

-- Owner A: sees own group + members, can seed entries but not attach other accounts.
set local role authenticated;
set local request.jwt.claim.sub='20000000-0000-4000-8000-00000000000a';
do $$begin
 if (select count(*) from public.family_groups)<>1 or (select count(*) from public.family_members)<>2 then raise exception 'Owner view wrong';end if;
 insert into public.family_members(group_id,display_name,relationship) values('30000000-0000-4000-8000-000000000001','Grandpa','Grandparent');
end$$;
select pg_temp.expect_error($x$insert into public.family_members(group_id,user_id,display_name) values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-00000000000c','Forced')$x$,'row-level security');
select pg_temp.expect_error($x$insert into public.family_members(group_id,display_name) values('30000000-0000-4000-8000-000000000002','Cross-family')$x$,'row-level security');
delete from public.family_members where display_name='Grandpa';
do $$begin if exists(select 1 from public.family_members where display_name='Grandpa') then raise exception 'Owner cannot remove member';end if;end$$;
reset role;

-- Seven-member cap still holds through the RPC.
do $$begin
 insert into public.family_members(group_id,display_name) select '30000000-0000-4000-8000-000000000001','Filler '||g from generate_series(1,5)g;
end$$;
set local role authenticated;
set local request.jwt.claim.sub='20000000-0000-4000-8000-00000000000c';
select pg_temp.expect_error($x$select public.join_family_group('SMITH-AB12','Smith','Eighth')$x$,'Family group is full');
reset role;
rollback;
\echo 'Family RLS: anon denied, outsider isolation, code+last-name join, owner-only writes, member cap and match_queue lockout passed (rolled back).'
