-- Private communications and referral attribution. Browser roles use verified server APIs.
create table public.customer_email_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 unsubscribe_token uuid not null unique default gen_random_uuid(),
 unsubscribed_at timestamptz
);
create table public.customer_email_messages (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 subject text not null check(length(subject) between 1 and 160),
 body text not null check(length(body) between 1 and 8000),
 status text not null default 'draft' check(status in ('draft','sending','accepted','unconfirmed')),
 created_at timestamptz not null default now(),
 attempted_at timestamptz
);
create index customer_email_messages_recipient_idx on public.customer_email_messages(user_id,created_at desc);
create index customer_email_messages_actor_idx on public.customer_email_messages(actor_id);
create table public.customer_referral_links (
 user_id uuid primary key references auth.users(id) on delete cascade,
 code uuid not null unique default gen_random_uuid(),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.customer_referrals (
 referred_user_id uuid primary key references auth.users(id) on delete cascade,
 referrer_user_id uuid not null references public.customer_referral_links(user_id) on delete cascade,
 created_at timestamptz not null default now(),
 check(referred_user_id<>referrer_user_id)
);
create index customer_referrals_referrer_idx on public.customer_referrals(referrer_user_id);
alter table public.customer_email_preferences enable row level security;
alter table public.customer_email_messages enable row level security;
alter table public.customer_referral_links enable row level security;
alter table public.customer_referrals enable row level security;
revoke all on public.customer_email_preferences,public.customer_email_messages,public.customer_referral_links,public.customer_referrals from public,anon,authenticated;
grant all on public.customer_email_preferences,public.customer_email_messages,public.customer_referral_links,public.customer_referrals to service_role;

-- At most one provider attempt per saved message; serialize cooldown/suppression across tabs.
create function public.customer_claim_email(p_id uuid,p_actor uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare recipient uuid;
begin
 select user_id into recipient from public.customer_email_messages where id=p_id and actor_id=p_actor;
 if recipient is null then return false; end if;
 perform pg_advisory_xact_lock(hashtextextended(recipient::text,31));
 if exists(select 1 from public.customer_email_preferences where user_id=recipient and unsubscribed_at is not null)
 or exists(select 1 from public.customer_email_messages where user_id=recipient and attempted_at>now()-interval '60 seconds') then return false; end if;
 update public.customer_email_messages set status='sending',attempted_at=now() where id=p_id and actor_id=p_actor and status='draft';
 return found;
end $$;
revoke all on function public.customer_claim_email(uuid,uuid) from public,anon,authenticated;
grant execute on function public.customer_claim_email(uuid,uuid) to service_role;

-- Only a confirmed, newly registered account can claim one referral. No payment/reward implied.
create function public.customer_claim_referral(p_user uuid,p_code uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare referrer uuid; issued timestamptz; registered timestamptz;
begin
 select user_id,created_at into referrer,issued from public.customer_referral_links where code=p_code and active;
 select created_at into registered from auth.users where id=p_user and email_confirmed_at is not null and deleted_at is null;
 if referrer is null or referrer=p_user or registered is null or registered<issued or registered<now()-interval '7 days' then return false; end if;
 insert into public.customer_referrals(referred_user_id,referrer_user_id) values(p_user,referrer) on conflict do nothing;
 return found;
end $$;
revoke all on function public.customer_claim_referral(uuid,uuid) from public,anon,authenticated;
grant execute on function public.customer_claim_referral(uuid,uuid) to service_role;
