-- No-card promotional access. All mutations go through authenticated server handlers.
create table public.promo_redemptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 code text not null check(code='REDDITMONTH'),
 redeemed_at timestamptz not null default now(),
 expires_at timestamptz not null,
 feedback_email_consent boolean not null default false,
 consent_updated_at timestamptz not null default now()
);
create table public.product_feedback (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check(category in ('idea','problem','experience')),
 message text not null check(length(message) between 10 and 4000),
 source text not null default 'site' check(source in ('site','email')),
 recorded_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.promo_redemptions enable row level security;
alter table public.product_feedback enable row level security;
revoke all on public.promo_redemptions,public.product_feedback from public,anon,authenticated;
grant select,insert,update on public.promo_redemptions,public.product_feedback to service_role;

-- Atomic, one redemption per account. Repeating a request never extends access.
create function public.redeem_reddit_month(p_user uuid,p_email text,p_consent boolean)
returns public.promo_redemptions language plpgsql security invoker set search_path='' as $$
declare result public.promo_redemptions;
begin
 -- Existing claims remain idempotent after the deadline; new grants do not.
 select * into result from public.promo_redemptions where user_id=p_user;
 if found then return result; end if;
 if now()>=timestamptz '2026-12-02 07:00:00+00' then
  raise exception 'Reddit offer redemption deadline has passed';
 end if;
 insert into public.promo_redemptions(user_id,code,expires_at,feedback_email_consent)
 values(p_user,'REDDITMONTH',now()+interval '1 month',p_consent)
 on conflict(user_id) do nothing;
 update public.owner_crm_contacts set user_id=p_user,updated_at=now()
 where id=(select id from public.owner_crm_contacts where user_id is null and lower(email)=lower(p_email) limit 1)
 and not exists(select 1 from public.owner_crm_contacts where user_id=p_user);
 insert into public.owner_crm_contacts(id,user_id,name,email,notes)
 values(p_user,p_user,left(split_part(p_email,'@',1),120),lower(p_email),'Source: Reddit free month — REDDITMONTH')
 on conflict(user_id) do nothing;
 select * into result from public.promo_redemptions where user_id=p_user;
 return result;
end $$;
revoke all on function public.redeem_reddit_month(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.redeem_reddit_month(uuid,text,boolean) to service_role;

-- Mirror new accounts and changed emails into the existing owner CRM; no email is sent.
create schema if not exists lt_campaign_private;
revoke all on schema lt_campaign_private from public,anon,authenticated;
create function lt_campaign_private.sync_account_contact() returns trigger
language plpgsql security definer set search_path='' as $$
declare existing_id uuid;
begin
 if new.email is null or length(new.email)>254 then return new; end if;
 select id into existing_id from public.owner_crm_contacts
 where user_id=new.id or (user_id is null and lower(email)=lower(new.email))
 order by (user_id=new.id) desc nulls last limit 1;
 if existing_id is not null then
  update public.owner_crm_contacts set user_id=new.id,email=lower(new.email),updated_at=now() where id=existing_id;
 else
  insert into public.owner_crm_contacts(id,user_id,name,email,notes)
  values(new.id,new.id,left(split_part(new.email,'@',1),120),lower(new.email),'Source: Language Threshold account signup')
  on conflict(user_id) do update set email=excluded.email,updated_at=now();
 end if;
 return new;
end $$;
revoke all on function lt_campaign_private.sync_account_contact() from public,anon,authenticated;
create trigger sync_signup_to_owner_crm after insert or update of email on auth.users
for each row execute function lt_campaign_private.sync_account_contact();

create function public.save_product_feedback(p_id uuid,p_user uuid,p_category text,p_message text,p_source text default 'site',p_actor uuid default null)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('feedback:'||p_user::text,0));
 if exists(select 1 from public.product_feedback where id=p_id and user_id=p_user and category=p_category and message=p_message) then return true; end if;
 if (select count(*) from public.product_feedback where user_id=p_user and created_at>now()-interval '1 hour')>=6 then raise exception 'Feedback limit reached'; end if;
 insert into public.product_feedback(id,user_id,category,message,source,recorded_by) values(p_id,p_user,p_category,p_message,p_source,p_actor);
 return true;
end $$;
revoke all on function public.save_product_feedback(uuid,uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.save_product_feedback(uuid,uuid,text,text,text,uuid) to service_role;

-- One owner-reviewed reward per coupon user, regardless of feedback sentiment.
alter table public.promo_redemptions add column rewarded_at timestamptz,
 add column rewarded_by uuid references auth.users(id) on delete set null,
 add column reward_feedback_id uuid references public.product_feedback(id) on delete set null,
 add column reward_reason text check(length(reward_reason)<=1000);
create function public.reward_reddit_feedback(p_feedback uuid,p_actor uuid,p_user uuid default null,p_reason text default null)
returns public.promo_redemptions language plpgsql security invoker set search_path='' as $$
declare learner uuid; result public.promo_redemptions;
begin
 if p_feedback is not null then
  select user_id into learner from public.product_feedback where id=p_feedback;
  if not found then raise exception 'Feedback not found'; end if;
 elsif p_user is not null and length(trim(p_reason)) between 10 and 1000 then
  learner:=p_user;
 else raise exception 'Reviewed feedback is required'; end if;
 select * into result from public.promo_redemptions where user_id=learner for update;
 if not found then raise exception 'This feedback is not from a Reddit coupon user'; end if;
 if result.rewarded_at is not null then return result; end if;
 if p_feedback is null then
  p_feedback:=gen_random_uuid();
  perform public.save_product_feedback(p_feedback,learner,'experience',p_reason,'email',p_actor);
 end if;
 update public.promo_redemptions set expires_at=greatest(expires_at,now())+interval '2 months',rewarded_at=now(),rewarded_by=p_actor,reward_feedback_id=p_feedback,reward_reason=p_reason
 where user_id=learner returning * into result;
 return result;
end $$;
revoke all on function public.reward_reddit_feedback(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reward_reddit_feedback(uuid,uuid,uuid,text) to service_role;

create function public.reddit_feedback_summary(p_users uuid[])
returns table(user_id uuid,feedback_count bigint,last_feedback_at timestamptz)
language sql security invoker set search_path='' as $$
 select f.user_id,count(*),max(f.created_at) from public.product_feedback f
 where cardinality(p_users)<=50 and f.user_id=any(p_users) group by f.user_id;
$$;
revoke all on function public.reddit_feedback_summary(uuid[]) from public,anon,authenticated;
grant execute on function public.reddit_feedback_summary(uuid[]) to service_role;
