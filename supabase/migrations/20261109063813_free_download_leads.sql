-- Private first-party reporting for CRM-accepted free-resource requests.
create table public.free_download_leads (
  event_id text primary key check (event_id ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  site text not null check (site in ('medicalspanish.app','constructionspanish.app','languagethreshold.com')),
  email text not null check (length(email) between 3 and 255),
  resource_id text not null check (length(resource_id) between 1 and 100),
  resource_title text not null check (length(resource_title) between 1 and 160),
  signup_page text not null check (length(signup_page) <= 160),
  landing_page text not null check (length(landing_page) <= 160),
  referrer_host text not null default '' check (length(referrer_host) <= 160),
  utm_source text not null default '' check (length(utm_source) <= 80),
  utm_medium text not null default '' check (length(utm_medium) <= 80),
  utm_campaign text not null default '' check (length(utm_campaign) <= 80),
  utm_content text not null default '' check (length(utm_content) <= 80),
  is_test boolean not null default false
);
alter table public.free_download_leads enable row level security;
revoke all on public.free_download_leads from public, anon, authenticated;
grant select, insert on public.free_download_leads to service_role;
create index free_download_leads_time on public.free_download_leads (created_at desc);
create index free_download_leads_email on public.free_download_leads (email, created_at);

create function public.owner_download_lead_report(p_since timestamptz, p_include_tests boolean default false)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
with eligible as (
 select * from public.free_download_leads where (p_include_tests or not is_test)
), first_seen as (
 select email, min(created_at) as first_at from eligible group by email
), period as (
 select * from eligible where created_at >= p_since
), groups as (
 select site, signup_page, landing_page, resource_id, resource_title,
   utm_source, utm_medium, utm_campaign, utm_content, referrer_host,
   count(*) as requests, count(distinct email) as unique_emails
 from period group by site, signup_page, landing_page, resource_id, resource_title,
   utm_source, utm_medium, utm_campaign, utm_content, referrer_host
), daily as (
 select (created_at at time zone 'America/Denver')::date as day,
 count(*) as requests, count(distinct email) as unique_emails
 from period group by 1
)
select jsonb_build_object(
 'requests', (select count(*) from period),
 'uniqueEmails', (select count(distinct email) from period),
 'newEmails', (select count(*) from first_seen where first_at >= p_since),
 'todayRequests', (select count(*) from eligible where (created_at at time zone 'America/Denver')::date = (now() at time zone 'America/Denver')::date),
 'todayEmails', (select count(distinct email) from eligible where (created_at at time zone 'America/Denver')::date = (now() at time zone 'America/Denver')::date),
 'testsExcluded', (select count(*) from public.free_download_leads where is_test and created_at >= p_since and not p_include_tests),
 'trackingStartedAt', (select obj_description('public.free_download_leads'::regclass)),
 'sources', coalesce((select jsonb_agg(to_jsonb(g) order by g.requests desc, g.site) from groups g), '[]'::jsonb),
 'daily', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from daily d), '[]'::jsonb),
 'recent', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (
 select created_at, site, email, resource_title, signup_page, landing_page, utm_source, utm_campaign, is_test from period order by created_at desc limit 100
 ) r), '[]'::jsonb)
);
$$;
revoke all on function public.owner_download_lead_report(timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.owner_download_lead_report(timestamptz,boolean) to service_role;
-- Set at deployment, rather than pretending that historical CRM contacts were tracked.
comment on table public.free_download_leads is 'Tracking installed 2026-11-09 UTC. Per-site reporting starts when each funnel deployment is live. Earlier CRM history is not included.';
