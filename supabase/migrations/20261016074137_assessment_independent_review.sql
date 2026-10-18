-- A learner cannot become their own reviewer by changing team roles later.
create or replace function assessment_private.can_review(p_actor uuid,p_attempt uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.assessment_attempts a
 join public.assessment_checkpoints c on c.id=a.checkpoint_id
 join public.assessment_enrollments e on e.id=c.enrollment_id
 where a.id=p_attempt and e.user_id<>p_actor and (
  (e.scope='team' and exists(select 1 from public.team_members m where m.organization_id=e.organization_id and m.user_id=p_actor and m.status='active' and m.role in ('owner','admin')))
  or (e.scope='personal' and exists(select 1 from public.assessment_review_requests q
   join public.assessment_reviewers r on r.user_id=q.reviewer_id
   where q.attempt_id=a.id and q.reviewer_id=p_actor and q.status='claimed' and r.active and r.module_id=e.module_id and r.target_language=e.target_language and r.instruction_language=e.instruction_language))
 ));
$$;

alter table public.assessment_review_requests
 add constraint assessment_review_independent check(reviewer_id is null or reviewer_id<>requested_by);
-- Raw speech evidence has no approved retention policy yet. Fail closed until
-- a protected, consented evidence workflow can validate the linked recording.
create function assessment_private.require_spoken_evidence() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.state='scored' and new.skill='speaking' then
  raise exception 'Verified spoken evidence workflow is not enabled';
 end if;
 return new;
end $$;
revoke all on function assessment_private.require_spoken_evidence() from public,anon,authenticated;
create trigger assessment_spoken_evidence before insert on public.assessment_score_events
 for each row execute function assessment_private.require_spoken_evidence();
