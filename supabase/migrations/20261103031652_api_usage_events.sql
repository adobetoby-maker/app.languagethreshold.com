-- Minimal provider-attempt ledger. No prompts, transcripts, audio, tokens, or recipient details.
create table public.api_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('anthropic', 'google_tts', 'elevenlabs_tts', 'elevenlabs_stt')),
  request_status text not null check (request_status in ('accepted', 'rejected', 'transport_error')),
  cost_ceiling_micro_usd bigint check (cost_ceiling_micro_usd is null or cost_ceiling_micro_usd >= 0),
  created_at timestamptz not null default now()
);
create index api_usage_events_user_time_idx on public.api_usage_events (user_id, created_at desc);
create index api_usage_events_time_idx on public.api_usage_events (created_at desc);
alter table public.api_usage_events enable row level security;
revoke all on public.api_usage_events from public, anon, authenticated;
grant select, insert, delete on public.api_usage_events to service_role;
comment on column public.api_usage_events.cost_ceiling_micro_usd is
  'Conservative reservation ceiling in millionths of USD; not an invoice or actual provider charge.';

create function public.api_usage_summary(p_user uuid default null)
returns table(provider text, request_status text, calls bigint, cost_ceiling_micro_usd numeric)
language sql stable security invoker set search_path = '' as $$
  select e.provider, e.request_status, count(*)::bigint,
    sum(e.cost_ceiling_micro_usd)::numeric
  from public.api_usage_events e
  where e.created_at >= now() - interval '30 days'
    and (p_user is null or e.user_id = p_user)
  group by e.provider, e.request_status
  order by e.provider, e.request_status;
$$;
revoke all on function public.api_usage_summary(uuid) from public, anon, authenticated;
grant execute on function public.api_usage_summary(uuid) to service_role;
