-- Authorized additive routing infrastructure. No form/public runtime is enabled here.
create table public.assessment_attempt_routes (
 attempt_id uuid primary key references public.assessment_attempts(id) on delete cascade,
 request_id uuid not null unique,
 source_revision integer not null check(source_revision>=0 and source_revision<2147483647),
 decision_revision integer not null check(decision_revision=source_revision+1),
 decision jsonb not null check(jsonb_typeof(decision)='object' and octet_length(decision::text)<=8000),
 core_snapshot jsonb not null check(jsonb_typeof(core_snapshot)='array' and octet_length(core_snapshot::text)<=2000000),
 request_payload jsonb not null check(jsonb_typeof(request_payload)='object' and octet_length(request_payload::text)<=6000000),
 created_at timestamptz not null default now()
);
alter table public.assessment_attempt_routes enable row level security;
revoke all on public.assessment_attempt_routes from public,anon,authenticated,service_role;
grant select,insert on public.assessment_attempt_routes to service_role;

-- Mirror the private policy's bounded membership/band contract. Malformed/null
-- routing never silently falls through to a historical flat form.
create function assessment_private.routing_policy_valid(d jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare p jsonb:=d->'routing'; b jsonb; v jsonb; ids text[]; used text[]; branches text[]:='{}'; bands text[]:='{}'; core text[]; member text; edge numeric:=0; objective_count integer; objective_total integer;
begin
 if jsonb_typeof(d)<>'object' or octet_length(d::text)>4000000
  or jsonb_typeof(p)<>'object' or p->'schema'<>'1'::jsonb or coalesce(p->>'version','') !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$'
  or (select count(*) from jsonb_object_keys(p))<>8
  or p-array['schema','version','coreItemIds','minimumEvidence','minimumObjectives','branches','bands','insufficientEvidenceBranchId']<>'{}'::jsonb
  or jsonb_typeof(d->'items')<>'array' or jsonb_array_length(d->'items') not between 1 and 1000
  or jsonb_typeof(p->'coreItemIds')<>'array' or jsonb_array_length(p->'coreItemIds') not between 1 and 1000
  or jsonb_typeof(p->'branches')<>'array' or jsonb_array_length(p->'branches') not between 2 and 8
  or jsonb_typeof(p->'bands')<>'array' or jsonb_array_length(p->'bands')<>jsonb_array_length(p->'branches')-1 then return false; end if;
 select array_agg(i->>'id') into ids from jsonb_array_elements(d->'items') i;
 if exists(select 1 from unnest(ids) id where id is null or id !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$') or cardinality(ids)<>(select count(distinct id) from unnest(ids) id) then return false; end if;
 if exists(select 1 from jsonb_array_elements(p->'coreItemIds') x where jsonb_typeof(x)<>'string') then return false; end if;
 select array_agg(x) into core from jsonb_array_elements_text(p->'coreItemIds') x;
 if not core<@ids or cardinality(core)<>(select count(distinct id) from unnest(core) id) then return false; end if;
 if exists(select 1 from unnest(array['recognition','recall','listening','reading','writing','speaking']) skill where
  (select count(distinct i->>'objectiveId') from jsonb_array_elements(d->'items') i where i->>'id'=any(core) and i->>'skill'=skill)<3) then return false; end if;
 select count(*),count(distinct i->>'objectiveId') into objective_count,objective_total from jsonb_array_elements(d->'items') i
  where i->>'id'=any(core) and i->>'type'<>'production' and i->>'skill' not in ('speaking','writing');
 if jsonb_typeof(p->'minimumEvidence')<>'number' or (p->>'minimumEvidence') !~ '^[0-9]+$' or (p->>'minimumEvidence')::integer not between 1 and objective_count
  or jsonb_typeof(p->'minimumObjectives')<>'number' or (p->>'minimumObjectives') !~ '^[0-9]+$' or (p->>'minimumObjectives')::integer not between 1 and objective_total then return false; end if;
 used:=core;
 for b in select value from jsonb_array_elements(p->'branches') loop
  if jsonb_typeof(b)<>'object' or (select count(*) from jsonb_object_keys(b))<>2 or b-array['id','itemIds']<>'{}'::jsonb
   or coalesce(b->>'id','') !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$' or b->>'id'=any(branches)
   or jsonb_typeof(b->'itemIds')<>'array' or jsonb_array_length(b->'itemIds') not between 1 and least(30,cardinality(core)) then return false; end if;
  branches:=array_append(branches,b->>'id');
  for v in select value from jsonb_array_elements(b->'itemIds') loop
   member:=v#>>'{}';
   if jsonb_typeof(v)<>'string' or member is null or not member=any(ids) or member=any(used) then return false; end if;
   used:=array_append(used,member);
  end loop;
 end loop;
 if cardinality(used)<>cardinality(ids) or not coalesce(p->>'insufficientEvidenceBranchId','')=any(branches) then return false; end if;
 for b in select value from jsonb_array_elements(p->'bands') loop
  if jsonb_typeof(b)<>'object' or (select count(*) from jsonb_object_keys(b))<>3 or b-array['minimumPercent','maximumPercent','branchId']<>'{}'::jsonb
   or jsonb_typeof(b->'minimumPercent')<>'number' or jsonb_typeof(b->'maximumPercent')<>'number'
   or (b->>'minimumPercent')::numeric<>edge or (b->>'maximumPercent')::numeric<=edge or (b->>'maximumPercent')::numeric>100
   or not coalesce(b->>'branchId','')=any(branches) or b->>'branchId'=any(bands) or b->>'branchId'=p->>'insufficientEvidenceBranchId' then return false; end if;
  edge:=(b->>'maximumPercent')::numeric; bands:=array_append(bands,b->>'branchId');
 end loop;
 return edge=100;
exception when others then return false;
end $$;

create function assessment_private.route_item_ids(p_snapshot jsonb,p_attempt uuid,p_require_route boolean default false) returns text[]
language plpgsql stable security invoker set search_path='' as $$
declare d jsonb:=p_snapshot->'definition'; p jsonb; branch text; ids text[];
begin
 if not d ? 'routing' then return array(select i->>'id' from jsonb_array_elements(d->'items') i); end if;
 if not coalesce(assessment_private.routing_policy_valid(d),false) then raise exception 'Invalid frozen routing policy'; end if;
 p:=d->'routing';
 select decision->>'branchId' into branch from public.assessment_attempt_routes where attempt_id=p_attempt;
 if branch is null and p_require_route then raise exception 'Select a route before submission'; end if;
 ids:=array(select jsonb_array_elements_text(p->'coreItemIds'));
 if branch is not null then
  ids:=ids||array(select jsonb_array_elements_text(b->'itemIds') from jsonb_array_elements(p->'branches') b where b->>'id'=branch);
 end if;
 return ids;
end $$;

create function assessment_private.guard_route_insert() returns trigger
language plpgsql security invoker set search_path='' as $$
declare a public.assessment_attempts; e public.assessment_enrollments; c public.assessment_checkpoints; d jsonb; p jsonb; q jsonb:=new.decision; actual jsonb; r record; actor uuid; minimum_count integer; minimum_objectives integer; objective_count integer; objective_total integer;
begin
 select * into a from public.assessment_attempts where id=new.attempt_id for update;
 select * into c from public.assessment_checkpoints where id=a.checkpoint_id;
 select * into e from public.assessment_enrollments where id=c.enrollment_id;
 new.created_at:=now();
 actor:=(new.request_payload->>'actor')::uuid;
 if actor is null or e.id is null or e.user_id is distinct from actor or not assessment_private.can_read(actor,e.id) then raise exception 'Learner assessment access required'; end if;
 if a.status<>'in_progress' or e.status<>'active' or c.status<>'scheduled' then raise exception 'Active learner assessment required'; end if;
 if a.revision is distinct from new.source_revision then raise exception 'Assessment revision conflict'; end if;
 d:=a.form_snapshot->'definition'; p:=d->'routing';
 if e.program_scope<>'full_module' or not coalesce(assessment_private.routing_policy_valid(d),false) then raise exception 'Invalid frozen routing policy'; end if;
 if new.request_payload is distinct from jsonb_build_object('actor',actor,'attemptId',a.id,'revision',new.source_revision,'definition',d,'core',new.core_snapshot,'decision',q) then raise exception 'Invalid route request payload'; end if;
 if exists(select 1 from public.assessment_responses where attempt_id=a.id and not item_id in (select jsonb_array_elements_text(p->'coreItemIds'))) then raise exception 'Unexpected pre-route response'; end if;
 select jsonb_agg(jsonb_build_object('itemId',i.id,'answer',s.answer) order by i.ord) into actual
  from jsonb_array_elements_text(p->'coreItemIds') with ordinality i(id,ord)
  left join public.assessment_responses s on s.attempt_id=a.id and s.item_id=i.id;
 if actual is distinct from new.core_snapshot then raise exception 'Saved core response conflict'; end if;
 for r in select s.answer,i.item from public.assessment_responses s join lateral
  (select value item from jsonb_array_elements(d->'items') where value->>'id'=s.item_id) i on true
  where s.attempt_id=a.id loop
  if coalesce(r.answer->>'inputMethod','') not in ('choice','typed','handwriting','speech_transcript','unavailable') then raise exception 'Invalid core response'; end if;
  if r.answer->>'inputMethod'='unavailable' or length(trim(coalesce(r.answer->>'missingReason','')))>0 or r.answer->'recognitionIssue'='true'::jsonb then continue; end if;
  if r.item->>'type'='choice' then
   if not exists(select 1 from jsonb_array_elements(r.item->'options') o where o->>'id'=r.answer->>'choiceId') then raise exception 'Incomplete core response'; end if;
  elsif r.item->>'skill'='speaking' then
   if nullif(r.answer->>'mediaEvidenceId','') is null then raise exception 'Incomplete core response'; end if;
  elsif length(trim(coalesce(r.answer->>'correctedTranscript',r.answer->>'text',r.answer->>'originalTranscript','')))=0 then raise exception 'Incomplete core response'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(actual) x where jsonb_typeof(x->'answer') is distinct from 'object') then raise exception 'Incomplete core response'; end if;
 if (select count(*) from jsonb_object_keys(q))<>13 or q-array['schema','attemptId','sourceRevision','formId','formVersion','rubricVersion','policyVersion','branchId','reason','scoredCount','scoredObjectives','percent','sourceDigest']<>'{}'::jsonb then raise exception 'Invalid route decision shape'; end if;
 if q->'schema' is distinct from '1'::jsonb or q->>'attemptId' is distinct from a.id::text or q->'sourceRevision' is distinct from to_jsonb(a.revision)
  or q->>'formId' is distinct from d->>'id' or q->>'formId' is distinct from a.form_id
  or q->>'formVersion' is distinct from d->>'version' or q->>'formVersion' is distinct from a.form_snapshot->>'version'
  or q->>'rubricVersion' is distinct from d->>'rubricVersion' or q->>'rubricVersion' is distinct from a.form_snapshot->>'rubricVersion'
  or q->>'policyVersion' is distinct from p->>'version' or coalesce(q->>'sourceDigest','') !~ '^[a-f0-9]{64}$'
  or jsonb_typeof(q->'scoredCount') is distinct from 'number' or coalesce(q->>'scoredCount','') !~ '^[0-9]+$'
  or jsonb_typeof(q->'scoredObjectives') is distinct from 'number' or coalesce(q->>'scoredObjectives','') !~ '^[0-9]+$'
  or not exists(select 1 from jsonb_array_elements(p->'branches') b where b->>'id'=q->>'branchId') then raise exception 'Route identity does not match frozen form'; end if;
 select count(*),count(distinct i->>'objectiveId') into objective_count,objective_total from jsonb_array_elements(d->'items') i
  where p->'coreItemIds' ? (i->>'id') and i->>'type'<>'production' and i->>'skill' not in ('speaking','writing');
 if (q->>'scoredCount')::integer>objective_count or (q->>'scoredCount')::integer>0 and (q->>'scoredObjectives')::integer=0 or (q->>'scoredObjectives')::integer>least(objective_total,(q->>'scoredCount')::integer) then raise exception 'Invalid routing evidence counts'; end if;
 minimum_count:=(p->>'minimumEvidence')::integer; minimum_objectives:=(p->>'minimumObjectives')::integer;
 if q->>'reason'='insufficient_evidence' then
  if q->'percent' is distinct from 'null'::jsonb or q->>'branchId'<>p->>'insufficientEvidenceBranchId'
   or ((q->>'scoredCount')::integer>=minimum_count and (q->>'scoredObjectives')::integer>=minimum_objectives) then raise exception 'Invalid insufficient-evidence route'; end if;
 elsif q->>'reason'='score_band' then
  if jsonb_typeof(q->'percent') is distinct from 'number' or (q->>'scoredCount')::integer<minimum_count or (q->>'scoredObjectives')::integer<minimum_objectives or not exists(
   select 1 from jsonb_array_elements(p->'bands') b where b->>'branchId'=q->>'branchId'
   and (q->>'percent')::numeric>=(b->>'minimumPercent')::numeric and ((q->>'percent')::numeric<(b->>'maximumPercent')::numeric or (q->>'percent')::numeric=100 and (b->>'maximumPercent')::numeric=100)
  ) then raise exception 'Invalid score-band route'; end if;
 else raise exception 'Invalid routing reason'; end if;
 return new;
end $$;
create trigger assessment_route_valid before insert on public.assessment_attempt_routes for each row execute function assessment_private.guard_route_insert();

create function assessment_private.finalize_route_insert() returns trigger
language plpgsql security invoker set search_path='' as $$
declare enrollment uuid;
begin
 update public.assessment_attempts set revision=new.decision_revision,saved_at=now() where id=new.attempt_id;
 select c.enrollment_id into enrollment from public.assessment_checkpoints c join public.assessment_attempts a on a.checkpoint_id=c.id where a.id=new.attempt_id;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
 values(enrollment,(new.request_payload->>'actor')::uuid,'attempt.routed',new.request_id,jsonb_build_object('attemptId',new.attempt_id,'branchId',new.decision->>'branchId','policyVersion',new.decision->>'policyVersion','revision',new.decision_revision));
 return new;
end $$;
create trigger assessment_route_atomic after insert on public.assessment_attempt_routes for each row execute function assessment_private.finalize_route_insert();
create trigger assessment_route_immutable before update on public.assessment_attempt_routes for each row execute function assessment_private.guard_evidence_update();

create function public.assessment_select_route(p_actor uuid,p_attempt uuid,p_revision integer,p_request uuid,p_definition jsonb,p_core jsonb,p_decision jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.assessment_attempts; e public.assessment_enrollments; prior public.assessment_attempt_routes; payload jsonb;
begin
 select * into a from public.assessment_attempts where id=p_attempt for update;
 select en.* into e from public.assessment_enrollments en join public.assessment_checkpoints c on c.enrollment_id=en.id where c.id=a.checkpoint_id;
 if p_actor is null or e.id is null or e.user_id is distinct from p_actor or not assessment_private.can_read(p_actor,e.id) then raise exception 'Learner assessment access required'; end if;
 payload:=jsonb_build_object('actor',p_actor,'attemptId',p_attempt,'revision',p_revision,'definition',p_definition,'core',p_core,'decision',p_decision);
 select * into prior from public.assessment_attempt_routes where request_id=p_request;
 if prior.attempt_id is not null then
  if prior.attempt_id is distinct from p_attempt or prior.request_payload is distinct from payload then raise exception 'Route request key reused with different payload'; end if;
 else
  select * into prior from public.assessment_attempt_routes where attempt_id=p_attempt;
  if prior.attempt_id is null then
   insert into public.assessment_attempt_routes(attempt_id,request_id,source_revision,decision_revision,decision,core_snapshot,request_payload)
   values(p_attempt,p_request,p_revision,p_revision+1,p_decision,p_core,payload) returning * into prior;
  end if;
 end if;
 return jsonb_build_object('decision',prior.decision,'sourceRevision',prior.source_revision,'decisionRevision',prior.decision_revision,'revision',(select revision from public.assessment_attempts where id=p_attempt));
end $$;

create or replace function assessment_private.guard_response_write() returns trigger
language plpgsql security invoker set search_path='' as $$
declare attempt public.assessment_attempts;
begin
 if TG_OP='UPDATE' and (new.attempt_id is distinct from old.attempt_id or new.item_id is distinct from old.item_id) then raise exception 'Response identity cannot change'; end if;
 select * into attempt from public.assessment_attempts where id=new.attempt_id for update;
 if attempt.id is null or attempt.status<>'in_progress' then raise exception 'Submitted responses are immutable'; end if;
 if not exists(select 1 from jsonb_array_elements(attempt.form_snapshot->'definition'->'items') item where item->>'id'=new.item_id) then raise exception 'Response item is not in frozen form'; end if;
 if not new.item_id=any(assessment_private.route_item_ids(attempt.form_snapshot,attempt.id)) then raise exception 'Response item is not in selected frozen path'; end if;
 return new;
end $$;

-- Same receipt/history behavior for flat attempts; only adaptive missing rows differ.
create or replace function public.assessment_submit_attempt(p_actor uuid,p_attempt uuid,p_revision integer,p_request uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare attempt public.assessment_attempts; cp public.assessment_checkpoints; en public.assessment_enrollments; allowed text[];
begin
 select * into attempt from public.assessment_attempts where id=p_attempt for update;
 select * into cp from public.assessment_checkpoints where id=attempt.checkpoint_id for update;
 select * into en from public.assessment_enrollments where id=cp.enrollment_id;
 if en.id is null or en.user_id<>p_actor or not assessment_private.can_read(p_actor,en.id) then raise exception 'Learner assessment access required'; end if;
 if attempt.submitted_at is not null then return attempt.status; end if;
 if en.status<>'active' or cp.status<>'scheduled' then raise exception 'Assessment plan is paused or checkpoint exempt'; end if;
 if attempt.revision is distinct from p_revision then raise exception 'Assessment revision conflict'; end if;
 allowed:=assessment_private.route_item_ids(attempt.form_snapshot,attempt.id,true);
 insert into public.assessment_responses(attempt_id,item_id,answer)
 select p_attempt,item->>'id','{"inputMethod":"unavailable","missingReason":"No response submitted"}'::jsonb
 from jsonb_array_elements(attempt.form_snapshot->'definition'->'items') item where item->>'id'=any(allowed)
 on conflict(attempt_id,item_id) do nothing;
 update public.assessment_attempts set status='submitted',submitted_at=now(),submit_request_id=p_request,
  designated=not exists(select 1 from public.assessment_attempts where checkpoint_id=cp.id and designated)
 where id=p_attempt;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(en.id,p_actor,'attempt.submitted',p_request,jsonb_build_object('attemptId',p_attempt));
 return 'submitted';
end $$;

create function assessment_private.guard_route_speech_item() returns trigger
language plpgsql security invoker set search_path='' as $$
declare a public.assessment_attempts;
begin
 -- Parent deletion deliberately detaches evidence for the existing cleanup lifecycle.
 if new.attempt_id is null then return new; end if;
 select * into a from public.assessment_attempts where id=new.attempt_id for update;
 if a.form_snapshot->'definition' ? 'routing' and (not new.item_id=any(assessment_private.route_item_ids(a.form_snapshot,a.id)) or not exists(select 1 from jsonb_array_elements(a.form_snapshot->'definition'->'items') i where i->>'id'=new.item_id and i->>'skill'='speaking' and i->'inputMethods' ? 'speech')) then raise exception 'Speech item is not in selected frozen path'; end if;
 return new;
end $$;
create trigger assessment_speech_selected_item before insert or update of attempt_id,item_id on public.assessment_speech_evidence for each row execute function assessment_private.guard_route_speech_item();

revoke all on function assessment_private.routing_policy_valid(jsonb),assessment_private.route_item_ids(jsonb,uuid,boolean),assessment_private.guard_route_insert(),assessment_private.finalize_route_insert(),assessment_private.guard_route_speech_item() from public,anon,authenticated;
grant execute on function assessment_private.routing_policy_valid(jsonb),assessment_private.route_item_ids(jsonb,uuid,boolean),assessment_private.guard_route_insert(),assessment_private.finalize_route_insert(),assessment_private.guard_route_speech_item() to service_role;
revoke all on function public.assessment_select_route(uuid,uuid,integer,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.assessment_select_route(uuid,uuid,integer,uuid,jsonb,jsonb,jsonb) to service_role;
