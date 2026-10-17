\set ON_ERROR_STOP on
begin;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
-- The hosted service_role is BYPASSRLS. This transaction restores any previous local role flag.
alter role service_role bypassrls;
\ir ../../supabase/migrations/20261017004825_shared_lesson_word_drafts.sql
create function pg_temp.expect_error(query text) returns void language plpgsql as $$
begin
 begin execute query; exception when others then return; end;
 raise exception 'Expected denied/invalid operation';
end $$;
do $$ declare first_lease uuid:=gen_random_uuid(); next_lease uuid:=gen_random_uuid(); payload jsonb; hit jsonb; begin
 select jsonb_agg(jsonb_build_object('en','fixture '||i,'es','palabra '||i,'kind',case when i<=8 then 'term' else 'phrase' end)) into payload from generate_series(1,12)i;
 assert not has_table_privilege('anon','public.lesson_word_drafts','SELECT');
 assert not has_table_privilege('authenticated','public.lesson_word_drafts','INSERT');
 assert not has_function_privilege('anon','public.claim_lesson_word_draft(text,text,uuid)','EXECUTE');
 assert not has_function_privilege('authenticated','public.complete_lesson_word_draft(text,text,uuid,jsonb)','EXECUTE');
 assert not (select prosecdef from pg_proc where oid='public.claim_lesson_word_draft(text,text,uuid)'::regprocedure);
 assert (select relrowsecurity from pg_class where oid='public.lesson_word_drafts'::regclass);
 assert public.claim_lesson_word_draft('preview',repeat('a',64),first_lease)->>'status'='claimed';
 assert public.claim_lesson_word_draft('preview',repeat('a',64),next_lease)->>'status'='pending';
 assert not public.complete_lesson_word_draft('preview',repeat('a',64),next_lease,payload);
 assert not public.release_lesson_word_draft('preview',repeat('a',64),next_lease);
 assert public.complete_lesson_word_draft('preview',repeat('a',64),first_lease,payload);
 hit:=public.claim_lesson_word_draft('preview',repeat('a',64),next_lease);
 assert hit->>'status'='hit'; assert hit->'words'=payload;
 assert public.claim_lesson_word_draft('production',repeat('a',64),next_lease)->>'status'='claimed';
 assert public.claim_lesson_word_draft('preview',repeat('b',64),next_lease)->>'status'='claimed';
 assert public.release_lesson_word_draft('preview',repeat('b',64),next_lease);
 assert public.claim_lesson_word_draft('preview',repeat('b',64),first_lease)->>'status'='claimed';
 update public.lesson_word_drafts set lease_until=clock_timestamp()-interval '1 second' where cache_key=repeat('b',64);
 assert not public.complete_lesson_word_draft('preview',repeat('b',64),first_lease,payload);
 assert public.claim_lesson_word_draft('preview',repeat('b',64),next_lease)->>'status'='claimed';
 assert not public.release_lesson_word_draft('preview',repeat('b',64),first_lease);
 perform pg_temp.expect_error($q$select public.complete_lesson_word_draft('preview',repeat('b',64),gen_random_uuid(),'[]')$q$);
 perform pg_temp.expect_error($q$select public.claim_lesson_word_draft('other',repeat('a',64),gen_random_uuid())$q$);
 perform pg_temp.expect_error($q$select public.claim_lesson_word_draft('preview','invalid',gen_random_uuid())$q$);
 update public.lesson_word_drafts set ready_until=clock_timestamp()-interval '1 second' where environment='preview' and cache_key=repeat('a',64);
 assert public.claim_lesson_word_draft('preview',repeat('a',64),next_lease)->>'status'='claimed';
end $$;
set local role service_role;
select public.claim_lesson_word_draft('development',repeat('c',64),gen_random_uuid())->>'status' as server_role_claim;
reset role;
set local role anon;
select pg_temp.expect_error($q$select * from public.lesson_word_drafts$q$);
select pg_temp.expect_error($q$select public.claim_lesson_word_draft('preview',repeat('a',64),gen_random_uuid())$q$);
reset role;
rollback;
