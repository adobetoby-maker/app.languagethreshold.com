-- Preserve frozen exams and submitted responses even if a future server path uses direct updates.
create function assessment_private.guard_attempt_snapshot() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.form_snapshot is distinct from old.form_snapshot or new.form_id is distinct from old.form_id
  or new.checkpoint_id is distinct from old.checkpoint_id or new.attempt_number is distinct from old.attempt_number
  or new.start_request_id is distinct from old.start_request_id or new.started_at is distinct from old.started_at then
  raise exception 'Frozen assessment identity cannot change';
 end if;
 if old.submitted_at is not null and (new.submitted_at is distinct from old.submitted_at or new.submit_request_id is distinct from old.submit_request_id or new.designated is distinct from old.designated) then
  raise exception 'Submitted assessment history cannot change';
 end if;
 return new;
end $$;
create trigger assessment_attempt_frozen before update on public.assessment_attempts for each row execute function assessment_private.guard_attempt_snapshot();

create function assessment_private.guard_response_write() returns trigger
language plpgsql set search_path='' as $$
declare attempt public.assessment_attempts;
begin
 if TG_OP='UPDATE' and (new.attempt_id is distinct from old.attempt_id or new.item_id is distinct from old.item_id) then raise exception 'Response identity cannot change'; end if;
 select * into attempt from public.assessment_attempts where id=new.attempt_id for update;
 if attempt.id is null or attempt.status<>'in_progress' then raise exception 'Submitted responses are immutable'; end if;
 if not exists(select 1 from jsonb_array_elements(attempt.form_snapshot->'definition'->'items') item where item->>'id'=new.item_id) then raise exception 'Response item is not in frozen form'; end if;
 return new;
end $$;
create trigger assessment_response_write before insert or update on public.assessment_responses for each row execute function assessment_private.guard_response_write();

create function assessment_private.guard_evidence_update() returns trigger
language plpgsql set search_path='' as $$
begin raise exception 'Assessment evidence is append-only'; end $$;
create trigger assessment_scores_append_only before update on public.assessment_score_events for each row execute function assessment_private.guard_evidence_update();
create trigger assessment_events_append_only before update on public.assessment_events for each row execute function assessment_private.guard_evidence_update();
revoke update,delete on public.assessment_score_events,public.assessment_events from service_role;
revoke all on function assessment_private.guard_attempt_snapshot() from public,anon,authenticated;
revoke all on function assessment_private.guard_response_write() from public,anon,authenticated;
revoke all on function assessment_private.guard_evidence_update() from public,anon,authenticated;
