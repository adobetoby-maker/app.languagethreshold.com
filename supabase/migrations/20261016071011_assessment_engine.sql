-- Individual/team assessments. Separate from the legacy Roofing certificate test.
-- Browser roles have no direct access to answer keys or authoritative mutations.
-- API authenticates the JWT; service-only RPCs independently enforce stored ownership.
create table public.assessment_releases (
  id text primary key check(length(id) between 3 and 160),
  module_id text not null check(length(module_id) between 1 and 80),
  target_language text not null,
  instruction_language text not null,
  content_version text not null,
  status text not null default 'draft' check(status in ('draft','in_review','verified','retired')),
  lesson_manifest jsonb not null default '{}'::jsonb,
  review_records jsonb not null default '[]'::jsonb check(jsonb_typeof(review_records)='array'),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  unique(id,module_id,target_language,instruction_language),
  check(target_language<>instruction_language),
  check(status<>'verified' or (verified_at is not null and jsonb_array_length(review_records)>=3))
);
create index assessment_releases_track_idx on public.assessment_releases(module_id,target_language,instruction_language,status);

create table public.assessment_forms (
  id text primary key check(length(id) between 3 and 160),
  release_id text not null references public.assessment_releases(id),
  checkpoint text not null check(checkpoint in ('entrance','day45','day90')),
  version text not null,
  rubric_version text not null,
  status text not null default 'draft' check(status in ('draft','in_review','verified','retired')),
  -- Private, server-only immutable form includes item answers/rubrics. Never send this whole row.
  definition jsonb not null check(jsonb_typeof(definition)='object'),
  equivalence_group text,
  equivalence_approved boolean not null default false,
  calibrated boolean not null default false,
  review_records jsonb not null default '[]'::jsonb check(jsonb_typeof(review_records)='array'),
  created_at timestamptz not null default now(),
  unique(release_id,checkpoint,version),
  check(status<>'verified' or jsonb_array_length(review_records)>=3)
);
create index assessment_forms_release_idx on public.assessment_forms(release_id,checkpoint,status);

create table public.assessment_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.team_organizations(id) on delete cascade,
  scope text not null check(scope in ('personal','team')),
  release_id text not null,
  module_id text not null,
  target_language text not null,
  instruction_language text not null,
  role text not null default 'primary' check(role in ('primary','support')),
  start_date date not null,
  timezone text not null,
  status text not null default 'active' check(status in ('active','paused','archived')),
  paused_on date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  request_id uuid not null,
  revision integer not null default 0 check(revision>=0),
  foreign key(release_id,module_id,target_language,instruction_language) references public.assessment_releases(id,module_id,target_language,instruction_language),
  check((scope='personal' and organization_id is null) or (scope='team' and organization_id is not null)),
  check((status='paused')=(paused_on is not null)),
  unique(created_by,request_id)
);
create unique index assessment_enrollment_personal_active_idx on public.assessment_enrollments(user_id,module_id,target_language,instruction_language) where scope='personal' and status<>'archived';
create unique index assessment_enrollment_team_active_idx on public.assessment_enrollments(organization_id,user_id,module_id,target_language,instruction_language) where scope='team' and status<>'archived';
create index assessment_enrollments_user_idx on public.assessment_enrollments(user_id,created_at desc);
create index assessment_enrollments_org_idx on public.assessment_enrollments(organization_id,status);

