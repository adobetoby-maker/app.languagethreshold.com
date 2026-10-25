-- Additive, server-only owner CRM. Prepared locally; requires migration approval before rollout.
create table public.owner_crm_contacts (
 id uuid primary key,
 name text not null check(length(name) between 1 and 120),
 email text not null default '' check(length(email)<=254),
 expertise text not null default '' check(length(expertise)<=1000),
 notes text not null default '' check(length(notes)<=4000),
 status text not null default 'new' check(status in ('new','follow_up','waiting','done')),
 follow_up_on date,
 user_id uuid unique references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
create table public.owner_crm_assets (
 id uuid primary key,
 title text not null check(length(title) between 1 and 160),
 category text not null default '' check(length(category)<=80),
 url text not null unique check(length(url)<=1000),
 updated_at timestamptz not null default now()
);
create table public.owner_crm_drafts (
 id uuid primary key,
 contact_id uuid not null references public.owner_crm_contacts(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 subject text not null check(length(subject) between 1 and 160),
 body text not null check(length(body) between 1 and 6000),
 asset_ids uuid[] not null default '{}' check(cardinality(asset_ids)<=24),
 include_referral boolean not null default false,
 referral_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index owner_crm_drafts_contact_idx on public.owner_crm_drafts(contact_id,created_at desc);
create index owner_crm_contacts_follow_up_idx on public.owner_crm_contacts(follow_up_on) where status='follow_up';
alter table public.owner_crm_contacts enable row level security;
alter table public.owner_crm_assets enable row level security;
alter table public.owner_crm_drafts enable row level security;
revoke all on public.owner_crm_contacts,public.owner_crm_assets,public.owner_crm_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.owner_crm_contacts,public.owner_crm_assets,public.owner_crm_drafts to service_role;
