-- Final insertion-time integrity check for newly started targeted support checks.
-- Does not alter or re-grade existing attempts, and creates no learner assignments.
create function assessment_private.guard_targeted_attempt_insert()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
 enrollment public.assessment_enrollments;
 parent public.assessment_enrollments;
 checkpoint public.assessment_checkpoints;
 capability public.assessment_support_capabilities;
 assignment public.assessment_support_assignments;
 form public.assessment_forms;
 release public.assessment_releases;
 snapshot jsonb;
 units text[];
 frozen_units jsonb;
 expected_items jsonb;
 assignment_id text;
 pilot boolean;
begin
 select * into checkpoint from public.assessment_checkpoints where id=new.checkpoint_id;
 select * into enrollment from public.assessment_enrollments where id=checkpoint.enrollment_id;
 if enrollment.program_scope is distinct from 'support_units' then return new; end if;

 assignment_id:=new.form_snapshot->>'supportAssignmentId';
 if assignment_id is null or assignment_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
  raise exception 'Targeted support assignment unavailable';
 end if;
 select * into assignment from public.assessment_support_assignments where id=assignment_id::uuid;
 select * into parent from public.assessment_enrollments where id=assignment.enrollment_id;
 select * into capability from public.assessment_support_capabilities where id=enrollment.support_capability_id;
 select * into form from public.assessment_forms where id=new.form_id;
 select * into release from public.assessment_releases where id=enrollment.release_id;
 snapshot:=assignment.capability_snapshot;
 if assignment.id is null or assignment.support_enrollment_id is distinct from enrollment.id
  or assignment.mode is distinct from 'units' or assignment.status not in ('active','checkpoint_due')
  or assignment.user_id is distinct from enrollment.user_id or assignment.organization_id is distinct from enrollment.organization_id
  or parent.id is null or parent.user_id is distinct from enrollment.user_id or parent.scope is distinct from enrollment.scope
  or parent.organization_id is distinct from enrollment.organization_id or parent.target_language is distinct from enrollment.target_language
  or parent.instruction_language is distinct from enrollment.instruction_language then
  raise exception 'Targeted support assignment unavailable';
 end if;
 if capability.id is null or capability.status is distinct from 'verified' or capability.assignment_mode is distinct from 'units'
  or capability.release_id is distinct from enrollment.release_id or release.id is null
  or release.module_id is distinct from enrollment.module_id or release.target_language is distinct from enrollment.target_language
  or release.instruction_language is distinct from enrollment.instruction_language
  or snapshot->>'capabilityId' is distinct from capability.id or snapshot->>'version' is distinct from capability.version
  or snapshot->>'releaseId' is distinct from enrollment.release_id or snapshot->>'contentVersion' is distinct from release.content_version
  or snapshot->>'moduleId' is distinct from enrollment.module_id or snapshot->>'targetLanguage' is distinct from enrollment.target_language
  or snapshot->>'instructionLanguage' is distinct from enrollment.instruction_language then
  raise exception 'Targeted support mapping unavailable';
 end if;
 if form.id is null or form.purpose is distinct from 'support' or form.release_id is distinct from enrollment.release_id
  or form.support_capability_id is distinct from capability.id or form.checkpoint is distinct from checkpoint.checkpoint
  or checkpoint.checkpoint not in ('entrance','day90')
  or form.id is distinct from (case when checkpoint.checkpoint='entrance' then capability.before_form_id else capability.after_form_id end) then
  raise exception 'Targeted support check unavailable';
 end if;
 pilot:=coalesce((new.form_snapshot->>'pilot')::boolean,false);
 if not pilot and (form.status is distinct from 'verified' or not form.calibrated or release.status is distinct from 'verified') then
  raise exception 'Targeted support content review is pending';
 end if;
 if new.form_snapshot->>'programScope' is distinct from 'support_units'
  or new.form_snapshot->>'formId' is distinct from form.id or new.form_snapshot->>'releaseId' is distinct from release.id
  or new.form_snapshot->>'version' is distinct from form.version or new.form_snapshot->>'rubricVersion' is distinct from form.rubric_version
  or new.form_snapshot->>'contentVersion' is distinct from release.content_version then
  raise exception 'Targeted support frozen version conflict';
 end if;
 if jsonb_typeof(snapshot->'lessonIds') is distinct from 'array' then raise exception 'Targeted support units unavailable'; end if;
 if jsonb_array_length(snapshot->'lessonIds') not between 1 and 30
  or exists(select 1 from jsonb_array_elements(snapshot->'lessonIds') unit where jsonb_typeof(unit) is distinct from 'string') then
  raise exception 'Targeted support units unavailable';
 end if;
 select array_agg(value order by ordinal) into units
  from jsonb_array_elements_text(snapshot->'lessonIds') with ordinality as assigned(value,ordinal);
 if cardinality(units)<>(select count(distinct unit) from unnest(units) unit)
  or not units<@capability.lesson_ids or not coalesce((release.lesson_manifest->'lessonIds') ?& units,false) then
  raise exception 'Targeted support units unavailable';
 end if;
 frozen_units:=new.form_snapshot->'unitLessonIds';
 if jsonb_typeof(frozen_units) is distinct from 'array' then raise exception 'Targeted support frozen units conflict'; end if;
 if jsonb_array_length(frozen_units)<>cardinality(units) or not (frozen_units @> to_jsonb(units) and frozen_units <@ to_jsonb(units)) then
  raise exception 'Targeted support frozen units conflict';
 end if;
 if jsonb_typeof(form.definition->'items') is distinct from 'array' then raise exception 'Targeted support items unavailable'; end if;
 if jsonb_array_length(form.definition->'items') not between 1 and 1000 then raise exception 'Targeted support items unavailable'; end if;
 select coalesce(jsonb_agg(item order by ordinal),'[]'::jsonb) into expected_items
  from jsonb_array_elements(form.definition->'items') with ordinality as items(item,ordinal)
  where item->>'objectiveId'=any(units);
 if exists(select 1 from unnest(units) unit where not exists(
  select 1 from jsonb_array_elements(expected_items) item where item->>'objectiveId'=unit)) then
  raise exception 'Targeted support check must cover every assigned unit';
 end if;
 if new.form_snapshot->'definition'->'items' is distinct from expected_items then
  raise exception 'Targeted support frozen items conflict';
 end if;
 return new;
end $$;
revoke all on function assessment_private.guard_targeted_attempt_insert() from public,anon,authenticated;
grant execute on function assessment_private.guard_targeted_attempt_insert() to service_role;
create trigger assessment_targeted_attempt_insert
 before insert on public.assessment_attempts for each row
 execute function assessment_private.guard_targeted_attempt_insert();
