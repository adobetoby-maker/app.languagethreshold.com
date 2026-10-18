-- Reviewed curriculum mappings, suggestions, and explicit support-plan approvals.
-- This migration publishes no content and assigns no real learner.
create table public.assessment_support_capabilities (
 id text primary key check(length(id) between 3 and 160),
 release_id text not null references public.assessment_releases(id),
 title text not null check(length(title) between 3 and 200),
 gap_objectives text[] not null check(cardinality(gap_objectives)>=3),
 prerequisite_objectives text[] not null default '{}',
 lesson_ids text[] not null check(cardinality(lesson_ids) between 1 and 30),
 weekly_minutes integer not null check(weekly_minutes between 1 and 180),
 offline_available boolean not null default false,
 status text not null default 'draft' check(status in ('draft','verified','retired')),
 review_records jsonb not null default '[]' check(jsonb_typeof(review_records)='array'),
 version text not null,
 created_at timestamptz not null default now(),
 check(status<>'verified' or jsonb_array_length(review_records)>=3)
);
create table public.assessment_recommendations (
 id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references public.assessment_enrollments(id),
 attempt_id uuid not null references public.assessment_attempts(id),
 capability_id text not null references public.assessment_support_capabilities(id),
 evidence jsonb not null check(jsonb_typeof(evidence)='array'),
 why text not null check(length(why) between 3 and 2000),
 decision text not null default 'suggested' check(decision in ('suggested','approved','deferred','dismissed')),
 decision_reason text,
 decided_by uuid references auth.users(id),
 decided_at timestamptz,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 request_id uuid not null,
 unique(created_by,request_id),
 unique(enrollment_id,attempt_id,capability_id)
);
create table public.assessment_support_assignments (
 id uuid primary key default gen_random_uuid(),
 recommendation_id uuid not null unique references public.assessment_recommendations(id),
 enrollment_id uuid not null references public.assessment_enrollments(id),
 user_id uuid not null references auth.users(id),
 organization_id uuid references public.team_organizations(id),
 capability_snapshot jsonb not null,
 mode text not null check(mode in ('units','full_module')),
 support_enrollment_id uuid not null references public.assessment_enrollments(id),
 primary_weekly_minutes integer not null check(primary_weekly_minutes between 20 and 1200),
 support_weekly_minutes integer not null check(support_weekly_minutes between 1 and 180),
 support_cap_percent integer not null default 20 check(support_cap_percent between 1 and 50),
 budget_reason text not null check(length(budget_reason) between 3 and 2000),
 status text not null default 'active' check(status in ('active','paused','checkpoint_due','completed','withdrawn')),
 approved_by uuid not null references auth.users(id),
 approved_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 request_id uuid not null,
 unique(approved_by,request_id),
 check(support_weekly_minutes*100 <= support_cap_percent*(primary_weekly_minutes+support_weekly_minutes))
);
create unique index assessment_one_support_active_idx on public.assessment_support_assignments(user_id,organization_id) nulls not distinct
 where status in ('active','paused','checkpoint_due');
create table public.assessment_plan_revisions (
 id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references public.assessment_enrollments(id),
 source_attempt_id uuid not null references public.assessment_attempts(id),
 revision integer not null check(revision>0),
 suggested_lesson integer not null check(suggested_lesson between 1 and 30),
 focus_ways text[] not null check(cardinality(focus_ways) between 1 and 6 and focus_ways<@array['see','recall','hear','type','say','write']),
 catchup_objectives text[] not null default '{}',
 rationale text not null check(length(rationale) between 3 and 2000),
 evidence jsonb not null check(jsonb_typeof(evidence)='array'),
 approved_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 request_id uuid not null,
 unique(enrollment_id,revision),
 unique(approved_by,request_id)
);
do $$ declare name text; begin
 foreach name in array array['assessment_support_capabilities','assessment_recommendations','assessment_support_assignments','assessment_plan_revisions'] loop
  execute format('alter table public.%I enable row level security',name);
  execute format('revoke all on public.%I from public,anon,authenticated',name);
  execute format('grant all on public.%I to service_role',name);
 end loop;
