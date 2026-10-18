-- Operational evidence contains counts only, never learner IDs, object paths or question data.
create table public.assessment_cleanup_runs (
 id uuid primary key,
 source text not null check(source in ('operator','scheduled_endpoint')),
 status text not null default 'running' check(status in ('running','succeeded','partial','failed')),
 started_at timestamptz not null default now(),finished_at timestamptz,lease_until timestamptz not null,
 selected_count integer not null default 0 check(selected_count between 0 and 250),
 deleted_count integer not null default 0 check(deleted_count between 0 and 250),
 failed_count integer not null default 0 check(failed_count between 0 and 250),
 may_have_more boolean not null default false,
 failure_code text check(failure_code in ('worker_failed','lease_expired')),
 check(deleted_count+failed_count<=selected_count),
 check((status='running')=(finished_at is null)),
 check(status<>'succeeded' or (failed_count=0 and not may_have_more and failure_code is null))
);
create index assessment_cleanup_runs_recent on public.assessment_cleanup_runs(started_at desc);
alter table public.assessment_cleanup_runs enable row level security;
revoke all on public.assessment_cleanup_runs from public,anon,authenticated;
grant all on public.assessment_cleanup_runs to service_role;

create function public.assessment_begin_cleanup_run(p_id uuid,p_source text) returns uuid language plpgsql security invoker set search_path='' as $$
begin
 if p_id is null or p_source is null or p_source not in ('operator','scheduled_endpoint') then raise exception 'Valid cleanup run required'; end if;
 perform pg_catalog.pg_advisory_xact_lock(47110027);
 update public.assessment_cleanup_runs set status='failed',finished_at=now(),failure_code='lease_expired' where status='running' and lease_until<=now();
 if exists(select 1 from public.assessment_cleanup_runs where id=p_id or (status='running' and lease_until>now())) then return null; end if;
 insert into public.assessment_cleanup_runs(id,source,lease_until) values(p_id,p_source,now()+case when p_source='operator' then interval '11 minutes' else interval '2 minutes' end);
 return p_id;
end $$;
create function public.assessment_finish_cleanup_run(p_id uuid,p_selected integer,p_deleted integer,p_failed integer,p_more boolean,p_error boolean default false) returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_selected is null or p_deleted is null or p_failed is null or p_more is null or p_error is null then raise exception 'Cleanup counts required'; end if;
 update public.assessment_cleanup_runs set status=case when p_error then 'failed' when p_failed>0 or p_more then 'partial' else 'succeeded' end,
  finished_at=now(),selected_count=p_selected,deleted_count=p_deleted,failed_count=p_failed,may_have_more=p_more,failure_code=case when p_error then 'worker_failed' end
 where id=p_id and status='running' and lease_until>now();
 if not found then raise exception 'Active cleanup run required'; end if;
end $$;
revoke all on function public.assessment_begin_cleanup_run(uuid,text),public.assessment_finish_cleanup_run(uuid,integer,integer,integer,boolean,boolean) from public,anon,authenticated;
grant execute on function public.assessment_begin_cleanup_run(uuid,text),public.assessment_finish_cleanup_run(uuid,integer,integer,integer,boolean,boolean) to service_role;
