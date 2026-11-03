-- Separate additive migration: the original campaign schema is already applied.
create table public.promo_campaign_budget (
 code text primary key check(code='REDDITMONTH'),
 limit_microusd bigint not null check(limit_microusd=1000000000),
 reserved_microusd bigint not null default 0 check(reserved_microusd between 0 and 1000000000)
);
insert into public.promo_campaign_budget(code,limit_microusd) values('REDDITMONTH',1000000000);
alter table public.promo_campaign_budget enable row level security;
revoke all on public.promo_campaign_budget from public,anon,authenticated;
grant select,update on public.promo_campaign_budget to service_role;
alter table public.promo_redemptions add column budget_reserved_microusd bigint not null default 0 check(budget_reserved_microusd between 0 and 10000000);
create or replace function public.redeem_reddit_month(p_user uuid,p_email text,p_consent boolean)
returns public.promo_redemptions language plpgsql security invoker set search_path='' as $$
declare result public.promo_redemptions;
begin
 perform pg_advisory_xact_lock(hashtextextended('reddit-claim-cap',0));
 -- Existing claims remain idempotent after the deadline; new grants do not.
 select * into result from public.promo_redemptions where user_id=p_user;
 if found then return result; end if;
 if now()>=timestamptz '2026-12-02 07:00:00+00' then
  raise exception 'Reddit offer redemption deadline has passed';
 end if;
 if (select count(*) from public.promo_redemptions)>=100 then raise exception 'Reddit tester places are full'; end if;
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

create function public.reserve_reddit_generation(p_user uuid,p_amount bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
declare available boolean;
begin
 if p_amount is null or p_amount<1 or p_amount>10000000 then return false; end if;
 -- Same lock order for every admission; concurrent server instances cannot overspend.
 perform 1 from public.promo_campaign_budget where code='REDDITMONTH' for update;
 select expires_at>now() and budget_reserved_microusd+p_amount<=10000000 into available
 from public.promo_redemptions where user_id=p_user for update;
 if available is not true then return false; end if;
 update public.promo_campaign_budget set reserved_microusd=reserved_microusd+p_amount
 where code='REDDITMONTH' and reserved_microusd+p_amount<=limit_microusd;
 if not found then return false; end if;
 update public.promo_redemptions set budget_reserved_microusd=budget_reserved_microusd+p_amount where user_id=p_user;
 return true;
end $$;
revoke all on function public.reserve_reddit_generation(uuid,bigint) from public,anon,authenticated;
grant execute on function public.reserve_reddit_generation(uuid,bigint) to service_role;
