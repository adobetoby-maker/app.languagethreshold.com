-- Owner-approved additive prepared-start RPC; existing flat start functions remain unchanged.
-- Trusted API supplies complete private source rows after validating the prepared digest.
-- Browser request bodies must never supply p_expected_form or p_expected_release.
create function public.assessment_start_prepared_attempt(
 p_actor uuid,p_checkpoint uuid,p_form text,p_request uuid,
 p_expected_form jsonb,p_expected_release jsonb,p_studied_objectives text[] default '{}'::text[]
) returns uuid language plpgsql security invoker set search_path='' as $$
declare en public.assessment_enrollments; cp public.assessment_checkpoints;
 form public.assessment_forms; rel public.assessment_releases; prior public.assessment_attempts;
begin
 if p_actor is null or p_request is null or jsonb_typeof(p_expected_form) is distinct from 'object'
  or jsonb_typeof(p_expected_release) is distinct from 'object'
  or octet_length(p_expected_form::text)>2000000 or octet_length(p_expected_release::text)>2000000
 then raise exception 'Prepared assessment source required'; end if;
 select e.* into en from public.assessment_enrollments e join public.assessment_checkpoints c on c.enrollment_id=e.id where c.id=p_checkpoint;
 if en.id is null or en.user_id is distinct from p_actor or not assessment_private.can_read(p_actor,en.id)
 then raise exception 'Learner assessment access required'; end if;
 -- Match the legacy start/content-exposure lock before acquiring row locks.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('assessment-content-track:'||p_actor::text||':'||en.module_id||':'||en.target_language||':'||en.instruction_language,0));
 -- Match schedule changes' enrollment -> checkpoint ordering.
 select * into en from public.assessment_enrollments where id=en.id for share;
 select * into cp from public.assessment_checkpoints where id=p_checkpoint and enrollment_id=en.id for update;
 if cp.id is null or en.user_id is distinct from p_actor or not assessment_private.can_read(p_actor,en.id)
 then raise exception 'Learner assessment access required'; end if;
 select * into prior from public.assessment_attempts where checkpoint_id=cp.id and start_request_id=p_request;
 if prior.id is not null and prior.form_id is distinct from p_form then raise exception 'Start request key reused'; end if;
 if prior.id is null then
  select * into prior from public.assessment_attempts where checkpoint_id=cp.id and status='in_progress';
 end if;
 if prior.id is not null then
  -- Preserve the authoritative frozen attempt, even after its source has changed.
  -- The existing RPC repeats current access/exposure and resume/status checks.
  return public.assessment_start_attempt(p_actor,p_checkpoint,p_form,p_request,false,p_studied_objectives);
 end if;
 if en.program_scope<>'full_module' or en.status<>'active' or cp.status<>'scheduled'
 then raise exception 'Active full-module assessment required'; end if;
 -- Same form -> release ordering as content review; hold through snapshot creation.
 select * into form from public.assessment_forms where id=p_form and release_id=en.release_id and checkpoint=cp.checkpoint for share;
 select * into rel from public.assessment_releases where id=en.release_id for share;
 if form.id is null or rel.id is null or to_jsonb(form) is distinct from p_expected_form
  or to_jsonb(rel) is distinct from p_expected_release
 then raise exception 'Prepared assessment source changed; reopen start details'; end if;
 if form.status<>'verified' or not form.calibrated or form.purpose<>'module' or rel.status<>'verified'
  or rel.module_id is distinct from en.module_id or rel.target_language is distinct from en.target_language
  or rel.instruction_language is distinct from en.instruction_language
  or form.definition->>'id' is distinct from form.id
  or form.definition->>'version' is distinct from form.version
  or form.definition->>'rubricVersion' is distinct from form.rubric_version
  or form.definition->>'status' is distinct from 'verified'
  or form.definition->>'checkpoint' is distinct from cp.checkpoint
  or form.definition->>'targetLanguage' is distinct from en.target_language
  or form.definition->>'instructionLanguage' is distinct from en.instruction_language
  or jsonb_typeof(form.definition->'routing') is distinct from 'object'
  or form.definition->'routing'->>'schema' is distinct from '1'
 then raise exception 'Reviewed calibrated adaptive assessment required'; end if;
 if not exists(select 1 from public.assessment_lesson_snapshots s where s.release_id=rel.id
  and s.fingerprint=rel.lesson_manifest->>'lessonSnapshotFingerprint' and s.content_version=rel.content_version
  and jsonb_array_length(s.snapshot_text::jsonb->'lessons')=30)
 then raise exception 'Reviewed lesson binding required'; end if;
 -- Existing transaction owns freezing, studied coverage, limits, single event and key exposure.
 return public.assessment_start_attempt(p_actor,p_checkpoint,p_form,p_request,false,p_studied_objectives);
end $$;
revoke all on function public.assessment_start_prepared_attempt(uuid,uuid,text,uuid,jsonb,jsonb,text[]) from public,anon,authenticated;
grant execute on function public.assessment_start_prepared_attempt(uuid,uuid,text,uuid,jsonb,jsonb,text[]) to service_role;
