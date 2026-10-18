-- Fictional verified fixtures ONLY in the named local transaction; no hosted content approval.
reset role;
insert into public.assessment_releases(id,module_id,target_language,instruction_language,content_version,status,review_records,verified_at)
 values('insight-fixture','roofing','Spanish','English','fictional-local-only','verified','[{},{},{}]',now());
insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,status,calibrated,review_records,definition)
 values('insight-fixture-form','insight-fixture','entrance','fixture-v1','fixture-r1','verified',true,'[{},{},{}]','{"items":[{"id":"fixture-item","skill":"recall","objectiveId":"roofing.lesson.1","maximum":1}]}');
create temporary table insight_fixture_users(id uuid primary key);
insert into insight_fixture_users select gen_random_uuid() from generate_series(1,1001);
insert into auth.users select id from insight_fixture_users;
insert into public.team_members select '20000000-0000-4000-8000-000000000001',id,'learner','active' from insight_fixture_users order by id limit 5;
insert into public.assessment_enrollments(user_id,scope,organization_id,release_id,module_id,target_language,instruction_language,start_date,timezone,created_by,request_id)
 select user_id,'team',organization_id,'insight-fixture','roofing','Spanish','English',current_date,'UTC','10000000-0000-4000-8000-000000000002',gen_random_uuid() from public.team_members where user_id in(select id from insight_fixture_users);
insert into public.assessment_checkpoints(enrollment_id,checkpoint,due_date,due_at) select id,'entrance',current_date,now() from public.assessment_enrollments where release_id='insight-fixture';
-- One ordinary submitted form; a QA-pilot attempt must be excluded even if calibrated.
insert into public.assessment_attempts(checkpoint_id,attempt_number,form_id,form_snapshot,status,start_request_id,submitted_at,designated)
 select id,1,'insight-fixture-form',jsonb_build_object('calibrated',true,'pilot',false,'version','fixture-v1','rubricVersion','fixture-r1','definition','{"items":[{"id":"fixture-item","skill":"recall","objectiveId":"roofing.lesson.1","maximum":1}]}'::jsonb),'in_progress',gen_random_uuid(),null,true from public.assessment_checkpoints where enrollment_id in(select id from public.assessment_enrollments where release_id='insight-fixture') order by id limit 1;
insert into public.assessment_responses(attempt_id,item_id,answer)
 select id,'fixture-item','{"text":"private fixture response must not leave the server"}' from public.assessment_attempts where form_id='insight-fixture-form';
insert into public.assessment_score_events(response_id,revision,state,skill,objective_id,points,maximum,source,rubric_version,request_id)
 select id,1,'scored','recall','roofing.lesson.1',0,1,'deterministic','fixture-r1',gen_random_uuid() from public.assessment_responses where item_id='fixture-item';
insert into public.assessment_score_events(response_id,revision,state,skill,objective_id,points,maximum,source,rubric_version,request_id)
 select id,2,'scored','recall','roofing.lesson.1',1,1,'deterministic','fixture-r1',gen_random_uuid() from public.assessment_responses where item_id='fixture-item';
update public.assessment_attempts set status='completed',submitted_at=now() where form_id='insight-fixture-form';
insert into public.assessment_attempts(checkpoint_id,attempt_number,form_id,form_snapshot,status,start_request_id,submitted_at,designated)
 select id,1,'insight-fixture-form','{"calibrated":true,"pilot":true,"version":"fixture-v1","rubricVersion":"fixture-r1"}','completed',gen_random_uuid(),now(),true from public.assessment_checkpoints where enrollment_id in(select id from public.assessment_enrollments where release_id='insight-fixture') and id not in(select checkpoint_id from public.assessment_attempts) order by id limit 1;
