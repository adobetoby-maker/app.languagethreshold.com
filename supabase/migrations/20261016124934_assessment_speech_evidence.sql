-- Protected learner speech. Collection/cleanup remain OFF until an actual owner policy decision.
create table public.assessment_media_policies (
 version text primary key check(length(version) between 3 and 100),
 notice text not null check(length(notice) between 10 and 2000),
 retention_days integer check(retention_days between 1 and 90),
 approved_by uuid references auth.users(id), approved_at timestamptz,
 collection_enabled boolean not null default false,
 cleanup_enabled boolean not null default false,
 check((approved_by is null)=(approved_at is null)),
 check(not collection_enabled or (approved_at is not null and retention_days is not null)),
 check(not cleanup_enabled or (approved_at is not null and retention_days is not null))
);
insert into public.assessment_media_policies(version,notice) values
 ('assessment-speech-pending-v1','Speech recording is unavailable while the owner reviews the evidence retention policy. You may leave speaking not assessed.');
-- Consent binds to this exact notice and retention period; version any policy change.
create function assessment_private.freeze_approved_media_policy() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.approved_at is not null and (new.version,new.notice,new.retention_days,new.approved_by,new.approved_at) is distinct from (old.version,old.notice,old.retention_days,old.approved_by,old.approved_at) then raise exception 'Approved media policy is immutable; create a new version'; end if;
 return new;
