\set ON_ERROR_STOP on
begin;
-- Isolated local integration fixture, rolled back in full. Never run against a hosted project.
create schema auth;
create table auth.users(id uuid primary key);
create table public.team_organizations(id uuid primary key);
create table public.team_members(organization_id uuid,user_id uuid,role text,status text);
create table public.team_assignments(organization_id uuid,user_id uuid,module_id text);
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
\ir ../../supabase/migrations/20261016071011_assessment_engine.sql
\ir ../../supabase/migrations/20261016071015_assessment_scoring.sql
\ir ../../supabase/migrations/20261016071020_assessment_integrity.sql
create function pg_temp.expect_error(sql_text text,expected text) returns void language plpgsql as $$
begin
 begin execute sql_text;
 exception when others then
  if sqlerrm not like '%'||expected||'%' then raise exception 'Expected %, received %',expected,sqlerrm; end if;
  return;
 end;
 raise exception 'Expected error % but command succeeded',expected;
end $$;
insert into auth.users values
 ('10000000-0000-4000-8000-000000000001'), -- learner
 ('10000000-0000-4000-8000-000000000002'), -- their admin
 ('10000000-0000-4000-8000-000000000003'); -- unrelated learner/admin
insert into public.team_organizations values('20000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002');
insert into public.team_members values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','learner','active'),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','admin','active'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','admin','active');
insert into public.team_assignments values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','roofing');
insert into public.assessment_releases(id,module_id,target_language,instruction_language,content_version) values('roofing-es-en-test','roofing','Spanish','English','test-only');
insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,definition) values
 ('test-entrance','roofing-es-en-test','entrance','test','test','{"items":[{"id":"item1","type":"recall","skill":"recall","objectiveId":"roofing.lesson.1","maximum":1},{"id":"item2","type":"production","skill":"writing","objectiveId":"roofing.lesson.2","maximum":3},{"id":"item3","type":"production","skill":"writing","objectiveId":"roofing.lesson.3","maximum":6}]}');

