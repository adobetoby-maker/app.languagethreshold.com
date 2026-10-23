-- Exams v2 (design: docs/superpowers/specs/2026-10-23-exams-v2-design.md, section 1).
-- NOT APPLIED BY AGENTS. The owner reviews and applies this migration once, by hand.
-- Additive only: two new service-role-only tables, no functions, no triggers, no changes to the
-- legacy assessment engine.
-- exams v2: hand-made fixed checkpoints + adaptive diagnostic. Item content is private (service role only).
create table public.exam_banks (
  module_id text not null check (module_id ~ '^[a-z][a-z0-9-]{0,79}$'),
  target_language text not null, instruction_language text not null,
  version text not null check (version ~ '^v[0-9]{1,4}$'),
  status text not null default 'draft' check (status in ('draft','approved','retired')),
  content jsonb not null check (jsonb_typeof(content)='object' and octet_length(content::text) <= 3000000),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  review_records jsonb not null default '[]' check (jsonb_typeof(review_records)='array'),
  approved_by uuid references auth.users(id), approved_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (module_id, target_language, instruction_language, version),
  check (status <> 'approved' or (approved_by is not null and approved_at is not null
         and jsonb_array_length(review_records) >= 2))
);
create unique index exam_banks_one_approved on public.exam_banks(module_id,target_language,instruction_language) where status='approved';

create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  module_id text not null, target_language text not null, instruction_language text not null,
  bank_version text not null,
  kind text not null check (kind in ('A','B','C','diagnostic')),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.team_organizations(id) on delete set null,
  public_secret_hash text check (public_secret_hash ~ '^[0-9a-f]{64}$'),
  seed text not null,
  step integer not null default 0 check (step between 0 and 200),
  served jsonb not null default '[]' check (jsonb_typeof(served)='array'),
  responses jsonb not null default '[]' check (jsonb_typeof(responses)='array' and octet_length(responses::text) <= 200000),
  result jsonb,
  score numeric, total numeric,
  status text not null default 'in_progress' check (status in ('in_progress','completed','abandoned')),
  ip_hash text, lead_email text, lead_consent_version text, lead_consented_at timestamptz,
  started_at timestamptz not null default now(), completed_at timestamptz,
  check (user_id is not null or public_secret_hash is not null),
  check (kind = 'diagnostic' or user_id is not null),
  check ((status='completed') = (completed_at is not null))
);
create index exam_sessions_user_idx on public.exam_sessions(user_id,module_id,kind,started_at desc);
create index exam_sessions_org_idx on public.exam_sessions(organization_id,module_id,kind) where status='completed';
create unique index exam_sessions_one_open on public.exam_sessions(user_id,module_id,kind) where status='in_progress' and user_id is not null;
alter table public.exam_banks enable row level security; alter table public.exam_sessions enable row level security;
revoke all on public.exam_banks, public.exam_sessions from public, anon, authenticated;
grant all on public.exam_banks, public.exam_sessions to service_role;
