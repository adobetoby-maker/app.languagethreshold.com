-- Team learning, credentials and owner-only cash ledger.
-- All access runs through authenticated server handlers using the service role.
create table public.team_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  owner_user_id uuid not null references auth.users(id),
  billing_email text not null,
  onboarding_step integer not null default 1 check (onboarding_step between 1 and 6),
  created_at timestamptz not null default now()
);

create table public.team_entitlements (
  organization_id uuid primary key references public.team_organizations(id) on delete cascade,
  seat_limit integer not null default 0 check (seat_limit between 0 and 10000),
  term text check (term in ('quarterly','annual')),
  status text not null default 'pending' check (status in ('pending','active','past_due','canceled','manual')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.team_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner','admin','learner')),
  status text not null default 'active' check (status in ('active','inactive')),
  joined_at timestamptz not null default now(),
  unique (organization_id,user_id)
);
create index team_members_user_idx on public.team_members(user_id);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.team_organizations(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'learner' check (role in ('admin','learner')),
  module_id text,
  require_certificate boolean not null default false,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  expires_at timestamptz not null,
  accepted_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  last_email_error text
);
create index team_invites_org_idx on public.team_invitations(organization_id,status);
create unique index team_invites_one_pending_email on public.team_invitations(organization_id,lower(email)) where status='pending';

create table public.team_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.team_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  require_certificate boolean not null default false,
  due_at timestamptz,
  assigned_at timestamptz not null default now(),
  unique (organization_id,user_id,module_id)
);

create table public.team_activity_intervals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.team_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  activity text not null,
  started_at timestamptz not null,
  active_seconds integer not null check (active_seconds between 1 and 30),
  idempotency_key uuid not null,
  unique (organization_id,idempotency_key),
  created_at timestamptz not null default now()
);
create index team_activity_reporting_idx on public.team_activity_intervals(organization_id,user_id,module_id,started_at desc);

create table public.platform_activity_intervals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  activity text not null,
  started_at timestamptz not null,
  active_seconds integer not null check (active_seconds between 1 and 30),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);
create index platform_activity_reporting_idx on public.platform_activity_intervals(started_at desc,module_id,user_id);

-- A client may retry an interval, but cannot stack overlapping activity to inflate time.
create function public.guard_platform_activity_overlap() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if exists (select 1 from public.platform_activity_intervals where idempotency_key=new.idempotency_key) then
    return new;
  end if;
  if exists (
    select 1 from public.platform_activity_intervals a
    where a.user_id=new.user_id
      and a.started_at < new.started_at + make_interval(secs => new.active_seconds) - interval '2 seconds'
      and a.started_at + make_interval(secs => a.active_seconds) > new.started_at + interval '2 seconds'
  ) then
    raise exception 'Overlapping activity interval';
  end if;
  return new;
end $$;
create trigger platform_activity_no_overlap before insert on public.platform_activity_intervals
for each row execute function public.guard_platform_activity_overlap();
revoke all on function public.guard_platform_activity_overlap() from public,anon,authenticated;

create function public.team_usage_summary(p_org uuid,p_since timestamptz,p_user uuid default null)
returns table(user_id uuid,module_id text,active_seconds bigint,started_at timestamptz)
language sql security definer set search_path=public as $$
  select a.user_id,a.module_id,sum(a.active_seconds)::bigint,max(a.started_at)
  from public.team_activity_intervals a
  where a.organization_id=p_org and a.started_at>=p_since and (p_user is null or a.user_id=p_user)
  group by a.user_id,a.module_id;
$$;
revoke all on function public.team_usage_summary(uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.team_usage_summary(uuid,timestamptz,uuid) to service_role;

create table public.team_lesson_completions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.team_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  lesson_number integer not null check (lesson_number between 1 and 1000),
  completed_at timestamptz not null default now(),
  unique (organization_id,user_id,module_id,lesson_number)
);

create table public.team_lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.team_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  lesson_number integer not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index team_lesson_sessions_user_idx on public.team_lesson_sessions(organization_id,user_id,module_id,started_at desc);

create table public.team_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.team_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  version integer not null default 1,
  question_ids text[] not null,
  answers jsonb,
  area_scores jsonb,
  score integer,
  total integer not null default 25,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index team_attempts_user_idx on public.team_assessment_attempts(organization_id,user_id,module_id,started_at desc);

create table public.team_certificates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.team_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_name text not null,
  module_id text not null,
  version integer not null default 1,
  score integer not null check (score between 80 and 100),
  lesson_count integer not null,
  status text not null default 'issued' check (status in ('issued','revoked')),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text,
  unique (organization_id,user_id,module_id,version)
);

create table public.platform_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','support')),
  created_at timestamptz not null default now()
);

create table public.platform_audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id),
  action text not null,
  organization_id uuid references public.team_organizations(id),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Positive amounts are receipts; negative amounts are refunds or expenses.
