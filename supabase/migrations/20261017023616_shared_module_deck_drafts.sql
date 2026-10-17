-- Shared public curriculum drafts only. No learner text, answers, media or exam keys.
create table public.module_deck_drafts (
  environment text not null check (environment in ('development','preview','production')),
  cache_key text not null check (cache_key ~ '^[0-9a-f]{64}$'),
  pairs jsonb,
  ready_until timestamptz,
  lease_id uuid,
  lease_until timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (environment,cache_key)
);
create index module_deck_drafts_expiry on public.module_deck_drafts(updated_at);
alter table public.module_deck_drafts enable row level security;
revoke all on public.module_deck_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.module_deck_drafts to service_role;

-- Invoker functions: only the server role may call them, and no definer bypass is needed.
create function public.claim_module_deck_draft(p_environment text,p_cache_key text,p_lease uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare row_value public.module_deck_drafts; current_time_at timestamptz := clock_timestamp();
begin
  if p_environment is null or p_environment not in ('development','preview','production')
    or p_cache_key is null or p_cache_key !~ '^[0-9a-f]{64}$' or p_lease is null then
    raise exception 'Invalid module deck draft identity';
  end if;
  -- Bounded eviction of expired, disposable draft copies; never evict an active generator.
  if pg_try_advisory_xact_lock(hashtextextended('language-threshold:module-deck-drafts:eviction',0)) then
   delete from public.module_deck_drafts where (environment,cache_key) in (
    select environment,cache_key from public.module_deck_drafts
    where updated_at < current_time_at - interval '30 days'
      and coalesce(lease_until,'epoch'::timestamptz) < current_time_at
    order by updated_at limit 32 for update skip locked
   );
  end if;
  insert into public.module_deck_drafts(environment,cache_key)
    values(p_environment,p_cache_key) on conflict do nothing;
  select * into row_value from public.module_deck_drafts
    where environment=p_environment and cache_key=p_cache_key for update;
  if row_value.pairs is not null and row_value.ready_until > current_time_at then
    return jsonb_build_object('status','hit','pairs',row_value.pairs);
  end if;
  if row_value.lease_id is not null and row_value.lease_until > current_time_at then
    return jsonb_build_object('status','pending');
  end if;
  update public.module_deck_drafts set pairs=null,ready_until=null,
    lease_id=p_lease,lease_until=current_time_at + interval '120 seconds',updated_at=current_time_at
    where environment=p_environment and cache_key=p_cache_key;
  return jsonb_build_object('status','claimed');
end $$;

create function public.complete_module_deck_draft(p_environment text,p_cache_key text,p_lease uuid,p_pairs jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
  if p_pairs is null or jsonb_typeof(p_pairs) <> 'array' then
    raise exception 'Invalid module deck draft pairs';
  end if;
  if jsonb_array_length(p_pairs) not between 32 and 40 or octet_length(p_pairs::text)>65536 then
    raise exception 'Invalid module deck draft pairs';
  end if;
  if exists(select 1 from jsonb_array_elements(p_pairs) entry where
    jsonb_typeof(entry) <> 'object' or entry - array['english','translation','kind'] <> '{}'::jsonb
    or jsonb_typeof(entry->'english') is distinct from 'string'
    or jsonb_typeof(entry->'translation') is distinct from 'string'
    or length(btrim(entry->>'english')) not between 1 and 180
    or length(btrim(entry->>'translation')) not between 1 and 240
    or (entry->>'kind') is null or (entry->>'kind') not in ('term','phrase'))
    or (select count(*) from jsonb_array_elements(p_pairs) entry where entry->>'kind'='term') not between 16 and 20
    or (select count(*) from jsonb_array_elements(p_pairs) entry where entry->>'kind'='phrase') not between 16 and 20 or (select count(distinct lower(btrim(entry->>'english'))) from jsonb_array_elements(p_pairs) entry) <> jsonb_array_length(p_pairs) then
    raise exception 'Invalid module deck draft pairs';
  end if;
  update public.module_deck_drafts set pairs=p_pairs,ready_until=clock_timestamp()+interval '30 days',
    lease_id=null,lease_until=null,updated_at=clock_timestamp()
    where environment=p_environment and cache_key=p_cache_key
      and lease_id=p_lease and lease_until>clock_timestamp();
  get diagnostics changed = row_count;
  return changed=1;
end $$;

create function public.release_module_deck_draft(p_environment text,p_cache_key text,p_lease uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
  update public.module_deck_drafts set lease_id=null,lease_until=null
    where environment=p_environment and cache_key=p_cache_key and lease_id=p_lease;
  get diagnostics changed = row_count;
  return changed=1;
end $$;

revoke execute on function public.claim_module_deck_draft(text,text,uuid) from public,anon,authenticated;
revoke execute on function public.complete_module_deck_draft(text,text,uuid,jsonb) from public,anon,authenticated;
revoke execute on function public.release_module_deck_draft(text,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_module_deck_draft(text,text,uuid) to service_role;
grant execute on function public.complete_module_deck_draft(text,text,uuid,jsonb) to service_role;
grant execute on function public.release_module_deck_draft(text,text,uuid) to service_role;
