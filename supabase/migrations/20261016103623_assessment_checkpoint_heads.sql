-- Latest and designated attempts plus exact counts for support/checkpoint previews.
create function public.assessment_checkpoint_heads(p_actor uuid,p_checkpoints uuid[])
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_actor is null or coalesce(cardinality(p_checkpoints),0)>200 then raise exception 'Checkpoint report limit exceeded'; end if;
 if exists(select 1 from unnest(p_checkpoints) requested(id) where not exists(select 1 from public.assessment_checkpoints c where c.id=requested.id and assessment_private.can_read(p_actor,c.enrollment_id))) then raise exception 'Checkpoint report access required'; end if;
 with ranked as (
  select a.id,a.checkpoint_id,a.attempt_number,a.form_id,a.status,a.revision,a.started_at,a.submitted_at,a.designated,
   row_number() over(partition by a.checkpoint_id order by a.attempt_number desc) as position
  from public.assessment_attempts a where a.checkpoint_id=any(p_checkpoints)
 ) select coalesce(jsonb_agg(jsonb_build_object('checkpointId',c.id,'attemptCount',(select count(*) from ranked a where a.checkpoint_id=c.id),
  'attempts',coalesce((select jsonb_agg(to_jsonb(a)-'position' order by a.attempt_number desc) from ranked a where a.checkpoint_id=c.id and (a.position=1 or a.designated)),'[]'::jsonb))),'[]'::jsonb) into result
  from public.assessment_checkpoints c where c.id=any(p_checkpoints);
 return result;
end $$;
revoke all on function public.assessment_checkpoint_heads(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.assessment_checkpoint_heads(uuid,uuid[]) to service_role;
create index assessment_events_history_idx on public.assessment_events(enrollment_id,created_at desc,id desc);
create index assessment_enrollments_team_page_idx on public.assessment_enrollments(organization_id,created_at desc,id desc);
