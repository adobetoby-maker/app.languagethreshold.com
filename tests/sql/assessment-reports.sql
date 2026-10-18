-- Rolled-back pagination/privacy fixtures, exercised under the service-role grants.
do $$ declare actor uuid:='10000000-0000-4000-8000-000000000001'; admin_actor uuid:='10000000-0000-4000-8000-000000000002'; outsider uuid:='10000000-0000-4000-8000-000000000003'; org uuid:='20000000-0000-4000-8000-000000000001'; first_page jsonb; next_page jsonb; personal uuid; team uuid; submitted uuid; result jsonb; begin
 select id into personal from public.assessment_enrollments where user_id=actor and scope='personal';
 select id into team from public.assessment_enrollments where user_id=actor and scope='team';
 select a.id into submitted from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id where c.enrollment_id=personal and a.submitted_at is not null limit 1;
 insert into public.assessment_enrollments(user_id,scope,release_id,module_id,target_language,instruction_language,start_date,timezone,status,created_by,request_id,created_at)
  select actor,'personal','roofing-es-en-test','roofing','Spanish','English','2010-01-01','UTC','archived',actor,gen_random_uuid(),'2010-01-01T12:00:00Z' from generate_series(1,60);
 first_page:=public.assessment_overview_page(actor);
 if jsonb_array_length(first_page->'enrollments')<>50 or (first_page->>'hasMore')::boolean is not true then raise exception 'Overview did not page at50'; end if;
 next_page:=public.assessment_overview_page(actor,null,(first_page->'nextCursor'->>'createdAt')::timestamptz,(first_page->'nextCursor'->>'id')::uuid);
 if jsonb_array_length(next_page->'enrollments')<>12 or (next_page->>'hasMore')::boolean then raise exception 'Overview lost old enrollments'; end if;
 if exists(select 1 from jsonb_array_elements(first_page->'enrollments') p join jsonb_array_elements(next_page->'enrollments') q on p->>'id'=q->>'id') then raise exception 'Overview repeated rows at equal timestamps'; end if;
 if first_page::text like '%"form_snapshot"%' or first_page::text like '%"answer"%' then raise exception 'Overview leaked private evidence'; end if;
 result:=public.assessment_overview_page(admin_actor,org);
 if jsonb_array_length(result->'enrollments')<>1 or result->'enrollments'->0->>'scope'<>'team' then raise exception 'Team admin report includes private enrollments'; end if;
 if jsonb_array_length(public.assessment_overview_page(admin_actor)->'enrollments')<>0 then raise exception 'Admin role inherited personal reports'; end if;
 perform pg_temp.expect_error(format('select public.assessment_overview_page(%L,%L)',outsider,org),'Team assessment access required');
 perform pg_temp.expect_error(format('select public.assessment_overview_page(%L,null,null,null,null,%L)',actor,admin_actor),'Learner filter access required');
 perform pg_temp.expect_error(format('select public.assessment_overview_page(%L,null,now())',actor),'Invalid assessment overview');
 if jsonb_array_length(public.assessment_overview_page(actor,null,null,null,'missing-module')->'enrollments')<>0 then raise exception 'Module filter ignored'; end if;
 if jsonb_array_length(public.assessment_overview_page(actor,null,null,null,null,null,'all','English','Spanish')->'enrollments')<>0 then raise exception 'Language filter ignored'; end if;
 result:=public.assessment_overview_page(actor,null,null,null,null,null,'in_progress');
 if jsonb_array_length(result->'enrollments')<>1 or result->'enrollments'->0->>'id'<>personal::text then raise exception 'Active attempt filter lost the learner plan'; end if;
 result:=public.assessment_checkpoint_heads(actor,array(select id from public.assessment_checkpoints where enrollment_id=personal));
 if jsonb_array_length(result)<>3 or not exists(select 1 from jsonb_array_elements(result) row where (row->>'attemptCount')::integer>0) then raise exception 'Checkpoint preview count missing'; end if;
 if result::text like '%"form_snapshot"%' or result::text like '%"answer"%' then raise exception 'Checkpoint preview exposed private evidence'; end if;
 perform pg_temp.expect_error(format('select public.assessment_checkpoint_heads(%L,array(select id from public.assessment_checkpoints where enrollment_id=%L))',outsider,personal),'Checkpoint report access required');
 if jsonb_array_length(public.assessment_selected_summaries(actor,array[personal],array[submitted]))<>1 then raise exception 'Selected summary missing'; end if;
 if public.assessment_selected_summaries(actor,array[personal],array[submitted])::text like '%"answer"%' then raise exception 'Selected summary leaked raw response'; end if;
 perform pg_temp.expect_error(format('select public.assessment_selected_summaries(%L,array[%L]::uuid[],array[%L]::uuid[])',outsider,personal,submitted),'report access required');
 perform pg_temp.expect_error(format('select public.assessment_selected_summaries(%L,array[%L]::uuid[],array[%L]::uuid[])',admin_actor,team,submitted),'attempt scope mismatch');
end $$;