end $$;
create index assessment_recommendation_enrollment_idx on public.assessment_recommendations(enrollment_id,created_at desc);
create index assessment_support_enrollment_idx on public.assessment_support_assignments(enrollment_id,status);
create index assessment_plan_history_idx on public.assessment_plan_revisions(enrollment_id,revision desc);
create trigger assessment_plan_history_immutable before update or delete on public.assessment_plan_revisions
 for each row execute function assessment_private.guard_evidence_update();
revoke update,delete on public.assessment_plan_revisions from service_role;

-- Targeted before/after checks use the same attempt/response/scoring engine,
-- but never appear as another full 90-day enrollment or as full-module readiness.
alter table public.assessment_forms
 add column purpose text not null default 'module' check(purpose in ('module','support')),
 add column support_capability_id text references public.assessment_support_capabilities(id),
 add constraint assessment_form_purpose_matches check((purpose='support')=(support_capability_id is not null)),
 add constraint assessment_support_form_stage check(purpose='module' or checkpoint<>'day45');
alter table public.assessment_enrollments
 add column program_scope text not null default 'full_module' check(program_scope in ('full_module','support_units')),
 add column support_capability_id text references public.assessment_support_capabilities(id),
 add constraint assessment_enrollment_purpose_matches check((program_scope='support_units')=(support_capability_id is not null));
alter table public.assessment_support_capabilities
 add column assignment_mode text not null default 'units' check(assignment_mode in ('units','full_module')),
 add column before_form_id text references public.assessment_forms(id),
 add column after_form_id text references public.assessment_forms(id),
 add constraint assessment_units_checks_required check(status<>'verified' or assignment_mode='full_module' or (before_form_id is not null and after_form_id is not null));

create function assessment_private.verified_support_release(p_release text) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.assessment_releases r where r.id=p_release and r.status='verified'
  and r.lesson_manifest->>'reviewed'='true' and (r.lesson_manifest->>'lessonCount')::integer>=30
  and not exists(select 1 from (values('entrance'),('day45'),('day90')) kinds(kind)
   where not exists(select 1 from public.assessment_forms f where f.release_id=r.id and f.checkpoint=kinds.kind and f.purpose='module' and f.status='verified' and f.calibrated)));
$$;
revoke all on function assessment_private.verified_support_release(text) from public,anon,authenticated;
grant execute on function assessment_private.verified_support_release(text) to service_role;
create function assessment_private.verified_support_capability(p_capability text) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.assessment_support_capabilities cap join public.assessment_releases rel on rel.id=cap.release_id
  where cap.id=p_capability and cap.status='verified' and assessment_private.verified_support_release(cap.release_id)
  and (not cap.offline_available or rel.lesson_manifest->>'offlineVerified'='true')
  and not exists(select 1 from unnest(cap.lesson_ids) lesson where not (rel.lesson_manifest->'lessonIds') ? lesson)
  and (cap.assignment_mode='full_module' or (
   exists(select 1 from public.assessment_forms f where f.id=cap.before_form_id and f.support_capability_id=cap.id and f.release_id=cap.release_id and f.purpose='support' and f.checkpoint='entrance' and f.status='verified' and f.calibrated)
   and exists(select 1 from public.assessment_forms f where f.id=cap.after_form_id and f.support_capability_id=cap.id and f.release_id=cap.release_id and f.purpose='support' and f.checkpoint='day90' and f.status='verified' and f.calibrated)
  )));
$$;
revoke all on function assessment_private.verified_support_capability(text) from public,anon,authenticated;
grant execute on function assessment_private.verified_support_capability(text) to service_role;

alter table public.assessment_support_capabilities add column evidence_max_age_days integer not null default 90 check(evidence_max_age_days between 1 and 365);
alter table public.assessment_recommendations add column capability_version text not null;

