-- Recording a content review itself establishes knowledge of the private bank.
create or replace function public.assessment_record_content_review(p_actor uuid,p_form text,p_kind text,p_decision text,p_fingerprint text,p_note text,p_request uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare form public.assessment_forms;release public.assessment_releases;scope public.assessment_content_reviewers;old public.assessment_content_decisions;result uuid;current_hash text;
begin
 if p_kind is null or p_kind not in ('curriculum','fluent_language','domain') or p_decision is null or p_decision not in ('approved','changes_requested') or p_note is null or length(trim(p_note)) not between 3 and 4000 or p_request is null then raise exception 'Invalid content review'; end if;
 select * into form from public.assessment_forms where id=p_form for share;
 select * into release from public.assessment_releases where id=form.release_id for share;
 select * into scope from public.assessment_content_reviewers where user_id=p_actor and module_id=release.module_id and target_language=release.target_language and instruction_language=release.instruction_language and kind=p_kind and active for share;
 if scope.user_id is null then raise exception 'Assigned content reviewer access required'; end if;
 current_hash:=assessment_private.content_fingerprint(p_form);
 if p_fingerprint is distinct from current_hash then raise exception 'Content conflict; reload before reviewing'; end if;
 -- A reviewer may submit findings from an authorized external copy rather than the browser.
 perform public.assessment_note_content_exposure(p_actor,p_form);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('assessment-content-request:'||p_actor::text||':'||p_request::text,0));
 select * into old from public.assessment_content_decisions where actor_id=p_actor and request_id=p_request;
 if old.id is not null then
  if old.form_id<>p_form or old.kind<>p_kind or old.decision<>p_decision or old.fingerprint<>p_fingerprint or old.note<>trim(p_note) then raise exception 'Content review request key reused'; end if;
  return old.id;
 end if;
 insert into public.assessment_content_decisions(form_id,actor_id,kind,decision,fingerprint,note,grant_revision,request_id) values(p_form,p_actor,p_kind,p_decision,current_hash,trim(p_note),scope.revision,p_request) returning id into result;
 return result;
end $$;
revoke all on function public.assessment_record_content_review(uuid,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_record_content_review(uuid,text,text,text,text,text,uuid) to service_role;
