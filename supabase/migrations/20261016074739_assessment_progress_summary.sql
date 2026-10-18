-- One bounded, authorized query; no response text, private forms or answer keys.
create function public.assessment_progress_summaries(p_actor uuid,p_enrollments uuid[])
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if coalesce(cardinality(p_enrollments),0)>200 then raise exception 'Assessment report limit exceeded'; end if;
 if exists(select 1 from unnest(p_enrollments) id where not assessment_private.can_read(p_actor,id)) then raise exception 'Assessment report access required'; end if;
 select coalesce(jsonb_agg(row_result),'[]'::jsonb) into result from (
  select jsonb_build_object('attemptId',a.id,'checkpoint',c.checkpoint,'calibrated',coalesce((a.form_snapshot->>'calibrated')::boolean,false),
   'equivalenceApproved',coalesce((a.form_snapshot->>'equivalenceApproved')::boolean,false),'equivalenceGroup',a.form_snapshot->>'equivalenceGroup',
   'evidence',coalesce((select jsonb_agg(jsonb_build_object('itemId',r.item_id,'objectiveId',s.objective_id,'skill',s.skill,'state',s.state,'points',s.points,'maximum',s.maximum,'source',s.source,'comparisonGroup',s.comparison_group,'coverage',s.coverage))
    from public.assessment_responses r join lateral(select * from public.assessment_score_events score where score.response_id=r.id order by revision desc limit 1) s on true where r.attempt_id=a.id),'[]'::jsonb)) row_result
  from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id
  where c.enrollment_id=any(p_enrollments) and a.submitted_at is not null
 ) summaries;
 return result;
end $$;
revoke all on function public.assessment_progress_summaries(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.assessment_progress_summaries(uuid,uuid[]) to service_role;
