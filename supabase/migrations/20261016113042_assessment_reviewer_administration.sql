-- Explicit, versioned reviewer scopes; content access never implies learner-evidence access.
alter table public.assessment_reviewers add column revision integer not null default 1 check(revision>0), add column updated_at timestamptz not null default now();
create table public.assessment_content_reviewers (
 user_id uuid not null references auth.users(id) on delete cascade,
 module_id text not null,target_language text not null,instruction_language text not null,
 kind text not null check(kind in ('curriculum','fluent_language','domain')),
 active boolean not null default true,revision integer not null default 1 check(revision>0),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(user_id,module_id,target_language,instruction_language,kind)
);
create table public.assessment_reviewer_admin_events (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users(id),target_id uuid not null references auth.users(id),
 module_id text not null,target_language text not null,instruction_language text not null,kind text not null,
 active boolean not null,revision integer not null,reason text not null check(length(trim(reason)) between 3 and 2000),
 request_id uuid not null,request_payload jsonb not null,created_at timestamptz not null default now(),unique(actor_id,request_id)
);
create table public.assessment_content_decisions (
 id uuid primary key default gen_random_uuid(),form_id text not null references public.assessment_forms(id),
 actor_id uuid not null references auth.users(id),kind text not null check(kind in ('curriculum','fluent_language','domain')),
 decision text not null check(decision in ('approved','changes_requested')),fingerprint text not null,
 note text not null check(length(trim(note)) between 3 and 4000),grant_revision integer not null,
 request_id uuid not null,created_at timestamptz not null default now(),unique(actor_id,request_id)
);
create index assessment_reviewer_admin_history_idx on public.assessment_reviewer_admin_events(module_id,created_at desc,id desc);
create index assessment_content_decisions_form_idx on public.assessment_content_decisions(form_id,created_at desc,id desc);
do $$ declare name text; begin
 foreach name in array array['assessment_content_reviewers','assessment_reviewer_admin_events','assessment_content_decisions'] loop
  execute format('alter table public.%I enable row level security',name);
  execute format('revoke all on public.%I from public,anon,authenticated',name);
  execute format('grant all on public.%I to service_role',name);
 end loop;
end $$;
create function public.assessment_manage_reviewer(p_actor uuid,p_user uuid,p_module text,p_target text,p_native text,p_kind text,p_active boolean,p_expected integer,p_reason text,p_request uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare previous integer;result jsonb;payload jsonb;old public.assessment_reviewer_admin_events;
begin
 if not exists(select 1 from public.platform_admin_roles where user_id=p_actor and role='owner') then raise exception 'Registered platform owner access required'; end if;
 if p_kind is null or p_kind not in ('response','curriculum','fluent_language','domain') or p_active is null or p_expected is null or p_expected<0 or p_reason is null or length(trim(p_reason)) not between 3 and 2000 or p_request is null
  or coalesce(length(trim(p_module)),0) not between 1 and 80 or coalesce(length(trim(p_target)),0) not between 1 and 80 or coalesce(length(trim(p_native)),0) not between 1 and 80 then raise exception 'Invalid reviewer scope'; end if;
 if p_active and p_user=p_actor then raise exception 'An owner cannot grant themselves reviewer access'; end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'Existing reviewer account required'; end if;
 payload:=jsonb_build_object('user',p_user,'module',p_module,'target',p_target,'native',p_native,'kind',p_kind,'active',p_active,'expected',p_expected,'reason',trim(p_reason));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('assessment-reviewer-request:'||p_actor::text||':'||p_request::text,0));
 select * into old from public.assessment_reviewer_admin_events where actor_id=p_actor and request_id=p_request;
 if old.id is not null then
  if old.request_payload<>payload then raise exception 'Reviewer request key reused'; end if;
  return jsonb_build_object('active',old.active,'revision',old.revision,'id',old.id);
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('assessment-reviewer-scope:'||p_user::text||':'||p_module||':'||p_target||':'||p_native||':'||p_kind,0));
 if p_kind='response' then
  select revision into previous from public.assessment_reviewers where user_id=p_user and module_id=p_module and target_language=p_target and instruction_language=p_native for update;
 else
  select revision into previous from public.assessment_content_reviewers where user_id=p_user and module_id=p_module and target_language=p_target and instruction_language=p_native and kind=p_kind for update;
 end if;
 if coalesce(previous,0)<>p_expected then raise exception 'Reviewer scope conflict; refresh before updating'; end if;
 if previous is null and not p_active then raise exception 'Reviewer scope was not found'; end if;
 if p_kind='response' then
  insert into public.assessment_reviewers(user_id,module_id,target_language,instruction_language,active,created_by,revision) values(p_user,p_module,p_target,p_native,p_active,p_actor,coalesce(previous,0)+1)
  on conflict(user_id,module_id,target_language,instruction_language) do update set active=excluded.active,revision=excluded.revision,updated_at=now();
 else
  insert into public.assessment_content_reviewers(user_id,module_id,target_language,instruction_language,kind,active,created_by,revision) values(p_user,p_module,p_target,p_native,p_kind,p_active,p_actor,coalesce(previous,0)+1)
  on conflict(user_id,module_id,target_language,instruction_language,kind) do update set active=excluded.active,revision=excluded.revision,updated_at=now();
 end if;
 insert into public.assessment_reviewer_admin_events(actor_id,target_id,module_id,target_language,instruction_language,kind,active,revision,reason,request_id,request_payload)
 values(p_actor,p_user,p_module,p_target,p_native,p_kind,p_active,coalesce(previous,0)+1,trim(p_reason),p_request,payload) returning jsonb_build_object('id',id,'active',active,'revision',revision) into result;
 return result;
