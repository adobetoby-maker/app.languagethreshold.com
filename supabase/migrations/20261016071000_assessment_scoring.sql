-- Human/AI proposals remain distinct. No automatic trade/proficiency certificates are issued.
create table public.assessment_reviewers (
 user_id uuid not null references auth.users(id) on delete cascade,
 module_id text not null,
 target_language text not null,
 instruction_language text not null,
 active boolean not null default true,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(user_id,module_id,target_language,instruction_language)
);
create table public.assessment_review_requests (
 id uuid primary key default gen_random_uuid(),
 attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
 requested_by uuid not null references auth.users(id),
 reason text not null check(length(trim(reason)) between 3 and 2000),
 -- A personal learner explicitly shares this one attempt for review, never their profile/history.
 consent_version text not null,
 status text not null default 'requested' check(status in ('requested','claimed','resolved')),
 reviewer_id uuid references auth.users(id),
 request_id uuid not null,
 created_at timestamptz not null default now(),
 resolved_at timestamptz,
 unique(requested_by,request_id),
 check(status='requested' or reviewer_id is not null)
);
create index assessment_review_requests_queue_idx on public.assessment_review_requests(status,created_at);
create index assessment_review_requests_attempt_idx on public.assessment_review_requests(attempt_id);
create unique index assessment_review_request_one_open_idx on public.assessment_review_requests(attempt_id) where status<>'resolved';

create table public.assessment_grading_jobs (
 response_id uuid primary key references public.assessment_responses(id) on delete cascade,
 status text not null default 'queued' check(status in ('queued','claimed','completed','failed')),
 lease_id uuid,
 lease_until timestamptz,
 provider_requested_at timestamptz,
 completed_at timestamptz,
 error_kind text,
 created_at timestamptz not null default now(),
 check(status<>'claimed' or (lease_id is not null and lease_until is not null))
);
create index assessment_grading_jobs_queue_idx on public.assessment_grading_jobs(status,created_at);

do $$ declare name text; begin
 foreach name in array array['assessment_reviewers','assessment_review_requests','assessment_grading_jobs'] loop
  execute format('alter table public.%I enable row level security',name);
  execute format('revoke all on public.%I from anon, authenticated',name);
  execute format('grant all on public.%I to service_role',name);
 end loop;
end $$;

create function assessment_private.can_review(p_actor uuid,p_attempt uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.assessment_attempts a
 join public.assessment_checkpoints c on c.id=a.checkpoint_id
 join public.assessment_enrollments e on e.id=c.enrollment_id
 where a.id=p_attempt and (
  (e.scope='team' and exists(select 1 from public.team_members m where m.organization_id=e.organization_id and m.user_id=p_actor and m.status='active' and m.role in ('owner','admin')))
  or (e.scope='personal' and exists(select 1 from public.assessment_review_requests q
   join public.assessment_reviewers r on r.user_id=q.reviewer_id
   where q.attempt_id=a.id and q.reviewer_id=p_actor and q.status='claimed' and r.active and r.module_id=e.module_id and r.target_language=e.target_language and r.instruction_language=e.instruction_language))
 ));
$$;
revoke all on function assessment_private.can_review(uuid,uuid) from public,anon,authenticated;

