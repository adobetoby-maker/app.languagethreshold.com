-- Fictional local-only verified metadata. Never publish this fixture or its cutoffs.
do $$ declare manifest jsonb; material text; fingerprint text;
begin
 select jsonb_build_object('lessonCount',30,'lessonIds',jsonb_agg('route-fixture.lesson.'||n),'reviewed',false) into manifest from generate_series(1,30) n;
 update public.assessment_releases set lesson_manifest=manifest where id='route-test-release';
 select jsonb_build_object('schema',1,'status','current-app-draft','requiredLessons',30,'moduleId','route-fixture','targetLanguage','Spanish','instructionLanguage','English',
  'lessons',jsonb_agg(jsonb_build_object('lessonNumber',n,'objectiveId','route-fixture.lesson.'||n)))::text into material from generate_series(1,30) n;
 fingerprint:=encode(sha256(convert_to(material,'UTF8')),'hex');
 perform public.assessment_bind_lesson_snapshot('10000000-0000-4000-8000-000000000003','route-test-release',material,fingerprint,manifest,'fixture-only',gen_random_uuid());
 update public.assessment_releases set status='verified',verified_at=now(),review_records='[{"localFixture":1},{"localFixture":2},{"localFixture":3}]' where id='route-test-release';
end $$;
do $$ declare d jsonb; items jsonb;
begin
 d:=pg_temp.route_definition();
 select jsonb_agg(item || jsonb_build_object('prompt','Synthetic local runtime question','coverage','module',
  'options','[{"id":"yes","text":"QA yes"},{"id":"no","text":"QA no"},{"id":"other","text":"QA other"}]'::jsonb,
  'rubric',jsonb_build_object('id','local-task','dimensions','[{"id":"task","label":"Task","description":"Local fixture only","maximum":1}]'::jsonb)) ||
  case when item->>'skill'='listening' then jsonb_build_object('audioRequired',true,'audioText','Synthetic local clip',
  'audioAsset',jsonb_build_object('sha256',repeat('a',64),'bytes',32,'mime','audio/wav')) else '{}'::jsonb end order by ord)
 into items from jsonb_array_elements(d->'items') with ordinality i(item,ord);
 d:=d || jsonb_build_object('id','runtime-fixture-form','status','verified','targetLanguage','Spanish','instructionLanguage','English','estimatedMinutes',20,'version','runtime-v1','rubricVersion','runtime-r1','items',items);
 insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,status,calibrated,review_records,definition)
 values('runtime-fixture-form','route-test-release','entrance','runtime-v1','runtime-r1','verified',true,'[{"localFixture":1},{"localFixture":2},{"localFixture":3}]',d);
end $$;
insert into auth.users values('60000000-0000-4000-8000-000000000001');
set local role service_role;
do $$ declare learner uuid:='60000000-0000-4000-8000-000000000001'; e uuid; cp uuid; a uuid; again uuid; request uuid:=gen_random_uuid();
 d jsonb; core jsonb; decision jsonb; updates jsonb; frozen jsonb; result jsonb;
begin
 e:=public.assessment_create_enrollment(learner,learner,null,'route-test-release','2026-10-16','America/Denver',gen_random_uuid());
 select id into cp from public.assessment_checkpoints where enrollment_id=e and checkpoint='entrance';
 a:=public.assessment_start_attempt(learner,cp,'runtime-fixture-form',request,false);
 again:=public.assessment_start_attempt(learner,cp,'runtime-fixture-form',request,false);
 if a is distinct from again then raise exception 'Start retry created another adaptive attempt'; end if;
 again:=public.assessment_start_attempt(learner,cp,'runtime-fixture-form',gen_random_uuid(),false);
 if a is distinct from again then raise exception 'New start key did not resume authoritative open attempt'; end if;
 select form_snapshot into frozen from public.assessment_attempts where id=a;
 select definition into d from public.assessment_forms where id='runtime-fixture-form';
 if frozen->'definition' is distinct from d or frozen->>'version' is distinct from 'runtime-v1' or frozen->>'rubricVersion' is distinct from 'runtime-r1'
  or frozen->'pilot' is distinct from 'false'::jsonb or frozen->'calibrated' is distinct from 'true'::jsonb then raise exception 'Official adaptive start lost frozen metadata'; end if;
 perform pg_temp.expect_error(format('select public.assessment_submit_attempt(%L,%L,0,%L)',learner,a,gen_random_uuid()),'Select a route');
 select jsonb_agg(jsonb_build_object('itemId',i->>'id','answer',case when i->>'skill' in ('writing','speaking') then '{"inputMethod":"unavailable","missingReason":"Local unavailable input"}'::jsonb else '{"inputMethod":"choice","choiceId":"yes"}'::jsonb end))
 into updates from jsonb_array_elements(d->'items') i where d->'routing'->'coreItemIds' ? (i->>'id');
 perform public.assessment_save_responses(learner,a,0,updates,gen_random_uuid());
 core:=pg_temp.route_core(a); decision:=pg_temp.route_decision(a,1)||jsonb_build_object('formId','runtime-fixture-form','formVersion','runtime-v1','rubricVersion','runtime-r1');
 result:=public.assessment_select_route(learner,a,1,gen_random_uuid(),d,core,decision);
 if result->'decision' is distinct from decision then raise exception 'Selected route changed'; end if;
 perform public.assessment_submit_attempt(learner,a,2,gen_random_uuid());
 if (select count(*) from public.assessment_responses where attempt_id=a)<>19 then raise exception 'Submission did not retain exactly core plus selected branch'; end if;
 if exists(select 1 from public.assessment_responses where attempt_id=a and item_id in ('low','diagnostic')) then raise exception 'Submission invented unused branch rows'; end if;
 if (select answer->>'inputMethod' from public.assessment_responses where attempt_id=a and item_id='high')<>'unavailable' then raise exception 'Missing selected input was not explicitly unavailable'; end if;
 perform public.assessment_submit_attempt(learner,a,2,gen_random_uuid());
 if (select count(*) from public.assessment_events where action='attempt.started' and detail->>'attemptId'=a::text)<>1
  or (select count(*) from public.assessment_events where action='attempt.submitted' and detail->>'attemptId'=a::text)<>1 then raise exception 'Start/submission retry duplicated events'; end if;
end $$;
reset role;
select 'PASS: local official adaptive start, frozen routing/calibration, start replay/resume, required route, selected-only missing input and idempotent submission' as result;