end $$;
revoke all on function public.assessment_manage_reviewer(uuid,uuid,text,text,text,text,boolean,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.assessment_manage_reviewer(uuid,uuid,text,text,text,text,boolean,integer,text,uuid) to service_role;

create function assessment_private.content_fingerprint(p_form text) returns text language sql stable security invoker set search_path='' as $$
 select encode(sha256(convert_to(jsonb_build_object('form',f.id,'version',f.version,'rubric',f.rubric_version,'definition',f.definition,'checkpoint',f.checkpoint,'purpose',f.purpose,'release',r.id,'contentVersion',r.content_version,'module',r.module_id,'target',r.target_language,'native',r.instruction_language,'lessons',r.lesson_manifest)::text,'UTF8')),'hex')
 from public.assessment_forms f join public.assessment_releases r on r.id=f.release_id where f.id=p_form;
$$;
revoke all on function assessment_private.content_fingerprint(text) from public,anon,authenticated;
grant execute on function assessment_private.content_fingerprint(text) to service_role;
create function public.assessment_record_content_review(p_actor uuid,p_form text,p_kind text,p_decision text,p_fingerprint text,p_note text,p_request uuid)
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
create function public.assessment_content_review_context(p_actor uuid,p_form text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare release public.assessment_releases;is_owner boolean;result jsonb;
begin
 select r.* into release from public.assessment_releases r join public.assessment_forms f on f.release_id=r.id where f.id=p_form;
 is_owner:=exists(select 1 from public.platform_admin_roles where user_id=p_actor and role='owner');
 if not is_owner and not exists(select 1 from public.assessment_content_reviewers g where g.user_id=p_actor and g.active and g.module_id=release.module_id and g.target_language=release.target_language and g.instruction_language=release.instruction_language) then raise exception 'Assigned content reviewer access required'; end if;
 if release.id is null then raise exception 'Content form was not found'; end if;
 select jsonb_build_object('fingerprint',assessment_private.content_fingerprint(p_form),
  'reviewKinds',coalesce((select jsonb_agg(g.kind order by g.kind) from public.assessment_content_reviewers g where g.user_id=p_actor and g.active and g.module_id=release.module_id and g.target_language=release.target_language and g.instruction_language=release.instruction_language),'[]'::jsonb),
  'decisions',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc,d.id desc) from (select id,actor_id,kind,decision,fingerprint,note,grant_revision,created_at from public.assessment_content_decisions where form_id=p_form order by created_at desc,id desc limit 50) d),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.assessment_content_review_context(uuid,text) from public,anon,authenticated;
grant execute on function public.assessment_content_review_context(uuid,text) to service_role;
-- Seeing private keys disqualifies this module/language bank from a subsequent official assessment.
create table public.assessment_content_exposures (
 user_id uuid not null references auth.users(id) on delete cascade,form_id text not null references public.assessment_forms(id),fingerprint text not null,
 module_id text not null,target_language text not null,instruction_language text not null,first_seen_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),
 primary key(user_id,form_id,fingerprint)
);
create index assessment_content_exposures_track_idx on public.assessment_content_exposures(user_id,module_id,target_language,instruction_language);
alter table public.assessment_content_exposures enable row level security;
revoke all on public.assessment_content_exposures from public,anon,authenticated;
grant all on public.assessment_content_exposures to service_role;
create function public.assessment_note_content_exposure(p_actor uuid,p_form text)
returns void language plpgsql security invoker set search_path='' as $$
declare release public.assessment_releases; exposure_hash text;
begin
 select r.* into release from public.assessment_releases r join public.assessment_forms f on f.release_id=r.id where f.id=p_form;
 if release.id is null or p_actor is null then raise exception 'Content form was not found'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('assessment-content-track:'||p_actor::text||':'||release.module_id||':'||release.target_language||':'||release.instruction_language,0));
 if exists(select 1 from public.assessment_attempts a join public.assessment_checkpoints c on c.id=a.checkpoint_id join public.assessment_enrollments e on e.id=c.enrollment_id where e.user_id=p_actor and e.module_id=release.module_id and e.target_language=release.target_language and e.instruction_language=release.instruction_language and a.submitted_at is null and not coalesce((a.form_snapshot->>'pilot')::boolean,false)) then raise exception 'Finish your official assessment before opening private question keys'; end if;
 exposure_hash:=assessment_private.content_fingerprint(p_form);
 insert into public.assessment_content_exposures(user_id,form_id,fingerprint,module_id,target_language,instruction_language) values(p_actor,p_form,exposure_hash,release.module_id,release.target_language,release.instruction_language)
 on conflict(user_id,form_id,fingerprint) do update set last_seen_at=now();
