-- All fixtures live inside assessment-engine.sql's rolled-back local transaction.
do $$
declare
 actor uuid:='10000000-0000-4000-8000-000000000001';
 admin_actor uuid:='10000000-0000-4000-8000-000000000002';
 outsider uuid:='10000000-0000-4000-8000-000000000003';
 org uuid:='20000000-0000-4000-8000-000000000001';
 personal uuid; fixture uuid; fixtures uuid[]:='{}'; review_attempt uuid;
 result jsonb; next_page jsonb; original_due date; original_due_at timestamptz;
begin
 select id into personal from public.assessment_enrollments where user_id=actor and scope='personal' and status='active';
 result:=public.assessment_overview_checkpoint_page(actor,p_state=>'in_progress',p_checkpoint=>'day45');
 if jsonb_array_length(result->'enrollments')<>1 then raise exception 'Day45 in-progress filter lost its matching plan'; end if;
 result:=public.assessment_overview_checkpoint_page(actor,p_state=>'in_progress',p_checkpoint=>'entrance');
 if jsonb_array_length(result->'enrollments')<>0 then raise exception 'Entrance matched another checkpoint in progress'; end if;
 insert into public.assessment_attempts(checkpoint_id,attempt_number,form_id,form_snapshot,status,start_request_id,submitted_at)
 select id,1,'test-entrance','{}','needs_review',gen_random_uuid(),now() from public.assessment_checkpoints where enrollment_id=personal and checkpoint='day90'
 returning id into review_attempt;
 result:=public.assessment_overview_checkpoint_page(actor,p_state=>'needs_review',p_checkpoint=>'day90');
 if jsonb_array_length(result->'enrollments')<>1 then raise exception 'Day90 review filter missed the pending review'; end if;
 if jsonb_array_length(public.assessment_overview_checkpoint_page(actor,p_state=>'needs_review',p_checkpoint=>'day45')->'enrollments')<>0 then raise exception 'Day45 matched another checkpoint review'; end if;
 delete from public.assessment_attempts where id=review_attempt;
 select due_date,due_at into original_due,original_due_at from public.assessment_checkpoints where enrollment_id=personal and checkpoint='day90';
 update public.assessment_checkpoints set due_date=(now() at time zone 'America/Denver')::date-1,due_at=now()-interval '1 day' where enrollment_id=personal and checkpoint='day90';
 if jsonb_array_length(public.assessment_overview_checkpoint_page(actor,p_state=>'overdue',p_checkpoint=>'day90')->'enrollments')<>1 then raise exception 'Selected overdue checkpoint missing'; end if;
 if jsonb_array_length(public.assessment_overview_checkpoint_page(actor,p_state=>'overdue',p_checkpoint=>'day45')->'enrollments')<>0 then raise exception 'Day45 matched another overdue checkpoint'; end if;
 update public.assessment_checkpoints set due_date=original_due,due_at=original_due_at where enrollment_id=personal and checkpoint='day90';
 for counter in 1..61 loop
  insert into public.assessment_enrollments(user_id,scope,release_id,module_id,target_language,instruction_language,start_date,timezone,status,created_by,request_id,created_at)
  values(actor,'personal','roofing-es-en-test','roofing','Spanish','English','2009-01-01','UTC','archived',actor,gen_random_uuid(),'2009-01-01T12:00:00Z') returning id into fixture;
  fixtures:=array_append(fixtures,fixture);
  insert into public.assessment_checkpoints(enrollment_id,checkpoint,due_date,due_at) values(fixture,'day90','2009-04-01','2009-04-01T12:00:00Z');
 end loop;
 result:=public.assessment_overview_checkpoint_page(actor,p_checkpoint=>'day90');
 if jsonb_array_length(result->'enrollments')<>50 or not (result->>'hasMore')::boolean then raise exception 'Checkpoint filter must run before paging'; end if;
 next_page:=public.assessment_overview_checkpoint_page(actor,p_after=>(result->'nextCursor'->>'createdAt')::timestamptz,p_after_id=>(result->'nextCursor'->>'id')::uuid,p_checkpoint=>'day90');
 if jsonb_array_length(next_page->'enrollments')<>13 or (next_page->>'hasMore')::boolean then raise exception 'Checkpoint cursor lost matching plans'; end if;
 if exists(select 1 from jsonb_array_elements(result->'enrollments') p join jsonb_array_elements(next_page->'enrollments') q on p->>'id'=q->>'id') then raise exception 'Checkpoint cursor repeated matching plans'; end if;
 if result::text like '%"form_snapshot"%' or result::text like '%"answer"%' then raise exception 'Checkpoint filter leaked raw evidence'; end if;
 result:=public.assessment_overview_checkpoint_page(admin_actor,p_org=>org,p_checkpoint=>'day90');
 if jsonb_array_length(result->'enrollments')<>1 or result->'enrollments'->0->>'scope'<>'team' then raise exception 'Checkpoint filter leaked personal plans to admin'; end if;
 if jsonb_array_length(public.assessment_overview_checkpoint_page(admin_actor,p_checkpoint=>'day90')->'enrollments')<>0 then raise exception 'Checkpoint admin acquired personal access'; end if;
 perform pg_temp.expect_error(format('select public.assessment_overview_checkpoint_page(%L,p_org=>%L,p_checkpoint=>%L)',outsider,org,'day90'),'Team assessment access required');
 perform pg_temp.expect_error(format('select public.assessment_overview_checkpoint_page(%L,p_learner=>%L,p_checkpoint=>%L)',actor,admin_actor,'day90'),'Learner filter access required');
 perform pg_temp.expect_error(format('select public.assessment_overview_checkpoint_page(%L,p_checkpoint=>%L)',actor,'not-a-checkpoint'),'Invalid assessment overview');
 perform pg_temp.expect_error(format('select public.assessment_overview_checkpoint_page(%L)',actor),'Invalid assessment overview');
 if has_function_privilege('anon','public.assessment_overview_checkpoint_page(uuid,uuid,timestamptz,uuid,text,uuid,text,text,text,text)','EXECUTE') or has_function_privilege('authenticated','public.assessment_overview_checkpoint_page(uuid,uuid,timestamptz,uuid,text,uuid,text,text,text,text)','EXECUTE') then raise exception 'Checkpoint RPC became client callable'; end if;
 delete from public.assessment_enrollments where id=any(fixtures);
end $$;
