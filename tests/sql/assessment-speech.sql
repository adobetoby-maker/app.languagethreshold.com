-- Fictional speech workflow. Runs only inside the local fixture's outer ROLLBACK.
\ir ../../supabase/migrations/20261016124934_assessment_speech_evidence.sql
\ir ../../supabase/migrations/20261016130745_assessment_speech_replacements.sql
insert into storage.objects(bucket_id,name) values('assessment-speech-private','fixture');
set local role authenticated;
select pg_temp.expect_error('select * from public.assessment_speech_evidence','permission denied');
select pg_temp.expect_error('select * from public.assessment_media_policies','permission denied');
select pg_temp.expect_error('select public.assessment_finish_speech(null,null)','permission denied');
select pg_temp.expect_error($q$insert into storage.objects(bucket_id,name) values('assessment-speech-private','denied')$q$,'row-level security');
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='assessment-speech-private') then raise exception 'Speech storage bypassed restrictive policy'; end if;
end $$;
reset role;
insert into public.assessment_releases(id,module_id,target_language,instruction_language,content_version) values('speech-test-release','speech-fixture','Spanish','English','fixture-only');
insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,definition) values('speech-fixture-form','speech-test-release','entrance','fixture','fixture','{"items":[{"id":"spoken1","type":"production","skill":"speaking","inputMethods":["speech"],"objectiveId":"fixture.speech","maximum":3,"rubric":{"dimensions":[{"id":"meaning","maximum":3}]}},{"id":"spoken2","type":"production","skill":"speaking","inputMethods":["speech"],"objectiveId":"fixture.speech2","maximum":3}]}');
insert into public.team_assignments values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','speech-fixture');
set local role service_role;
do $$ declare e uuid; cp uuid; a uuid; m uuid; expired_m uuid; prior_m uuid; r uuid; n integer;
 learner uuid:='10000000-0000-4000-8000-000000000001'; reviewer uuid:='10000000-0000-4000-8000-000000000002'; other uuid:='10000000-0000-4000-8000-000000000003';
