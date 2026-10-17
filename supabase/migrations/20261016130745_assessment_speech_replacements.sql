-- Collection must have approved cleanup enabled; replacement makes older recordings unavailable.
alter table public.assessment_media_policies add constraint assessment_speech_collection_requires_cleanup check(not collection_enabled or cleanup_enabled);
create or replace function public.assessment_finish_speech(p_actor uuid,p_evidence uuid)
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
 update public.assessment_speech_evidence set delete_requested_at=coalesce(delete_requested_at,now()) where attempt_id=a.id and item_id=m.item_id and id<>m.id and state='ready';
 rev:=a.revision+1;
 update public.assessment_speech_evidence set state='ready',ready_at=now(),attached_revision=rev where id=m.id;
 insert into public.assessment_responses(attempt_id,item_id,answer) values(a.id,m.item_id,jsonb_build_object('inputMethod','speech_transcript','mediaEvidenceId',m.id))
 on conflict(attempt_id,item_id) do update set answer=excluded.answer,saved_at=now();
 update public.assessment_attempts set revision=rev,saved_at=now() where id=a.id;
 insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail) values(e.id,p_actor,'speech.attached',m.request_id,jsonb_build_object('attemptId',a.id,'itemId',m.item_id,'evidenceId',m.id,'revision',rev));
 return rev;
end $$;

