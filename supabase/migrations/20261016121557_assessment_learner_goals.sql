-- Explicit learner goals, separate from assessed weaknesses and plan-approval authority.
create table public.assessment_learner_goals (
 enrollment_id uuid primary key references public.assessment_enrollments(id),
 revision integer not null check(revision>0),
 topics text[] not null default '{}' check(cardinality(topics)<=3 and topics<@array['everyday_conversation','numbers_measurements','directions_travel','requests_clarification','reading_messages','customer_conversations']),
 offline_preferred boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.assessment_learner_goals enable row level security;
revoke all on public.assessment_learner_goals from public,anon,authenticated;
grant select,insert,update on public.assessment_learner_goals to service_role;
alter table public.assessment_support_capabilities add column goal_tags text[] not null default '{}'
 check(goal_tags<@array['everyday_conversation','numbers_measurements','directions_travel','requests_clarification','reading_messages','customer_conversations']);
create index assessment_support_goal_tags_idx on public.assessment_support_capabilities using gin(goal_tags);
alter table public.assessment_recommendations alter column attempt_id drop not null;
alter table public.assessment_recommendations
 add column basis text not null default 'assessment_gap' check(basis in ('assessment_gap','learner_goal')),
 add column goal_snapshot jsonb,
 add constraint assessment_recommendation_basis check(
  (basis='assessment_gap' and attempt_id is not null and goal_snapshot is null) or
  (basis='learner_goal' and attempt_id is null and goal_snapshot is not null and
    jsonb_typeof(goal_snapshot)='object' and goal_snapshot ?& array['revision','topics','offlinePreferred'] and
    jsonb_typeof(goal_snapshot->'topics')='array' and jsonb_typeof(evidence)='array' and jsonb_array_length(evidence)=0));
create unique index assessment_goal_suggestion_once_idx on public.assessment_recommendations(enrollment_id,capability_id,((goal_snapshot->>'revision')::integer)) where basis='learner_goal';

create function public.assessment_save_goals(p_actor uuid,p_enrollment uuid,p_topics text[],p_offline boolean,p_expected integer,p_request uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare en public.assessment_enrollments; current_revision integer; normalized text[]; payload jsonb; event public.assessment_events;
begin
 select * into en from public.assessment_enrollments where id=p_enrollment for update;
 if en.id is null or en.user_id<>p_actor or not assessment_private.can_read(p_actor,en.id) then raise exception 'Learner goal access required'; end if;
 if en.role<>'primary' or en.status='archived' then raise exception 'Choose a current primary learning plan'; end if;
 if p_topics is null or array_position(p_topics,null) is not null or cardinality(p_topics)>3 or
  not p_topics<@array['everyday_conversation','numbers_measurements','directions_travel','requests_clarification','reading_messages','customer_conversations'] or p_offline is null or p_expected is null or p_request is null then raise exception 'Choose up to three valid learner goals'; end if;
 select coalesce(array_agg(distinct topic order by topic),'{}'::text[]) into normalized from unnest(p_topics) topic;
 if cardinality(normalized)<>cardinality(p_topics) then raise exception 'Choose distinct learner goals'; end if;
 payload:=jsonb_build_object('topics',normalized,'offlinePreferred',p_offline,'expectedRevision',p_expected);
 select * into event from public.assessment_events where enrollment_id=en.id and request_id=p_request and action='goals.changed';
 if event.id is not null then
  if event.actor_id is distinct from p_actor or event.detail->'payload' is distinct from payload then raise exception 'Learner goal request key reused'; end if;
  return (event.detail->>'revision')::integer;
 end if;
 select coalesce((select revision from public.assessment_learner_goals where enrollment_id=en.id),0) into current_revision;
 if current_revision<>p_expected then raise exception 'Learner goals conflict; refresh before saving'; end if;
 insert into public.assessment_learner_goals(enrollment_id,revision,topics,offline_preferred)
 values(en.id,current_revision+1,normalized,p_offline)
 on conflict(enrollment_id) do update set revision=excluded.revision,topics=excluded.topics,offline_preferred=excluded.offline_preferred,updated_at=now();
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
 values(en.id,p_actor,'goals.changed',p_request,jsonb_build_object('payload',payload,'revision',current_revision+1,'reason','Learner updated optional goals. Existing work and supporting assignments are unchanged.'));
 return current_revision+1;
end $$;
revoke all on function public.assessment_save_goals(uuid,uuid,text[],boolean,integer,uuid) from public,anon,authenticated;
grant execute on function public.assessment_save_goals(uuid,uuid,text[],boolean,integer,uuid) to service_role;

-- Goal eligibility checks reviewed content, explicit choice, prerequisites and duplicate mastery.
-- Empty or missing scores are never manufactured into evidence for a goal-based request.
create function assessment_private.goal_support_eligible(p_actor uuid,p_enrollment uuid,p_capability text,p_revision integer)
returns boolean language plpgsql stable security invoker set search_path='' as $$
declare en public.assessment_enrollments; cap public.assessment_support_capabilities; rel public.assessment_releases; goals public.assessment_learner_goals; demonstrated text[];
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
 return cap.prerequisite_objectives<@demonstrated and not cap.lesson_ids<@demonstrated;
end $$;
revoke all on function assessment_private.goal_support_eligible(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function assessment_private.goal_support_eligible(uuid,uuid,text,integer) to service_role;

create function public.assessment_suggest_goal_support(p_actor uuid,p_enrollment uuid,p_capability text,p_revision integer,p_why text,p_request uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare en public.assessment_enrollments; cap public.assessment_support_capabilities; goals public.assessment_learner_goals; result uuid; prior public.assessment_recommendations;
begin
 select * into en from public.assessment_enrollments where id=p_enrollment for update;
 if en.id is null or not assessment_private.can_manage(p_actor,en.id) then raise exception 'Assessment plan approval access required'; end if;
 if p_why is null or length(trim(p_why)) not between 3 and 2000 or p_request is null then raise exception 'Support rationale required'; end if;
 if p_revision is null or p_revision<1 then raise exception 'Valid learner goal revision required'; end if;
 select * into prior from public.assessment_recommendations where created_by=p_actor and request_id=p_request;
 if prior.id is not null then
  if prior.basis<>'learner_goal' or prior.enrollment_id<>en.id or prior.capability_id<>p_capability or (prior.goal_snapshot->>'revision')::integer<>p_revision or prior.why<>trim(p_why) then raise exception 'Support request key reused'; end if;
  return prior.id;
 end if;
 if (select count(*) from public.assessment_recommendations where enrollment_id=en.id and decision in ('suggested','deferred'))>=2 then raise exception 'Review the two existing suggestions first'; end if;
 if not assessment_private.goal_support_eligible(p_actor,en.id,p_capability,p_revision) then raise exception 'Learner goal or reviewed content changed; refresh before suggesting support'; end if;
 select * into cap from public.assessment_support_capabilities where id=p_capability;
 select * into goals from public.assessment_learner_goals where enrollment_id=en.id;
 insert into public.assessment_recommendations(enrollment_id,attempt_id,capability_id,capability_version,evidence,why,created_by,request_id,basis,goal_snapshot)
 values(en.id,null,cap.id,cap.version,'[]'::jsonb,trim(p_why),p_actor,p_request,'learner_goal',jsonb_build_object('revision',goals.revision,'topics',goals.topics,'offlinePreferred',goals.offline_preferred)) returning id into result;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
 values(en.id,p_actor,'recommendation.created',p_request,jsonb_build_object('recommendationId',result,'basis','learner_goal','goalRevision',goals.revision,'reason',trim(p_why)));
 return result;
end $$;
revoke all on function public.assessment_suggest_goal_support(uuid,uuid,text,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_suggest_goal_support(uuid,uuid,text,integer,text,uuid) to service_role;

create function assessment_private.support_recommendation_current(p_actor uuid,p_recommendation uuid) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare q public.assessment_recommendations;
begin
 select * into q from public.assessment_recommendations where id=p_recommendation;
 if q.basis='learner_goal' then
  return assessment_private.goal_support_eligible(p_actor,q.enrollment_id,q.capability_id,(q.goal_snapshot->>'revision')::integer);
 end if;
 return jsonb_array_length(assessment_private.support_evidence(p_actor,q.attempt_id,q.capability_id))>=3;
end $$;
revoke all on function assessment_private.support_recommendation_current(uuid,uuid) from public,anon,authenticated;
grant execute on function assessment_private.support_recommendation_current(uuid,uuid) to service_role;

-- Preserve existing approval, budget, targeted/full schedule and retry contracts.
create or replace function public.assessment_decide_support(
 p_actor uuid,p_recommendation uuid,p_decision text,p_reason text,p_units text[],
 p_primary_minutes integer,p_support_minutes integer,p_cap_percent integer,p_mode text,
 p_start date,p_timezone text,p_followup_days integer,p_request uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.assessment_recommendations; en public.assessment_enrollments; cap public.assessment_support_capabilities; rel public.assessment_releases;
 assignment public.assessment_support_assignments; target_enrollment uuid; result uuid; units text[]; stage record; payload text;
begin
 select e.* into en from public.assessment_enrollments e join public.assessment_recommendations rec on rec.enrollment_id=e.id where rec.id=p_recommendation for update of e;
 if en.id is null or not assessment_private.can_manage(p_actor,en.id) then raise exception 'Assessment plan approval access required'; end if;
 select * into q from public.assessment_recommendations where id=p_recommendation for update;
 if p_decision not in ('approved','deferred','dismissed') or p_reason is null or length(trim(p_reason)) not between 3 and 2000 then raise exception 'Support decision and reason required'; end if;
 payload:=md5(jsonb_build_object('recommendation',p_recommendation,'decision',p_decision,'reason',trim(p_reason),'units',p_units,'primaryMinutes',p_primary_minutes,'supportMinutes',p_support_minutes,'capPercent',p_cap_percent,'mode',p_mode,'start',p_start,'timezone',p_timezone,'followupDays',p_followup_days)::text);
 if exists(select 1 from public.assessment_events where enrollment_id=en.id and request_id=p_request and action='support.decision') then
  if not exists(select 1 from public.assessment_events where enrollment_id=en.id and request_id=p_request and action='support.decision' and detail->>'payloadHash'=payload) then raise exception 'Support decision key reused'; end if;
  return (select detail->'result' from public.assessment_events where enrollment_id=en.id and request_id=p_request and action='support.decision');
 end if;
 if q.decision not in ('suggested','deferred') then raise exception 'This support suggestion already has a final decision'; end if;
 if p_decision='approved' then
  if en.status<>'active' then raise exception 'Resume the primary plan before assigning support'; end if;
  select * into cap from public.assessment_support_capabilities where id=q.capability_id;
  select * into rel from public.assessment_releases where id=cap.release_id;
  if cap.version<>q.capability_version or not assessment_private.verified_support_capability(cap.id)
   or not assessment_private.support_recommendation_current(p_actor,q.id) then raise exception 'Support evidence or reviewed content changed; review again'; end if;
  if p_primary_minutes is null or p_primary_minutes not between 20 and 1200 or p_support_minutes is null or p_support_minutes not between 1 and 180
   or p_cap_percent is null or p_cap_percent not between 1 and 50 or p_support_minutes*100>p_cap_percent*(p_primary_minutes+p_support_minutes) then raise exception 'Support exceeds the approved study-time budget'; end if;
  if p_cap_percent<>20 and length(trim(p_reason))<20 then raise exception 'Explain the change from the default 80/20 study budget'; end if;
  if p_mode not in ('units','full_module') then raise exception 'Choose targeted units or a full additional module'; end if;
  if exists(select 1 from public.assessment_support_assignments where user_id=en.user_id and organization_id is not distinct from en.organization_id and status in ('active','paused','checkpoint_due')) then raise exception 'Review the existing active supporting module first'; end if;
  if p_mode='full_module' then
   if length(trim(p_reason))<20 then raise exception 'Explain why the learner goal requires the full additional module'; end if;
   select array_agg(value) into units from jsonb_array_elements_text(rel.lesson_manifest->'lessonIds');
   if p_units is not null and p_units<>units then raise exception 'A full module includes its complete curriculum'; end if;
  else
   if not exists(select 1 from public.assessment_forms f where f.id=cap.before_form_id and f.purpose='support' and f.support_capability_id=cap.id and f.status='verified' and f.calibrated)
    or not exists(select 1 from public.assessment_forms f where f.id=cap.after_form_id and f.purpose='support' and f.support_capability_id=cap.id and f.status='verified' and f.calibrated) then raise exception 'Targeted before/after checks are not reviewed for these units'; end if;
   if p_followup_days is null or p_followup_days not between 1 and 90 then raise exception 'Choose when to revisit the supporting units'; end if;
   units:=coalesce(p_units,cap.lesson_ids);
   if cardinality(units) not between 1 and cardinality(cap.lesson_ids) or not units<@cap.lesson_ids
    or cardinality(units)<>(select count(distinct unit) from unnest(units) unit) then raise exception 'Choose distinct reviewed supporting units'; end if;
  end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) or p_start is null then raise exception 'Choose a support start date and timezone'; end if;
  if p_mode='full_module' then
   if en.organization_id is not null then
    -- Existing paid team membership is retained. This records the approved module;
    -- it sends no invitation, email or certificate and preserves other assignments.
    insert into public.team_assignments(organization_id,user_id,module_id) values(en.organization_id,en.user_id,rel.module_id) on conflict(organization_id,user_id,module_id) do nothing;
   end if;
   target_enrollment:=public.assessment_create_enrollment(p_actor,en.user_id,en.organization_id,rel.id,p_start,p_timezone,p_request);
   update public.assessment_enrollments set role='support' where id=target_enrollment;
  else
   insert into public.assessment_enrollments(user_id,organization_id,scope,release_id,module_id,target_language,instruction_language,role,start_date,timezone,created_by,request_id,program_scope,support_capability_id)
    values(en.user_id,en.organization_id,en.scope,rel.id,rel.module_id,rel.target_language,rel.instruction_language,'support',p_start,p_timezone,p_actor,p_request,'support_units',cap.id) returning id into target_enrollment;
   -- Dates are suggested short-check dates, not another 90-day deadline.
   for stage in select * from (values('entrance',0),('day90',p_followup_days)) as checks(kind,days) loop
    if ((((p_start+stage.days)::timestamp+interval '12 hours') at time zone p_timezone) at time zone p_timezone)::date<>p_start+stage.days then raise exception 'Local support-check date unavailable'; end if;
    insert into public.assessment_checkpoints(enrollment_id,checkpoint,due_date,due_at)
     values(target_enrollment,stage.kind,p_start+stage.days,((p_start+stage.days)::timestamp+interval '12 hours') at time zone p_timezone);
   end loop;
  end if;
  insert into public.assessment_support_assignments(recommendation_id,enrollment_id,user_id,organization_id,capability_snapshot,mode,support_enrollment_id,primary_weekly_minutes,support_weekly_minutes,support_cap_percent,budget_reason,approved_by,request_id)
   values(q.id,en.id,en.user_id,en.organization_id,jsonb_build_object('capabilityId',cap.id,'version',cap.version,'releaseId',rel.id,'contentVersion',rel.content_version,'moduleId',rel.module_id,'title',cap.title,'lessonIds',units,'targetLanguage',rel.target_language,'instructionLanguage',rel.instruction_language,'offlineAvailable',cap.offline_available,'estimatedWeeklyMinutes',cap.weekly_minutes,'basis',q.basis,'goalSnapshot',q.goal_snapshot),p_mode,target_enrollment,p_primary_minutes,p_support_minutes,p_cap_percent,trim(p_reason),p_actor,p_request)
   returning id into result;
 end if;
 update public.assessment_recommendations set decision=p_decision,decision_reason=trim(p_reason),decided_by=p_actor,decided_at=now() where id=q.id;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
  values(en.id,p_actor,'support.decision',p_request,jsonb_build_object('payloadHash',payload,'result',jsonb_build_object('recommendationId',q.id,'assignmentId',result,'supportEnrollmentId',target_enrollment,'decision',p_decision),'reason',trim(p_reason)));
 return jsonb_build_object('recommendationId',q.id,'assignmentId',result,'supportEnrollmentId',target_enrollment,'decision',p_decision);
end $$;
revoke all on function public.assessment_decide_support(uuid,uuid,text,text,text[],integer,integer,integer,text,date,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.assessment_decide_support(uuid,uuid,text,text,text[],integer,integer,integer,text,date,text,integer,uuid) to service_role;

-- Candidate previews distinguish goal requests from assessed gaps. Neither assigns work.
create or replace function public.assessment_support_candidates(p_actor uuid,p_enrollment uuid,p_attempt uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare en public.assessment_enrollments; attempt public.assessment_attempts; goals public.assessment_learner_goals; slots integer; result jsonb; use_assessment boolean;
begin
 select * into en from public.assessment_enrollments where id=p_enrollment;
 if en.id is null or not assessment_private.can_manage(p_actor,en.id) then raise exception 'Assessment plan approval access required'; end if;
 if p_attempt is not null then
  select a.* into attempt from public.assessment_attempts a join public.assessment_checkpoints cp on cp.id=a.checkpoint_id where a.id=p_attempt and cp.enrollment_id=en.id;
  if attempt.id is null then raise exception 'Source assessment belongs to another plan'; end if;
 end if;
 if en.status<>'active' or en.role<>'primary' or en.program_scope<>'full_module' then return '[]'::jsonb; end if;
 select * into goals from public.assessment_learner_goals where enrollment_id=en.id;
 use_assessment:=attempt.id is not null and attempt.submitted_at is not null and not coalesce((attempt.form_snapshot->>'pilot')::boolean,false) and coalesce((attempt.form_snapshot->>'calibrated')::boolean,false);
 slots:=greatest(0,2-(select count(*)::integer from public.assessment_recommendations where enrollment_id=en.id and decision in ('suggested','deferred')));
 select coalesce(jsonb_agg(candidate),'[]'::jsonb) into result from (
  select jsonb_build_object('capabilityId',cap.id,'version',cap.version,'moduleId',rel.module_id,'title',cap.title,'lessonIds',cap.lesson_ids,'weeklyMinutes',cap.weekly_minutes,'offlineAvailable',cap.offline_available,'assignmentMode',cap.assignment_mode,
   'sourceAttemptId',case when jsonb_array_length(evidence.items)>=3 then attempt.id else null end,
   'assessedAt',case when jsonb_array_length(evidence.items)>=3 then attempt.submitted_at else null end,
   'basis',case when jsonb_array_length(evidence.items)>=3 then 'assessment_gap' else 'learner_goal' end,
   'goalRevision',case when jsonb_array_length(evidence.items)<3 then goals.revision else null end,
   'matchedGoals',to_jsonb(array(select distinct tag from unnest(cap.goal_tags) tag where tag=any(goals.topics) order by tag)),
   'evidence',evidence.items) candidate
  from public.assessment_support_capabilities cap join public.assessment_releases rel on rel.id=cap.release_id
  cross join lateral(select case when use_assessment then assessment_private.support_evidence(p_actor,attempt.id,cap.id) else '[]'::jsonb end items) evidence
  where cap.status='verified' and rel.target_language=en.target_language and rel.instruction_language=en.instruction_language and rel.module_id<>en.module_id
  and (jsonb_array_length(evidence.items)>=3 or assessment_private.goal_support_eligible(p_actor,en.id,cap.id,goals.revision))
  and not exists(select 1 from public.assessment_recommendations prior where prior.enrollment_id=en.id and prior.capability_id=cap.id and
    ((jsonb_array_length(evidence.items)>=3 and prior.attempt_id=attempt.id) or
     (jsonb_array_length(evidence.items)<3 and prior.basis='learner_goal' and (prior.goal_snapshot->>'revision')::integer=goals.revision)))
  and not exists(select 1 from public.assessment_enrollments other where other.user_id=en.user_id and other.scope=en.scope and other.organization_id is not distinct from en.organization_id and other.module_id=rel.module_id and other.target_language=en.target_language and other.instruction_language=en.instruction_language and other.status<>'archived')
  order by (jsonb_array_length(evidence.items)>=3) desc,
   (select count(distinct tag) from unnest(cap.goal_tags) tag where tag=any(goals.topics)) desc,
   (select count(*) from jsonb_array_elements(evidence.items) item where (item->>'points')::numeric<(item->>'maximum')::numeric) desc,
   (coalesce(goals.offline_preferred,false) and cap.offline_available) desc,cap.weekly_minutes,cap.offline_available desc,cap.id
  limit slots
 ) ranked;
 return result;
end $$;
revoke all on function public.assessment_support_candidates(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.assessment_support_candidates(uuid,uuid,uuid) to service_role;
