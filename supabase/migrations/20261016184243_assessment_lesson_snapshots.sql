-- Freeze public practice material for review. This grants no reviewer role and publishes nothing.
create table public.assessment_lesson_snapshots (
 release_id text primary key references public.assessment_releases(id),
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 snapshot_text text not null check(octet_length(snapshot_text) between 2 and 2000000),
 actor_id uuid not null references auth.users(id),
 request_id uuid not null,expected_manifest jsonb not null,content_version text not null,
 created_at timestamptz not null default now(),unique(actor_id,request_id),
 check(fingerprint=encode(sha256(convert_to(snapshot_text,'UTF8')),'hex')),
 check(jsonb_typeof(snapshot_text::jsonb)='object')
);
create index assessment_lesson_snapshots_actor_idx on public.assessment_lesson_snapshots(actor_id);
alter table public.assessment_lesson_snapshots enable row level security;
revoke all on public.assessment_lesson_snapshots from public,anon,authenticated,service_role;
grant select,insert on public.assessment_lesson_snapshots to service_role;
create trigger assessment_lesson_snapshots_append_only before update on public.assessment_lesson_snapshots for each row execute function assessment_private.guard_evidence_update();

create function public.assessment_bind_lesson_snapshot(p_actor uuid,p_release text,p_snapshot text,p_fingerprint text,p_expected_manifest jsonb,p_content_version text,p_request uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare rel public.assessment_releases;old public.assessment_lesson_snapshots;material jsonb;lesson_count integer;objective_ids jsonb;
begin
 if not exists(select 1 from public.platform_admin_roles where user_id=p_actor and role='owner') then raise exception 'Registered platform owner access required'; end if;
 if p_request is null or p_snapshot is null or octet_length(p_snapshot) not between 2 and 2000000 or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' or p_expected_manifest is null or jsonb_typeof(p_expected_manifest)<>'object' then raise exception 'Invalid lesson snapshot'; end if;
 if p_fingerprint<>encode(sha256(convert_to(p_snapshot,'UTF8')),'hex') then raise exception 'Lesson snapshot fingerprint conflict'; end if;
 material:=p_snapshot::jsonb;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('assessment-lesson-request:'||p_actor::text||':'||p_request::text,0));
 select * into old from public.assessment_lesson_snapshots where actor_id=p_actor and request_id=p_request;
 if old.release_id is not null then
  if old.release_id<>p_release or old.snapshot_text<>p_snapshot or old.fingerprint<>p_fingerprint or old.expected_manifest<>p_expected_manifest or old.content_version is distinct from p_content_version then raise exception 'Lesson snapshot request key reused'; end if;
  return jsonb_build_object('fingerprint',old.fingerprint,'createdAt',old.created_at);
 end if;
 select * into rel from public.assessment_releases where id=p_release for update;
 if rel.id is null then raise exception 'Lesson release was not found'; end if;
 if exists(select 1 from public.assessment_lesson_snapshots where release_id=p_release) then raise exception 'Lesson snapshot is immutable; create a new release version'; end if;
 if rel.status<>'draft' then raise exception 'Only a draft release can bind lesson materials'; end if;
 if rel.content_version is distinct from p_content_version or rel.lesson_manifest<>p_expected_manifest then raise exception 'Lesson release conflict; refresh before binding'; end if;
 if material->>'schema' is distinct from '1' or material->>'status' is distinct from 'current-app-draft' or material->>'requiredLessons' is distinct from '30'
  or material->>'moduleId' is distinct from rel.module_id or material->>'targetLanguage' is distinct from rel.target_language or material->>'instructionLanguage' is distinct from rel.instruction_language
  or jsonb_typeof(material->'lessons') is distinct from 'array' then raise exception 'Lesson snapshot track conflict'; end if;
 lesson_count:=jsonb_array_length(material->'lessons');
 if lesson_count not between 1 and 30 or rel.lesson_manifest->>'lessonCount' is distinct from lesson_count::text then raise exception 'Lesson snapshot count conflict'; end if;
 if exists(select 1 from jsonb_array_elements(material->'lessons') lesson where coalesce(lesson->>'lessonNumber','') !~ '^([1-9]|[12][0-9]|30)$'
  or lesson->>'objectiveId' is distinct from rel.module_id||'.lesson.'||(lesson->>'lessonNumber')) then raise exception 'Lesson snapshot objective conflict'; end if;
 if (select count(distinct lesson->>'objectiveId') from jsonb_array_elements(material->'lessons') lesson)<>lesson_count then raise exception 'Duplicate lesson snapshot objective'; end if;
 select jsonb_agg(lesson->>'objectiveId' order by (lesson->>'lessonNumber')::integer) into objective_ids from jsonb_array_elements(material->'lessons') lesson;
 if rel.lesson_manifest->'lessonIds' is distinct from objective_ids then raise exception 'Lesson snapshot objectives conflict'; end if;
 insert into public.assessment_lesson_snapshots(release_id,fingerprint,snapshot_text,actor_id,request_id,expected_manifest,content_version)
 values(p_release,p_fingerprint,p_snapshot,p_actor,p_request,p_expected_manifest,p_content_version);
 update public.assessment_releases set lesson_manifest=lesson_manifest||jsonb_build_object('lessonSnapshotFingerprint',p_fingerprint) where id=p_release;
 return jsonb_build_object('fingerprint',p_fingerprint,'createdAt',(select created_at from public.assessment_lesson_snapshots where release_id=p_release));