begin
 e:=public.assessment_create_enrollment(reviewer,learner,'20000000-0000-4000-8000-000000000001','speech-test-release','2026-10-16','America/Denver',gen_random_uuid());
 select id into cp from public.assessment_checkpoints where enrollment_id=e and checkpoint='entrance';
 a:=public.assessment_start_attempt(learner,cp,'speech-fixture-form',gen_random_uuid(),true);
 perform pg_temp.expect_error(format('select public.assessment_reserve_speech(%L,%L,%L,0,%L,%L,64,%L,1000,%L)',learner,a,'spoken1','assessment-speech-pending-v1',repeat('a',64),'audio/webm',gen_random_uuid()),'policy is not enabled');
 if exists(select 1 from public.assessment_speech_evidence) then raise exception 'Disabled collection wrote evidence'; end if;
 perform pg_temp.expect_error(format('update public.assessment_media_policies set retention_days=30,approved_by=%L,approved_at=now(),collection_enabled=true where version=%L',reviewer,'assessment-speech-pending-v1'),'collection_requires_cleanup');
 update public.assessment_media_policies set retention_days=30,approved_by=reviewer,approved_at=now(),collection_enabled=true,cleanup_enabled=true where version='assessment-speech-pending-v1';
 perform pg_temp.expect_error(format('select public.assessment_reserve_speech(%L,%L,%L,0,%L,%L,64,%L,1000,%L)',other,a,'spoken1','assessment-speech-pending-v1',repeat('a',64),'audio/webm',gen_random_uuid()),'access required');
 perform pg_temp.expect_error(format('select public.assessment_reserve_speech(%L,%L,%L,2,%L,%L,64,%L,1000,%L)',learner,a,'spoken1','assessment-speech-pending-v1',repeat('a',64),'audio/webm',gen_random_uuid()),'revision conflict');
 perform pg_temp.expect_error(format('select public.assessment_reserve_speech(%L,%L,%L,0,%L,%L,64,%L,1000,%L)',learner,a,'missing','assessment-speech-pending-v1',repeat('a',64),'audio/webm',gen_random_uuid()),'Frozen speaking item');
 expired_m:=public.assessment_reserve_speech(learner,a,'spoken1',0,'assessment-speech-pending-v1',repeat('d',64),64,'audio/webm',1000,gen_random_uuid());
 update public.assessment_speech_evidence set created_at=now()-interval '11 minutes' where id=expired_m;
 perform pg_temp.expect_error(format('select public.assessment_finish_speech(%L,%L)',learner,expired_m),'Speech upload expired');
 if (select revision from public.assessment_attempts where id=a)<>0 then raise exception 'Expired upload changed saved revision'; end if;
 r:=gen_random_uuid(); m:=public.assessment_reserve_speech(learner,a,'spoken1',0,'assessment-speech-pending-v1',repeat('a',64),64,'audio/webm',1000,r);
 if public.assessment_reserve_speech(learner,a,'spoken1',0,'assessment-speech-pending-v1',repeat('a',64),64,'audio/webm',1000,r)<>m then raise exception 'Speech retry duplicated'; end if;
 perform pg_temp.expect_error(format('select public.assessment_reserve_speech(%L,%L,%L,0,%L,%L,64,%L,1000,%L)',learner,a,'spoken1','assessment-speech-pending-v1',repeat('b',64),'audio/webm',r),'key reused');
 perform pg_temp.expect_error(format('select public.assessment_finish_speech(%L,%L)',other,m),'access required');
 n:=public.assessment_finish_speech(learner,m);
 if n<>1 or public.assessment_finish_speech(learner,m)<>1 then raise exception 'Speech attach retry changed revision'; end if;
 if not exists(select 1 from public.assessment_responses where attempt_id=a and item_id='spoken1' and answer->>'mediaEvidenceId'=m::text) then raise exception 'Recording not attached atomically'; end if;
 prior_m:=m; m:=public.assessment_reserve_speech(learner,a,'spoken1',1,'assessment-speech-pending-v1',repeat('b',64),64,'audio/webm',1000,gen_random_uuid());
 if public.assessment_finish_speech(learner,m)<>2 then raise exception 'Replacement revision wrong'; end if;
 if not exists(select 1 from public.assessment_speech_evidence where id=prior_m and delete_requested_at is not null) then raise exception 'Replaced recording still playable'; end if;
 perform pg_temp.expect_error(format('select public.assessment_save_responses(%L,%L,2,%L,%L)',learner,a,jsonb_build_array(jsonb_build_object('itemId','spoken2','answer',jsonb_build_object('inputMethod','speech_transcript','mediaEvidenceId',m))),gen_random_uuid()),'Verified speech reference');
 perform pg_temp.expect_error(format('select public.assessment_ack_speech_review(%L,%L,%L)',reviewer,m,gen_random_uuid()),'Submitted speech review access');
 perform public.assessment_submit_attempt(learner,a,2,gen_random_uuid());
 select id into r from public.assessment_responses where attempt_id=a and item_id='spoken1';
 perform pg_temp.expect_error(format('select public.assessment_review_rubric(%L,%L,%L,%L,3,%L,%L,%L)',reviewer,a,r,'scored','{"meaning":3}','Fixture review only',gen_random_uuid()),'Verified spoken evidence');
 perform pg_temp.expect_error(format('select public.assessment_ack_speech_review(%L,%L,%L)',learner,m,gen_random_uuid()),'Submitted speech review access');
 perform pg_temp.expect_error(format('select public.assessment_ack_speech_review(%L,%L,%L)',other,m,gen_random_uuid()),'Submitted speech review access');
 perform public.assessment_ack_speech_review(reviewer,m,gen_random_uuid());
 perform public.assessment_review_rubric(reviewer,a,r,'scored',3,'{"meaning":3}','Fictional local rubric review',gen_random_uuid());
 update public.assessment_media_policies set collection_enabled=false,cleanup_enabled=false where version='assessment-speech-pending-v1';
 if exists(select 1 from public.assessment_claim_speech_cleanup()) then raise exception 'Disabled cleanup returned work'; end if;
 perform pg_temp.expect_error(format('select public.assessment_withdraw_speech(%L,%L,%L)',other,m,gen_random_uuid()),'access required');
 perform public.assessment_withdraw_speech(learner,m,gen_random_uuid());
 perform pg_temp.expect_error(format('select public.assessment_review_rubric(%L,%L,%L,%L,2,%L,%L,%L)',reviewer,a,r,'scored','{"meaning":2}','After withdrawal',gen_random_uuid()),'Verified spoken evidence');
 update public.assessment_media_policies set cleanup_enabled=true where version='assessment-speech-pending-v1';
 if (select count(*) from public.assessment_claim_speech_cleanup())<>2 then raise exception 'Withdrawn recording not selected for cleanup'; end if;
 perform public.assessment_finish_speech_cleanup(m);
 perform public.assessment_finish_speech_cleanup(prior_m);
 if exists(select 1 from public.assessment_claim_speech_cleanup()) then raise exception 'Deleted recording selected again'; end if;
 perform pg_temp.expect_error($q$update public.assessment_media_policies set retention_days=1 where version='assessment-speech-pending-v1'$q$,'policy is immutable');
 -- Historical fixture tests actual retention/dispute cutoffs, not just withdrawal.
 insert into public.assessment_attempts(checkpoint_id,attempt_number,form_id,form_snapshot,status,start_request_id,submitted_at,started_at)
 select checkpoint_id,2,form_id,form_snapshot,'completed',gen_random_uuid(),now()-interval '40 days',now()-interval '41 days' from public.assessment_attempts where id=a returning id into a;
 insert into public.assessment_speech_evidence(attempt_id,enrollment_id,learner_id,item_id,policy_version,request_id,expected_revision,attached_revision,sha256,bytes,mime,duration_ms,state,ready_at)
 values(a,e,learner,'spoken1','assessment-speech-pending-v1',gen_random_uuid(),0,1,repeat('c',64),64,'audio/webm',1000,'ready',now()-interval '2 days') returning id into m;
 if exists(select 1 from public.assessment_claim_speech_cleanup()) then raise exception 'Recent recording expired prematurely'; end if;
 update public.assessment_speech_evidence set ready_at=now()-interval '40 days' where id=m;
 insert into public.assessment_review_requests(attempt_id,requested_by,reason,consent_version,request_id) values(a,learner,'Fictional unresolved dispute','fixture',gen_random_uuid()) returning id into r;
 if exists(select 1 from public.assessment_claim_speech_cleanup()) then raise exception 'Unresolved dispute evidence deleted'; end if;
 update public.assessment_review_requests set status='resolved',reviewer_id=reviewer,resolved_at=now() where id=r;
 if exists(select 1 from public.assessment_claim_speech_cleanup()) then raise exception 'Resolved dispute did not restart retention clock'; end if;
 update public.assessment_review_requests set resolved_at=now()-interval '40 days' where id=r;
 if (select count(*) from public.assessment_claim_speech_cleanup())<>1 then raise exception 'Expired final evidence not selected'; end if;
 perform public.assessment_finish_speech_cleanup(m);
end $$;
reset role;
select 'PASS: speech consent/policy gate, exact learner/item binding, retries/conflicts, independent listening attestation, withdrawal, disabled/approved cleanup and restrictive storage' as result;
