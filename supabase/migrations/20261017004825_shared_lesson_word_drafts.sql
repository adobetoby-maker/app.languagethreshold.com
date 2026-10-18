-- Shared public curriculum drafts only. No learner text, answers, media or exam keys.
create table public.lesson_word_drafts (
  environment text not null check (environment in ('development','preview','production')),
  cache_key text not null check (cache_key ~ '^[0-9a-f]{64}$'),
  words jsonb,
  ready_until timestamptz,
  lease_id uuid,
  lease_until timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (environment,cache_key)
);
create index lesson_word_drafts_expiry on public.lesson_word_drafts(updated_at);
alter table public.lesson_word_drafts enable row level security;
revoke all on public.lesson_word_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.lesson_word_drafts to service_role;

-- Invoker functions: only the server role may call them, and no definer bypass is needed.
create function public.claim_lesson_word_draft(p_environment text,p_cache_key text,p_lease uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare row_value public.lesson_word_drafts; current_time_at timestamptz := clock_timestamp();
begin
  if p_environment is null or p_environment not in ('development','preview','production')
    or p_cache_key is null or p_cache_key !~ '^[0-9a-f]{64}$' or p_lease is null then
    raise exception 'Invalid lesson draft identity';
  end if;
  -- Bounded eviction of expired, disposable draft copies; never evict an active generator.
  if pg_try_advisory_xact_lock(hashtextextended('language-threshold:lesson-word-drafts:eviction',0)) then
   delete from public.lesson_word_drafts where (environment,cache_key) in (
    select environment,cache_key from public.lesson_word_drafts
    where updated_at < current_time_at - interval '30 days'
      and coalesce(lease_until,'epoch'::timestamptz) < current_time_at
    order by updated_at limit 32 for update skip locked
   );
  end if;
  insert into public.lesson_word_drafts(environment,cache_key)
    values(p_environment,p_cache_key) on conflict do nothing;
  select * into row_value from public.lesson_word_drafts
    where environment=p_environment and cache_key=p_cache_key for update;
  if row_value.words is not null and row_value.ready_until > current_time_at then
    return jsonb_build_object('status','hit','words',row_value.words);
  end if;
  if row_value.lease_id is not null and row_value.lease_until > current_time_at then
    return jsonb_build_object('status','pending');
  end if;
  update public.lesson_word_drafts set words=null,ready_until=null,
    lease_id=p_lease,lease_until=current_time_at + interval '120 seconds',updated_at=current_time_at
    where environment=p_environment and cache_key=p_cache_key;
  return jsonb_build_object('status','claimed');
end $$;

create function public.complete_lesson_word_draft(p_environment text,p_cache_key text,p_lease uuid,p_words jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
  if p_words is null or jsonb_typeof(p_words) <> 'array' then
    raise exception 'Invalid lesson draft words';
  end if;
  if jsonb_array_length(p_words) not between 9 and 18 or octet_length(p_words::text)>65536 then
    raise exception 'Invalid lesson draft words';
  end if;
  if exists(select 1 from jsonb_array_elements(p_words) entry where
    jsonb_typeof(entry) <> 'object' or entry - array['en','es','kind','note'] <> '{}'::jsonb
    or jsonb_typeof(entry->'en') is distinct from 'string'
    or jsonb_typeof(entry->'es') is distinct from 'string'
    or length(btrim(entry->>'en')) not between 1 and 140
    or length(btrim(entry->>'es')) not between 1 and 180
    or (entry->>'kind') is null or (entry->>'kind') not in ('term','phrase')
    or (entry ? 'note' and (jsonb_typeof(entry->'note') <> 'string' or length(entry->>'note')>140)))
    or (select count(*) from jsonb_array_elements(p_words) entry where entry->>'kind'='term') not between 6 and 12
    or (select count(*) from jsonb_array_elements(p_words) entry where entry->>'kind'='phrase') not between 3 and 6 then
    raise exception 'Invalid lesson draft words';
  end if;
  update public.lesson_word_drafts set words=p_words,ready_until=clock_timestamp()+interval '30 days',
    lease_id=null,lease_until=null,updated_at=clock_timestamp()
    where environment=p_environment and cache_key=p_cache_key
      and lease_id=p_lease and lease_until>clock_timestamp();
  get diagnostics changed = row_count;
  return changed=1;
end $$;

create function public.release_lesson_word_draft(p_environment text,p_cache_key text,p_lease uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
  update public.lesson_word_drafts set lease_id=null,lease_until=null
    where environment=p_environment and cache_key=p_cache_key and lease_id=p_lease;
  get diagnostics changed = row_count;
  return changed=1;
end $$;

revoke execute on function public.claim_lesson_word_draft(text,text,uuid) from public,anon,authenticated;
revoke execute on function public.complete_lesson_word_draft(text,text,uuid,jsonb) from public,anon,authenticated;
revoke execute on function public.release_lesson_word_draft(text,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_lesson_word_draft(text,text,uuid) to service_role;
grant execute on function public.complete_lesson_word_draft(text,text,uuid,jsonb) to service_role;
grant execute on function public.release_lesson_word_draft(text,text,uuid) to service_role;