-- A verified mapping changes by publishing a new version, never by rewriting a served suggestion.
create function assessment_private.guard_support_mapping() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if old.status<>'draft' and (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then
  raise exception 'Verified support mapping is immutable; publish a new version';
 end if;
 return new;
end $$;
revoke all on function assessment_private.guard_support_mapping() from public,anon,authenticated;
create trigger assessment_support_mapping_frozen before update on public.assessment_support_capabilities
 for each row execute function assessment_private.guard_support_mapping();

create function assessment_private.support_evidence(p_actor uuid,p_attempt uuid,p_capability text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare cap public.assessment_support_capabilities; en public.assessment_enrollments; a public.assessment_attempts; rel public.assessment_releases; evidence jsonb;
begin
 select * into cap from public.assessment_support_capabilities where id=p_capability;
 select * into a from public.assessment_attempts where id=p_attempt;
 select e.* into en from public.assessment_enrollments e join public.assessment_checkpoints c on c.enrollment_id=e.id where c.id=a.checkpoint_id;
 if en.id is null or not assessment_private.can_read(p_actor,en.id) then raise exception 'Assessment recommendation access required'; end if;
 select * into rel from public.assessment_releases where id=cap.release_id;
 if en.role<>'primary' or en.program_scope<>'full_module' or a.submitted_at is null or coalesce((a.form_snapshot->>'pilot')::boolean,false)
  or not coalesce((a.form_snapshot->>'calibrated')::boolean,false) or not assessment_private.verified_support_capability(p_capability)
  or a.submitted_at<now()-make_interval(days=>cap.evidence_max_age_days)
  or rel.module_id=en.module_id or rel.target_language<>en.target_language or rel.instruction_language<>en.instruction_language then return '[]'::jsonb; end if;
 -- Prerequisites require assessed evidence in the same personal/team scope; a team
 -- recommendation cannot pull evidence from the learner's private enrollments.
 if exists(select 1 from unnest(cap.prerequisite_objectives) prerequisite where not exists(
  select 1 from public.assessment_enrollments pe join public.assessment_checkpoints pc on pc.enrollment_id=pe.id
  join public.assessment_attempts pa on pa.checkpoint_id=pc.id join public.assessment_responses pr on pr.attempt_id=pa.id
  join lateral(select * from public.assessment_score_events s where s.response_id=pr.id order by revision desc limit 1) score on true
  where pe.user_id=en.user_id and pe.scope=en.scope and pe.organization_id is not distinct from en.organization_id
  and pe.target_language=en.target_language and pe.instruction_language=en.instruction_language
  and coalesce((pa.form_snapshot->>'calibrated')::boolean,false) and not coalesce((pa.form_snapshot->>'pilot')::boolean,false)
  and pa.submitted_at>=now()-make_interval(days=>cap.evidence_max_age_days)
  and score.objective_id=prerequisite and score.state='scored' and score.source<>'ai_proposal' and score.points=score.maximum
 )) then return '[]'::jsonb; end if;
 with latest as (
  select response.item_id,score.* from public.assessment_responses response
  join lateral(select * from public.assessment_score_events s where s.response_id=response.id order by revision desc limit 1) score on true
  where response.attempt_id=a.id and score.state='scored' and score.source<>'ai_proposal' and score.objective_id=any(cap.gap_objectives)
  and score.coverage<>'transfer'
 ), eligible as (
  select skill from latest group by skill having count(distinct objective_id)>=3 and bool_or(points<maximum)
 ) select coalesce(jsonb_agg(jsonb_build_object('itemId',item_id,'scoreEventId',id,'objectiveId',objective_id,'skill',skill,'points',points,'maximum',maximum,'source',source,'scoredRevision',revision)),'[]'::jsonb)
 into evidence from latest where skill in (select skill from eligible);
 return evidence;
end $$;
revoke all on function assessment_private.support_evidence(uuid,uuid,text) from public,anon,authenticated;
grant execute on function assessment_private.support_evidence(uuid,uuid,text) to service_role;

create function public.assessment_suggest_support(p_actor uuid,p_enrollment uuid,p_attempt uuid,p_capability text,p_why text,p_request uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare en public.assessment_enrollments; cap public.assessment_support_capabilities; evidence jsonb; result uuid;
begin
 select * into en from public.assessment_enrollments where id=p_enrollment for update;
 if en.id is null or not assessment_private.can_manage(p_actor,en.id) then raise exception 'Assessment plan approval access required'; end if;
 if en.status<>'active' then raise exception 'Resume the primary plan before suggesting support'; end if;
 select id into result from public.assessment_recommendations where created_by=p_actor and request_id=p_request;
 if result is not null then
  if not exists(select 1 from public.assessment_recommendations where id=result and enrollment_id=p_enrollment and attempt_id=p_attempt and capability_id=p_capability and why=trim(p_why)) then raise exception 'Support request key reused'; end if;
  return result;
 end if;
 if not exists(select 1 from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id where a.id=p_attempt and c.enrollment_id=en.id) then raise exception 'Source assessment belongs to another plan'; end if;
 if p_why is null or length(trim(p_why)) not between 3 and 2000 then raise exception 'Support rationale required'; end if;
 if (select count(*) from public.assessment_recommendations where enrollment_id=en.id and decision in ('suggested','deferred'))>=2 then raise exception 'Review the two existing suggestions first'; end if;
 select * into cap from public.assessment_support_capabilities where id=p_capability;
 evidence:=assessment_private.support_evidence(p_actor,p_attempt,p_capability);
 if jsonb_array_length(evidence)<3 then raise exception 'Reviewed content and sufficient recent assessment evidence are required'; end if;
 if exists(select 1 from public.assessment_enrollments other join public.assessment_releases rel on rel.id=cap.release_id where other.user_id=en.user_id and other.scope=en.scope and other.organization_id is not distinct from en.organization_id and other.module_id=rel.module_id and other.target_language=en.target_language and other.instruction_language=en.instruction_language and other.status<>'archived') then raise exception 'Learner already has this module; review the existing plan'; end if;
 insert into public.assessment_recommendations(enrollment_id,attempt_id,capability_id,capability_version,evidence,why,created_by,request_id)
 values(en.id,p_attempt,cap.id,cap.version,evidence,trim(p_why),p_actor,p_request) returning id into result;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
 values(en.id,p_actor,'recommendation.created',p_request,jsonb_build_object('recommendationId',result,'attemptId',p_attempt,'capabilityId',cap.id,'evidence',evidence));
 return result;
end $$;
revoke all on function public.assessment_suggest_support(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_suggest_support(uuid,uuid,uuid,text,text,uuid) to service_role;

create function public.assessment_decide_support(
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
   or jsonb_array_length(assessment_private.support_evidence(p_actor,q.attempt_id,cap.id))<3 then raise exception 'Support evidence or reviewed content changed; review again'; end if;
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
   values(q.id,en.id,en.user_id,en.organization_id,jsonb_build_object('capabilityId',cap.id,'version',cap.version,'releaseId',rel.id,'contentVersion',rel.content_version,'moduleId',rel.module_id,'title',cap.title,'lessonIds',units,'targetLanguage',rel.target_language,'instructionLanguage',rel.instruction_language,'offlineAvailable',cap.offline_available,'estimatedWeeklyMinutes',cap.weekly_minutes),p_mode,target_enrollment,p_primary_minutes,p_support_minutes,p_cap_percent,trim(p_reason),p_actor,p_request)
   returning id into result;
 end if;
 update public.assessment_recommendations set decision=p_decision,decision_reason=trim(p_reason),decided_by=p_actor,decided_at=now() where id=q.id;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
  values(en.id,p_actor,'support.decision',p_request,jsonb_build_object('payloadHash',payload,'result',jsonb_build_object('recommendationId',q.id,'assignmentId',result,'supportEnrollmentId',target_enrollment,'decision',p_decision),'reason',trim(p_reason)));
 return jsonb_build_object('recommendationId',q.id,'assignmentId',result,'supportEnrollmentId',target_enrollment,'decision',p_decision);
end $$;
revoke all on function public.assessment_decide_support(uuid,uuid,text,text,text[],integer,integer,integer,text,date,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.assessment_decide_support(uuid,uuid,text,text,text[],integer,integer,integer,text,date,text,integer,uuid) to service_role;

-- Full exams and short checks share the authoritative attempt engine.
create or replace function public.assessment_start_attempt(p_actor uuid,p_checkpoint uuid,p_form text,p_request uuid,p_allow_pilot boolean default false,p_studied_objectives text[] default '{}'::text[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare cp public.assessment_checkpoints; en public.assessment_enrollments; form public.assessment_forms; result uuid; ordinal integer; frozen_definition jsonb; support public.assessment_support_assignments; cap public.assessment_support_capabilities; units text[];
begin
 select * into cp from public.assessment_checkpoints where id=p_checkpoint for update;
 select * into en from public.assessment_enrollments where id=cp.enrollment_id;
 if en.id is null or en.user_id<>p_actor or not assessment_private.can_read(p_actor,en.id) then raise exception 'Learner assessment access required'; end if;
 select id into result from public.assessment_attempts where checkpoint_id=p_checkpoint and start_request_id=p_request;
 if result is not null then return result; end if;
 if en.status<>'active' or cp.status<>'scheduled' then raise exception 'Assessment plan is paused or checkpoint exempt'; end if;
 -- Resume the one authoritative open attempt, regardless of device request key.
 select id into result from public.assessment_attempts where checkpoint_id=p_checkpoint and status='in_progress';
 if result is not null then return result; end if;
 select * into form from public.assessment_forms where id=p_form and release_id=en.release_id and checkpoint=cp.checkpoint;
 if form.id is null then raise exception 'Assessment form unavailable'; end if;
 if not coalesce(p_allow_pilot,false) and (form.status<>'verified' or not exists(select 1 from public.assessment_releases where id=en.release_id and status='verified')) then raise exception 'Assessment content review is pending'; end if;
 if form.definition->'items' is null or jsonb_typeof(form.definition->'items')<>'array' or jsonb_array_length(form.definition->'items')<1 then raise exception 'Assessment form has no items'; end if;
 if cardinality(coalesce(p_studied_objectives,'{}'::text[]))>1000 then raise exception 'Invalid studied coverage'; end if;
 frozen_definition:=form.definition;
 if en.program_scope='support_units' then
  select * into cap from public.assessment_support_capabilities where id=en.support_capability_id;
  select * into support from public.assessment_support_assignments where support_enrollment_id=en.id and status in ('active','checkpoint_due');
  if support.id is null or form.purpose<>'support' or form.support_capability_id is distinct from cap.id
   or form.id is distinct from (case when cp.checkpoint='entrance' then cap.before_form_id when cp.checkpoint='day90' then cap.after_form_id else null end) then raise exception 'Targeted support check unavailable'; end if;
  select array_agg(value) into units from jsonb_array_elements_text(support.capability_snapshot->'lessonIds');
  frozen_definition:=jsonb_set(frozen_definition,'{items}',coalesce((select jsonb_agg(item order by items.ordinal) from jsonb_array_elements(form.definition->'items') with ordinality as items(item,ordinal) where item->>'objectiveId'=any(units)),'[]'::jsonb));
  if jsonb_array_length(frozen_definition->'items')=0 then raise exception 'No reviewed check items match these supporting units'; end if;
 elsif form.purpose<>'module' then raise exception 'A targeted check is not a full-module exam';
 end if;
 if cp.checkpoint='day45' then
  frozen_definition:=jsonb_set(frozen_definition,'{items}',(select jsonb_agg(jsonb_set(item,'{coverage}',to_jsonb(case when item->>'objectiveId'=any(coalesce(p_studied_objectives,'{}'::text[])) then 'studied'::text else 'transfer'::text end)) order by items.ordinal) from jsonb_array_elements(form.definition->'items') with ordinality as items(item,ordinal)));
 end if;
 select coalesce(max(attempt_number),0)+1 into ordinal from public.assessment_attempts where checkpoint_id=p_checkpoint;
 if ordinal>10 then raise exception 'Checkpoint attempt limit reached'; end if;
 insert into public.assessment_attempts(checkpoint_id,attempt_number,form_id,form_snapshot,start_request_id)
 values(p_checkpoint,ordinal,p_form,jsonb_build_object('formId',form.id,'version',form.version,'rubricVersion',form.rubric_version,'releaseId',en.release_id,'contentVersion',(select content_version from public.assessment_releases where id=en.release_id),'pilot',p_allow_pilot,'calibrated',form.calibrated and (en.program_scope='full_module' or units@>cap.lesson_ids),'programScope',en.program_scope,'supportAssignmentId',support.id,'unitLessonIds',units,'equivalenceGroup',form.equivalence_group,'equivalenceApproved',form.equivalence_approved,'definition',frozen_definition,'reportedStudiedObjectives',coalesce(p_studied_objectives,'{}'::text[])),p_request) returning id into result;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(en.id,p_actor,'attempt.started',p_request,jsonb_build_object('attemptId',result,'formId',form.id,'attemptNumber',ordinal,'pilot',p_allow_pilot));
 return result;
end $$;


alter table public.assessment_support_assignments add column acknowledged_at timestamptz;
create function public.assessment_change_support(p_actor uuid,p_assignment uuid,p_status text,p_reason text,p_request uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare en public.assessment_enrollments; assignment public.assessment_support_assignments; child public.assessment_enrollments; prior jsonb;
begin
 select e.* into en from public.assessment_enrollments e join public.assessment_support_assignments a on a.enrollment_id=e.id where a.id=p_assignment for update of e;
 if en.id is null or not assessment_private.can_manage(p_actor,en.id) then raise exception 'Assessment plan approval access required'; end if;
 select * into assignment from public.assessment_support_assignments where id=p_assignment for update;
 if p_status not in ('active','paused','completed','withdrawn') or p_reason is null or length(trim(p_reason)) not between 3 and 2000 then raise exception 'Support status and reason required'; end if;
 select detail into prior from public.assessment_events where enrollment_id=en.id and request_id=p_request and action='support.changed';
 if prior is not null then
  if prior->>'assignmentId'<>p_assignment::text or prior->>'status'<>p_status or prior->>'reason'<>trim(p_reason) then raise exception 'Support status request key reused'; end if;
  return p_status;
 end if;
 if assignment.status in ('completed','withdrawn') then raise exception 'Completed support history is preserved'; end if;
 select * into child from public.assessment_enrollments where id=assignment.support_enrollment_id for update;
 if p_status='completed' and not exists(select 1 from public.assessment_checkpoints c join public.assessment_attempts a on a.checkpoint_id=c.id where c.enrollment_id=child.id and c.checkpoint='day90' and a.submitted_at is not null and a.status='completed') then raise exception 'Complete and review the follow-up check before ending supporting practice'; end if;
 if p_status='paused' and child.status='active' then
  perform public.assessment_change_schedule(p_actor,child.id,child.revision,'pause',null,null,trim(p_reason),p_request);
 elsif p_status='active' and child.status='paused' then
  perform public.assessment_change_schedule(p_actor,child.id,child.revision,'resume',null,null,trim(p_reason),p_request);
 elsif p_status in ('completed','withdrawn') then
  update public.assessment_enrollments set status='archived',paused_on=null,revision=revision+1 where id=child.id;
 end if;
 update public.assessment_support_assignments set status=p_status,updated_at=now() where id=assignment.id;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
 values(en.id,p_actor,'support.changed',p_request,jsonb_build_object('assignmentId',assignment.id,'before',assignment.status,'status',p_status,'reason',trim(p_reason)));
 return p_status;
end $$;
revoke all on function public.assessment_change_support(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_change_support(uuid,uuid,text,text,uuid) to service_role;

create function public.assessment_acknowledge_support(p_actor uuid,p_assignment uuid,p_request uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare assignment public.assessment_support_assignments;
begin
 select * into assignment from public.assessment_support_assignments where id=p_assignment for update;
 if assignment.id is null or assignment.user_id<>p_actor or not assessment_private.can_read(p_actor,assignment.enrollment_id) then raise exception 'Learner support access required'; end if;
 if assignment.acknowledged_at is not null then return true; end if;
 update public.assessment_support_assignments set acknowledged_at=now() where id=assignment.id;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
 values(assignment.enrollment_id,p_actor,'support.acknowledged',p_request,jsonb_build_object('assignmentId',assignment.id));
 return true;
end $$;
revoke all on function public.assessment_acknowledge_support(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.assessment_acknowledge_support(uuid,uuid,uuid) to service_role;

create function public.assessment_revise_plan(p_actor uuid,p_enrollment uuid,p_attempt uuid,p_start_lesson integer,p_ways text[],p_catchup text[],p_reason text,p_request uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare en public.assessment_enrollments; attempt public.assessment_attempts; rel public.assessment_releases; result uuid; next_revision integer; evidence jsonb; prerequisite_id text; way text; needed text[]; prior public.assessment_plan_revisions;
begin
 select * into en from public.assessment_enrollments where id=p_enrollment for update;
 if en.id is null or not assessment_private.can_manage(p_actor,en.id) then raise exception 'Assessment plan approval access required'; end if;
 select * into prior from public.assessment_plan_revisions where approved_by=p_actor and request_id=p_request;
 if prior.id is not null then
  if prior.enrollment_id<>en.id or prior.source_attempt_id<>p_attempt or prior.suggested_lesson<>p_start_lesson or prior.focus_ways is distinct from p_ways or prior.catchup_objectives is distinct from p_catchup or prior.rationale is distinct from trim(p_reason) then raise exception 'Plan revision key reused'; end if;
  return prior.id;
 end if;
 select a.* into attempt from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id where a.id=p_attempt and c.enrollment_id=en.id;
 if en.status<>'active' or en.role<>'primary' or en.program_scope<>'full_module' or attempt.submitted_at is null
  or coalesce((attempt.form_snapshot->>'pilot')::boolean,false) or not coalesce((attempt.form_snapshot->>'calibrated')::boolean,false) then raise exception 'Reviewed primary-module evidence is required for an assessed plan revision'; end if;
 select * into rel from public.assessment_releases where id=en.release_id;
 if not assessment_private.verified_support_release(rel.id) then raise exception 'Primary curriculum and exams must be reviewed before plan personalization'; end if;
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
 insert into public.assessment_plan_revisions(enrollment_id,source_attempt_id,revision,suggested_lesson,focus_ways,catchup_objectives,rationale,evidence,approved_by,request_id)
 values(en.id,attempt.id,next_revision,p_start_lesson,p_ways,p_catchup,trim(p_reason),evidence,p_actor,p_request) returning id into result;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
 values(en.id,p_actor,'plan.revised',p_request,jsonb_build_object('planRevisionId',result,'revision',next_revision,'sourceAttemptId',attempt.id,'suggestedLesson',p_start_lesson,'focusWays',p_ways,'catchupObjectives',p_catchup,'reason',trim(p_reason)));
 return result;
end $$;
revoke all on function public.assessment_revise_plan(uuid,uuid,uuid,integer,text[],text[],text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_revise_plan(uuid,uuid,uuid,integer,text[],text[],text,uuid) to service_role;

-- Approval snapshots and the evidence behind suggestions remain reviewable.
create function assessment_private.guard_support_record() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if TG_TABLE_NAME='assessment_recommendations' then
  if (to_jsonb(new)-array['decision','decision_reason','decided_by','decided_at']) is distinct from (to_jsonb(old)-array['decision','decision_reason','decided_by','decided_at'])
   or (old.decision in ('approved','dismissed') and to_jsonb(new) is distinct from to_jsonb(old)) then raise exception 'Support suggestion evidence is immutable'; end if;
 else
  if (to_jsonb(new)-array['status','updated_at','acknowledged_at']) is distinct from (to_jsonb(old)-array['status','updated_at','acknowledged_at']) then raise exception 'Approved support snapshot is immutable'; end if;
 end if;
 return new;
end $$;
revoke all on function assessment_private.guard_support_record() from public,anon,authenticated;
create trigger assessment_suggestion_evidence_frozen before update on public.assessment_recommendations
 for each row execute function assessment_private.guard_support_record();
create trigger assessment_support_approval_frozen before update on public.assessment_support_assignments
 for each row execute function assessment_private.guard_support_record();
