-- Page the enrollment overview and bound its attempt selection before transferring data.
create function public.assessment_overview_page(
 p_actor uuid,p_org uuid default null,p_after timestamptz default null,p_after_id uuid default null,
 p_module text default null,p_learner uuid default null,p_state text default 'all',p_target text default null,p_native text default null
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; is_admin boolean:=false;
begin
 if p_actor is null or (p_after is null)<>(p_after_id is null) or p_state is null or p_state not in ('all','active','paused','needs_review','in_progress','overdue','upcoming') then raise exception 'Invalid assessment overview request'; end if;
 if p_org is not null then
  select m.role in ('owner','admin') into is_admin from public.team_members m where m.organization_id=p_org and m.user_id=p_actor and m.status='active';
  if is_admin is null then raise exception 'Team assessment access required'; end if;
 end if;
 if p_learner is not null and p_learner<>p_actor and not is_admin then raise exception 'Learner filter access required'; end if;
 with matches as (
  select e.* from public.assessment_enrollments e
  where e.program_scope='full_module' and assessment_private.can_read(p_actor,e.id)
   and ((p_org is null and e.user_id=p_actor) or (p_org is not null and e.organization_id=p_org))
   and (p_module is null or e.module_id=p_module) and (p_learner is null or e.user_id=p_learner)
   and (p_target is null or e.target_language=p_target) and (p_native is null or e.instruction_language=p_native)
   and (p_after is null or (e.created_at,e.id)<(p_after,p_after_id))
   and (p_state='all' or (p_state in ('active','paused') and e.status=p_state)
    or (p_state in ('needs_review','in_progress') and exists(select 1 from public.assessment_checkpoints c join public.assessment_attempts a on a.checkpoint_id=c.id where c.enrollment_id=e.id and ((p_state='needs_review' and a.status in ('submitted','scoring','needs_review')) or (p_state='in_progress' and a.status='in_progress'))))
    or (p_state in ('overdue','upcoming') and e.status='active' and exists(select 1 from public.assessment_checkpoints c where c.enrollment_id=e.id and c.status='scheduled'
     and not exists(select 1 from public.assessment_attempts a where a.checkpoint_id=c.id and a.submitted_at is not null)
     and ((p_state='overdue' and c.due_date<(now() at time zone e.timezone)::date)
       or (p_state='upcoming' and c.due_date between (now() at time zone e.timezone)::date and (now() at time zone e.timezone)::date+7)))))
  order by e.created_at desc,e.id desc limit 51
 ), page as (select * from matches order by created_at desc,id desc limit 50), checks as (
  select c.*,(select count(*) from public.assessment_attempts a where a.checkpoint_id=c.id) as attempt_count from public.assessment_checkpoints c where c.enrollment_id in (select id from page)
 ), ranked as (
  select a.id,a.checkpoint_id,a.attempt_number,a.form_id,a.status,a.revision,a.started_at,a.submitted_at,a.designated,
   row_number() over(partition by a.checkpoint_id order by a.attempt_number desc) as position
   from public.assessment_attempts a where a.checkpoint_id in (select id from checks)
 ), attempts as (select id,checkpoint_id,attempt_number,form_id,status,revision,started_at,submitted_at,designated from ranked where position=1 or designated)
 select jsonb_build_object(
  'enrollments',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('organization_name',(select o.name from public.team_organizations o where o.id=p.organization_id)) order by p.created_at desc,p.id desc) from page p),'[]'::jsonb),
  'checkpoints',coalesce((select jsonb_agg(to_jsonb(c)) from checks c),'[]'::jsonb),
  'attempts',coalesce((select jsonb_agg(to_jsonb(a) order by a.attempt_number desc,a.id) from attempts a),'[]'::jsonb),
  'hasMore',(select count(*)>50 from matches),
  'nextCursor',(select jsonb_build_object('createdAt',created_at,'id',id) from page order by created_at,id limit 1)
 ) into result;
 return result;
end $$;
revoke all on function public.assessment_overview_page(uuid,uuid,timestamptz,uuid,text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.assessment_overview_page(uuid,uuid,timestamptz,uuid,text,uuid,text,text,text) to service_role;

-- Report only selected attempts, never whole unbounded retake histories or raw answers.
create function public.assessment_selected_summaries(p_actor uuid,p_enrollments uuid[],p_attempts uuid[])
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_actor is null or coalesce(cardinality(p_enrollments),0)>50 or coalesce(cardinality(p_attempts),0)>600 then raise exception 'Assessment report limit exceeded'; end if;
 if exists(select 1 from unnest(p_enrollments) id where not assessment_private.can_read(p_actor,id)) then raise exception 'Assessment report access required'; end if;
 if exists(select 1 from unnest(p_attempts) requested(id) where not exists(select 1 from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id where a.id=requested.id and c.enrollment_id=any(p_enrollments))) then raise exception 'Assessment report attempt scope mismatch'; end if;
 select coalesce(jsonb_agg(row_result),'[]'::jsonb) into result from (
  select jsonb_build_object('attemptId',a.id,'checkpoint',c.checkpoint,'calibrated',coalesce((a.form_snapshot->>'calibrated')::boolean,false),
   'equivalenceApproved',coalesce((a.form_snapshot->>'equivalenceApproved')::boolean,false),'equivalenceGroup',a.form_snapshot->>'equivalenceGroup',
   'evidence',coalesce((select jsonb_agg(jsonb_build_object('itemId',r.item_id,'objectiveId',s.objective_id,'skill',s.skill,'state',s.state,'points',s.points,'maximum',s.maximum,'source',s.source,'comparisonGroup',s.comparison_group,'coverage',s.coverage))
    from public.assessment_responses r join lateral(select * from public.assessment_score_events score where score.response_id=r.id order by revision desc limit 1) s on true where r.attempt_id=a.id),'[]'::jsonb)) row_result
  from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id
  where c.enrollment_id=any(p_enrollments) and a.id=any(p_attempts) and a.submitted_at is not null
 ) summaries;
 return result;
end $$;
revoke all on function public.assessment_selected_summaries(uuid,uuid[],uuid[]) from public,anon,authenticated;
grant execute on function public.assessment_selected_summaries(uuid,uuid[],uuid[]) to service_role;
