-- Additional LOCAL-ONLY fixture inside assessment-engine.sql's rollback transaction.
-- These fictional modules/reviews never enter the hosted database or real catalog.
do $$
declare module text; kind text; items jsonb; checks jsonb; manifest jsonb; work_en uuid; work_cp uuid; work_attempt uuid; rec uuid; rec2 uuid; assignment uuid; child uuid; cp uuid; short_attempt uuid; revision integer; response record; result jsonb; plan_id uuid;
begin
 for module in select unnest(array['work-fixture','support-fixture']) loop
  select jsonb_build_object('lessonCount',30,'reviewed',true,'offlineVerified',true,'lessonIds',jsonb_agg(module||'.lesson.'||n order by n)) into manifest from generate_series(1,30) n;
  insert into public.assessment_releases(id,module_id,target_language,instruction_language,content_version,status,lesson_manifest,review_records,verified_at)
   values(module,module,'Spanish','English','test-only','verified',manifest,'[{"test":true},{"test":true},{"test":true}]',now());
  select jsonb_build_object('items',jsonb_agg(jsonb_build_object('id',module||'-'||skill||'-'||n,'objectiveId',module||'.lesson.'||n,'skill',skill,'type',case when skill in ('writing','speaking') then 'production' else 'recall' end,'coverage','module','maximum',1) order by skill,n)) into items
   from unnest(array['recognition','recall','listening','reading','writing','speaking']) skill cross join generate_series(1,3) n;
  for kind in select unnest(array['entrance','day45','day90']) loop
   insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,status,definition,calibrated,equivalence_group,equivalence_approved,review_records)
    values(module||'-'||kind,module,kind,'test-only','test-only','verified',items,true,'test-only-equivalence',true,'[{"test":true},{"test":true},{"test":true}]');
  end loop;
 end loop;
 work_en:=public.assessment_create_enrollment('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',null,'work-fixture',current_date,'America/Denver','90000000-0000-4000-8000-000000000001');
 select id into work_cp from public.assessment_checkpoints where enrollment_id=work_en and checkpoint='entrance';
 work_attempt:=public.assessment_start_attempt('10000000-0000-4000-8000-000000000001',work_cp,'work-fixture-entrance','90000000-0000-4000-8000-000000000002');
 select jsonb_agg(jsonb_build_object('itemId','work-fixture-recall-'||n,'answer',jsonb_build_object('inputMethod','typed','text','synthetic response'))) into checks from generate_series(1,3) n;
 revision:=public.assessment_save_responses('10000000-0000-4000-8000-000000000001',work_attempt,0,checks,'90000000-0000-4000-8000-000000000003');
 perform public.assessment_submit_attempt('10000000-0000-4000-8000-000000000001',work_attempt,revision,'90000000-0000-4000-8000-000000000004');
 for response in select * from public.assessment_responses where attempt_id=work_attempt loop
  perform public.assessment_record_score('10000000-0000-4000-8000-000000000001',response.id,
   case when response.item_id like '%-recall-%' then 'scored' else 'not_assessed' end,
   case when response.item_id like '%-recall-%' then 0 else null end,'deterministic','Synthetic fixture evidence',null,null,gen_random_uuid());
 end loop;
 perform pg_temp.expect_error(format('select public.assessment_revise_plan(%L,%L,%L,2,array[%L],array[]::text[],%L,%L)','10000000-0000-4000-8000-000000000001',work_en,work_attempt,'recall','Missing catch-up test','91000000-0000-4000-8000-000000000001'),'targeted catch-up');
 perform pg_temp.expect_error(format('select public.assessment_revise_plan(%L,%L,%L,2,array[%L],array[%L],%L,%L)','10000000-0000-4000-8000-000000000001',work_en,work_attempt,'say','work-fixture.lesson.1','Missing speech is not a weakness','91000000-0000-4000-8000-000000000002'),'missing inputs are not a weakness');
 plan_id:=public.assessment_revise_plan('10000000-0000-4000-8000-000000000001',work_en,work_attempt,2,array['recall'],array['work-fixture.lesson.1'],'Synthetic reviewed recall focus retains prior catch-up','91000000-0000-4000-8000-000000000003');
 if plan_id<>public.assessment_revise_plan('10000000-0000-4000-8000-000000000001',work_en,work_attempt,2,array['recall'],array['work-fixture.lesson.1'],'Synthetic reviewed recall focus retains prior catch-up','91000000-0000-4000-8000-000000000003') then raise exception 'Plan retry duplicated'; end if;
 perform public.assessment_revise_plan('10000000-0000-4000-8000-000000000001',work_en,work_attempt,1,array['recall'],array[]::text[],'Synthetic revised entry keeps the original plan history','91000000-0000-4000-8000-000000000004',2);
 if not exists(select 1 from public.assessment_plan_revisions pr where pr.enrollment_id=work_en and pr.revision=2 and pr.review_every_days=2) then raise exception 'Approved review interval missing'; end if;
 if (select count(*) from public.assessment_plan_revisions where enrollment_id=work_en)<>2 then raise exception 'Plan history lost'; end if;
 perform pg_temp.expect_error(format('update public.assessment_plan_revisions set rationale=%L where id=%L','Rewritten history',plan_id),'permission denied');
 insert into public.assessment_support_capabilities(id,release_id,title,gap_objectives,lesson_ids,weekly_minutes,offline_available,version)
  values('fixture-units','support-fixture','Fictional supporting units',array['work-fixture.lesson.1','work-fixture.lesson.2','work-fixture.lesson.3'],array['support-fixture.lesson.1','support-fixture.lesson.2','support-fixture.lesson.3'],20,true,'test-only');
 select jsonb_build_object('items',jsonb_agg(jsonb_build_object('id','support-recall-'||n,'objectiveId','support-fixture.lesson.'||n,'skill','recall','type','recall','coverage','module','maximum',1) order by n)) into checks from generate_series(1,3) n;
 for kind in select unnest(array['entrance','day90']) loop
  insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,status,definition,calibrated,equivalence_group,equivalence_approved,review_records,purpose,support_capability_id)
   values('fixture-units-'||kind,'support-fixture',kind,'support-test-only','test-only','verified',checks,true,'test-only-short-equivalence',true,'[{"test":true},{"test":true},{"test":true}]','support','fixture-units');
 end loop;
 if assessment_private.verified_support_capability('fixture-units') then raise exception 'Draft support mapping is assignable'; end if;
 update public.assessment_support_capabilities set status='verified',review_records='[{"test":true},{"test":true},{"test":true}]',before_form_id='fixture-units-entrance',after_form_id='fixture-units-day90' where id='fixture-units';
 if not assessment_private.verified_support_capability('fixture-units') then raise exception 'Reviewed fixture mapping unavailable'; end if;
 insert into public.assessment_support_capabilities(id,release_id,title,gap_objectives,lesson_ids,weekly_minutes,version,assignment_mode,status,review_records)
  values('fixture-full','support-fixture','Fictional broader learner goal',array['work-fixture.lesson.1','work-fixture.lesson.2','work-fixture.lesson.3'],array['support-fixture.lesson.1','support-fixture.lesson.2','support-fixture.lesson.3'],20,'test-only','full_module','verified','[{"test":true},{"test":true},{"test":true}]');
 checks:=public.assessment_support_candidates('10000000-0000-4000-8000-000000000001',work_en,work_attempt);
 if jsonb_array_length(checks)<>2 then raise exception 'Reviewed candidate preview missing or exceeds two'; end if;
 if checks::text like '%correctOptionId%' then raise exception 'Candidate preview leaked question keys'; end if;
 perform pg_temp.expect_error(format('select public.assessment_support_candidates(%L,%L,%L)','10000000-0000-4000-8000-000000000003',work_en,work_attempt),'approval access required');
 perform pg_temp.expect_error(format('select public.assessment_suggest_support(%L,%L,%L,%L,%L,%L)','10000000-0000-4000-8000-000000000003',work_en,work_attempt,'fixture-units','Unauthorized personal suggestion','90000000-0000-4000-8000-000000000005'),'approval access required');
 rec:=public.assessment_suggest_support('10000000-0000-4000-8000-000000000001',work_en,work_attempt,'fixture-units','Synthetic three-objective recall evidence','90000000-0000-4000-8000-000000000006');
 if rec<>public.assessment_suggest_support('10000000-0000-4000-8000-000000000001',work_en,work_attempt,'fixture-units','Synthetic three-objective recall evidence','90000000-0000-4000-8000-000000000006') then raise exception 'Suggestion retry duplicated'; end if;
 rec2:=public.assessment_suggest_support('10000000-0000-4000-8000-000000000001',work_en,work_attempt,'fixture-full','Synthetic alternative supporting scope','90000000-0000-4000-8000-000000000007');
 perform pg_temp.expect_error(format('select public.assessment_suggest_support(%L,%L,%L,%L,%L,%L)','10000000-0000-4000-8000-000000000001',work_en,work_attempt,'fixture-full','Third visible suggestion','90000000-0000-4000-8000-000000000008'),'two existing suggestions');
 perform pg_temp.expect_error(format('select public.assessment_decide_support(%L,%L,%L,%L,null,80,40,20,%L,current_date,%L,8,%L)','10000000-0000-4000-8000-000000000001',rec,'approved','Synthetic over-budget decision','units','America/Denver','90000000-0000-4000-8000-000000000009'),'study-time budget');
 result:=public.assessment_decide_support('10000000-0000-4000-8000-000000000001',rec,'approved','Synthetic agreed study budget',null,80,20,20,'units',current_date,'America/Denver',8,'90000000-0000-4000-8000-000000000010');
 assignment:=(result->>'assignmentId')::uuid;child:=(result->>'supportEnrollmentId')::uuid;
 perform pg_temp.expect_error('update public.assessment_support_capabilities set version=''rewritten'' where id=''fixture-units''','immutable');
 perform pg_temp.expect_error(format('update public.assessment_recommendations set why=%L where id=%L','Rewritten source evidence',rec),'immutable');
 perform pg_temp.expect_error(format('update public.assessment_support_assignments set support_weekly_minutes=1 where id=%L',assignment),'immutable');
 if result<>public.assessment_decide_support('10000000-0000-4000-8000-000000000001',rec,'approved','Synthetic agreed study budget',null,80,20,20,'units',current_date,'America/Denver',8,'90000000-0000-4000-8000-000000000010') then raise exception 'Approval retry duplicated'; end if;
 if (select count(*) from public.assessment_checkpoints where enrollment_id=child)<>2 or not exists(select 1 from public.assessment_enrollments where id=child and program_scope='support_units' and role='support') then raise exception 'Units created a full 90-day program'; end if;
 if not exists(select 1 from public.assessment_checkpoints where enrollment_id=child and checkpoint='day90' and due_date=current_date+8) then raise exception 'Short follow-up date ignored'; end if;
 perform pg_temp.expect_error(format('select public.assessment_decide_support(%L,%L,%L,%L,null,80,20,20,%L,current_date,%L,8,%L)','10000000-0000-4000-8000-000000000001',rec2,'approved','Synthetic full-module learner goal','full_module','America/Denver','90000000-0000-4000-8000-000000000011'),'existing active supporting module');
 select id into cp from public.assessment_checkpoints where enrollment_id=child and checkpoint='entrance';
 perform pg_temp.expect_error(format('select public.assessment_start_attempt(%L,%L,%L,%L)','10000000-0000-4000-8000-000000000001',cp,'support-fixture-entrance','90000000-0000-4000-8000-000000000012'),'Targeted support check unavailable');
 -- LOCAL fictional reviews only: final DB insertion must independently reject
 -- a retired mapping or a reviewed form missing one of the assigned units.
 update public.assessment_support_capabilities set status='retired' where id='fixture-units';
 perform pg_temp.expect_error(format('select public.assessment_start_attempt(%L,%L,%L,%L)','10000000-0000-4000-8000-000000000001',cp,'fixture-units-entrance','92000000-0000-4000-8000-000000000001'),'Targeted support mapping unavailable');
 update public.assessment_support_capabilities set status='verified' where id='fixture-units';
 declare original_definition jsonb; before_count bigint;
 begin
  select definition into original_definition from public.assessment_forms where id='fixture-units-entrance';
  select count(*) into before_count from public.assessment_attempts where checkpoint_id=cp;
  update public.assessment_forms set status='draft' where id='fixture-units-entrance';
  update public.assessment_forms set definition=jsonb_set(definition,'{items}',(definition->'items')-2) where id='fixture-units-entrance';
  update public.assessment_forms set status='verified' where id='fixture-units-entrance';
  perform pg_temp.expect_error(format('select public.assessment_start_attempt(%L,%L,%L,%L)','10000000-0000-4000-8000-000000000001',cp,'fixture-units-entrance','92000000-0000-4000-8000-000000000002'),'must cover every assigned unit');
  if (select count(*) from public.assessment_attempts where checkpoint_id=cp)<>before_count then raise exception 'Rejected targeted check created an attempt'; end if;
  update public.assessment_forms set status='draft' where id='fixture-units-entrance';
  update public.assessment_forms set definition=original_definition where id='fixture-units-entrance';
  update public.assessment_forms set status='verified' where id='fixture-units-entrance';
 end;
 short_attempt:=public.assessment_start_attempt('10000000-0000-4000-8000-000000000001',cp,'fixture-units-entrance','90000000-0000-4000-8000-000000000013');
 if (select jsonb_array_length(form_snapshot->'definition'->'items') from public.assessment_attempts where id=short_attempt)<>3 then raise exception 'Short check did not freeze assigned-unit items'; end if;
 declare frozen jsonb; invalid jsonb;
 begin
  select form_snapshot into frozen from public.assessment_attempts where id=short_attempt;
  invalid:=jsonb_set(frozen,'{unitLessonIds}','["support-fixture.lesson.1"]');
  perform pg_temp.expect_error(format('insert into public.assessment_attempts(checkpoint_id,attempt_number,form_id,form_snapshot,start_request_id) values(%L,99,%L,%L,gen_random_uuid())',cp,'fixture-units-entrance',invalid),'Targeted support frozen units conflict');
  invalid:=jsonb_set(frozen,'{definition,items}',(frozen->'definition'->'items')-0);
  perform pg_temp.expect_error(format('insert into public.assessment_attempts(checkpoint_id,attempt_number,form_id,form_snapshot,start_request_id) values(%L,99,%L,%L,gen_random_uuid())',cp,'fixture-units-entrance',invalid),'Targeted support frozen items conflict');
  invalid:=jsonb_set(frozen,'{contentVersion}','"stale-version"');
  perform pg_temp.expect_error(format('insert into public.assessment_attempts(checkpoint_id,attempt_number,form_id,form_snapshot,start_request_id) values(%L,99,%L,%L,gen_random_uuid())',cp,'fixture-units-entrance',invalid),'Targeted support frozen version conflict');
  invalid:=jsonb_set(frozen,'{supportAssignmentId}','"not-an-assignment"');
  perform pg_temp.expect_error(format('insert into public.assessment_attempts(checkpoint_id,attempt_number,form_id,form_snapshot,start_request_id) values(%L,99,%L,%L,gen_random_uuid())',cp,'fixture-units-entrance',invalid),'Targeted support assignment unavailable');
  if has_function_privilege('anon','assessment_private.guard_targeted_attempt_insert()','execute')
   or has_function_privilege('authenticated','assessment_private.guard_targeted_attempt_insert()','execute')
   or not has_function_privilege('service_role','assessment_private.guard_targeted_attempt_insert()','execute')
   or (select prosecdef from pg_proc where oid='assessment_private.guard_targeted_attempt_insert()'::regprocedure) then
   raise exception 'Targeted guard role privileges changed';
  end if;
 end;
 update public.assessment_support_capabilities set status='retired' where id='fixture-units';
 if public.assessment_start_attempt('10000000-0000-4000-8000-000000000001',cp,'fixture-units-entrance','90000000-0000-4000-8000-000000000013')<>short_attempt then raise exception 'Retired mapping broke an existing attempt retry'; end if;
 if public.assessment_start_attempt('10000000-0000-4000-8000-000000000001',cp,'fixture-units-entrance','92000000-0000-4000-8000-000000000003')<>short_attempt then raise exception 'Retired mapping duplicated an existing open attempt'; end if;
 update public.assessment_support_capabilities set status='verified' where id='fixture-units';
 perform public.assessment_acknowledge_support('10000000-0000-4000-8000-000000000001',assignment,'90000000-0000-4000-8000-000000000014');
 perform public.assessment_change_support('10000000-0000-4000-8000-000000000001',assignment,'paused','Synthetic pause reason','90000000-0000-4000-8000-000000000015');
 if not exists(select 1 from public.assessment_enrollments where id=child and status='paused') then raise exception 'Supporting enrollment did not pause'; end if;
 perform public.assessment_change_support('10000000-0000-4000-8000-000000000001',assignment,'active','Synthetic resume reason','90000000-0000-4000-8000-000000000016');
 perform pg_temp.expect_error(format('select public.assessment_change_support(%L,%L,%L,%L,%L)','10000000-0000-4000-8000-000000000001',assignment,'completed','Synthetic premature completion','90000000-0000-4000-8000-000000000017'),'follow-up check');
 perform public.assessment_change_support('10000000-0000-4000-8000-000000000001',assignment,'withdrawn','Synthetic units withdrawal keeps history','90000000-0000-4000-8000-000000000018');
 result:=public.assessment_decide_support('10000000-0000-4000-8000-000000000001',rec2,'approved','Synthetic learner goal justifies a complete additional module',null,80,20,20,'full_module',current_date,'America/Denver',8,'90000000-0000-4000-8000-000000000019');
 child:=(result->>'supportEnrollmentId')::uuid;
 if (select count(*) from public.assessment_checkpoints where enrollment_id=child)<>3 then raise exception 'Full supporting module lacks its own three checkpoints'; end if;
 if not exists(select 1 from public.assessment_enrollments where id=work_en and role='primary' and status='active') then raise exception 'Primary work module replaced'; end if;
 if (select count(*) from public.assessment_checkpoints where enrollment_id=work_en)<>3 then raise exception 'Primary deadlines changed'; end if;
 -- Exercise the actual team approval branch and its tenant checks under service_role.
 update public.team_members set role='learner' where organization_id='20000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000001';
 insert into public.team_assignments values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','work-fixture');
 work_en:=public.assessment_create_enrollment('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','work-fixture',current_date,'America/Denver','90000000-0000-4000-8000-000000000020');
 select id into work_cp from public.assessment_checkpoints where enrollment_id=work_en and checkpoint='entrance';
 work_attempt:=public.assessment_start_attempt('10000000-0000-4000-8000-000000000001',work_cp,'work-fixture-entrance','90000000-0000-4000-8000-000000000021');
 select jsonb_agg(jsonb_build_object('itemId','work-fixture-recall-'||n,'answer',jsonb_build_object('inputMethod','typed','text','synthetic team response'))) into checks from generate_series(1,3) n;
 revision:=public.assessment_save_responses('10000000-0000-4000-8000-000000000001',work_attempt,0,checks,'90000000-0000-4000-8000-000000000022');
 perform public.assessment_submit_attempt('10000000-0000-4000-8000-000000000001',work_attempt,revision,'90000000-0000-4000-8000-000000000023');
 for response in select * from public.assessment_responses where attempt_id=work_attempt loop
  perform public.assessment_record_score('10000000-0000-4000-8000-000000000001',response.id,case when response.item_id like '%-recall-%' then 'scored' else 'not_assessed' end,case when response.item_id like '%-recall-%' then 0 else null end,'deterministic','Synthetic team fixture evidence',null,null,gen_random_uuid());
 end loop;
 perform pg_temp.expect_error(format('select public.assessment_suggest_support(%L,%L,%L,%L,%L,%L)','10000000-0000-4000-8000-000000000001',work_en,work_attempt,'fixture-full','Learner cannot assign team support','90000000-0000-4000-8000-000000000024'),'approval access required');
 rec:=public.assessment_suggest_support('10000000-0000-4000-8000-000000000002',work_en,work_attempt,'fixture-full','Synthetic approved team supporting scope','90000000-0000-4000-8000-000000000025');
 perform pg_temp.expect_error(format('select public.assessment_decide_support(%L,%L,%L,%L,null,80,20,20,%L,current_date,%L,8,%L)','10000000-0000-4000-8000-000000000003',rec,'approved','Wrong tenant support approval','full_module','America/Denver','90000000-0000-4000-8000-000000000026'),'approval access required');
 result:=public.assessment_decide_support('10000000-0000-4000-8000-000000000002',rec,'approved','Synthetic team learner goal justifies an additional complete module',null,80,20,20,'full_module',current_date,'America/Denver',8,'90000000-0000-4000-8000-000000000027');
 child:=(result->>'supportEnrollmentId')::uuid;
 if not exists(select 1 from public.team_assignments where organization_id='20000000-0000-4000-8000-000000000001' and user_id='10000000-0000-4000-8000-000000000001' and module_id='support-fixture') then raise exception 'Approved team module assignment missing'; end if;
 if not exists(select 1 from public.assessment_enrollments where id=child and scope='team' and role='support') then raise exception 'Team support enrollment missing'; end if;
 if (select count(*) from public.assessment_checkpoints where enrollment_id=child)<>3 then raise exception 'Team support schedule missing'; end if;
 if (select count(*) from public.team_assignments where organization_id='20000000-0000-4000-8000-000000000001' and module_id='roofing')<>1 then raise exception 'Original team work assignment changed'; end if;
end $$;
