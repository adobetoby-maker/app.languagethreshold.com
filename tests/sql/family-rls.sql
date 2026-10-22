\set ON_ERROR_STOP on
begin;
-- Named local QA database only. All fixtures, DDL and mutations roll back.
create schema auth;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.profiles(id uuid primary key,data jsonb not null default '{}');
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
\if :production_shape
-- Mirror the read-only production snapshot: owner ALL policies, no cap trigger.
do $$declare p record;begin
 for p in select tablename,policyname from pg_policies where schemaname='public' and tablename in ('family_groups','family_members') loop
  execute format('drop policy %I on public.%I',p.policyname,p.tablename);
 end loop;
end$$;
create policy "Owner manages family group" on public.family_groups for all using(auth.uid()=owner_user_id);
create policy "Group owner manages members" on public.family_members for all using(exists(select 1 from public.family_groups g where g.id=family_members.group_id and g.owner_user_id=auth.uid()));
drop trigger trg_family_members_cap on public.family_members;
drop function public.enforce_family_member_cap();
\endif
-- Mirror Supabase's default client-role table grants before the hardening runs.
grant all on public.family_groups,public.family_members,public.match_queue,public.profiles to anon,authenticated,service_role;
-- Run with the already-shipped reset guards too: both profile triggers must coexist.
create table public.library_books(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id));
grant all on public.library_books to authenticated,service_role;
\ir ../../supabase/migrations/20261022013531_learner_learning_reset.sql
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
do $$begin
 if public.join_family_group('SMITH-AB12','Wrong','Mom B')->>'error'<>'not_found' then raise exception 'Wrong last name accepted';end if;
 if public.join_family_group('SMITH-0000','Smith','Mom B')->>'error'<>'not_found' then raise exception 'Wrong code accepted';end if;
end$$;
select pg_temp.expect_error($x$select * from public.family_join_attempts$x$,'permission denied');
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
do $$begin if public.join_family_group('JONES-ZZ99','Smith','Mismatch')->>'error'<>'not_found' then raise exception 'Cross-family code accepted';end if;end$$;
-- Brute-force limit: B has used 5 attempts; 5 more misses hit the cap, then even a valid join is refused.
do $$begin for i in 1..5 loop perform public.join_family_group('SMITH-'||i,'Smith','Guess');end loop;end$$;
select pg_temp.expect_error($x$select public.join_family_group('SMITH-AB12','Smith','Mom B')$x$,'Too many join attempts');
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
-- Billing keys in profiles.data: clients cannot set or erase them; service_role can.
insert into public.profiles values('20000000-0000-4000-8000-00000000000a','{"subscription_status":"active","subscription_id":"sub_fixture","xp":1}');
set local role authenticated;
set local request.jwt.claim.sub='20000000-0000-4000-8000-00000000000b';
insert into public.profiles values('20000000-0000-4000-8000-00000000000b','{"subscription_status":"active","xp":5}');
update public.profiles set data='{"subscription_status":"trialing","xp":6}' where id='20000000-0000-4000-8000-00000000000b';
reset role;
set local role authenticated;
set local request.jwt.claim.sub='20000000-0000-4000-8000-00000000000a';
update public.profiles set data='{"xp":2}' where id='20000000-0000-4000-8000-00000000000a';
update public.profiles set data=data||'{"subscription_status":"canceled"}' where id='20000000-0000-4000-8000-00000000000a';
reset role;
do $$begin
 if (select data from public.profiles where id='20000000-0000-4000-8000-00000000000b')<>'{"xp":6}'::jsonb then raise exception 'Client self-granted a subscription';end if;
 if (select data from public.profiles where id='20000000-0000-4000-8000-00000000000a')<>'{"xp":2,"subscription_status":"active","subscription_id":"sub_fixture"}'::jsonb then raise exception 'Client sync erased or altered billing keys';end if;
end$$;
set local role service_role;
update public.profiles set data=data||'{"subscription_status":"canceled"}' where id='20000000-0000-4000-8000-00000000000a';
reset role;
do $$begin if (select data->>'subscription_status' from public.profiles where id='20000000-0000-4000-8000-00000000000a')<>'canceled' then raise exception 'Service role cannot update billing';end if;end$$;
-- Reset remains usable without erasing paid access or other accounts' books.
update public.profiles set data=data||'{"subscription_status":"active","xp":42}' where id='20000000-0000-4000-8000-00000000000a';
insert into public.library_books(user_id) values('20000000-0000-4000-8000-00000000000a'),('20000000-0000-4000-8000-00000000000b');
set local role authenticated;
set local request.jwt.claim.sub='20000000-0000-4000-8000-00000000000a';
select public.reset_my_learning_data('RESET','40000000-0000-4000-8000-000000000001');
select pg_temp.expect_error($x$update public.profiles set data='{"xp":99}' where id='20000000-0000-4000-8000-00000000000a'$x$,'Learning progress was reset');
update public.profiles set data='{"learningResetId":"40000000-0000-4000-8000-000000000001","xp":3,"subscription_status":"trialing"}' where id='20000000-0000-4000-8000-00000000000a';
select pg_temp.expect_error($x$insert into public.library_books(user_id) values('20000000-0000-4000-8000-00000000000a')$x$,'Learning progress was reset');
insert into public.library_books(user_id,learning_reset_id) values('20000000-0000-4000-8000-00000000000a','40000000-0000-4000-8000-000000000001');
-- Retrying the same reset must preserve the new practice and newly saved book.
select public.reset_my_learning_data('RESET','40000000-0000-4000-8000-000000000001');
reset role;
do $$declare p jsonb;begin
 select data into p from public.profiles where id='20000000-0000-4000-8000-00000000000a';
 if p->>'subscription_status'<>'active' or p->>'subscription_id'<>'sub_fixture' then raise exception 'Reset or later client sync changed billing';end if;
 if p->>'xp'<>'3' or p->>'learningResetId'<>'40000000-0000-4000-8000-000000000001' then raise exception 'Reset retry erased new progress or marker';end if;
 if (select count(*) from public.library_books where user_id='20000000-0000-4000-8000-00000000000a')<>1 then raise exception 'Reset retry deleted the new book';end if;
 if (select count(*) from public.library_books where user_id='20000000-0000-4000-8000-00000000000b')<>1 then raise exception 'Reset touched another account book';end if;
 if (select count(*) from public.family_members where group_id='30000000-0000-4000-8000-000000000001')<>7 then raise exception 'Reset touched the family roster';end if;
end$$;
-- A webhook-like metadata patch after reset must keep the epoch and new learning data.
set local role service_role;
update public.profiles set data='{"subscription_status":"canceled"}' where id='20000000-0000-4000-8000-00000000000a';
reset role;
do $$declare p jsonb;begin
 select data into p from public.profiles where id='20000000-0000-4000-8000-00000000000a';
 if p->>'subscription_status'<>'canceled' or p->>'xp'<>'3' or p->>'learningResetId'<>'40000000-0000-4000-8000-000000000001' then raise exception 'Billing patch lost reset marker or progress';end if;
end$$;
rollback;
\echo 'Family RLS and reset integration: ownership, billing protection, stale writes, safe retries and metadata preservation passed (rolled back).'