do $$ declare personal uuid; team uuid; cp uuid; attempt uuid; repeat_id uuid; new_revision integer; r1 uuid; r2 uuid; r3 uuid; score_id uuid; review_id uuid; begin
 personal:=public.assessment_create_enrollment('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',null,'roofing-es-en-test','2026-10-15','America/Denver','30000000-0000-4000-8000-000000000001');
 repeat_id:=public.assessment_create_enrollment('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',null,'roofing-es-en-test','2026-10-15','America/Denver','30000000-0000-4000-8000-000000000001');
 if personal<>repeat_id then raise exception 'Enrollment retry duplicated'; end if;
 team:=public.assessment_create_enrollment('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','roofing-es-en-test','2026-10-15','America/Denver','30000000-0000-4000-8000-000000000002');
 if assessment_private.can_read('10000000-0000-4000-8000-000000000002',personal) then raise exception 'Personal enrollment leaked to team admin'; end if;
 if not assessment_private.can_read('10000000-0000-4000-8000-000000000002',team) then raise exception 'Own admin cannot read team enrollment'; end if;
 if assessment_private.can_read('10000000-0000-4000-8000-000000000003',team) then raise exception 'Other team can read enrollment'; end if;
 if (select count(*) from public.assessment_checkpoints where enrollment_id=personal)<>3 then raise exception 'Missing checkpoints'; end if;
 if not exists(select 1 from public.assessment_checkpoints where enrollment_id=personal and checkpoint='day45' and due_date='2026-11-28' and due_at='2026-11-28T19:00:00Z') then raise exception 'DST calendar schedule wrong'; end if;
 select id into cp from public.assessment_checkpoints where enrollment_id=personal and checkpoint='entrance';
 perform pg_temp.expect_error(format('select public.assessment_start_attempt(%L,%L,%L,%L)', '10000000-0000-4000-8000-000000000001',cp,'test-entrance','30000000-0000-4000-8000-000000000003'),'content review is pending');
 perform pg_temp.expect_error(format('select public.assessment_start_attempt(%L,%L,%L,%L,null)', '10000000-0000-4000-8000-000000000001',cp,'test-entrance','30000000-0000-4000-8000-000000000003'),'content review is pending');
 attempt:=public.assessment_start_attempt('10000000-0000-4000-8000-000000000001',cp,'test-entrance','30000000-0000-4000-8000-000000000003',true);
 repeat_id:=public.assessment_start_attempt('10000000-0000-4000-8000-000000000001',cp,'test-entrance','30000000-0000-4000-8000-000000000004',true);
 if attempt<>repeat_id then raise exception 'Multiple open attempts'; end if;
 update public.assessment_forms set definition='{"items":[{"id":"changed"}]}' where id='test-entrance';
 if (select form_snapshot->'definition'->'items'->0->>'id' from public.assessment_attempts where id=attempt)<>'item1' then raise exception 'Frozen form changed'; end if;
 new_revision:=public.assessment_save_responses('10000000-0000-4000-8000-000000000001',attempt,0,'[{"itemId":"item1","answer":{"text":"teja","inputMethod":"typed"}},{"itemId":"item3","answer":{"text":"Necesito una teja.","inputMethod":"typed"}}]','30000000-0000-4000-8000-000000000005');
 if new_revision<>1 then raise exception 'Draft revision missing'; end if;
 new_revision:=public.assessment_save_responses('10000000-0000-4000-8000-000000000001',attempt,0,'[{"itemId":"item1","answer":{"text":"teja","inputMethod":"typed"}},{"itemId":"item3","answer":{"text":"Necesito una teja.","inputMethod":"typed"}}]','30000000-0000-4000-8000-000000000005');
 if new_revision<>1 then raise exception 'Save retry mutated attempt'; end if;
 perform pg_temp.expect_error(format('select public.assessment_save_responses(%L,%L,0,%L,%L)','10000000-0000-4000-8000-000000000001',attempt,'[{"itemId":"item1","answer":{"text":"changed"}}]','30000000-0000-4000-8000-000000000005'),'Request key reused');
 perform pg_temp.expect_error(format('select public.assessment_save_responses(%L,%L,0,%L,%L)','10000000-0000-4000-8000-000000000001',attempt,'[]','30000000-0000-4000-8000-000000000006'),'revision conflict');
 perform pg_temp.expect_error(format('select public.assessment_save_responses(%L,%L,null,%L,%L)','10000000-0000-4000-8000-000000000001',attempt,'[]','30000000-0000-4000-8000-000000000006'),'revision conflict');
 perform pg_temp.expect_error(format('select public.assessment_save_responses(%L,%L,1,%L,%L)','10000000-0000-4000-8000-000000000003',attempt,'[]','30000000-0000-4000-8000-000000000006'),'access required');
 perform pg_temp.expect_error(format('select public.assessment_save_responses(%L,%L,1,%L,%L)','10000000-0000-4000-8000-000000000001',attempt,'[{"itemId":"changed","answer":{}}]','30000000-0000-4000-8000-000000000006'),'not in frozen form');
 perform public.assessment_submit_attempt('10000000-0000-4000-8000-000000000001',attempt,1,'30000000-0000-4000-8000-000000000007');
 perform public.assessment_submit_attempt('10000000-0000-4000-8000-000000000001',attempt,1,'30000000-0000-4000-8000-000000000007');
 if (select count(*) from public.assessment_responses where attempt_id=attempt)<>3 then raise exception 'Missing evidence not preserved'; end if;
 if not exists(select 1 from public.assessment_responses where attempt_id=attempt and item_id='item2' and answer->>'missingReason'='No response submitted') then raise exception 'Invented missing response'; end if;
 perform pg_temp.expect_error(format('select public.assessment_save_responses(%L,%L,1,%L,%L)','10000000-0000-4000-8000-000000000001',attempt,'[]','30000000-0000-4000-8000-000000000008'),'immutable');
 if (select count(*) from public.assessment_events where enrollment_id=personal and action='attempt.submitted')<>1 then raise exception 'Submit retry duplicated'; end if;
 if not exists(select 1 from public.assessment_attempts where id=attempt and designated) then raise exception 'Baseline not designated'; end if;
 -- The learner controls personal dates, but joining a team does not grant its admin private control.
 perform pg_temp.expect_error(format('select public.assessment_change_schedule(%L,%L,0,%L,null,null,%L,%L)','10000000-0000-4000-8000-000000000002',personal,'pause','test reason','30000000-0000-4000-8000-000000000010'),'access required');
 perform pg_temp.expect_error(format('select public.assessment_change_schedule(%L,%L,0,%L,null,null,%L,%L)','10000000-0000-4000-8000-000000000001',team,'pause','test reason','30000000-0000-4000-8000-000000000010'),'access required');
 perform pg_temp.expect_error(format('select public.assessment_change_schedule(%L,%L,0,%L,%L,%L,%L,%L)','10000000-0000-4000-8000-000000000001',personal,'reschedule',cp,'2026-10-20','test reason','30000000-0000-4000-8000-000000000010'),'Historical checkpoint');
 select id into cp from public.assessment_checkpoints where enrollment_id=personal and checkpoint='day45';
 new_revision:=public.assessment_change_schedule('10000000-0000-4000-8000-000000000001',personal,0,'reschedule',cp,'2026-11-30','Travel on original date','30000000-0000-4000-8000-000000000010');
 if new_revision<>1 then raise exception 'Schedule revision missing'; end if;
 new_revision:=public.assessment_change_schedule('10000000-0000-4000-8000-000000000001',personal,0,'reschedule',cp,'2026-11-30','Travel on original date','30000000-0000-4000-8000-000000000010');
 if new_revision<>1 then raise exception 'Schedule retry duplicated'; end if;
 perform public.assessment_change_schedule('10000000-0000-4000-8000-000000000001',personal,1,'pause',null,null,'Testing plan pause','30000000-0000-4000-8000-000000000011');
 update public.assessment_enrollments set paused_on=paused_on-3 where id=personal;
 perform public.assessment_change_schedule('10000000-0000-4000-8000-000000000001',personal,2,'resume',null,null,'Testing plan resume','30000000-0000-4000-8000-000000000012');
 if not exists(select 1 from public.assessment_checkpoints where id=cp and due_date='2026-12-03' and due_at='2026-12-03T19:00:00Z') then raise exception 'Paused calendar days not applied'; end if;
 if not exists(select 1 from public.assessment_checkpoints where enrollment_id=personal and checkpoint='entrance' and due_date='2026-10-15') then raise exception 'Historical schedule moved'; end if;
 if (select count(*) from public.assessment_events where enrollment_id=personal and action='schedule.changed')<>3 then raise exception 'Schedule history lost or duplicated'; end if;
 perform public.assessment_change_schedule('10000000-0000-4000-8000-000000000001',personal,3,'exempt',cp,null,'Checkpoint exemption test','30000000-0000-4000-8000-000000000013');
 if not exists(select 1 from public.assessment_checkpoints where id=cp and status='exempt') then raise exception 'Exemption not recorded'; end if;
 perform public.assessment_change_schedule('10000000-0000-4000-8000-000000000001',personal,4,'restore',cp,null,'Checkpoint restored','30000000-0000-4000-8000-000000000014');
 if not exists(select 1 from public.assessment_checkpoints where id=cp and status='scheduled') then raise exception 'Checkpoint not restored'; end if;
 select id into r1 from public.assessment_responses where attempt_id=attempt and item_id='item1';
 select id into r2 from public.assessment_responses where attempt_id=attempt and item_id='item2';
 select id into r3 from public.assessment_responses where attempt_id=attempt and item_id='item3';
 if not public.assessment_claim_grading('10000000-0000-4000-8000-000000000001',r3,'40000000-0000-4000-8000-000000000001') then raise exception 'First provider claim denied'; end if;
 if public.assessment_claim_grading('10000000-0000-4000-8000-000000000001',r3,'40000000-0000-4000-8000-000000000002') then raise exception 'Provider retry could duplicate billing'; end if;
 perform pg_temp.expect_error(format('select public.assessment_finish_grading(%L,%L,%L,true,null)','10000000-0000-4000-8000-000000000001',r3,'40000000-0000-4000-8000-000000000002'),'lease mismatch');
 perform public.assessment_finish_grading('10000000-0000-4000-8000-000000000001',r3,'40000000-0000-4000-8000-000000000001',false,'timeout_unknown_outcome');
 if public.assessment_claim_grading('10000000-0000-4000-8000-000000000001',r3,'40000000-0000-4000-8000-000000000003') then raise exception 'Unknown provider outcome automatically retried'; end if;
 if public.assessment_claim_grading('10000000-0000-4000-8000-000000000001',r1,'40000000-0000-4000-8000-000000000003') then raise exception 'Fixed response should not call AI'; end if;

 score_id:=public.assessment_record_score('10000000-0000-4000-8000-000000000001',r1,'scored',1,'deterministic','Accepted answer',null,null,'30000000-0000-4000-8000-000000000020');
 if public.assessment_record_score('10000000-0000-4000-8000-000000000001',r1,'scored',1,'deterministic','Accepted answer',null,null,'30000000-0000-4000-8000-000000000020')<>score_id then raise exception 'Scoring retry duplicated'; end if;
 perform public.assessment_record_score('10000000-0000-4000-8000-000000000001',r2,'not_assessed',null,'deterministic','No response submitted',null,null,'30000000-0000-4000-8000-000000000021');
 perform public.assessment_record_score('10000000-0000-4000-8000-000000000001',r3,'needs_review',4,'ai_proposal','Proposed rubric result',0.9,'test-only-model','30000000-0000-4000-8000-000000000022');
 if not exists(select 1 from public.assessment_attempts where id=attempt and status='needs_review') then raise exception 'AI proposal became final'; end if;
 perform pg_temp.expect_error(format('select public.assessment_record_score(%L,%L,%L,4,%L,%L,0.9,null,%L)','10000000-0000-4000-8000-000000000001',r3,'scored','ai_proposal','Invalid automatic final','30000000-0000-4000-8000-000000000023'),'AI proposals require review');
 perform pg_temp.expect_error(format('select public.assessment_record_score(%L,%L,%L,4,%L,%L,null,null,%L)','10000000-0000-4000-8000-000000000003',r3,'scored','deterministic','Unauthorized score','30000000-0000-4000-8000-000000000023'),'access required');
 perform pg_temp.expect_error(format('select public.assessment_record_score(%L,%L,%L,4,%L,%L,null,null,%L)','10000000-0000-4000-8000-000000000002',r3,'scored','human','No personal sharing yet','30000000-0000-4000-8000-000000000023'),'review access required');
 review_id:=public.assessment_request_review('10000000-0000-4000-8000-000000000001',attempt,'Please review the response','assessment-review-v1','30000000-0000-4000-8000-000000000024');
 insert into public.assessment_reviewers(user_id,module_id,target_language,instruction_language,created_by) values('10000000-0000-4000-8000-000000000002','roofing','Spanish','English','10000000-0000-4000-8000-000000000002');
 perform pg_temp.expect_error(format('select public.assessment_claim_review(%L,%L)','10000000-0000-4000-8000-000000000003',review_id),'reviewer access required');
 perform public.assessment_claim_review('10000000-0000-4000-8000-000000000002',review_id);
 perform public.assessment_record_score('10000000-0000-4000-8000-000000000002',r3,'scored',5,'human','Reviewed communication against frozen rubric',null,null,'30000000-0000-4000-8000-000000000025');
 if (select count(*) from public.assessment_score_events where response_id=r3)<>2 then raise exception 'Original AI proposal not retained'; end if;
 perform pg_temp.expect_error(format('select public.assessment_record_score(%L,%L,%L,0,%L,%L,null,null,%L)','10000000-0000-4000-8000-000000000002',r2,'scored','human','Cannot invent missing evidence','30000000-0000-4000-8000-000000000026'),'Missing evidence cannot be scored');
 perform public.assessment_resolve_review('10000000-0000-4000-8000-000000000002',review_id,'Rubric reviewed; missing task remains not assessed','30000000-0000-4000-8000-000000000027');
 perform public.assessment_resolve_review('10000000-0000-4000-8000-000000000002',review_id,'Rubric reviewed; missing task remains not assessed','30000000-0000-4000-8000-000000000027');
 if not exists(select 1 from public.assessment_attempts where id=attempt and status='completed') then raise exception 'Reviewed result not completed'; end if;
 insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,definition) select 'test-midpoint','roofing-es-en-test','day45','test','test',form_snapshot->'definition' from public.assessment_attempts where id=attempt;
 select id into cp from public.assessment_checkpoints where enrollment_id=personal and checkpoint='day45';
 repeat_id:=public.assessment_start_attempt('10000000-0000-4000-8000-000000000001',cp,'test-midpoint','30000000-0000-4000-8000-000000000030',true,array['roofing.lesson.1']);
 if (select form_snapshot->'definition'->'items'->0->>'coverage' from public.assessment_attempts where id=repeat_id)<>'studied' then raise exception 'Actual reported study scope not frozen'; end if;
 if (select form_snapshot->'definition'->'items'->1->>'coverage' from public.assessment_attempts where id=repeat_id)<>'transfer' then raise exception 'Unstudied question mislabeled studied'; end if;

 perform pg_temp.expect_error(format('update public.assessment_attempts set form_snapshot=%L where id=%L','{}',attempt),'Frozen assessment identity');
 perform pg_temp.expect_error(format('update public.assessment_responses set answer=%L where id=%L','{}',r1),'immutable');
 perform pg_temp.expect_error(format('update public.assessment_score_events set points=0 where id=%L',score_id),'append-only');



end $$;
-- Even authenticated clients cannot call pilot RPCs or read keys directly.
set local role authenticated;
select pg_temp.expect_error('select * from public.assessment_forms','permission denied');
select pg_temp.expect_error('select public.assessment_start_attempt(null,null,null,null,true)','permission denied');
reset role;
select 'PASS: enrollment privacy, checkpoint dates, frozen forms, autosave conflicts, retries, submission, schedule history, scoring proposals, explicit review sharing and direct-client denial' as result;
rollback;
