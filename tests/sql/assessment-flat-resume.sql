-- Fictional data inside assessment-engine.sql's local transaction; rolled back in full.
do $$
declare actor uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); en uuid; cp uuid;
 attempt uuid; request uuid:=gen_random_uuid(); other_request uuid:=gen_random_uuid(); frozen jsonb; events bigint;
begin
 insert into auth.users values(actor),(outsider);
 insert into public.assessment_releases(id,module_id,target_language,instruction_language,content_version)
 values('flat-resume-fixture','roofing','Spanish','English','synthetic-only');
 insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,definition)
 values('flat-resume-fixture-form','flat-resume-fixture','entrance','synthetic','synthetic','{"items":[{"id":"synthetic-item","type":"recall","skill":"recall","objectiveId":"roofing.lesson.1","maximum":1}]}');
 en:=public.assessment_create_enrollment(actor,actor,null,'flat-resume-fixture','2026-10-18','America/Denver',gen_random_uuid());
 select id into cp from public.assessment_checkpoints where enrollment_id=en and checkpoint='entrance';
 attempt:=public.assessment_start_attempt(actor,cp,'flat-resume-fixture-form',request,true);
 select form_snapshot into frozen from public.assessment_attempts where id=attempt;
 select count(*) into events from public.assessment_events where enrollment_id=en and action='attempt.started';
 update public.assessment_forms set definition='{"items":[{"id":"changed-source"}]}' where id='flat-resume-fixture-form';
 if public.assessment_start_attempt(actor,cp,null,request,true)<>attempt then raise exception 'Same-key recovery lost frozen identity'; end if;
 if public.assessment_start_attempt(actor,cp,null,other_request,true)<>attempt then raise exception 'Open-attempt recovery lost frozen identity'; end if;
 if (select form_snapshot from public.assessment_attempts where id=attempt) is distinct from frozen then raise exception 'Recovery rewrote frozen form'; end if;
 if (select count(*) from public.assessment_events where enrollment_id=en and action='attempt.started')<>events then raise exception 'Recovery duplicated start events'; end if;
 update public.assessment_enrollments set status='paused',paused_on=current_date where id=en;
 if public.assessment_start_attempt(actor,cp,null,request,true)<>attempt then raise exception 'Paused same-key result disappeared'; end if;
 perform pg_temp.expect_error(format('select public.assessment_start_attempt(%L,%L,null,%L,true)',actor,cp,other_request),'paused');
 perform pg_temp.expect_error(format('select public.assessment_start_attempt(%L,%L,null,%L,true)',outsider,cp,request),'access required');
 update public.assessment_enrollments set status='active',paused_on=null where id=en;
 delete from public.assessment_attempts where id=attempt;
 perform pg_temp.expect_error(format('select public.assessment_start_attempt(%L,%L,null,%L,true)',actor,cp,request),'form unavailable');
 if exists(select 1 from public.assessment_attempts where checkpoint_id=cp) then raise exception 'NULL-form recovery created an attempt'; end if;
 if (select count(*) from public.assessment_events where enrollment_id=en and action='attempt.started')<>events then raise exception 'Absent recovery wrote a start event'; end if;
end $$;
select 'PASS: NULL-form flat recovery preserves frozen identity, permissions and pause ordering; missing saved work cannot create a replacement' as result;
