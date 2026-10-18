-- Fictional local actors/material only; the outer integration transaction rolls back.
reset role;
insert into public.assessment_releases(id,module_id,target_language,instruction_language,content_version,lesson_manifest)
values('lesson-binding-fixture','roofing','Spanish','English','fixture-v1','{"lessonCount":1,"lessonIds":["roofing.lesson.1"],"reviewed":false}');
insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,definition)
values('lesson-binding-form','lesson-binding-fixture','entrance','fixture-v1','fixture-rubric','{"items":[]}');
set local role service_role;
do $$
declare owner_id uuid:='10000000-0000-4000-8000-000000000003';reviewer uuid:='10000000-0000-4000-8000-000000000004';admin_id uuid:='10000000-0000-4000-8000-000000000002';
 material text:='{"instructionLanguage":"English","lessons":[{"lessonNumber":1,"objectiveId":"roofing.lesson.1"}],"moduleId":"roofing","requiredLessons":30,"schema":1,"status":"current-app-draft","targetLanguage":"Spanish"}';
 manifest jsonb:='{"lessonCount":1,"lessonIds":["roofing.lesson.1"],"reviewed":false}';
 fingerprint text;request_id uuid:=gen_random_uuid();result jsonb;again jsonb;old_hash text;current_hash text;
begin
 fingerprint:=encode(sha256(convert_to(material,'UTF8')),'hex');
 perform public.assessment_manage_reviewer(owner_id,reviewer,'roofing','Spanish','English','curriculum',true,2,'Local snapshot fixture only',gen_random_uuid());
 old_hash:=public.assessment_content_review_context(reviewer,'lesson-binding-form')->>'fingerprint';
 perform pg_temp.expect_error(format('select public.assessment_record_content_review(%L,''lesson-binding-form'',''curriculum'',''approved'',%L,''Fixture unbound approval'',%L)',reviewer,old_hash,gen_random_uuid()),'Bind lesson materials');
 perform public.assessment_record_content_review(reviewer,'lesson-binding-form','curriculum','changes_requested',old_hash,'Local fixture: missing lesson binding',gen_random_uuid());
 perform pg_temp.expect_error(format('select public.assessment_bind_lesson_snapshot(%L,''lesson-binding-fixture'',%L,%L,%L,''fixture-v1'',%L)',admin_id,material,fingerprint,manifest,request_id),'Registered platform owner access required');
 perform pg_temp.expect_error(format('select public.assessment_bind_lesson_snapshot(%L,''lesson-binding-fixture'',%L,%L,%L,''fixture-v1'',%L)',owner_id,material,repeat('0',64),manifest,request_id),'fingerprint conflict');
 perform pg_temp.expect_error(format('select public.assessment_bind_lesson_snapshot(%L,''lesson-binding-fixture'',%L,%L,''{}'',''fixture-v1'',%L)',owner_id,material,fingerprint,request_id),'release conflict');
 perform pg_temp.expect_error(format('select public.assessment_bind_lesson_snapshot(%L,''lesson-binding-fixture'',%L,%L,%L,''stale-version'',%L)',owner_id,material,fingerprint,manifest,request_id),'release conflict');
 result:=public.assessment_bind_lesson_snapshot(owner_id,'lesson-binding-fixture',material,fingerprint,manifest,'fixture-v1',request_id);
 again:=public.assessment_bind_lesson_snapshot(owner_id,'lesson-binding-fixture',material,fingerprint,manifest,'fixture-v1',request_id);
 if result<>again or (select count(*) from public.assessment_lesson_snapshots where release_id='lesson-binding-fixture')<>1 then raise exception 'Lesson binding retry duplicated'; end if;
 if not exists(select 1 from public.assessment_releases where id='lesson-binding-fixture' and lesson_manifest->>'lessonSnapshotFingerprint'=fingerprint and status='draft' and review_records='[]' and lesson_manifest->>'reviewed'='false') then raise exception 'Binding changed approval state'; end if;
 insert into public.assessment_releases(id,module_id,target_language,instruction_language,content_version) values('lesson-binding-fixture','roofing','Spanish','English','discarded-seed') on conflict(id) do nothing;
 if not exists(select 1 from public.assessment_releases where id='lesson-binding-fixture' and content_version='fixture-v1' and lesson_manifest->>'lessonSnapshotFingerprint'=fingerprint) then raise exception 'Idempotent draft seeding overwrote binding'; end if;
 perform pg_temp.expect_error(format('select public.assessment_bind_lesson_snapshot(%L,''lesson-binding-fixture'',%L,%L,%L,''changed-version'',%L)',owner_id,material,fingerprint,manifest,request_id),'request key reused');
 perform pg_temp.expect_error(format('select public.assessment_bind_lesson_snapshot(%L,''lesson-binding-fixture'',%L,%L,%L,''fixture-v1'',%L)',owner_id,material,fingerprint,manifest,gen_random_uuid()),'immutable');
 current_hash:=public.assessment_content_review_context(reviewer,'lesson-binding-form')->>'fingerprint';
 if old_hash=current_hash then raise exception 'Binding failed to invalidate earlier form fingerprint'; end if;
 perform pg_temp.expect_error(format('select public.assessment_record_content_review(%L,''lesson-binding-form'',''curriculum'',''approved'',%L,''Stale local fixture'',%L)',reviewer,old_hash,gen_random_uuid()),'Content conflict');
 perform public.assessment_record_content_review(reviewer,'lesson-binding-form','curriculum','approved',current_hash,'Fictional local review only; not a real qualification',gen_random_uuid());
 if not exists(select 1 from public.assessment_forms where id='lesson-binding-form' and status='draft' and calibrated=false) then raise exception 'Review published or calibrated a draft'; end if;
 perform pg_temp.expect_error('update public.assessment_lesson_snapshots set snapshot_text=''{}''','permission denied');
 perform pg_temp.expect_error('delete from public.assessment_lesson_snapshots','permission denied');
 perform pg_temp.expect_error('truncate public.assessment_lesson_snapshots','permission denied');
 perform pg_temp.expect_error('update public.assessment_releases set content_version=''changed'' where id=''lesson-binding-fixture''','Bound lesson identity is immutable');
 perform pg_temp.expect_error('update public.assessment_releases set lesson_manifest=lesson_manifest-''lessonSnapshotFingerprint'' where id=''lesson-binding-fixture''','Bound lesson fingerprint is immutable');
 perform pg_temp.expect_error('update public.assessment_releases set lesson_manifest=jsonb_set(lesson_manifest,''{lessonIds}'',''[]'') where id=''lesson-binding-fixture''','Bound lesson identity is immutable');
 perform pg_temp.expect_error('update public.assessment_releases set lesson_manifest=jsonb_set(lesson_manifest,''{lessonSnapshotFingerprint}'',to_jsonb(repeat(''0'',64))) where id=''roofing-es-en-test''','Stored lesson snapshot required');
 perform pg_temp.expect_error('update public.assessment_releases set status=''verified'',verified_at=now(),review_records=''[{}, {}, {}]'' where id=''lesson-binding-fixture''','frozen 30-lesson snapshot');
end $$;
reset role;
set local role authenticated;
select pg_temp.expect_error('select * from public.assessment_lesson_snapshots','permission denied');
select pg_temp.expect_error('select public.assessment_bind_lesson_snapshot(null,null,null,null,null,null,null)','permission denied');
reset role;
select 'PASS: immutable lesson binding, exact bytes, owner/scope protection, retries/conflicts, review invalidation and no publication' as result;
