\ir ../../supabase/migrations/20261016133823_assessment_cleanup_runs.sql
set local role authenticated;
select pg_temp.expect_error('select * from public.assessment_cleanup_runs','permission denied');
select pg_temp.expect_error('select public.assessment_begin_cleanup_run(null,null)','permission denied');
reset role;
set local role service_role;
do $$ declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); d uuid:=gen_random_uuid();begin
 if public.assessment_begin_cleanup_run(a,'operator')<>a then raise exception 'Operator run not recorded'; end if;
 if public.assessment_begin_cleanup_run(b,'scheduled_endpoint') is not null then raise exception 'Overlapping cleanup lease admitted'; end if;
 perform public.assessment_finish_cleanup_run(a,3,3,0,false,false);
 if not exists(select 1 from public.assessment_cleanup_runs where id=a and status='succeeded' and finished_at is not null) then raise exception 'Successful cleanup not recorded'; end if;
 if public.assessment_begin_cleanup_run(a,'operator') is not null then raise exception 'Run id reused'; end if;
 if public.assessment_begin_cleanup_run(b,'scheduled_endpoint')<>b then raise exception 'Lease was not released'; end if;
 perform pg_temp.expect_error(format('select public.assessment_finish_cleanup_run(%L,1,2,0,false,false)',b),'check constraint');
 perform public.assessment_finish_cleanup_run(b,3,2,1,true,false);
 if not exists(select 1 from public.assessment_cleanup_runs where id=b and status='partial' and may_have_more) then raise exception 'Failed/backlog work claimed complete'; end if;
 perform public.assessment_begin_cleanup_run(c,'scheduled_endpoint');
 update public.assessment_cleanup_runs set lease_until=now()-interval '1 second' where id=c;
 perform public.assessment_begin_cleanup_run(d,'operator');
 if not exists(select 1 from public.assessment_cleanup_runs where id=c and status='failed' and failure_code='lease_expired') then raise exception 'Expired lease remained healthy'; end if;
 perform public.assessment_finish_cleanup_run(d,0,0,0,false,true);
 if not exists(select 1 from public.assessment_cleanup_runs where id=d and status='failed' and failure_code='worker_failed') then raise exception 'Interrupted job not marked failed'; end if;
end $$;
reset role;
select 'PASS: cleanup run permissions, lease exclusivity/recovery, immutable run identity, bounded honest counts and failure/backlog states' as result;
