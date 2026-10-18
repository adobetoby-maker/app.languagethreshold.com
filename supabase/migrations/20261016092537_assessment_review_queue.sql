-- Authorized, paginated discovery. Private answers remain inaccessible until an explicit request is claimed.
create function public.assessment_review_queue(p_actor uuid,p_org uuid default null,p_after timestamptz default null,p_after_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if p_actor is null or (p_after is null)<>(p_after_id is null) then raise exception 'Invalid review queue request'; end if;
 if p_org is not null and not exists(select 1 from public.team_members m where m.organization_id=p_org and m.user_id=p_actor and m.status='active' and m.role in ('owner','admin')) then raise exception 'Team review access required'; end if;
 with available as (
  select a.id as attempt_id,a.submitted_at,a.attempt_number,a.status,c.checkpoint,e.module_id,e.target_language,e.instruction_language,e.scope,
   case when e.scope='team' then e.user_id else null end as learner_id,q.id as review_id,q.status as review_status,q.reviewer_id
  from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id
  join public.assessment_enrollments e on e.id=c.enrollment_id
  left join public.assessment_review_requests q on q.attempt_id=a.id and q.status<>'resolved'
  where a.submitted_at is not null and e.user_id<>p_actor
   and (p_after is null or (a.submitted_at,a.id)>(p_after,p_after_id))
   and (q.reviewer_id is null or q.reviewer_id=p_actor)
   and (
    (p_org is not null and e.scope='team' and e.organization_id=p_org and (a.status in ('needs_review','scoring') or q.id is not null))
    or (p_org is null and e.scope='personal' and q.id is not null and exists(
      select 1 from public.assessment_reviewers r where r.user_id=p_actor and r.active and r.module_id=e.module_id and r.target_language=e.target_language and r.instruction_language=e.instruction_language))
   )
  order by a.submitted_at,a.id limit 51
 ), page as (select * from available order by submitted_at,attempt_id limit 50)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by submitted_at,attempt_id) from page),'[]'::jsonb),'hasMore',(select count(*)>50 from available),
  'nextCursor',(select jsonb_build_object('submittedAt',submitted_at,'id',attempt_id) from page order by submitted_at desc,attempt_id desc limit 1)) into result;
 return result;
end $$;
revoke all on function public.assessment_review_queue(uuid,uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.assessment_review_queue(uuid,uuid,timestamptz,uuid) to service_role;

-- One current score per response, calculated before API row limits. Historical events remain append-only.
create function public.assessment_latest_scores(p_actor uuid,p_attempt uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare enrollment_id uuid; result jsonb;
begin
 select c.enrollment_id into enrollment_id from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id where a.id=p_attempt;
 if enrollment_id is null or not (assessment_private.can_read(p_actor,enrollment_id) or assessment_private.can_review(p_actor,p_attempt)) then raise exception 'Assessment score access required'; end if;
 select coalesce(jsonb_agg(to_jsonb(latest)),'[]'::jsonb) into result from (
  select distinct on (s.response_id) s.* from public.assessment_score_events s join public.assessment_responses r on r.id=s.response_id where r.attempt_id=p_attempt order by s.response_id,s.revision desc
 ) latest;
 return result;
end $$;
revoke all on function public.assessment_latest_scores(uuid,uuid) from public,anon,authenticated;
grant execute on function public.assessment_latest_scores(uuid,uuid) to service_role;
