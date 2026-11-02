-- Team leads can grant a learner the full advanced Documents workspace or assign
-- individual lead-owned documents as read-only study material. All access is
-- mediated by authenticated server handlers using the service role.
create table public.team_document_access_grants (
  organization_id uuid not null references public.team_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index team_document_access_user_idx
  on public.team_document_access_grants(user_id, organization_id);
create index team_document_access_granted_by_idx
  on public.team_document_access_grants(granted_by);

create table public.team_document_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.team_organizations(id) on delete cascade,
  document_id uuid not null references public.study_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (organization_id, document_id, user_id)
);

create index team_document_assignments_user_idx
  on public.team_document_assignments(user_id, organization_id);
create index team_document_assignments_document_idx
  on public.team_document_assignments(document_id);
create index team_document_assignments_assigned_by_idx
  on public.team_document_assignments(assigned_by);

alter table public.team_document_access_grants enable row level security;
alter table public.team_document_assignments enable row level security;

revoke all on public.team_document_access_grants from public, anon, authenticated;
revoke all on public.team_document_assignments from public, anon, authenticated;
grant select, insert, update, delete on public.team_document_access_grants to service_role;
grant select, insert, update, delete on public.team_document_assignments to service_role;
