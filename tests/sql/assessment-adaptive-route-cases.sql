-- Fictional local-only adaptive form. Never authored/published in the hosted project.
insert into public.assessment_releases(id,module_id,target_language,instruction_language,content_version)
values('route-test-release','route-fixture','Spanish','English','fixture-only');
create function pg_temp.route_definition() returns jsonb language sql as $$
 with core as (
 select jsonb_build_object('id',skill||n,'objectiveId',skill||'.'||n,'type',case when skill in ('speaking','writing') then 'production' else 'choice' end,'skill',skill,'maximum',1,'inputMethods',case when skill='speaking' then '["speech"]'::jsonb else '["choice"]'::jsonb end,'options','[{"id":"yes","text":"QA yes"},{"id":"no","text":"QA no"}]'::jsonb,'correctOptionId','yes') item
 from unnest(array['recognition','recall','listening','reading','writing','speaking']) with ordinality s(skill,ord) cross join generate_series(1,3) n order by s.ord,n
 ), extras as (
 select jsonb_build_object('id',id,'objectiveId','branch.fixture','type','choice','skill','recognition','maximum',1,'inputMethods','["choice"]'::jsonb,'options','[{"id":"yes","text":"QA yes"},{"id":"no","text":"QA no"}]'::jsonb,'correctOptionId','yes') item from unnest(array['low','high','diagnostic']) id
 ) select jsonb_build_object('id','route-fixture-form','version','fixture','rubricVersion','fixture','checkpoint','entrance','items',(select jsonb_agg(item) from (select * from core union all select * from extras) items),'routing',jsonb_build_object('schema',1,'version','fixture-policy','coreItemIds',(select jsonb_agg(item->>'id') from core),'minimumEvidence',6,'minimumObjectives',6,'branches','[{"id":"low","itemIds":["low"]},{"id":"high","itemIds":["high"]},{"id":"diagnostic","itemIds":["diagnostic"]}]'::jsonb,'bands','[{"minimumPercent":0,"maximumPercent":50,"branchId":"low"},{"minimumPercent":50,"maximumPercent":100,"branchId":"high"}]'::jsonb,'insufficientEvidenceBranchId','diagnostic'));
$$;
insert into public.assessment_forms(id,release_id,checkpoint,version,rubric_version,definition) values('route-fixture-form','route-test-release','entrance','fixture','fixture',pg_temp.route_definition());
create function pg_temp.route_core(a uuid) returns jsonb language sql as $$
 select jsonb_agg(jsonb_build_object('itemId',i.id,'answer',s.answer) order by i.ord)
 from public.assessment_attempts t cross join lateral jsonb_array_elements_text(t.form_snapshot->'definition'->'routing'->'coreItemIds') with ordinality i(id,ord)
 left join public.assessment_responses s on s.attempt_id=t.id and s.item_id=i.id where t.id=a;
$$;
create function pg_temp.route_decision(a uuid,revision integer) returns jsonb language sql as $$
 select jsonb_build_object('schema',1,'attemptId',a,'sourceRevision',revision,'formId','route-fixture-form','formVersion','fixture','rubricVersion','fixture','policyVersion','fixture-policy','branchId','high','reason','score_band','scoredCount',12,'scoredObjectives',12,'percent',100,'sourceDigest',repeat('a',64));
