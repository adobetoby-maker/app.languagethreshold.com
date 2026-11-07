-- Reviewed owner broadcasts. A campaign snapshots eligible adult, confirmed recipients.
create table public.customer_email_campaigns (
  id uuid primary key,
  actor_id uuid not null references auth.users(id),
  subject text not null check (length(subject) between 1 and 160),
  body text not null check (length(body) between 1 and 8000),
  permission_confirmed_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.customer_email_campaigns enable row level security;
revoke all on public.customer_email_campaigns from public, anon, authenticated;
grant select, insert on public.customer_email_campaigns to service_role;

alter table public.customer_email_messages
  add column campaign_id uuid references public.customer_email_campaigns(id),
  add column recipient_email text;
alter table public.customer_email_messages
  drop constraint customer_email_messages_status_check;
alter table public.customer_email_messages
  add constraint customer_email_messages_status_check
  check (status in ('draft','sending','accepted','unconfirmed','skipped'));
create unique index customer_email_messages_campaign_recipient_idx
  on public.customer_email_messages(campaign_id,user_id) where campaign_id is not null;
create index customer_email_messages_campaign_status_idx
  on public.customer_email_messages(campaign_id,status,created_at);

create function public.customer_campaign_eligible_count()
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from auth.users u
  left join public.customer_email_preferences p on p.user_id = u.id
  where u.deleted_at is null and u.email_confirmed_at is not null
    and u.email is not null and u.email not ilike '%@kids.languagethreshold.app'
    and (u.banned_until is null or u.banned_until < now())
    and p.unsubscribed_at is null
    and not exists (select 1 from public.platform_admin_roles a where a.user_id = u.id);
$$;
revoke all on function public.customer_campaign_eligible_count() from public, anon, authenticated;
grant execute on function public.customer_campaign_eligible_count() to service_role;

create function public.customer_prepare_campaign(
  p_actor uuid, p_id uuid, p_subject text, p_body text, p_permission_confirmed boolean
) returns bigint language plpgsql security definer set search_path = '' as $$
declare existing public.customer_email_campaigns%rowtype; recipient_count bigint;
begin
  if coalesce(auth.role(),'') <> 'service_role' or
     not exists (select 1 from public.platform_admin_roles where user_id=p_actor and role='owner')
  then raise exception 'Owner access required'; end if;
  if not p_permission_confirmed or p_subject is null or length(trim(p_subject)) not between 1 and 160
     or p_subject ~ '[\r\n]' or p_body is null or length(trim(p_body)) not between 1 and 8000
  then raise exception 'Invalid campaign'; end if;
  select * into existing from public.customer_email_campaigns where id=p_id;
  if found then
    if existing.actor_id<>p_actor or existing.subject<>trim(p_subject) or existing.body<>trim(p_body)
      then raise exception 'Campaign ID already used'; end if;
    return (select count(*) from public.customer_email_messages where campaign_id=p_id);
  end if;
  insert into public.customer_email_campaigns(id,actor_id,subject,body,permission_confirmed_at)
    values(p_id,p_actor,trim(p_subject),trim(p_body),now());
  insert into public.customer_email_messages(id,user_id,actor_id,subject,body,campaign_id,recipient_email)
  select gen_random_uuid(),u.id,p_actor,trim(p_subject),trim(p_body),p_id,u.email
  from auth.users u
  left join public.customer_email_preferences p on p.user_id=u.id
  where u.deleted_at is null and u.email_confirmed_at is not null
    and u.email is not null and u.email not ilike '%@kids.languagethreshold.app'
    and (u.banned_until is null or u.banned_until < now())
    and p.unsubscribed_at is null
    and not exists (select 1 from public.platform_admin_roles a where a.user_id=u.id);
  get diagnostics recipient_count = row_count;
  return recipient_count;
end $$;
revoke all on function public.customer_prepare_campaign(uuid,uuid,text,text,boolean)
  from public, anon, authenticated;
grant execute on function public.customer_prepare_campaign(uuid,uuid,text,text,boolean)
  to service_role;

create function public.customer_campaign_summary(p_actor uuid)
returns table(id uuid, subject text, created_at timestamptz, recipients bigint,
              draft bigint, accepted bigint, unconfirmed bigint, skipped bigint)
language sql stable security invoker set search_path = '' as $$
  select c.id,c.subject,c.created_at,count(m.id)::bigint,
    count(m.id) filter (where m.status='draft')::bigint,
    count(m.id) filter (where m.status='accepted')::bigint,
    count(m.id) filter (where m.status in ('sending','unconfirmed'))::bigint,
    count(m.id) filter (where m.status='skipped')::bigint
  from public.customer_email_campaigns c
  left join public.customer_email_messages m on m.campaign_id=c.id
  where c.actor_id=p_actor
  group by c.id
  order by c.created_at desc
  limit 20;
$$;
revoke all on function public.customer_campaign_summary(uuid) from public, anon, authenticated;
grant execute on function public.customer_campaign_summary(uuid) to service_role;