end $$;
revoke all on function public.assessment_bind_lesson_snapshot(uuid,text,text,text,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_bind_lesson_snapshot(uuid,text,text,text,jsonb,text,uuid) to service_role;

create function assessment_private.guard_lesson_binding() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 -- Existing draft seeding uses INSERT ... ON CONFLICT DO NOTHING. Its discarded candidate
 -- must not be mistaken for a replacement of an already-bound release.
 if tg_op='INSERT' and exists(select 1 from public.assessment_releases where id=new.id) then return new; end if;
 if tg_op='UPDATE' and exists(select 1 from public.assessment_lesson_snapshots where release_id=old.id) and
  (new.id<>old.id or new.module_id<>old.module_id or new.target_language<>old.target_language or new.instruction_language<>old.instruction_language or new.content_version<>old.content_version
   or new.lesson_manifest->'lessonCount' is distinct from old.lesson_manifest->'lessonCount' or new.lesson_manifest->'lessonIds' is distinct from old.lesson_manifest->'lessonIds') then raise exception 'Bound lesson identity is immutable; create a new release version'; end if;
 if exists(select 1 from public.assessment_lesson_snapshots s where s.release_id=new.id and s.fingerprint is distinct from new.lesson_manifest->>'lessonSnapshotFingerprint') then raise exception 'Bound lesson fingerprint is immutable'; end if;
 if new.lesson_manifest ? 'lessonSnapshotFingerprint' and not exists(select 1 from public.assessment_lesson_snapshots s where s.release_id=new.id and s.fingerprint=new.lesson_manifest->>'lessonSnapshotFingerprint') then raise exception 'Stored lesson snapshot required'; end if;
 if new.status='verified' and not exists(select 1 from public.assessment_lesson_snapshots s where s.release_id=new.id and s.fingerprint=new.lesson_manifest->>'lessonSnapshotFingerprint' and jsonb_array_length(s.snapshot_text::jsonb->'lessons')=30) then raise exception 'A frozen 30-lesson snapshot is required before verification'; end if;
 return new;
end $$;
revoke all on function assessment_private.guard_lesson_binding() from public,anon,authenticated;
grant execute on function assessment_private.guard_lesson_binding() to service_role;
create trigger assessment_release_lesson_binding before insert or update on public.assessment_releases for each row execute function assessment_private.guard_lesson_binding();

-- Existing exam review fingerprints cover the immutable lesson reference in the manifest.
-- Approval requires the referenced material to exist; findings can still be recorded on incomplete drafts.
create or replace function public.assessment_record_content_review(p_actor uuid,p_form text,p_kind text,p_decision text,p_fingerprint text,p_note text,p_request uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare form public.assessment_forms;release public.assessment_releases;scope public.assessment_content_reviewers;old public.assessment_content_decisions;result uuid;current_hash text;
begin
 if p_kind is null or p_kind not in ('curriculum','fluent_language','domain') or p_decision is null or p_decision not in ('approved','changes_requested') or p_note is null or length(trim(p_note)) not between 3 and 4000 or p_request is null then raise exception 'Invalid content review'; end if;
 select * into form from public.assessment_forms where id=p_form for share;
 select * into release from public.assessment_releases where id=form.release_id for share;
 select * into scope from public.assessment_content_reviewers where user_id=p_actor and module_id=release.module_id and target_language=release.target_language and instruction_language=release.instruction_language and kind=p_kind and active for share;
 if scope.user_id is null then raise exception 'Assigned content reviewer access required'; end if;
 current_hash:=assessment_private.content_fingerprint(p_form);
 if p_fingerprint is distinct from current_hash then raise exception 'Content conflict; reload before reviewing'; end if;
 if p_decision='approved' and not exists(select 1 from public.assessment_lesson_snapshots s where s.release_id=release.id and s.fingerprint=release.lesson_manifest->>'lessonSnapshotFingerprint') then raise exception 'Bind lesson materials before recording approval'; end if;
 perform public.assessment_note_content_exposure(p_actor,p_form);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('assessment-content-request:'||p_actor::text||':'||p_request::text,0));
 select * into old from public.assessment_content_decisions where actor_id=p_actor and request_id=p_request;
 if old.id is not null then
  if old.form_id<>p_form or old.kind<>p_kind or old.decision<>p_decision or old.fingerprint<>p_fingerprint or old.note<>trim(p_note) then raise exception 'Content review request key reused'; end if;
  return old.id;
 end if;
 insert into public.assessment_content_decisions(form_id,actor_id,kind,decision,fingerprint,note,grant_revision,request_id) values(p_form,p_actor,p_kind,p_decision,current_hash,trim(p_note),scope.revision,p_request) returning id into result;
 return result;
end $$;
revoke all on function public.assessment_record_content_review(uuid,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_record_content_review(uuid,text,text,text,text,text,uuid) to service_role;
