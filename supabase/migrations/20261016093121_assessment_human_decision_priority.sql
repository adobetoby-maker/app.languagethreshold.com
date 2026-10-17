-- A late provider response cannot replace any human disposition, including Not assessed.
create function assessment_private.protect_human_decision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.source='ai_proposal' and exists(select 1 from public.assessment_score_events where response_id=new.response_id and source='human') then
  raise exception 'Human review cannot be replaced by an AI proposal';
 end if;
 return new;
end $$;
revoke all on function assessment_private.protect_human_decision() from public,anon,authenticated;
create trigger assessment_human_decision_priority before insert on public.assessment_score_events for each row execute function assessment_private.protect_human_decision();
