-- Account-scoped Web Push subscriptions and reminder preferences.
-- Push endpoints are bearer capabilities, so only the service role can read
-- these tables; clients must use the authenticated application API.

create table if not exists public.push_subscriptions (
  endpoint_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null check (char_length(endpoint) between 12 and 2048),
  p256dh text not null check (char_length(p256dh) between 40 and 256),
  auth text not null check (char_length(auth) between 8 and 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create table if not exists public.push_reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  reminder_hour smallint not null default 19 check (reminder_hour between 0 and 23),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  last_sent_local_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.push_reminder_preferences enable row level security;

revoke all on table public.push_subscriptions from public, anon, authenticated;
revoke all on table public.push_reminder_preferences from public, anon, authenticated;
grant select, insert, update, delete on table public.push_subscriptions to service_role;
grant select, insert, update, delete on table public.push_reminder_preferences to service_role;

-- Atomically claim each due user's daily reminder, then return one row per
-- registered device. A user is claimed at most once per local calendar day.
create or replace function public.claim_due_push_reminders(p_now timestamptz default now())
returns table (
  user_id uuid,
  endpoint_hash text,
  endpoint text,
  p256dh text,
  auth text,
  context jsonb,
  timezone text
)
language sql
security definer
set search_path = ''
as $function$
  with due as (
    select p.user_id, (p_now at time zone p.timezone)::date as local_date
    from public.push_reminder_preferences p
    where p.enabled = true
      and extract(hour from (p_now at time zone p.timezone))::integer = p.reminder_hour
      and (
        p.last_sent_local_date is null
        or p.last_sent_local_date < (p_now at time zone p.timezone)::date
      )
    order by p.updated_at asc
    limit 1000
    for update skip locked
  ), claimed as (
    update public.push_reminder_preferences p
    set last_sent_local_date = due.local_date,
        updated_at = p_now
    from due
    where p.user_id = due.user_id
    returning p.user_id, p.context, p.timezone
  )
  select c.user_id, s.endpoint_hash, s.endpoint, s.p256dh, s.auth, c.context, c.timezone
  from claimed c
  join public.push_subscriptions s on s.user_id = c.user_id;
$function$;

revoke all on function public.claim_due_push_reminders(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_due_push_reminders(timestamptz) to service_role;