create table public.assessment_checkpoints (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.assessment_enrollments(id) on delete cascade,
  checkpoint text not null check(checkpoint in ('entrance','day45','day90')),
  due_date date not null,
  due_at timestamptz not null,
  status text not null default 'scheduled' check(status in ('scheduled','exempt')),
  reason text,
  unique(enrollment_id,checkpoint),
  check(status<>'exempt' or length(trim(reason)) between 3 and 1000)
);
create index assessment_checkpoints_due_idx on public.assessment_checkpoints(due_at) where status='scheduled';

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references public.assessment_checkpoints(id) on delete cascade,
  attempt_number integer not null check(attempt_number>0),
  form_id text not null references public.assessment_forms(id),
  -- Freeze reviewed content, rubrics, asset references and keys at attempt start.
  form_snapshot jsonb not null check(jsonb_typeof(form_snapshot)='object'),
  status text not null default 'in_progress' check(status in ('in_progress','submitted','scoring','needs_review','completed')),
  revision integer not null default 0 check(revision>=0),
  start_request_id uuid not null,
  submit_request_id uuid,
  started_at timestamptz not null default now(),
  saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  designated boolean not null default false,
  accommodations jsonb not null default '{}'::jsonb,
  unique(checkpoint_id,attempt_number),
  unique(checkpoint_id,start_request_id),
  check((status='in_progress')=(submitted_at is null))
);
create unique index assessment_attempt_one_open_idx on public.assessment_attempts(checkpoint_id) where status='in_progress';
create unique index assessment_attempt_designated_idx on public.assessment_attempts(checkpoint_id) where designated;
create index assessment_attempts_review_idx on public.assessment_attempts(status,submitted_at) where status in ('submitted','scoring','needs_review');

create table public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  item_id text not null check(length(item_id) between 1 and 160),
  -- Text/selected option, input method, original/corrected transcription, explicit missing reason.
  -- No raw voice/ink until retention and media-access policy is approved.
  answer jsonb not null check(jsonb_typeof(answer)='object' and octet_length(answer::text)<=20000),
  saved_at timestamptz not null default now(),
  unique(attempt_id,item_id)
);

create table public.assessment_score_events (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.assessment_responses(id) on delete cascade,
  revision integer not null check(revision>0),
  state text not null check(state in ('scored','pending','needs_review','not_assessed')),
  skill text not null check(skill in ('recognition','recall','listening','reading','writing','speaking')),
  objective_id text not null,
  comparison_group text,
  coverage text not null default 'module' check(coverage in ('module','studied','transfer')),
  points numeric,
  maximum numeric not null check(maximum>0),
  source text not null check(source in ('deterministic','human','ai_proposal')),
  rubric_version text not null,
  model_version text,
  confidence numeric check(confidence between 0 and 1),
  recognition_confidence numeric check(recognition_confidence between 0 and 1),
  rationale text not null default '' check(length(rationale)<=4000),
  evidence jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id),
  review_reason text check(length(review_reason) between 3 and 2000),
  request_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique(response_id,revision),
  check(points is null or points between 0 and maximum),
  check(state<>'scored' or (points is not null and source<>'ai_proposal')),
  check(source<>'human' or (reviewed_by is not null and review_reason is not null))
);
create index assessment_scores_latest_idx on public.assessment_score_events(response_id,revision desc);

