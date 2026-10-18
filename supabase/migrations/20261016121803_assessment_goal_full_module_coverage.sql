-- Full-module goals compare demonstrated coverage with the complete curriculum.
-- Knowing the mapping's sample units does not prove all thirty lessons.
create or replace function assessment_private.goal_support_eligible(p_actor uuid,p_enrollment uuid,p_capability text,p_revision integer)
returns boolean language plpgsql stable security invoker set search_path='' as $$
declare en public.assessment_enrollments; cap public.assessment_support_capabilities; rel public.assessment_releases; goals public.assessment_learner_goals; demonstrated text[]; units text[];
begin
 select * into en from public.assessment_enrollments where id=p_enrollment;
 if en.id is null or not assessment_private.can_read(p_actor,en.id) then raise exception 'Learner goal access required'; end if;
 select * into cap from public.assessment_support_capabilities where id=p_capability;
 select * into rel from public.assessment_releases where id=cap.release_id;
 select * into goals from public.assessment_learner_goals where enrollment_id=en.id;
 if en.status<>'active' or en.role<>'primary' or en.program_scope<>'full_module' or goals.revision is distinct from p_revision or
  goals.enrollment_id is null or not goals.topics&&cap.goal_tags or not assessment_private.verified_support_capability(cap.id) or
  rel.module_id=en.module_id or rel.target_language<>en.target_language or rel.instruction_language<>en.instruction_language then return false; end if;
 if exists(select 1 from public.assessment_enrollments other where other.user_id=en.user_id and other.scope=en.scope and other.organization_id is not distinct from en.organization_id
  and other.module_id=rel.module_id and other.target_language=en.target_language and other.instruction_language=en.instruction_language and other.status<>'archived') then return false; end if;
 select coalesce(array_agg(latest.objective_id) filter(where latest.state='scored' and latest.points=latest.maximum),'{}'::text[]) into demonstrated from (
 select distinct on (score.objective_id) score.objective_id,score.state,score.points,score.maximum
 from public.assessment_enrollments pe join public.assessment_checkpoints pc on pc.enrollment_id=pe.id
 join public.assessment_attempts pa on pa.checkpoint_id=pc.id join public.assessment_responses pr on pr.attempt_id=pa.id
 join lateral(select * from public.assessment_score_events s where s.response_id=pr.id order by revision desc limit 1) score on true
 where pe.user_id=en.user_id and pe.scope=en.scope and pe.organization_id is not distinct from en.organization_id
 and pe.target_language=en.target_language and pe.instruction_language=en.instruction_language
 and coalesce((pa.form_snapshot->>'calibrated')::boolean,false) and not coalesce((pa.form_snapshot->>'pilot')::boolean,false)
 and pa.submitted_at>=now()-make_interval(days=>cap.evidence_max_age_days)
 and score.source<>'ai_proposal' and score.coverage<>'transfer'
 order by score.objective_id,pa.submitted_at desc,pa.id desc,score.revision desc,score.id desc
 ) latest;
 if cap.assignment_mode='full_module' then
  select array_agg(value) into units from jsonb_array_elements_text(rel.lesson_manifest->'lessonIds');
 else units:=cap.lesson_ids;
 end if;
 return cap.prerequisite_objectives<@demonstrated and not units<@demonstrated;
end $$;
revoke all on function assessment_private.goal_support_eligible(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function assessment_private.goal_support_eligible(uuid,uuid,text,integer) to service_role;
