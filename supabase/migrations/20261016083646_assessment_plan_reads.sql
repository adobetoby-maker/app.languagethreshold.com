-- Read-only candidate previews preserve the same permission and content gates.
create index assessment_support_objectives_idx on public.assessment_support_capabilities using gin(gap_objectives);
create function public.assessment_support_candidates(p_actor uuid,p_enrollment uuid,p_attempt uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare en public.assessment_enrollments; attempt public.assessment_attempts; slots integer; objectives text[]; result jsonb;
begin
 select * into en from public.assessment_enrollments where id=p_enrollment;
 if en.id is null or not assessment_private.can_manage(p_actor,en.id) then raise exception 'Assessment plan approval access required'; end if;
 select a.* into attempt from public.assessment_attempts a join public.assessment_checkpoints cp on cp.id=a.checkpoint_id where a.id=p_attempt and cp.enrollment_id=en.id;
 if attempt.id is null then raise exception 'Source assessment belongs to another plan'; end if;
 if en.status<>'active' or attempt.submitted_at is null or coalesce((attempt.form_snapshot->>'pilot')::boolean,false) or not coalesce((attempt.form_snapshot->>'calibrated')::boolean,false) then return '[]'::jsonb; end if;
 select array_agg(distinct item->>'objectiveId') into objectives from jsonb_array_elements(attempt.form_snapshot->'definition'->'items') item;
 slots:=greatest(0,2-(select count(*)::integer from public.assessment_recommendations where enrollment_id=en.id and decision in ('suggested','deferred')));
 select coalesce(jsonb_agg(candidate),'[]'::jsonb) into result from (
  select jsonb_build_object('capabilityId',cap.id,'version',cap.version,'moduleId',rel.module_id,'title',cap.title,'lessonIds',cap.lesson_ids,'weeklyMinutes',cap.weekly_minutes,'offlineAvailable',cap.offline_available,'assignmentMode',cap.assignment_mode,'sourceAttemptId',attempt.id,'assessedAt',attempt.submitted_at,'evidence',evidence.items) candidate
  from public.assessment_support_capabilities cap join public.assessment_releases rel on rel.id=cap.release_id
  cross join lateral(select assessment_private.support_evidence(p_actor,attempt.id,cap.id) items) evidence
  where cap.status='verified' and cap.gap_objectives&&objectives and rel.target_language=en.target_language and rel.instruction_language=en.instruction_language
  and rel.module_id<>en.module_id and jsonb_array_length(evidence.items)>=3
  and not exists(select 1 from public.assessment_recommendations prior where prior.enrollment_id=en.id and prior.attempt_id=attempt.id and prior.capability_id=cap.id)
  and not exists(select 1 from public.assessment_enrollments other where other.user_id=en.user_id and other.scope=en.scope and other.organization_id is not distinct from en.organization_id and other.module_id=rel.module_id and other.target_language=en.target_language and other.instruction_language=en.instruction_language and other.status<>'archived')
  order by (select count(*) from jsonb_array_elements(evidence.items) item where (item->>'points')::numeric<(item->>'maximum')::numeric) desc,cap.weekly_minutes,cap.offline_available desc,cap.id
  limit slots
 ) ranked;
 return result;
end $$;
revoke all on function public.assessment_support_candidates(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.assessment_support_candidates(uuid,uuid,uuid) to service_role;

alter table public.assessment_plan_revisions add column review_every_days integer not null default 4 check(review_every_days between 1 and 30);
-- Preserve the old calling contract through the new optional parameter. No plan
-- records are rewritten; each approved revision owns its review schedule.
drop function public.assessment_revise_plan(uuid,uuid,uuid,integer,text[],text[],text,uuid);
create function public.assessment_revise_plan(p_actor uuid,p_enrollment uuid,p_attempt uuid,p_start_lesson integer,p_ways text[],p_catchup text[],p_reason text,p_request uuid,p_review_every_days integer default 4)
returns uuid language plpgsql security invoker set search_path='' as $$
declare en public.assessment_enrollments; attempt public.assessment_attempts; rel public.assessment_releases; result uuid; next_revision integer; evidence jsonb; prerequisite_id text; way text; needed text[]; prior public.assessment_plan_revisions;
begin
 select * into en from public.assessment_enrollments where id=p_enrollment for update;
 if en.id is null or not assessment_private.can_manage(p_actor,en.id) then raise exception 'Assessment plan approval access required'; end if;
 select * into prior from public.assessment_plan_revisions where approved_by=p_actor and request_id=p_request;
 if prior.id is not null then
  if prior.enrollment_id<>en.id or prior.source_attempt_id<>p_attempt or prior.suggested_lesson<>p_start_lesson or prior.focus_ways is distinct from p_ways or prior.catchup_objectives is distinct from p_catchup or prior.rationale is distinct from trim(p_reason) or prior.review_every_days is distinct from p_review_every_days then raise exception 'Plan revision key reused'; end if;
  return prior.id;
 end if;
 select a.* into attempt from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id where a.id=p_attempt and c.enrollment_id=en.id;
 if en.status<>'active' or en.role<>'primary' or en.program_scope<>'full_module' or attempt.submitted_at is null
  or coalesce((attempt.form_snapshot->>'pilot')::boolean,false) or not coalesce((attempt.form_snapshot->>'calibrated')::boolean,false) then raise exception 'Reviewed primary-module evidence is required for an assessed plan revision'; end if;
 select * into rel from public.assessment_releases where id=en.release_id;
 if not assessment_private.verified_support_release(rel.id) then raise exception 'Primary curriculum and exams must be reviewed before plan personalization'; end if;
 if p_review_every_days is null or p_review_every_days not between 1 and 30 then raise exception 'Choose a review interval from 1 to 30 days'; end if;
 if p_start_lesson is null or p_start_lesson not between 1 and least(30,(rel.lesson_manifest->>'lessonCount')::integer)
  or p_ways is null or cardinality(p_ways) not between 1 and 6 or not p_ways<@array['see','recall','hear','type','say','write']
  or cardinality(p_ways)<>(select count(distinct value) from unnest(p_ways) value)
  or p_reason is null or length(trim(p_reason)) not between 3 and 2000 then raise exception 'Choose a valid lesson, learning focus and rationale'; end if;
 if p_catchup is null or cardinality(p_catchup)>30 or cardinality(p_catchup)<>(select count(distinct value) from unnest(p_catchup) value) or exists(select 1 from unnest(p_catchup) objective where not (rel.lesson_manifest->'lessonIds') ? objective) then raise exception 'Catch-up objectives must belong to the primary module'; end if;
 with latest as (
  select r.item_id,s.* from public.assessment_responses r join lateral(select * from public.assessment_score_events score where score.response_id=r.id order by revision desc limit 1) s on true
  where r.attempt_id=attempt.id and s.state='scored' and s.source<>'ai_proposal' and s.coverage<>'transfer'
 ) select coalesce(jsonb_agg(jsonb_build_object('itemId',item_id,'scoreEventId',id,'objectiveId',objective_id,'skill',skill,'points',points,'maximum',maximum,'source',source,'scoredRevision',revision)),'[]'::jsonb) into evidence from latest;
 if (select count(distinct value->>'objectiveId') from jsonb_array_elements(evidence))<3 then raise exception 'Three assessed objectives are required for plan personalization'; end if;
 foreach way in array p_ways loop
  needed:=case way when 'see' then array['recognition','reading'] when 'recall' then array['recognition','recall'] when 'hear' then array['listening'] when 'type' then array['recall','writing'] when 'say' then array['speaking'] else array['recall','writing'] end;
  if not exists(select 1 from jsonb_array_elements(evidence) item where item->>'skill'=any(needed) group by item->>'skill' having count(distinct item->>'objectiveId')>=3 and bool_or((item->>'points')::numeric<(item->>'maximum')::numeric)) then raise exception 'Learning focus needs assessed evidence; missing inputs are not a weakness'; end if;
 end loop;
 -- Keep catch-up for every undemonstrated prerequisite below the suggested entry.
 -- This never changes completion/mastery or removes access to any earlier lesson.
 for prerequisite_id in select en.module_id||'.lesson.'||n from generate_series(1,p_start_lesson-1) n loop
  if not prerequisite_id=any(p_catchup) and not exists(
   select 1 from jsonb_array_elements(evidence) item where item->>'objectiveId'=prerequisite_id
   group by item->>'objectiveId' having count(distinct item->>'skill')=6 and bool_and((item->>'points')::numeric=(item->>'maximum')::numeric)
  ) then raise exception 'Keep targeted catch-up for unassessed or incomplete prerequisites'; end if;
 end loop;
 select coalesce(max(revision),0)+1 into next_revision from public.assessment_plan_revisions where enrollment_id=en.id;
 insert into public.assessment_plan_revisions(enrollment_id,source_attempt_id,revision,suggested_lesson,focus_ways,catchup_objectives,rationale,evidence,approved_by,request_id,review_every_days)
 values(en.id,attempt.id,next_revision,p_start_lesson,p_ways,p_catchup,trim(p_reason),evidence,p_actor,p_request,p_review_every_days) returning id into result;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
 values(en.id,p_actor,'plan.revised',p_request,jsonb_build_object('planRevisionId',result,'revision',next_revision,'sourceAttemptId',attempt.id,'suggestedLesson',p_start_lesson,'focusWays',p_ways,'catchupObjectives',p_catchup,'reason',trim(p_reason),'reviewEveryDays',p_review_every_days));
 return result;
end $$;
revoke all on function public.assessment_revise_plan(uuid,uuid,uuid,integer,text[],text[],text,uuid,integer) from public,anon,authenticated;
grant execute on function public.assessment_revise_plan(uuid,uuid,uuid,integer,text[],text[],text,uuid,integer) to service_role;
