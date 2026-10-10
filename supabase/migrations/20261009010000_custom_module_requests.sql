-- Requests are paid briefs for editorial review, not automatically published modules.
create table public.custom_module_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id),
  organization_id uuid references public.team_organizations(id),
  title text not null check (char_length(title) between 3 and 120),
  audience text not null check (char_length(audience) between 3 and 300),
  situations text not null check (char_length(situations) between 10 and 2000),
  vocabulary text not null default '' check (char_length(vocabulary) <= 2000),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','submitted','reviewing','delivered','declined')),
  fee_cents integer not null default 2000 check (fee_cents = 2000),
  stripe_session_id text unique,
  paid_at timestamptz,
  owner_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index custom_module_requests_requester_idx
  on public.custom_module_requests(requester_id, created_at desc);
create index custom_module_requests_status_idx
  on public.custom_module_requests(status, created_at desc);

alter table public.custom_module_requests enable row level security;
revoke all on public.custom_module_requests from public, anon, authenticated;
grant select, insert, update, delete on public.custom_module_requests to service_role;