-- The source and external reference make Stripe webhook retries idempotent.
create table public.platform_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  category text not null,
  amount_cents bigint not null check (amount_cents <> 0),
  source text not null check (source in ('stripe','manual')),
  external_ref text unique,
  organization_id uuid references public.team_organizations(id),
  memo text not null default '',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index platform_ledger_date_idx on public.platform_ledger_entries(occurred_on desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'team_organizations','team_entitlements','team_members','team_invitations',
    'team_assignments','team_activity_intervals','platform_activity_intervals','team_lesson_completions','team_lesson_sessions',
    'team_assessment_attempts','team_certificates','platform_admin_roles',
    'platform_audit_events','platform_ledger_entries'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to service_role', table_name);
  end loop;
end $$;
grant usage, select on sequence public.platform_audit_events_id_seq to service_role;

-- This function holds the organization row lock while reserving a seat.
create function public.team_reserve_invitation(
  p_org uuid, p_email text, p_name text, p_role text, p_module text,
  p_certificate boolean, p_token_hash text
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_limit integer; v_used integer; v_id uuid;
begin
  perform 1 from public.team_organizations where id=p_org for update;
  if not found then raise exception 'Organization not found'; end if;
  update public.team_invitations set status='revoked' where organization_id=p_org and status='pending' and expires_at<=now();
  if p_role not in ('admin','learner') then raise exception 'Invalid role'; end if;
  if not exists(select 1 from public.team_entitlements where organization_id=p_org and (status='active' or (status='manual' and period_end>now()))) then
    raise exception 'An active team plan is required';
  end if;
  if exists(select 1 from public.team_invitations where organization_id=p_org and lower(email)=lower(p_email) and status='pending') then
    raise exception 'An invitation is already pending for this email';
  end if;
  if p_role='learner' then
    select seat_limit into v_limit from public.team_entitlements where organization_id=p_org and (status='active' or (status='manual' and period_end>now()));
    if v_limit is null then raise exception 'An active team plan is required'; end if;
    select
      (select count(*) from public.team_members where organization_id=p_org and role='learner' and status='active') +
      (select count(*) from public.team_invitations where organization_id=p_org and role='learner' and status='pending' and expires_at>now())
    into v_used;
    if v_used >= v_limit then raise exception 'No learner seats are available'; end if;
  elsif (select count(*) from public.team_invitations where organization_id=p_org and role='admin' and status='pending')>=10 then
    raise exception 'Too many admin invitations are pending';
  end if;
  insert into public.team_invitations(organization_id,email,display_name,role,module_id,require_certificate,token_hash,expires_at)
    values(p_org,lower(trim(p_email)),trim(p_name),p_role,p_module,p_certificate,p_token_hash,now()+interval '7 days') returning id into v_id;
  return v_id;
end $$;

create function public.team_accept_invitation(p_token_hash text,p_user uuid,p_email text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_inv public.team_invitations%rowtype; v_limit integer; v_used integer;
begin
  select * into v_inv from public.team_invitations where token_hash=p_token_hash and status='pending' and expires_at>now();
  if not found then raise exception 'Invitation is invalid or expired'; end if;
  perform 1 from public.team_organizations where id=v_inv.organization_id for update;
  if lower(v_inv.email) <> lower(p_email) then raise exception 'Sign in with the invited email address'; end if;
  if v_inv.role='learner' then
    select seat_limit into v_limit from public.team_entitlements where organization_id=v_inv.organization_id and (status='active' or (status='manual' and period_end>now()));
    if v_limit is null then raise exception 'The team plan is no longer active'; end if;
    select count(*) into v_used from public.team_members where organization_id=v_inv.organization_id and role='learner' and status='active';
    if v_used >= v_limit then raise exception 'No learner seats are available'; end if;
  end if;
  update public.team_invitations set status='accepted',accepted_user_id=p_user where id=v_inv.id and status='pending';
  if not found then raise exception 'Invitation was already used'; end if;
  insert into public.team_members(organization_id,user_id,display_name,role)
    values(v_inv.organization_id,p_user,v_inv.display_name,v_inv.role)
    on conflict (organization_id,user_id) do update set status='active',display_name=excluded.display_name,
      role=case when team_members.role='owner' then 'owner' else excluded.role end;
  if v_inv.module_id is not null then
    insert into public.team_assignments(organization_id,user_id,module_id,require_certificate)
      values(v_inv.organization_id,p_user,v_inv.module_id,v_inv.require_certificate)
      on conflict (organization_id,user_id,module_id) do update set require_certificate=excluded.require_certificate;
  end if;
  return v_inv.organization_id;
end $$;

revoke all on function public.team_reserve_invitation(uuid,text,text,text,text,boolean,text) from public,anon,authenticated;
revoke all on function public.team_accept_invitation(text,uuid,text) from public,anon,authenticated;
grant execute on function public.team_reserve_invitation(uuid,text,text,text,text,boolean,text) to service_role;
grant execute on function public.team_accept_invitation(text,uuid,text) to service_role;

create function public.team_create_organization(p_owner uuid,p_name text,p_email text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  insert into public.team_organizations(name,owner_user_id,billing_email)
    values(trim(p_name),p_owner,lower(trim(p_email))) returning id into v_id;
  insert into public.team_entitlements(organization_id) values(v_id);
  insert into public.team_members(organization_id,user_id,display_name,role)
    values(v_id,p_owner,trim(p_name)||' admin','owner');
  return v_id;
end $$;
revoke all on function public.team_create_organization(uuid,text,text) from public,anon,authenticated;
grant execute on function public.team_create_organization(uuid,text,text) to service_role;

create function public.platform_account_counts() returns jsonb
language sql security definer set search_path=public as $$
  select jsonb_build_object(
    'total_accounts',(select count(*) from auth.users),
    'adult_accounts',(select count(*) from auth.users where email not like '%@kids.languagethreshold.app'),
    'junior_accounts',(select count(*) from auth.users where email like '%@kids.languagethreshold.app'),
    'organizations',(select count(*) from public.team_organizations),
    'paid_seats',(select coalesce(sum(seat_limit),0) from public.team_entitlements where status='active' or (status='manual' and period_end>now())),
    'assigned_seats',(select count(*) from public.team_members where role='learner' and status='active'),
    'certificates',(select count(*) from public.team_certificates where status='issued'),
    'pending_invites',(select count(*) from public.team_invitations where status='pending' and expires_at>now()),
    'email_failures',(select count(*) from public.team_invitations where last_email_error is not null and status='pending'),
    'assessment_passes_30d',(select count(*) from public.team_assessment_attempts where submitted_at>=now()-interval '30 days' and score>=20 and total=25),
    'active_7d',(select count(distinct user_id) from public.platform_activity_intervals where started_at>=now()-interval '7 days'),
    'active_30d',(select count(distinct user_id) from public.platform_activity_intervals where started_at>=now()-interval '30 days')
  );
$$;
revoke all on function public.platform_account_counts() from public,anon,authenticated;
grant execute on function public.platform_account_counts() to service_role;

create function public.platform_financial_summary(p_since date) returns jsonb
language sql security definer set search_path=public as $$
  with rows as (
    select date_trunc('month',occurred_on)::date as month,amount_cents
    from public.platform_ledger_entries where occurred_on>=p_since
  ), months as (
    select month,
      coalesce(sum(amount_cents) filter(where amount_cents>0),0) as income_cents,
      coalesce(-sum(amount_cents) filter(where amount_cents<0),0) as expense_cents,
      coalesce(sum(amount_cents),0) as net_cents
    from rows group by month
  )
  select jsonb_build_object(
    'income_cents',coalesce(sum(income_cents),0),
    'expense_cents',coalesce(sum(expense_cents),0),
    'net_cents',coalesce(sum(net_cents),0),
    'months',coalesce(jsonb_agg(jsonb_build_object('month',month,'income_cents',income_cents,'expense_cents',expense_cents,'net_cents',net_cents) order by month), '[]'::jsonb)
  ) from months;
$$;
revoke all on function public.platform_financial_summary(date) from public,anon,authenticated;
grant execute on function public.platform_financial_summary(date) to service_role;

create function public.platform_financial_categories(p_since date)
returns table(category text,income_cents bigint,expense_cents bigint,net_cents bigint)
language sql security definer set search_path=public as $$
  select e.category,
    coalesce(sum(e.amount_cents) filter(where e.amount_cents>0),0)::bigint,
    coalesce(-sum(e.amount_cents) filter(where e.amount_cents<0),0)::bigint,
    coalesce(sum(e.amount_cents),0)::bigint
  from public.platform_ledger_entries e where e.occurred_on>=p_since
  group by e.category order by e.category;
$$;
revoke all on function public.platform_financial_categories(date) from public,anon,authenticated;
grant execute on function public.platform_financial_categories(date) to service_role;

create function public.platform_usage_summary(p_since timestamptz)
returns table(organization_id uuid,user_id uuid,module_id text,active_seconds bigint,started_at timestamptz)
language sql security definer set search_path=public as $$
  select a.organization_id,a.user_id,a.module_id,sum(a.active_seconds)::bigint,max(a.started_at)
  from public.team_activity_intervals a where a.started_at>=p_since
  group by a.organization_id,a.user_id,a.module_id;
$$;
revoke all on function public.platform_usage_summary(timestamptz) from public,anon,authenticated;
grant execute on function public.platform_usage_summary(timestamptz) to service_role;

create function public.platform_site_usage_summary(p_since timestamptz)
returns table(module_id text,active_seconds bigint,active_users bigint)
language sql security definer set search_path=public as $$
  select a.module_id,sum(a.active_seconds)::bigint,count(distinct a.user_id)::bigint
  from public.platform_activity_intervals a where a.started_at>=p_since group by a.module_id;
$$;
revoke all on function public.platform_site_usage_summary(timestamptz) from public,anon,authenticated;
grant execute on function public.platform_site_usage_summary(timestamptz) to service_role;