create table public.assessment_events (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.assessment_enrollments(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  request_id uuid not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(enrollment_id,request_id,action)
);
create index assessment_events_enrollment_idx on public.assessment_events(enrollment_id,created_at);

-- RLS is deny-by-default. Read/write through authenticated API projections and service-only RPCs.
do $$ declare name text; begin
  foreach name in array array['assessment_releases','assessment_forms','assessment_enrollments','assessment_checkpoints','assessment_attempts','assessment_responses','assessment_score_events','assessment_events'] loop
    execute format('alter table public.%I enable row level security',name);
    execute format('revoke all on public.%I from anon, authenticated',name);
    execute format('grant all on public.%I to service_role',name);
  end loop;
end $$;

create schema if not exists assessment_private;
revoke all on schema assessment_private from public,anon,authenticated;
-- Service JWTs only. p_actor is the API-verified auth user, never a browser-supplied actor.
create function assessment_private.can_read(p_actor uuid,p_enrollment uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(
  select 1 from public.assessment_enrollments e where e.id=p_enrollment and (
   (e.scope='personal' and e.user_id=p_actor) or
   (e.scope='team' and exists(select 1 from public.team_members m where m.organization_id=e.organization_id and m.user_id=p_actor and m.status='active' and (m.role in ('owner','admin') or e.user_id=p_actor)))
  )
 );
$$;
create function assessment_private.can_manage(p_actor uuid,p_enrollment uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(
  select 1 from public.assessment_enrollments e where e.id=p_enrollment and (
   (e.scope='personal' and e.user_id=p_actor) or
   (e.scope='team' and exists(select 1 from public.team_members m where m.organization_id=e.organization_id and m.user_id=p_actor and m.status='active' and m.role in ('owner','admin')))
  )
 );
$$;
revoke all on all functions in schema assessment_private from public,anon,authenticated;

create function public.assessment_create_enrollment(p_actor uuid,p_user uuid,p_org uuid,p_release text,p_start date,p_timezone text,p_request uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; rel public.assessment_releases; entry record;
begin
 if p_actor is null or p_user is null then raise exception 'Assessment access required'; end if;
 -- Retry returns the original enrollment only for the same payload.
 select id into result from public.assessment_enrollments where created_by=p_actor and request_id=p_request;
 if result is not null then
  if not exists(select 1 from public.assessment_enrollments where id=result and user_id=p_user and organization_id is not distinct from p_org and release_id=p_release and start_date=p_start and timezone=p_timezone) then raise exception 'Request key reused with different enrollment'; end if;
  return result;
 end if;
 if p_org is null then
  if p_actor<>p_user then raise exception 'Personal assessment access required'; end if;
 else
  if not exists(select 1 from public.team_members where organization_id=p_org and user_id=p_actor and status='active' and role in ('owner','admin')) or
     not exists(select 1 from public.team_members where organization_id=p_org and user_id=p_user and status='active' and role='learner') then raise exception 'Team assessment access required'; end if;
 end if;
 select * into rel from public.assessment_releases where id=p_release and status<>'retired';
 if rel.id is null then raise exception 'Module assessment track unavailable'; end if;
 if p_org is not null and not exists(select 1 from public.team_assignments where organization_id=p_org and user_id=p_user and module_id=rel.module_id) then raise exception 'Assign the work module first'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'Invalid plan timezone'; end if;
 insert into public.assessment_enrollments(user_id,organization_id,scope,release_id,module_id,target_language,instruction_language,start_date,timezone,created_by,request_id)
 values(p_user,p_org,case when p_org is null then 'personal' else 'team' end,p_release,rel.module_id,rel.target_language,rel.instruction_language,p_start,p_timezone,p_actor,p_request) returning id into result;
 for entry in select * from (values('entrance',0),('day45',44),('day90',89)) as stages(kind,days) loop
  if ((((p_start+entry.days)::timestamp+interval '12 hours') at time zone p_timezone) at time zone p_timezone)::date<>p_start+entry.days then raise exception 'Local checkpoint date unavailable'; end if;
  insert into public.assessment_checkpoints(enrollment_id,checkpoint,due_date,due_at)
  values(result,entry.kind,p_start+entry.days,((p_start+entry.days)::timestamp+interval '12 hours') at time zone p_timezone);
 end loop;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(result,p_actor,'enrollment.created',p_request,jsonb_build_object('scope',case when p_org is null then 'personal' else 'team' end,'start',p_start,'timezone',p_timezone));
 return result;
end $$;

create function public.assessment_start_attempt(p_actor uuid,p_checkpoint uuid,p_form text,p_request uuid,p_allow_pilot boolean default false,p_studied_objectives text[] default '{}'::text[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare cp public.assessment_checkpoints; en public.assessment_enrollments; form public.assessment_forms; result uuid; ordinal integer; frozen_definition jsonb;
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
 if cp.checkpoint='day45' then
  frozen_definition:=jsonb_set(frozen_definition,'{items}',(select jsonb_agg(jsonb_set(item,'{coverage}',to_jsonb(case when item->>'objectiveId'=any(coalesce(p_studied_objectives,'{}'::text[])) then 'studied'::text else 'transfer'::text end)) order by items.ordinal) from jsonb_array_elements(form.definition->'items') with ordinality as items(item,ordinal)));
 end if;
 select coalesce(max(attempt_number),0)+1 into ordinal from public.assessment_attempts where checkpoint_id=p_checkpoint;
 if ordinal>10 then raise exception 'Checkpoint attempt limit reached'; end if;
 insert into public.assessment_attempts(checkpoint_id,attempt_number,form_id,form_snapshot,start_request_id)
 values(p_checkpoint,ordinal,p_form,jsonb_build_object('formId',form.id,'version',form.version,'rubricVersion',form.rubric_version,'releaseId',en.release_id,'contentVersion',(select content_version from public.assessment_releases where id=en.release_id),'pilot',p_allow_pilot,'calibrated',form.calibrated,'equivalenceGroup',form.equivalence_group,'equivalenceApproved',form.equivalence_approved,'definition',frozen_definition,'reportedStudiedObjectives',coalesce(p_studied_objectives,'{}'::text[])),p_request) returning id into result;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(en.id,p_actor,'attempt.started',p_request,jsonb_build_object('attemptId',result,'formId',form.id,'attemptNumber',ordinal,'pilot',p_allow_pilot));
 return result;
end $$;

create function public.assessment_save_responses(p_actor uuid,p_attempt uuid,p_revision integer,p_updates jsonb,p_request uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare attempt public.assessment_attempts; cp public.assessment_checkpoints; en public.assessment_enrollments; update_row jsonb;
begin
 select * into attempt from public.assessment_attempts where id=p_attempt for update;
 select * into cp from public.assessment_checkpoints where id=attempt.checkpoint_id;
 select * into en from public.assessment_enrollments where id=cp.enrollment_id;
 if en.id is null or en.user_id<>p_actor or not assessment_private.can_read(p_actor,en.id) then raise exception 'Learner assessment access required'; end if;
 if exists(select 1 from public.assessment_events where enrollment_id=en.id and request_id=p_request and action='response.saved') then
  if not exists(select 1 from public.assessment_events where enrollment_id=en.id and request_id=p_request and action='response.saved' and detail->>'attemptId'=p_attempt::text and detail->>'payloadHash'=md5(p_updates::text)) then raise exception 'Request key reused with different responses'; end if;
  return (select (detail->>'revision')::integer from public.assessment_events where enrollment_id=en.id and request_id=p_request and action='response.saved');
 end if;
 if attempt.status<>'in_progress' then raise exception 'Submitted responses are immutable'; end if;
 if en.status<>'active' or cp.status<>'scheduled' then raise exception 'Assessment plan is paused or checkpoint exempt'; end if;
 if attempt.revision is distinct from p_revision then raise exception 'Assessment revision conflict'; end if;
 if p_updates is null or jsonb_typeof(p_updates)<>'array' or jsonb_array_length(p_updates)>30 or octet_length(p_updates::text)>200000 then raise exception 'Invalid assessment response batch'; end if;
 for update_row in select value from jsonb_array_elements(p_updates) loop
  if not exists(select 1 from jsonb_array_elements(attempt.form_snapshot->'definition'->'items') item where item->>'id'=update_row->>'itemId') then raise exception 'Response item is not in frozen form'; end if;
  if jsonb_typeof(update_row->'answer')<>'object' or update_row->'answer' is null then raise exception 'Invalid assessment answer'; end if;
  if (update_row->'answer') ?| array['ink','audio','imageBase64','answerKey','score'] then raise exception 'Unsupported assessment answer fields'; end if;
  insert into public.assessment_responses(attempt_id,item_id,answer) values(p_attempt,update_row->>'itemId',update_row->'answer')
  on conflict(attempt_id,item_id) do update set answer=excluded.answer,saved_at=now();
 end loop;
 update public.assessment_attempts set revision=revision+1,saved_at=now() where id=p_attempt returning revision into p_revision;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(en.id,p_actor,'response.saved',p_request,jsonb_build_object('attemptId',p_attempt,'revision',p_revision,'itemCount',jsonb_array_length(p_updates),'payloadHash',md5(p_updates::text)));
 return p_revision;
end $$;

create function public.assessment_submit_attempt(p_actor uuid,p_attempt uuid,p_revision integer,p_request uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare attempt public.assessment_attempts; cp public.assessment_checkpoints; en public.assessment_enrollments;
begin
 select * into attempt from public.assessment_attempts where id=p_attempt for update;
 select * into cp from public.assessment_checkpoints where id=attempt.checkpoint_id for update;
 select * into en from public.assessment_enrollments where id=cp.enrollment_id;
 if en.id is null or en.user_id<>p_actor or not assessment_private.can_read(p_actor,en.id) then raise exception 'Learner assessment access required'; end if;
 if attempt.submitted_at is not null then return attempt.status; end if;
 if en.status<>'active' or cp.status<>'scheduled' then raise exception 'Assessment plan is paused or checkpoint exempt'; end if;
 if attempt.revision is distinct from p_revision then raise exception 'Assessment revision conflict'; end if;
 -- Explicit missing evidence is persisted, not given an invented answer or score.
 insert into public.assessment_responses(attempt_id,item_id,answer)
 select p_attempt,item->>'id','{"inputMethod":"unavailable","missingReason":"No response submitted"}'::jsonb
 from jsonb_array_elements(attempt.form_snapshot->'definition'->'items') item
 on conflict(attempt_id,item_id) do nothing;
 update public.assessment_attempts set status='submitted',submitted_at=now(),submit_request_id=p_request,
  designated=not exists(select 1 from public.assessment_attempts where checkpoint_id=cp.id and designated)
 where id=p_attempt;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(en.id,p_actor,'attempt.submitted',p_request,jsonb_build_object('attemptId',p_attempt));
 return 'submitted';
end $$;

revoke all on function public.assessment_create_enrollment(uuid,uuid,uuid,text,date,text,uuid) from public,anon,authenticated;
revoke all on function public.assessment_start_attempt(uuid,uuid,text,uuid,boolean,text[]) from public,anon,authenticated;
revoke all on function public.assessment_save_responses(uuid,uuid,integer,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.assessment_submit_attempt(uuid,uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.assessment_create_enrollment(uuid,uuid,uuid,text,date,text,uuid) to service_role;
grant execute on function public.assessment_start_attempt(uuid,uuid,text,uuid,boolean,text[]) to service_role;
grant execute on function public.assessment_save_responses(uuid,uuid,integer,jsonb,uuid) to service_role;
grant execute on function public.assessment_submit_attempt(uuid,uuid,integer,uuid) to service_role;

-- Schedule changes preserve original attempt snapshots and emit an immutable before/after trail.
create function public.assessment_change_schedule(p_actor uuid,p_enrollment uuid,p_revision integer,p_change text,p_checkpoint uuid,p_date date,p_reason text,p_request uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare en public.assessment_enrollments; cp public.assessment_checkpoints; local_day date; pause_days integer; before_state jsonb; after_state jsonb; fingerprint text;
begin
 select * into en from public.assessment_enrollments where id=p_enrollment for update;
 if not assessment_private.can_manage(p_actor,p_enrollment) then raise exception 'Assessment schedule access required'; end if;
 fingerprint:=md5(jsonb_build_object('change',p_change,'checkpoint',p_checkpoint,'date',p_date,'reason',p_reason)::text);
 if exists(select 1 from public.assessment_events where enrollment_id=en.id and action='schedule.changed' and request_id=p_request) then
  if not exists(select 1 from public.assessment_events where enrollment_id=en.id and action='schedule.changed' and request_id=p_request and detail->>'payloadHash'=fingerprint) then raise exception 'Schedule request key reused'; end if;
  return (select (detail->>'revision')::integer from public.assessment_events where enrollment_id=en.id and action='schedule.changed' and request_id=p_request);
 end if;
 if en.revision is distinct from p_revision then raise exception 'Assessment schedule revision conflict'; end if;
 if p_reason is null or length(trim(p_reason)) not between 3 and 1000 then raise exception 'A schedule change reason is required'; end if;
 if p_change is null or p_change not in ('pause','resume','reschedule','exempt','restore') then raise exception 'Unknown schedule change'; end if;
 if en.status='archived' then raise exception 'Assessment enrollment is archived'; end if;
 select jsonb_build_object('status',en.status,'pausedOn',en.paused_on,'checkpoints',coalesce(jsonb_agg(to_jsonb(c) order by c.checkpoint),'[]'::jsonb)) into before_state from public.assessment_checkpoints c where enrollment_id=en.id;
 local_day:=(now() at time zone en.timezone)::date;
 if p_change='pause' then
  if en.status<>'active' then raise exception 'Plan is already paused'; end if;
  update public.assessment_enrollments set status='paused',paused_on=local_day where id=en.id;
 elsif p_change='resume' then
  if en.status<>'paused' then raise exception 'Plan is not paused'; end if;
  pause_days:=greatest(0,local_day-en.paused_on);
  update public.assessment_checkpoints c set due_date=due_date+pause_days,
   due_at=((due_date+pause_days)::timestamp+interval '12 hours') at time zone en.timezone
  where c.enrollment_id=en.id and c.status='scheduled' and not exists(select 1 from public.assessment_attempts a where a.checkpoint_id=c.id and a.submitted_at is not null);
  update public.assessment_enrollments set status='active',paused_on=null where id=en.id;
 else
  select * into cp from public.assessment_checkpoints where id=p_checkpoint and enrollment_id=en.id for update;
  if cp.id is null then raise exception 'Checkpoint access required'; end if;
  if exists(select 1 from public.assessment_attempts where checkpoint_id=cp.id and submitted_at is not null) then raise exception 'Historical checkpoint schedule cannot be changed'; end if;
  if p_change='reschedule' then
   if p_date is null then raise exception 'Choose a checkpoint date'; end if;
   if (((p_date::timestamp+interval '12 hours') at time zone en.timezone) at time zone en.timezone)::date<>p_date then raise exception 'Local checkpoint date unavailable'; end if;
   update public.assessment_checkpoints set due_date=p_date,due_at=(p_date::timestamp+interval '12 hours') at time zone en.timezone,reason=trim(p_reason) where id=cp.id;
  elsif p_change='exempt' then
   update public.assessment_checkpoints set status='exempt',reason=trim(p_reason) where id=cp.id;
  else
   update public.assessment_checkpoints set status='scheduled',reason=trim(p_reason) where id=cp.id;
  end if;
 end if;
 update public.assessment_enrollments set revision=revision+1 where id=en.id returning revision into p_revision;
 select jsonb_build_object('status',e.status,'pausedOn',e.paused_on,'checkpoints',(select jsonb_agg(to_jsonb(c) order by c.checkpoint) from public.assessment_checkpoints c where c.enrollment_id=e.id)) into after_state from public.assessment_enrollments e where e.id=en.id;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(en.id,p_actor,'schedule.changed',p_request,jsonb_build_object('change',p_change,'reason',trim(p_reason),'before',before_state,'after',after_state,'revision',p_revision,'payloadHash',fingerprint));
 return p_revision;
end $$;
revoke all on function public.assessment_change_schedule(uuid,uuid,integer,text,uuid,date,text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_change_schedule(uuid,uuid,integer,text,uuid,date,text,uuid) to service_role;

grant usage on schema assessment_private to service_role;
grant execute on function assessment_private.can_read(uuid,uuid),assessment_private.can_manage(uuid,uuid) to service_role;
