-- Review decisions retain dimension-level evidence against the frozen rubric.
create function public.assessment_review_rubric(
 p_actor uuid,p_attempt uuid,p_response uuid,p_state text,p_points numeric,
 p_dimensions jsonb,p_reason text,p_request uuid
) returns uuid language plpgsql security invoker set search_path='' as $$
declare response public.assessment_responses; attempt public.assessment_attempts;
 item jsonb; dimension jsonb; total numeric:=0; maximum numeric:=0; score_id uuid;
begin
 select * into response from public.assessment_responses where id=p_response and attempt_id=p_attempt;
 select * into attempt from public.assessment_attempts where id=p_attempt for update;
 if response.id is null or not assessment_private.can_review(p_actor,p_attempt) then raise exception 'Assessment review access required'; end if;
 select value into item from jsonb_array_elements(attempt.form_snapshot->'definition'->'items') where value->>'id'=response.item_id;
 if item is null then raise exception 'Frozen assessment item missing'; end if;
 if p_state='scored' and item ? 'rubric' then
  if jsonb_typeof(p_dimensions) is distinct from 'object' or jsonb_array_length(item->'rubric'->'dimensions')=0 then raise exception 'Frozen rubric dimensions required'; end if;
  if (select count(*) from jsonb_object_keys(p_dimensions))<>jsonb_array_length(item->'rubric'->'dimensions') then raise exception 'All frozen rubric dimensions required'; end if;
  for dimension in select value from jsonb_array_elements(item->'rubric'->'dimensions') loop
   if jsonb_typeof(p_dimensions->(dimension->>'id')) is distinct from 'number' then raise exception 'Numeric rubric dimension required'; end if;
   if (p_dimensions->>(dimension->>'id'))::numeric<0 or (p_dimensions->>(dimension->>'id'))::numeric>(dimension->>'maximum')::numeric then raise exception 'Rubric dimension out of range'; end if;
   total:=total+(p_dimensions->>(dimension->>'id'))::numeric;
   maximum:=maximum+(dimension->>'maximum')::numeric;
  end loop;
  if maximum<>(item->>'maximum')::numeric or p_points is distinct from total then raise exception 'Rubric total must match frozen dimensions'; end if;
 elsif p_dimensions is not null and p_dimensions<>'{}'::jsonb then
  raise exception 'Dimensions only apply to scored rubric responses';
 end if;
 if exists(select 1 from public.assessment_events where request_id=p_request and action='review.rubric' and detail->'dimensions' is distinct from p_dimensions) then raise exception 'Review request key reused'; end if;
 score_id:=public.assessment_record_score(p_actor,p_response,p_state,p_points,'human',p_reason,null,null,p_request);
 if not exists(select 1 from public.assessment_events where request_id=p_request and action='review.rubric') then
  insert into public.assessment_events(enrollment_id,actor_id,action,request_id,detail)
   select c.enrollment_id,p_actor,'review.rubric',p_request,jsonb_build_object('attemptId',p_attempt,'responseId',p_response,'scoreEventId',score_id,'rubricVersion',attempt.form_snapshot->>'rubricVersion','dimensions',p_dimensions)
   from public.assessment_checkpoints c where c.id=attempt.checkpoint_id;
 end if;
 return score_id;
end $$;
revoke all on function public.assessment_review_rubric(uuid,uuid,uuid,text,numeric,jsonb,text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_review_rubric(uuid,uuid,uuid,text,numeric,jsonb,text,uuid) to service_role;
