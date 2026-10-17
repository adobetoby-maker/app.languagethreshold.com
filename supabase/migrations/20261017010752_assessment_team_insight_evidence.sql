-- Server-only bounded cohort evidence, never callable with a caller-selected actor from a browser.
create function public.assessment_team_insight_evidence(p_actor uuid,p_org uuid,p_form text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare selected public.assessment_forms; result jsonb;
begin
 if p_actor is null or p_org is null or p_form is null then raise exception 'Invalid team insight request'; end if;
 if not exists(select 1 from public.team_members where organization_id=p_org and user_id=p_actor and status='active' and role in ('owner','admin')) then raise exception 'Team insight admin access required'; end if;
 select f.* into selected from public.assessment_forms f join public.assessment_releases r on r.id=f.release_id
  where f.id=p_form and f.status='verified' and f.calibrated and f.purpose='module' and r.status='verified';
 if not found then raise exception 'Reviewed calibrated insight form required'; end if;
 if jsonb_typeof(selected.definition->'items') is distinct from 'array' or jsonb_array_length(selected.definition->'items') not between 1 and 1000 then raise exception 'Invalid reviewed insight form'; end if;
 with cohort as (
  select e.id,e.user_id from public.assessment_enrollments e
   join public.team_members m on m.organization_id=e.organization_id and m.user_id=e.user_id
   where e.organization_id=p_org and e.scope='team' and e.role='primary' and e.program_scope='full_module'
    and e.status='active' and e.release_id=selected.release_id and m.status='active' and m.role='learner'
   order by e.id limit 1001
 ), evidence as (
  select e.user_id,a.status,
   coalesce((select jsonb_agg(jsonb_build_object('itemId',r.item_id,'objectiveId',s.objective_id,'skill',s.skill,'state',s.state,'points',s.points,'maximum',s.maximum,'source',s.source))
    from public.assessment_responses r join lateral(select * from public.assessment_score_events score where score.response_id=r.id order by revision desc limit 1) s on true where r.attempt_id=a.id),'[]'::jsonb) as items
  from cohort e left join public.assessment_checkpoints c on c.enrollment_id=e.id and c.checkpoint=selected.checkpoint
  left join lateral(select t.* from public.assessment_attempts t where t.checkpoint_id=c.id and t.form_id=selected.id
   and t.designated and t.submitted_at is not null and t.form_snapshot->'calibrated'='true'::jsonb
   and not coalesce((t.form_snapshot->>'pilot')::boolean,false)
   and t.form_snapshot->>'version'=selected.version and t.form_snapshot->>'rubricVersion'=selected.rubric_version
   order by t.attempt_number desc limit 1) a on true
 )
 select case when (select count(*) from cohort)>1000 or (select count(*) from cohort)*jsonb_array_length(selected.definition->'items')>50000 then jsonb_build_object('status','too_large','learners','[]'::jsonb)
  when (select count(*) from cohort)<5 then jsonb_build_object('status','small_group','learners','[]'::jsonb)
  else jsonb_build_object('status','available','learners',coalesce((select jsonb_agg(jsonb_build_object('learnerId',user_id,'attemptState',coalesce(status,'not_started'),'evidence',items)) from evidence),'[]'::jsonb)) end into result;
 return result;
end $$;
revoke all on function public.assessment_team_insight_evidence(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.assessment_team_insight_evidence(uuid,uuid,text) to service_role;