end $$;
revoke all on function public.assessment_note_content_exposure(uuid,text) from public,anon,authenticated;
grant execute on function public.assessment_note_content_exposure(uuid,text) to service_role;
alter function public.assessment_start_attempt(uuid,uuid,text,uuid,boolean,text[]) set schema assessment_private;
create function public.assessment_start_attempt(p_actor uuid,p_checkpoint uuid,p_form text,p_request uuid,p_allow_pilot boolean default false,p_studied_objectives text[] default '{}'::text[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare enrollment public.assessment_enrollments;
begin
 select e.* into enrollment from public.assessment_enrollments e join public.assessment_checkpoints c on c.enrollment_id=e.id where c.id=p_checkpoint;
 if enrollment.id is null or enrollment.user_id is distinct from p_actor or not assessment_private.can_read(p_actor,enrollment.id) then raise exception 'Learner assessment access required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('assessment-content-track:'||p_actor::text||':'||enrollment.module_id||':'||enrollment.target_language||':'||enrollment.instruction_language,0));
 if not coalesce(p_allow_pilot,false) and exists(select 1 from public.assessment_content_exposures where user_id=p_actor and module_id=enrollment.module_id and target_language=enrollment.target_language and instruction_language=enrollment.instruction_language) then raise exception 'Private question keys were viewed for this language track; an independent assessment bank is required'; end if;
 return assessment_private.assessment_start_attempt(p_actor,p_checkpoint,p_form,p_request,p_allow_pilot,p_studied_objectives);
end $$;
revoke all on function public.assessment_start_attempt(uuid,uuid,text,uuid,boolean,text[]) from public,anon,authenticated;
grant execute on function public.assessment_start_attempt(uuid,uuid,text,uuid,boolean,text[]) to service_role;
-- Human decisions and access changes are append-only, including for the API service role.
create trigger assessment_reviewer_admin_append_only before update on public.assessment_reviewer_admin_events for each row execute function assessment_private.guard_evidence_update();
create trigger assessment_content_decisions_append_only before update on public.assessment_content_decisions for each row execute function assessment_private.guard_evidence_update();
revoke update,delete,truncate on public.assessment_reviewer_admin_events,public.assessment_content_decisions from service_role;
create index assessment_content_reviewers_creator_idx on public.assessment_content_reviewers(created_by);
create index assessment_reviewer_admin_target_idx on public.assessment_reviewer_admin_events(target_id);
create index assessment_content_exposures_form_idx on public.assessment_content_exposures(form_id);