create function public.assessment_request_review(p_actor uuid,p_attempt uuid,p_reason text,p_consent text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare en public.assessment_enrollments; attempt public.assessment_attempts; result uuid;
begin
 select * into attempt from public.assessment_attempts where id=p_attempt for update;
 select e.* into en from public.assessment_enrollments e join public.assessment_checkpoints c on c.enrollment_id=e.id where c.id=attempt.checkpoint_id;
 if en.user_id is distinct from p_actor or not assessment_private.can_read(p_actor,en.id) then raise exception 'Learner assessment access required'; end if;
 if attempt.submitted_at is null then raise exception 'Submit this assessment before requesting review'; end if;
 if p_consent is distinct from 'assessment-review-v1' then raise exception 'Review sharing confirmation required'; end if;
 if p_reason is null or length(trim(p_reason)) not between 3 and 2000 then raise exception 'Review reason required'; end if;
 select id into result from public.assessment_review_requests where requested_by=p_actor and request_id=p_request;
 if result is not null then
  if not exists(select 1 from public.assessment_review_requests where id=result and attempt_id=p_attempt and reason=trim(p_reason)) then raise exception 'Review request key reused'; end if;
  return result;
 end if;
 select id into result from public.assessment_review_requests where attempt_id=p_attempt and status<>'resolved';
 if result is not null then return result; end if;
 insert into public.assessment_review_requests(attempt_id,requested_by,reason,consent_version,request_id) values(p_attempt,p_actor,trim(p_reason),p_consent,p_request) returning id into result;
 update public.assessment_attempts set status='needs_review' where id=p_attempt;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(en.id,p_actor,'review.requested',p_request,jsonb_build_object('attemptId',p_attempt,'requestId',result,'scope',en.scope,'consentVersion',p_consent));
 return result;
end $$;

create function public.assessment_claim_review(p_actor uuid,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare q public.assessment_review_requests; en public.assessment_enrollments;
begin
 select * into q from public.assessment_review_requests where id=p_request for update;
 if q.id is null or q.status='resolved' then raise exception 'Review request unavailable'; end if;
 select e.* into en from public.assessment_enrollments e join public.assessment_checkpoints c on c.enrollment_id=e.id join public.assessment_attempts a on a.checkpoint_id=c.id where a.id=q.attempt_id;
 if en.scope='team' then
  if not assessment_private.can_manage(p_actor,en.id) then raise exception 'Team assessment review access required'; end if;
 else
  if not exists(select 1 from public.assessment_reviewers r where r.user_id=p_actor and r.active and r.module_id=en.module_id and r.target_language=en.target_language and r.instruction_language=en.instruction_language) then raise exception 'Assessment reviewer access required'; end if;
 end if;
 if q.reviewer_id is not null and q.reviewer_id<>p_actor then raise exception 'Review already claimed by another reviewer'; end if;
 update public.assessment_review_requests set reviewer_id=p_actor,status='claimed' where id=q.id;
 return q.attempt_id;
end $$;

create function public.assessment_record_score(p_actor uuid,p_response uuid,p_state text,p_points numeric,p_source text,p_reason text,p_confidence numeric,p_model text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare response public.assessment_responses; attempt public.assessment_attempts; en public.assessment_enrollments; item jsonb; next_revision integer; result uuid; next_status text;
begin
 select * into response from public.assessment_responses where id=p_response;
 select * into attempt from public.assessment_attempts where id=response.attempt_id for update;
 select e.* into en from public.assessment_enrollments e join public.assessment_checkpoints c on c.enrollment_id=e.id where c.id=attempt.checkpoint_id;
 if attempt.id is null or attempt.submitted_at is null then raise exception 'Submitted assessment required'; end if;
 if p_source='human' then
  if not assessment_private.can_review(p_actor,attempt.id) then raise exception 'Assessment review access required'; end if;
  if p_reason is null or length(trim(p_reason)) not between 3 and 2000 then raise exception 'Review reason required'; end if;
 else
  if not assessment_private.can_read(p_actor,en.id) then raise exception 'Assessment grading access required'; end if;
 end if;
 select id into result from public.assessment_score_events where request_id=p_request;
 if result is not null then
  if not exists(select 1 from public.assessment_score_events where id=result and response_id=p_response and state is not distinct from p_state and points is not distinct from p_points and source is not distinct from p_source) then raise exception 'Scoring request key reused'; end if;
  return result;
 end if;
 select value into item from jsonb_array_elements(attempt.form_snapshot->'definition'->'items') where value->>'id'=response.item_id;
 if item is null then raise exception 'Frozen assessment item missing'; end if;
 if p_state='scored' and (response.answer->>'inputMethod'='unavailable' or length(coalesce(response.answer->>'missingReason',''))>0) then raise exception 'Missing evidence cannot be scored'; end if;
 if p_state='scored' and item->>'skill'='speaking' and response.answer->>'inputMethod' not in ('recorded_speech','speech_transcript') then raise exception 'Written input is not spoken evidence'; end if;
 if p_source='deterministic' and item->>'type' not in ('choice','recall') and p_state not in ('not_assessed','pending','needs_review') then raise exception 'Production response requires rubric review'; end if;
 if p_source='ai_proposal' and p_state not in ('pending','needs_review') then raise exception 'AI proposals require review'; end if;
 -- A final score cannot be silently overwritten by a background retry/proposal.
 if p_source<>'human' and exists(select 1 from public.assessment_score_events where response_id=response.id and state='scored') then raise exception 'Reviewed score is immutable to background grading'; end if;
 select coalesce(max(revision),0)+1 into next_revision from public.assessment_score_events where response_id=response.id;
 insert into public.assessment_score_events(response_id,revision,state,skill,objective_id,comparison_group,points,maximum,source,rubric_version,model_version,confidence,rationale,reviewed_by,review_reason,request_id)
 values(response.id,next_revision,p_state,item->>'skill',item->>'objectiveId',item->>'comparisonGroup',p_points,(item->>'maximum')::numeric,p_source,attempt.form_snapshot->>'rubricVersion',p_model,p_confidence,left(coalesce(p_reason,''),4000),case when p_source='human' then p_actor else null end,case when p_source='human' then trim(p_reason) else null end,p_request) returning id into result;
 -- All responses, including explicit missing evidence, must have a current grading state.
 select case when exists(select 1 from public.assessment_responses r where r.attempt_id=attempt.id and not exists(select 1 from public.assessment_score_events s where s.response_id=r.id)) then 'scoring'
  when exists(select 1 from public.assessment_responses r join lateral(select state from public.assessment_score_events s where s.response_id=r.id order by revision desc limit 1) latest on true where r.attempt_id=attempt.id and latest.state='needs_review') then 'needs_review'
  when exists(select 1 from public.assessment_responses r join lateral(select state from public.assessment_score_events s where s.response_id=r.id order by revision desc limit 1) latest on true where r.attempt_id=attempt.id and latest.state='pending') then 'scoring'
  when exists(select 1 from public.assessment_review_requests where attempt_id=attempt.id and status<>'resolved') then 'needs_review'
  else 'completed' end into next_status;
 update public.assessment_attempts set status=next_status where id=attempt.id;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(en.id,p_actor,case when p_source='human' then 'result.reviewed' else 'scoring.recorded' end,p_request,jsonb_build_object('attemptId',attempt.id,'responseId',response.id,'scoreEventId',result,'source',p_source,'state',p_state));
 return result;
end $$;

-- Provider work is claimed once. An uncertain/failed provider call is NOT automatically billed again.
create function public.assessment_claim_grading(p_actor uuid,p_response uuid,p_lease uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare en public.assessment_enrollments; job public.assessment_grading_jobs;
begin
 select e.* into en from public.assessment_enrollments e join public.assessment_checkpoints c on c.enrollment_id=e.id join public.assessment_attempts a on a.checkpoint_id=c.id join public.assessment_responses r on r.attempt_id=a.id where r.id=p_response and a.submitted_at is not null;
 if en.id is null or not assessment_private.can_read(p_actor,en.id) then raise exception 'Assessment grading access required'; end if;
 if p_lease is null then raise exception 'Grading lease required'; end if;
 if not exists(select 1 from public.assessment_responses r join public.assessment_attempts a on a.id=r.attempt_id,
  lateral jsonb_array_elements(a.form_snapshot->'definition'->'items') item
  where r.id=p_response and item->>'id'=r.item_id and item->>'type'='production'
  and r.answer->>'inputMethod'<>'unavailable' and coalesce(r.answer->>'missingReason','')='') then return false; end if;
 if exists(select 1 from public.assessment_score_events where response_id=p_response and state='scored') then return false; end if;

 insert into public.assessment_grading_jobs(response_id) values(p_response) on conflict do nothing;
 select * into job from public.assessment_grading_jobs where response_id=p_response for update;
 if job.provider_requested_at is not null or job.status in ('completed','failed') then return false; end if;
 if job.status='claimed' and job.lease_until>now() then return false; end if;
 update public.assessment_grading_jobs set status='claimed',lease_id=p_lease,lease_until=now()+interval '2 minutes',provider_requested_at=now() where response_id=p_response;
 return true;
end $$;

revoke all on function public.assessment_request_review(uuid,uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.assessment_claim_review(uuid,uuid) from public,anon,authenticated;
revoke all on function public.assessment_record_score(uuid,uuid,text,numeric,text,text,numeric,text,uuid) from public,anon,authenticated;
revoke all on function public.assessment_claim_grading(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.assessment_request_review(uuid,uuid,text,text,uuid) to service_role;
grant execute on function public.assessment_claim_review(uuid,uuid) to service_role;
grant execute on function public.assessment_record_score(uuid,uuid,text,numeric,text,text,numeric,text,uuid) to service_role;
grant execute on function public.assessment_claim_grading(uuid,uuid,uuid) to service_role;

create function public.assessment_resolve_review(p_actor uuid,p_review uuid,p_reason text,p_request uuid)
returns void language plpgsql security definer set search_path='' as $$
declare q public.assessment_review_requests; en public.assessment_enrollments;
begin
 select * into q from public.assessment_review_requests where id=p_review for update;
 if q.id is null or q.reviewer_id is distinct from p_actor then raise exception 'Assigned assessment reviewer access required'; end if;
 if q.status='resolved' then return; end if;
 if not assessment_private.can_review(p_actor,q.attempt_id) then raise exception 'Assigned assessment reviewer access required'; end if;
 if p_reason is null or length(trim(p_reason)) not between 3 and 2000 then raise exception 'Review resolution reason required'; end if;
 select e.* into en from public.assessment_enrollments e join public.assessment_checkpoints c on c.enrollment_id=e.id join public.assessment_attempts a on a.checkpoint_id=c.id where a.id=q.attempt_id;
 if q.status='resolved' then return; end if;
 if exists(select 1 from public.assessment_responses r left join lateral(select state from public.assessment_score_events s where s.response_id=r.id order by revision desc limit 1) latest on true where r.attempt_id=q.attempt_id and (latest.state is null or latest.state in ('pending','needs_review'))) then raise exception 'Resolve pending item evidence first'; end if;
 update public.assessment_review_requests set status='resolved',resolved_at=now() where id=q.id;
 update public.assessment_attempts set status='completed' where id=q.attempt_id;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(en.id,p_actor,'review.resolved',p_request,jsonb_build_object('attemptId',q.attempt_id,'reviewId',q.id,'reason',trim(p_reason)));
end $$;
revoke all on function public.assessment_resolve_review(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_resolve_review(uuid,uuid,text,uuid) to service_role;

create function public.assessment_finish_grading(p_actor uuid,p_response uuid,p_lease uuid,p_succeeded boolean,p_error text default null)
returns void language plpgsql security definer set search_path='' as $$
declare en public.assessment_enrollments; job public.assessment_grading_jobs;
begin
 select e.* into en from public.assessment_enrollments e join public.assessment_checkpoints c on c.enrollment_id=e.id join public.assessment_attempts a on a.checkpoint_id=c.id join public.assessment_responses r on r.attempt_id=a.id where r.id=p_response;
 if en.id is null or not assessment_private.can_read(p_actor,en.id) then raise exception 'Assessment grading access required'; end if;
 select * into job from public.assessment_grading_jobs where response_id=p_response for update;
 if job.lease_id is distinct from p_lease or job.response_id is null then raise exception 'Grading lease mismatch'; end if;
 if job.status in ('completed','failed') then return; end if;
 update public.assessment_grading_jobs set status=case when p_succeeded is true then 'completed' else 'failed' end,
  completed_at=now(),error_kind=case when p_succeeded is true then null else left(coalesce(p_error,'provider_unavailable'),120) end where response_id=p_response;
end $$;
revoke all on function public.assessment_finish_grading(uuid,uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.assessment_finish_grading(uuid,uuid,uuid,boolean,text) to service_role;
