-- Fictional local fixtures only; the outer engine transaction rolls everything back.
do $$
declare en uuid; team_en uuid; candidates jsonb; rec uuid; revision integer; result jsonb; child uuid; prior_en uuid; prior_cp uuid; prior_attempt uuid; response record;
begin
 en:=public.assessment_create_enrollment('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003',null,'work-fixture',current_date,'America/Denver','92000000-0000-4000-8000-000000000001');
 insert into public.assessment_support_capabilities(id,release_id,title,gap_objectives,lesson_ids,weekly_minutes,version,assignment_mode,status,review_records,goal_tags)
 values('goal-fixture-full','support-fixture','Fictional goal-based enrichment',array['work-fixture.lesson.1','work-fixture.lesson.2','work-fixture.lesson.3'],array['support-fixture.lesson.1','support-fixture.lesson.2','support-fixture.lesson.3'],20,'goal-test-only','full_module','verified','[{"test":true},{"test":true},{"test":true}]',array['everyday_conversation']);
 if jsonb_array_length(public.assessment_support_candidates('10000000-0000-4000-8000-000000000003',en,null))<>0 then raise exception 'Goals inferred without learner choice'; end if;
 revision:=public.assessment_save_goals('10000000-0000-4000-8000-000000000003',en,array['everyday_conversation'],true,0,'92000000-0000-4000-8000-000000000002');
 if revision<>1 or public.assessment_save_goals('10000000-0000-4000-8000-000000000003',en,array['everyday_conversation'],true,0,'92000000-0000-4000-8000-000000000002')<>1 then raise exception 'Goal retry was not idempotent'; end if;
 perform pg_temp.expect_error(format('select public.assessment_save_goals(%L,%L,array[%L],false,0,%L)','10000000-0000-4000-8000-000000000003',en,'everyday_conversation','92000000-0000-4000-8000-000000000002'),'request key reused');
 perform pg_temp.expect_error(format('select public.assessment_save_goals(%L,%L,array[%L],true,0,%L)','10000000-0000-4000-8000-000000000003',en,'everyday_conversation','92000000-0000-4000-8000-000000000003'),'conflict; refresh');
 perform pg_temp.expect_error(format('select public.assessment_save_goals(%L,%L,array[%L],true,1,%L)','10000000-0000-4000-8000-000000000002',en,'everyday_conversation','92000000-0000-4000-8000-000000000004'),'Learner goal access required');
 perform pg_temp.expect_error(format('select public.assessment_save_goals(%L,%L,array[%L,%L],true,1,%L)','10000000-0000-4000-8000-000000000003',en,'everyday_conversation','everyday_conversation','92000000-0000-4000-8000-000000000005'),'distinct learner goals');
 perform pg_temp.expect_error(format('select public.assessment_save_goals(%L,%L,array[%L],true,1,%L)','10000000-0000-4000-8000-000000000003',en,'not-a-goal','92000000-0000-4000-8000-000000000006'),'valid learner goals');
 -- Three known sample objectives do not prove an entire optional thirty-lesson module.
 prior_en:=public.assessment_create_enrollment('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003',null,'support-fixture',current_date,'America/Denver','92000000-0000-4000-8000-000000000020');
 select id into prior_cp from public.assessment_checkpoints where enrollment_id=prior_en and checkpoint='entrance';
 prior_attempt:=public.assessment_start_attempt('10000000-0000-4000-8000-000000000003',prior_cp,'support-fixture-entrance','92000000-0000-4000-8000-000000000021');
 select jsonb_agg(jsonb_build_object('itemId','support-fixture-recall-'||n,'answer',jsonb_build_object('inputMethod','typed','text','Synthetic known sample'))) into candidates from generate_series(1,3) n;
 revision:=public.assessment_save_responses('10000000-0000-4000-8000-000000000003',prior_attempt,0,candidates,'92000000-0000-4000-8000-000000000022');
 perform public.assessment_submit_attempt('10000000-0000-4000-8000-000000000003',prior_attempt,revision,'92000000-0000-4000-8000-000000000023');
 for response in select * from public.assessment_responses where attempt_id=prior_attempt and item_id like '%-recall-%' loop
  perform public.assessment_record_score('10000000-0000-4000-8000-000000000003',response.id,'scored',1,'deterministic','Synthetic known sample objective',null,null,gen_random_uuid());
 end loop;
 update public.assessment_enrollments set status='archived' where id=prior_en;
 if not assessment_private.goal_support_eligible('10000000-0000-4000-8000-000000000003',en,'goal-fixture-full',1) then raise exception 'Sample mastery incorrectly excluded the full curriculum'; end if;
 candidates:=public.assessment_support_candidates('10000000-0000-4000-8000-000000000003',en,null);
 if jsonb_array_length(candidates)<>1 or candidates->0->>'basis'<>'learner_goal' or candidates->0->'sourceAttemptId'<>'null'::jsonb or candidates->0->'evidence'<>'[]'::jsonb then raise exception 'Goal was misrepresented as assessed weakness'; end if;
 if candidates->0->>'goalRevision'<>'1' or candidates->0->'matchedGoals'<>'["everyday_conversation"]' then raise exception 'Explicit matching goal revision missing'; end if;
 insert into public.assessment_support_capabilities(id,release_id,title,gap_objectives,lesson_ids,weekly_minutes,version,assignment_mode,status,review_records,goal_tags,prerequisite_objectives)
 values('goal-fixture-prerequisite','support-fixture','Fictional prerequisite-dependent goal',array['work-fixture.lesson.1','work-fixture.lesson.2','work-fixture.lesson.3'],array['support-fixture.lesson.1'],20,'goal-test-only','full_module','verified','[{"test":true},{"test":true},{"test":true}]',array['everyday_conversation'],array['unassessed-prerequisite']);
 if assessment_private.goal_support_eligible('10000000-0000-4000-8000-000000000003',en,'goal-fixture-prerequisite',1) then raise exception 'Goal bypassed assessed prerequisites'; end if;
 rec:=public.assessment_suggest_goal_support('10000000-0000-4000-8000-000000000003',en,'goal-fixture-full',1,'Optional learning goal, no weakness inferred','92000000-0000-4000-8000-000000000007');
 if public.assessment_suggest_goal_support('10000000-0000-4000-8000-000000000003',en,'goal-fixture-full',1,'Optional learning goal, no weakness inferred','92000000-0000-4000-8000-000000000007')<>rec then raise exception 'Goal suggestion duplicated on retry'; end if;
 perform public.assessment_save_goals('10000000-0000-4000-8000-000000000003',en,array['reading_messages'],false,1,'92000000-0000-4000-8000-000000000008');
 perform pg_temp.expect_error(format('select public.assessment_decide_support(%L,%L,%L,%L,null,80,20,20,%L,current_date,%L,7,%L)','10000000-0000-4000-8000-000000000003',rec,'approved','This suggestion now refers to a withdrawn learner goal','full_module','America/Denver','92000000-0000-4000-8000-000000000009'),'Support evidence or reviewed content changed');
 perform public.assessment_decide_support('10000000-0000-4000-8000-000000000003',rec,'dismissed','Learner changed their optional goal',null,null,null,null,null,null,null,null,'92000000-0000-4000-8000-000000000010');
 perform public.assessment_save_goals('10000000-0000-4000-8000-000000000003',en,array[]::text[],false,2,'92000000-0000-4000-8000-000000000011');
 if jsonb_array_length(public.assessment_support_candidates('10000000-0000-4000-8000-000000000003',en,null))<>0 then raise exception 'Cleared goals still generate requests'; end if;
 perform public.assessment_save_goals('10000000-0000-4000-8000-000000000003',en,array['everyday_conversation'],true,3,'92000000-0000-4000-8000-000000000012');
 rec:=public.assessment_suggest_goal_support('10000000-0000-4000-8000-000000000003',en,'goal-fixture-full',4,'Learner explicitly selected everyday conversation again','92000000-0000-4000-8000-000000000013');
 perform pg_temp.expect_error(format('select public.assessment_decide_support(%L,%L,%L,%L,null,80,30,20,%L,current_date,%L,7,%L)','10000000-0000-4000-8000-000000000003',rec,'approved','Goal-based work must respect the workload budget','full_module','America/Denver','92000000-0000-4000-8000-000000000014'),'study-time budget');
 result:=public.assessment_decide_support('10000000-0000-4000-8000-000000000003',rec,'approved','Optional conversation module fits the learner goal while keeping Roofing primary',null,80,20,20,'full_module',current_date,'America/Denver',7,'92000000-0000-4000-8000-000000000015');
 child:=(result->>'supportEnrollmentId')::uuid;
 if (select count(*) from public.assessment_checkpoints where enrollment_id=child)<>3 then raise exception 'Goal full module lacks three exams'; end if;
 if not exists(select 1 from public.assessment_enrollments where id=en and role='primary') then raise exception 'Goal replaced the primary module'; end if;
 if not exists(select 1 from public.assessment_support_assignments where id=(result->>'assignmentId')::uuid and capability_snapshot->>'basis'='learner_goal' and capability_snapshot->'goalSnapshot'->>'revision'='4') then raise exception 'Approved goal basis snapshot missing'; end if;
 perform public.assessment_save_goals('10000000-0000-4000-8000-000000000003',en,array[]::text[],false,4,'92000000-0000-4000-8000-000000000016');
 if not exists(select 1 from public.assessment_support_assignments where id=(result->>'assignmentId')::uuid and status='active') then raise exception 'Goal edit silently changed an approved assignment'; end if;
 select id into team_en from public.assessment_enrollments where user_id='10000000-0000-4000-8000-000000000001' and module_id='work-fixture' and scope='team' and role='primary';
 perform public.assessment_save_goals('10000000-0000-4000-8000-000000000001',team_en,array['numbers_measurements'],false,0,'92000000-0000-4000-8000-000000000017');
 perform pg_temp.expect_error(format('select public.assessment_save_goals(%L,%L,array[%L],true,1,%L)','10000000-0000-4000-8000-000000000002',team_en,'everyday_conversation','92000000-0000-4000-8000-000000000018'),'Learner goal access required');
 perform pg_temp.expect_error(format('select public.assessment_suggest_goal_support(%L,%L,%L,1,%L,%L)','10000000-0000-4000-8000-000000000001',team_en,'goal-fixture-full','Team learner cannot approve supporting work','92000000-0000-4000-8000-000000000019'),'approval access required');
end $$;