$$;
set local role service_role;
do $$ declare learner uuid:='10000000-0000-4000-8000-000000000001'; foreign_actor uuid:='10000000-0000-4000-8000-000000000003'; e uuid; cp uuid; a uuid; request uuid:=gen_random_uuid(); core jsonb; decision jsonb; d jsonb; result jsonb; updates jsonb; revision integer;
begin
 d:=pg_temp.route_definition();
 if not assessment_private.routing_policy_valid(d) then raise exception 'Valid fixture policy rejected'; end if;
 if assessment_private.routing_policy_valid(jsonb_set(d,'{routing}','null')) then raise exception 'Null routing accepted'; end if;
 if assessment_private.routing_policy_valid(jsonb_set(d,'{routing,branches,1,itemIds}','["low"]')) then raise exception 'Overlapping branch accepted'; end if;
 if assessment_private.routing_policy_valid(jsonb_set(d,'{routing,bands,1,minimumPercent}','49')) then raise exception 'Overlapping band accepted'; end if;
 e:=public.assessment_create_enrollment(learner,learner,null,'route-test-release','2026-10-16','America/Denver',gen_random_uuid());
 select id into cp from public.assessment_checkpoints where enrollment_id=e and checkpoint='entrance';
 a:=public.assessment_start_attempt(learner,cp,'route-fixture-form',gen_random_uuid(),true);
 select form_snapshot->'definition' into d from public.assessment_attempts where id=a;
 perform pg_temp.expect_error(format('insert into public.assessment_responses(attempt_id,item_id,answer) values(%L,%L,%L)',a,'high','{"inputMethod":"choice","choiceId":"yes"}'),'selected frozen path');
 perform pg_temp.expect_error(format('select public.assessment_submit_attempt(%L,%L,0,%L)',learner,a,gen_random_uuid()),'Select a route');
 select jsonb_agg(jsonb_build_object('itemId',i->>'id','answer',case when i->>'skill' in ('writing','speaking') then '{"inputMethod":"unavailable","missingReason":"Local fixture unavailable"}'::jsonb else '{"inputMethod":"choice","choiceId":"yes"}'::jsonb end)) into updates from jsonb_array_elements(d->'items') i where d->'routing'->'coreItemIds' ? (i->>'id');
 revision:=public.assessment_save_responses(learner,a,0,updates,gen_random_uuid());
 core:=pg_temp.route_core(a); decision:=pg_temp.route_decision(a,revision);
 perform pg_temp.expect_error(format('select public.assessment_select_route(%L,%L,1,%L,%L,%L,%L)',foreign_actor,a,request,d,core,decision),'access required');
 perform pg_temp.expect_error(format('select public.assessment_select_route(%L,%L,0,%L,%L,%L,%L)',learner,a,request,d,core,decision),'revision conflict');
 perform pg_temp.expect_error(format('select public.assessment_select_route(%L,%L,1,%L,%L,%L,%L)',learner,a,request,d,'[]',decision),'Saved core response conflict');
 perform pg_temp.expect_error(format('select public.assessment_select_route(%L,%L,1,%L,%L,%L,%L)',learner,a,request,d,core,jsonb_set(decision,'{branchId}','"missing"')),'Route identity');
 if exists(select 1 from public.assessment_attempt_routes where attempt_id=a) or (select t.revision from public.assessment_attempts t where t.id=a)<>1 then raise exception 'Failed route partially persisted'; end if;
 update public.assessment_enrollments set status='paused',paused_on=current_date where id=e;
 perform pg_temp.expect_error(format('select public.assessment_select_route(%L,%L,1,%L,%L,%L,%L)',learner,a,request,d,core,decision),'Active learner assessment');
 update public.assessment_enrollments set status='active',paused_on=null where id=e;
 update public.assessment_checkpoints set status='exempt',reason='Local fixture exemption' where id=cp;
 perform pg_temp.expect_error(format('select public.assessment_select_route(%L,%L,1,%L,%L,%L,%L)',learner,a,request,d,core,decision),'Active learner assessment');
 update public.assessment_checkpoints set status='scheduled',reason=null where id=cp;
 perform pg_temp.expect_error(format('select public.assessment_select_route(%L,%L,1,%L,%L,%L,%L)',learner,a,request,d,core,decision||'{"unknown":"field"}'::jsonb),'decision shape');
 result:=public.assessment_select_route(learner,a,1,request,d,core,decision);
 if result->>'revision'<>'2' or result->'decision'<>decision or (select count(*) from public.assessment_events where enrollment_id=e and action='attempt.routed')<>1 then raise exception 'Atomic route/revision/event failed'; end if;
 if public.assessment_select_route(learner,a,1,request,d,core,decision)<>result then raise exception 'Exact route retry changed'; end if;
 perform pg_temp.expect_error(format('select public.assessment_select_route(%L,%L,1,%L,%L,%L,%L)',learner,a,request,d,core,jsonb_set(decision,'{branchId}','"low"')),'request key reused');
 perform pg_temp.expect_error(format('update public.assessment_attempt_routes set decision=%L where attempt_id=%L',decision,a),'permission denied');
 perform pg_temp.expect_error(format('delete from public.assessment_attempt_routes where attempt_id=%L',a),'permission denied');
 perform pg_temp.expect_error(format('select public.assessment_save_responses(%L,%L,2,%L,%L)',learner,a,'[{"itemId":"low","answer":{"inputMethod":"choice","choiceId":"yes"}}]',gen_random_uuid()),'selected frozen path');
 -- Later edited core answers cannot reroute or rewrite the original audit basis.
 revision:=public.assessment_save_responses(learner,a,2,'[{"itemId":"recognition1","answer":{"inputMethod":"choice","choiceId":"no"}}]',gen_random_uuid());
 result:=public.assessment_select_route(learner,a,3,gen_random_uuid(),d,pg_temp.route_core(a),jsonb_set(decision,'{branchId}','"low"'));
 if result->>'revision'<>'3' or result->'decision'<>decision then raise exception 'Later core edit rerouted or lost current revision'; end if;
 if (public.assessment_select_route(learner,a,1,request,d,core,decision))->>'revision'<>'3' then raise exception 'Exact retry returned stale current revision'; end if;
 perform public.assessment_submit_attempt(learner,a,3,gen_random_uuid());
 if (select count(*) from public.assessment_responses where attempt_id=a)<>19 or exists(select 1 from public.assessment_responses where attempt_id=a and item_id in ('low','diagnostic')) then raise exception 'Submission filled unselected branches'; end if;
 if (select core_snapshot from public.assessment_attempt_routes where attempt_id=a)<>core then raise exception 'Original core snapshot changed'; end if;
 if public.assessment_select_route(learner,a,1,request,d,core,decision)->'decision'<>decision then raise exception 'Submitted retry lost immutable decision'; end if;
 -- Parent lifecycle must cascade the immutable route without granting direct DELETE.
 delete from public.assessment_enrollments where id=e;
 if exists(select 1 from public.assessment_attempt_routes where attempt_id=a) then raise exception 'Parent deletion left route'; end if;
end $$;
reset role;
set local role authenticated;
select pg_temp.expect_error('select * from public.assessment_attempt_routes','permission denied');
select pg_temp.expect_error('select public.assessment_select_route(null,null,null,null,null,null,null)','permission denied');
reset role;
select 'PASS: routing ownership, private grants, exact retries/current revision, authoritative core bytes, immutable branch, selected writes/submission and cascade' as result;