set local role service_role;
do $$ declare result jsonb; begin
 result:=public.assessment_team_insight_evidence('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','insight-fixture-form');
 if result->>'status'<>'available' or jsonb_array_length(result->'learners')<>5 then raise exception 'Insight cohort lost current enrolled members'; end if;
 if (select count(*) from jsonb_array_elements(result->'learners') r where r->>'attemptState'='completed')<>1 then raise exception 'Pilot evidence entered the official insight cohort'; end if;
 if result::text like '%"answer"%' or result::text like '%"form_snapshot"%' or result::text like '%private fixture response%' then raise exception 'Insight RPC exposed answers, form or prompts'; end if;
 if not exists(select 1 from jsonb_array_elements(result->'learners') learner cross join lateral jsonb_array_elements(learner->'evidence') item where item->>'itemId'='fixture-item' and (item->>'points')::numeric=1) then raise exception 'Insight evidence failed to select the latest corrected rating'; end if;
 perform pg_temp.expect_error('select public.assessment_team_insight_evidence(''10000000-0000-4000-8000-000000000003'',''20000000-0000-4000-8000-000000000001'',''insight-fixture-form'')','admin access required');
 perform pg_temp.expect_error('select public.assessment_team_insight_evidence(''10000000-0000-4000-8000-000000000001'',''20000000-0000-4000-8000-000000000001'',''test-entrance'')','Reviewed calibrated insight form required');
 if has_function_privilege('anon','public.assessment_team_insight_evidence(uuid,uuid,text)','EXECUTE') or has_function_privilege('authenticated','public.assessment_team_insight_evidence(uuid,uuid,text)','EXECUTE') then raise exception 'Insight RPC became directly client callable'; end if;
end $$;
reset role;
-- Membership departure changes the cohort; four users must not reveal a count or evidence.
update public.team_members set status='inactive' where user_id=(select id from insight_fixture_users order by id limit 1);
set local role service_role;
do $$ declare result jsonb; begin
 result:=public.assessment_team_insight_evidence('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','insight-fixture-form');
 if result<>jsonb_build_object('status','small_group','learners','[]'::jsonb) then raise exception 'Small cohort leaked records or count'; end if;
end $$;
reset role;
update public.team_members set status='active' where user_id in(select id from insight_fixture_users);
insert into public.team_members select '20000000-0000-4000-8000-000000000001',id,'learner','active' from insight_fixture_users where id not in(select user_id from public.team_members);
insert into public.assessment_enrollments(user_id,scope,organization_id,release_id,module_id,target_language,instruction_language,start_date,timezone,created_by,request_id)
 select id,'team','20000000-0000-4000-8000-000000000001','insight-fixture','roofing','Spanish','English',current_date,'UTC','10000000-0000-4000-8000-000000000002',gen_random_uuid() from insight_fixture_users where id not in(select user_id from public.assessment_enrollments where release_id='insight-fixture');
insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,status,calibrated,review_records,definition)
 select 'insight-large-fixture','insight-fixture','entrance','fixture-v2','fixture-r1','verified',true,'[{},{},{}]',jsonb_build_object('items',jsonb_agg(jsonb_build_object('id','extra-'||n,'objectiveId','roofing.lesson.1','skill','recall','maximum',1))) from generate_series(1,1000) n;
update public.team_members set status='inactive' where user_id in(select id from insight_fixture_users) and user_id not in(select id from insight_fixture_users order by id limit 51);
set local role service_role;
do $$ declare result jsonb; begin
 result:=public.assessment_team_insight_evidence('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','insight-large-fixture');
 if result<>jsonb_build_object('status','too_large','learners','[]'::jsonb) then raise exception 'Expected response-slot resource bound was bypassed'; end if;
end $$;
reset role;
update public.team_members set status='active' where user_id in(select id from insight_fixture_users);
set local role service_role;
do $$ declare result jsonb; begin
 result:=public.assessment_team_insight_evidence('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','insight-fixture-form');
 if result<>jsonb_build_object('status','too_large','learners','[]'::jsonb) then raise exception 'Large cohort returned a misleading partial report'; end if;
end $$;
reset role;
-- Remove local fixtures before subsequent role/member-count tests; outer transaction still rolls back.
delete from public.assessment_attempts where form_id='insight-fixture-form';
delete from public.assessment_enrollments where release_id='insight-fixture';
delete from public.team_members where user_id in(select id from insight_fixture_users);
delete from auth.users where id in(select id from insight_fixture_users);
delete from public.assessment_forms where id in ('insight-fixture-form','insight-large-fixture');
delete from public.assessment_releases where id='insight-fixture';
set local role service_role;