end $$;
create trigger assessment_media_policy_frozen before update on public.assessment_media_policies for each row execute function assessment_private.freeze_approved_media_policy();
create unique index assessment_media_one_collecting on public.assessment_media_policies((collection_enabled)) where collection_enabled;
create table public.assessment_speech_evidence (
 id uuid primary key default gen_random_uuid(),
 -- Retain deletion metadata if an account/plan is deleted, so storage cannot become orphaned.
 attempt_id uuid references public.assessment_attempts(id) on delete set null,
 enrollment_id uuid references public.assessment_enrollments(id) on delete set null,
 learner_id uuid not null, item_id text not null,
 policy_version text not null references public.assessment_media_policies(version),
 consented_at timestamptz not null default now(), request_id uuid not null,
 expected_revision integer not null check(expected_revision>=0), attached_revision integer,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 bytes integer not null check(bytes between 32 and 4194304),
 mime text not null check(mime in ('audio/webm','audio/ogg','audio/mp4','audio/wav')),
 duration_ms integer not null check(duration_ms between 250 and 120000),
 state text not null default 'uploading' check(state in ('uploading','ready','deleting','deleted')),
 created_at timestamptz not null default now(), ready_at timestamptz,
 delete_requested_at timestamptz, deleted_at timestamptz,
 unique(learner_id,request_id),
 check((state='deleted')=(deleted_at is not null)),
 check(state<>'ready' or (ready_at is not null and attached_revision is not null))
);
create index assessment_speech_attempt on public.assessment_speech_evidence(attempt_id,item_id);
create index assessment_speech_cleanup on public.assessment_speech_evidence(state,created_at) where state<>'deleted';
do $$ declare t text; begin
 foreach t in array array['assessment_media_policies','assessment_speech_evidence'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

create function public.assessment_reserve_speech(p_actor uuid,p_attempt uuid,p_item text,p_revision integer,p_policy text,p_sha256 text,p_bytes integer,p_mime text,p_duration integer,p_request uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.assessment_attempts; e public.assessment_enrollments; prior public.assessment_speech_evidence; result uuid;
begin
 select * into a from public.assessment_attempts where id=p_attempt for update;
 select en.* into e from public.assessment_enrollments en join public.assessment_checkpoints c on c.enrollment_id=en.id where c.id=a.checkpoint_id;
 if e.id is null or e.user_id<>p_actor or not assessment_private.can_read(p_actor,e.id) then raise exception 'Learner speech access required'; end if;
 if not exists(select 1 from public.assessment_media_policies where version=p_policy and collection_enabled and approved_at is not null) then raise exception 'Speech collection policy is not enabled'; end if;
 select * into prior from public.assessment_speech_evidence where learner_id=p_actor and request_id=p_request;
 if prior.id is not null then
  if prior.attempt_id is distinct from p_attempt or prior.item_id is distinct from p_item or prior.policy_version is distinct from p_policy or prior.expected_revision is distinct from p_revision or prior.sha256 is distinct from p_sha256 or prior.bytes is distinct from p_bytes or prior.mime is distinct from p_mime or prior.duration_ms is distinct from p_duration then raise exception 'Speech request key reused'; end if;
  if prior.state not in ('uploading','ready') or prior.delete_requested_at is not null then raise exception 'Speech evidence is no longer available'; end if;
  return prior.id;
 end if;
 if a.status<>'in_progress' or e.status<>'active' or not exists(select 1 from public.assessment_checkpoints where id=a.checkpoint_id and status='scheduled') then raise exception 'Active learner assessment required'; end if;
 if a.revision is distinct from p_revision then raise exception 'Assessment revision conflict'; end if;
 if not exists(select 1 from jsonb_array_elements(a.form_snapshot->'definition'->'items') item where item->>'id'=p_item and item->>'skill'='speaking' and item->'inputMethods' ? 'speech') then raise exception 'Frozen speaking item required'; end if;
 if (select count(*) from public.assessment_speech_evidence where attempt_id=a.id and item_id=p_item and state<>'deleted')>=5 then raise exception 'Remove an earlier recording before recording again'; end if;
 insert into public.assessment_speech_evidence(attempt_id,enrollment_id,learner_id,item_id,policy_version,request_id,expected_revision,sha256,bytes,mime,duration_ms)
 values(a.id,e.id,p_actor,p_item,p_policy,p_request,p_revision,p_sha256,p_bytes,p_mime,p_duration) returning id into result;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(e.id,p_actor,'speech.consent',p_request,jsonb_build_object('attemptId',a.id,'itemId',p_item,'evidenceId',result,'policyVersion',p_policy));
 return result;
end $$;

create function public.assessment_finish_speech(p_actor uuid,p_evidence uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare m public.assessment_speech_evidence; a public.assessment_attempts; e public.assessment_enrollments; rev integer;
begin
 -- Consistent order with answer saves/submission: lock attempt before its evidence.
 select a2.* into a from public.assessment_attempts a2 join public.assessment_speech_evidence m2 on m2.attempt_id=a2.id where m2.id=p_evidence for update of a2;
 select * into m from public.assessment_speech_evidence where id=p_evidence for update;
 select * into e from public.assessment_enrollments where id=m.enrollment_id;
 if m.id is null or m.learner_id<>p_actor or e.user_id<>p_actor or not assessment_private.can_read(p_actor,e.id) then raise exception 'Learner speech access required'; end if;
 if not exists(select 1 from public.assessment_media_policies where version=m.policy_version and collection_enabled and approved_at is not null) then raise exception 'Speech collection policy is not enabled'; end if;
 if m.state='ready' and m.delete_requested_at is null then return m.attached_revision; end if;
 if m.state<>'uploading' or m.delete_requested_at is not null or m.created_at<now()-interval '10 minutes' then raise exception 'Speech upload expired'; end if;
 if a.status<>'in_progress' or e.status<>'active' or not exists(select 1 from public.assessment_checkpoints where id=a.checkpoint_id and status='scheduled') then raise exception 'Active learner assessment required'; end if;
 if a.revision is distinct from m.expected_revision then raise exception 'Assessment revision conflict'; end if;
 -- Service verifies downloaded bytes/hash before invoking this finalizer. Browser cannot execute it.
 rev:=a.revision+1;
 update public.assessment_speech_evidence set state='ready',ready_at=now(),attached_revision=rev where id=m.id;
 insert into public.assessment_responses(attempt_id,item_id,answer) values(a.id,m.item_id,jsonb_build_object('inputMethod','speech_transcript','mediaEvidenceId',m.id))
 on conflict(attempt_id,item_id) do update set answer=excluded.answer,saved_at=now();
 update public.assessment_attempts set revision=rev,saved_at=now() where id=a.id;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(e.id,p_actor,'speech.attached',m.request_id,jsonb_build_object('attemptId',a.id,'itemId',m.item_id,'evidenceId',m.id,'revision',rev));
 return rev;
end $$;

-- A forged UUID or a recording from another question/account can never become spoken evidence.
create function assessment_private.validate_speech_reference() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.answer ? 'mediaEvidenceId' and not exists(
  select 1 from public.assessment_speech_evidence m join public.assessment_attempts a on a.id=m.attempt_id
  cross join lateral jsonb_array_elements(a.form_snapshot->'definition'->'items') item
  where m.id::text=new.answer->>'mediaEvidenceId' and m.attempt_id=new.attempt_id and m.item_id=new.item_id
   and m.state='ready' and m.delete_requested_at is null and item->>'id'=new.item_id and item->>'skill'='speaking'
   and new.answer->>'inputMethod'='speech_transcript'
 ) then raise exception 'Verified speech reference required'; end if;
 return new;
end $$;
create trigger assessment_speech_reference before insert or update of answer on public.assessment_responses for each row execute function assessment_private.validate_speech_reference();

create function public.assessment_ack_speech_review(p_actor uuid,p_evidence uuid,p_request uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare m public.assessment_speech_evidence;
begin
 select * into m from public.assessment_speech_evidence where id=p_evidence for update;
 if m.id is null or m.state<>'ready' or m.delete_requested_at is not null or not assessment_private.can_review(p_actor,m.attempt_id)
  or not exists(select 1 from public.assessment_attempts where id=m.attempt_id and submitted_at is not null)
  or not exists(select 1 from public.assessment_responses where attempt_id=m.attempt_id and item_id=m.item_id and answer->>'mediaEvidenceId'=m.id::text and coalesce(answer->>'missingReason','')='') then raise exception 'Submitted speech review access required'; end if;
 if exists(select 1 from public.assessment_events where enrollment_id=m.enrollment_id and action='speech.review_listened' and request_id=p_request and (actor_id is distinct from p_actor or detail->>'evidenceId'<>m.id::text)) then raise exception 'Speech review request key reused'; end if;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(m.enrollment_id,p_actor,'speech.review_listened',p_request,jsonb_build_object('attemptId',m.attempt_id,'evidenceId',m.id,'sha256',m.sha256)) on conflict do nothing;
end $$;

create or replace function assessment_private.require_spoken_evidence() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.state='scored' and new.skill='speaking' then
  perform 1 from public.assessment_speech_evidence m join public.assessment_responses r on r.answer->>'mediaEvidenceId'=m.id::text where r.id=new.response_id for update of m;
 end if;
 if new.state='scored' and new.skill='speaking' and not exists(
  select 1 from public.assessment_responses r join public.assessment_speech_evidence m on m.id::text=r.answer->>'mediaEvidenceId'
   join public.assessment_media_policies p on p.version=m.policy_version
  where r.id=new.response_id and m.attempt_id=r.attempt_id and m.item_id=r.item_id and m.state='ready' and m.delete_requested_at is null
   and p.approved_at is not null and new.source='human' and assessment_private.can_review(new.reviewed_by,r.attempt_id)
   and exists(select 1 from public.assessment_events ev where ev.enrollment_id=m.enrollment_id and ev.actor_id=new.reviewed_by and ev.action='speech.review_listened' and ev.detail->>'evidenceId'=m.id::text and ev.detail->>'sha256'=m.sha256)
 ) then raise exception 'Verified spoken evidence workflow is not enabled for this response'; end if;
 return new;
end $$;

-- Withdrawal hides playback immediately; the approved cleanup worker removes bytes separately.
create function public.assessment_withdraw_speech(p_actor uuid,p_evidence uuid,p_request uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare m public.assessment_speech_evidence;
begin
 select * into m from public.assessment_speech_evidence where id=p_evidence for update;
 if m.id is null or m.learner_id<>p_actor then raise exception 'Learner speech access required'; end if;
 update public.assessment_speech_evidence set delete_requested_at=coalesce(delete_requested_at,now()) where id=m.id;
 if m.enrollment_id is not null then
  insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(m.enrollment_id,p_actor,'speech.withdrawn',p_request,jsonb_build_object('evidenceId',m.id)) on conflict do nothing;
 end if;
end $$;

-- Only ready, final-scored attempts with no unresolved dispute age out. Unattached uploads
-- and orphaned account/plan objects are also collected. Disabled policy returns zero work.
create function public.assessment_claim_speech_cleanup(p_limit integer default 25)
returns setof public.assessment_speech_evidence language plpgsql security invoker set search_path='' as $$
begin
 return query with candidates as (
  select m.id from public.assessment_speech_evidence m join public.assessment_media_policies p on p.version=m.policy_version
  where p.cleanup_enabled and p.approved_at is not null and m.state<>'deleted' and (
   m.state='deleting' or m.delete_requested_at is not null or m.attempt_id is null
   or (m.state='uploading' and m.created_at<now()-interval '1 day')
   or (m.state='ready' and exists(select 1 from public.assessment_attempts a where a.id=m.attempt_id and a.status='completed')
    and not exists(select 1 from public.assessment_review_requests q where q.attempt_id=m.attempt_id and q.status<>'resolved')
    and greatest(m.ready_at,
      (select a.submitted_at from public.assessment_attempts a where a.id=m.attempt_id),
      (select max(s.created_at) from public.assessment_score_events s join public.assessment_responses r on r.id=s.response_id where r.attempt_id=m.attempt_id),
      (select max(q.resolved_at) from public.assessment_review_requests q where q.attempt_id=m.attempt_id))<now()-make_interval(days=>p.retention_days))
  ) order by m.created_at limit least(greatest(p_limit,1),100) for update of m skip locked
 ) update public.assessment_speech_evidence m set state='deleting' from candidates c where m.id=c.id returning m.*;
end $$;
create function public.assessment_finish_speech_cleanup(p_evidence uuid) returns void language plpgsql security invoker set search_path='' as $$
declare m public.assessment_speech_evidence;
begin
 update public.assessment_speech_evidence set state='deleted',deleted_at=now() where id=p_evidence and state='deleting' returning * into m;
 if m.enrollment_id is not null then
  insert into public.assessment_events(enrollment_id,action,request_id,detail) values(m.enrollment_id,'speech.deleted',m.id,jsonb_build_object('evidenceId',m.id)) on conflict do nothing;
 end if;
end $$;

revoke all on all functions in schema assessment_private from public,anon,authenticated;
revoke all on function public.assessment_reserve_speech(uuid,uuid,text,integer,text,text,integer,text,integer,uuid),public.assessment_finish_speech(uuid,uuid),public.assessment_ack_speech_review(uuid,uuid,uuid),public.assessment_withdraw_speech(uuid,uuid,uuid),public.assessment_claim_speech_cleanup(integer),public.assessment_finish_speech_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.assessment_reserve_speech(uuid,uuid,text,integer,text,text,integer,text,integer,uuid),public.assessment_finish_speech(uuid,uuid),public.assessment_ack_speech_review(uuid,uuid,uuid),public.assessment_withdraw_speech(uuid,uuid,uuid),public.assessment_claim_speech_cleanup(integer),public.assessment_finish_speech_cleanup(uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('assessment-speech-private','assessment-speech-private',false,4194304,array['audio/webm','audio/ogg','audio/mp4','audio/wav']) on conflict(id) do nothing;
do $$ begin
 if exists(select 1 from storage.buckets where id='assessment-speech-private' and (public or file_size_limit is distinct from 4194304)) then raise exception 'Assessment speech bucket must be private and limited to 4 MiB'; end if;
end $$;
create policy assessment_speech_service_only on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'assessment-speech-private') with check(bucket_id<>'assessment-speech-private');
