-- One durable claim for the whole resource offer, not one claim per PDF.
create table public.resource_offer_claims (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 campaign text not null default 'study-guides-10-v1' check(campaign='study-guides-10-v1'),
 resource_slug text not null,
 code text not null unique default ('LT10-'||upper(replace(gen_random_uuid()::text,'-',''))),
 state text not null default 'pending' check(state in ('pending','uncertain','issued','redeemed')),
 stripe_customer_id text,
 stripe_promotion_id text,
 customer_attempted_at timestamptz,
 promotion_attempted_at timestamptz,
 checkout_attempt_id uuid,
 checkout_attempted_at timestamptz,
 checkout_plan text,
 checkout_price_id text,
 checkout_product_id text,
 checkout_unit_amount bigint,
 checkout_session_id text,
 applied_invoice_id text,
 redeemed_at timestamptz,
 lease_id uuid,
 lease_until timestamptz,
 last_error_code text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,campaign),
 unique(stripe_customer_id,campaign),
 unique(stripe_promotion_id),
 unique(applied_invoice_id)
);
alter table public.resource_offer_claims enable row level security;
revoke all on public.resource_offer_claims from public,anon,authenticated;
grant select on public.resource_offer_claims to service_role;

create function public.reserve_resource_offer_claim(p_user uuid,p_resource text,p_lease uuid,p_purpose text default 'claim')
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.resource_offer_claims; u auth.users;
begin
 select * into u from auth.users where id=p_user and deleted_at is null;
 if p_purpose<>'invoice' and (u.id is null or u.email_confirmed_at is null or u.email is null or
   (lower(u.email) like '%@kids.languagethreshold.app' or lower(u.email) like '%@kids.juniorlinguist.app') or
   u.raw_app_meta_data->>'is_kid'='true' or u.raw_user_meta_data->>'is_kid'='true')
 then raise exception 'Confirmed adult account required'; end if;
 if p_resource !~ '^[a-z0-9][a-z0-9-]{0,79}$' or p_purpose not in ('claim','checkout','invoice') or p_lease is null
 then raise exception 'Invalid offer request'; end if;
 insert into public.resource_offer_claims(user_id,resource_slug) values(p_user,p_resource)
 on conflict(user_id,campaign) do nothing;
 select * into r from public.resource_offer_claims where user_id=p_user and campaign='study-guides-10-v1' for update;
 if r.state='redeemed' or (r.state='issued' and p_purpose='claim') then return to_jsonb(r); end if;
 if r.lease_until>now() and r.lease_id is distinct from p_lease then return jsonb_build_object('busy',true); end if;
 update public.resource_offer_claims set lease_id=p_lease,lease_until=now()+interval '3 minutes',updated_at=now()
 where id=r.id returning * into r;
 return to_jsonb(r);
end $$;

create function public.checkpoint_resource_offer_claim(
 p_user uuid,p_lease uuid,p_phase text,p_customer text default null,p_promotion text default null,
 p_plan text default null,p_session text default null,p_invoice text default null,
 p_price text default null,p_product text default null,p_amount bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.resource_offer_claims; profile_customer text;
begin
 select * into r from public.resource_offer_claims where user_id=p_user and campaign='study-guides-10-v1' for update;
 if r.id is null or r.lease_id is distinct from p_lease or r.lease_until<=now()
 then raise exception 'Offer claim lease changed'; end if;
 if p_customer is not null and p_customer !~ '^cus_[a-zA-Z0-9]+$' or
    p_promotion is not null and p_promotion !~ '^promo_[a-zA-Z0-9]+$' or
    p_session is not null and p_session !~ '^cs_[a-zA-Z0-9_]+$' or
    p_invoice is not null and p_invoice !~ '^in_[a-zA-Z0-9]+$'
 then raise exception 'Invalid provider receipt'; end if;
 if p_phase='attempt_customer' then
  update public.resource_offer_claims set customer_attempted_at=coalesce(customer_attempted_at,now()) where id=r.id;
 elsif p_phase='customer' then
  if p_customer is null or (r.stripe_customer_id is not null and r.stripe_customer_id<>p_customer) then raise exception 'Customer binding changed'; end if;
  select data->>'stripe_customer_id' into profile_customer from public.profiles where id=p_user for update;
  if profile_customer is not null and profile_customer<>p_customer then raise exception 'Billing profile changed'; end if;
  insert into public.profiles(id,data) values(p_user,jsonb_build_object('stripe_customer_id',p_customer))
  on conflict(id) do update set data=coalesce(public.profiles.data,'{}'::jsonb)||jsonb_build_object('stripe_customer_id',p_customer);
  update public.resource_offer_claims set stripe_customer_id=p_customer where id=r.id;
 elsif p_phase='attempt_promotion' then
  if r.stripe_customer_id is null then raise exception 'Customer binding required'; end if;
  update public.resource_offer_claims set promotion_attempted_at=coalesce(promotion_attempted_at,now()) where id=r.id;
 elsif p_phase='issued' then
  if r.stripe_customer_id is null or p_promotion is null or
    (r.stripe_promotion_id is not null and r.stripe_promotion_id<>p_promotion) then raise exception 'Promotion binding changed'; end if;
  update public.resource_offer_claims set stripe_promotion_id=p_promotion,state='issued',lease_until=null,last_error_code=null where id=r.id;
 elsif p_phase='attempt_checkout' then
  if r.state<>'issued' or p_plan is null or p_plan not in ('monthly','annual','family-monthly','family') or
    (r.checkout_plan is not null and r.checkout_plan<>p_plan) or
    p_price is null or p_price !~ '^price_[a-zA-Z0-9]+$' or
    p_product is null or p_product !~ '^prod_[a-zA-Z0-9]+$' or p_amount is null or p_amount<=0 or
    (r.checkout_price_id is not null and r.checkout_price_id<>p_price) or
    (r.checkout_product_id is not null and r.checkout_product_id<>p_product) or
    (r.checkout_unit_amount is not null and r.checkout_unit_amount<>p_amount)
    then raise exception 'Checkout selection changed'; end if;
  update public.resource_offer_claims set checkout_plan=p_plan,checkout_attempt_id=coalesce(checkout_attempt_id,gen_random_uuid()),
   checkout_price_id=p_price,checkout_product_id=p_product,checkout_unit_amount=p_amount,
   checkout_attempted_at=coalesce(checkout_attempted_at,now()) where id=r.id;
 elsif p_phase='checkout' then
  if p_session is null or r.checkout_attempt_id is null or
    (r.checkout_session_id is not null and r.checkout_session_id<>p_session) then raise exception 'Checkout receipt changed'; end if;
  update public.resource_offer_claims set checkout_session_id=p_session,lease_until=null where id=r.id;
 elsif p_phase='expired_checkout' then
  if r.checkout_session_id is null or r.checkout_session_id is distinct from p_session then raise exception 'Checkout receipt changed'; end if;
  update public.resource_offer_claims set checkout_session_id=null,checkout_plan=null,checkout_price_id=null,
   checkout_product_id=null,checkout_unit_amount=null,checkout_attempt_id=null,checkout_attempted_at=null where id=r.id;
 elsif p_phase='invoice' then
  if p_invoice is null or r.stripe_promotion_id is null or
   (r.applied_invoice_id is not null and r.applied_invoice_id<>p_invoice) then raise exception 'Invoice receipt changed'; end if;
  update public.resource_offer_claims set applied_invoice_id=p_invoice,lease_until=null where id=r.id;
 elsif p_phase='redeemed' then
  if r.applied_invoice_id is null or r.applied_invoice_id is distinct from p_invoice then raise exception 'Invoice receipt changed'; end if;
  update public.resource_offer_claims set state='redeemed',redeemed_at=coalesce(redeemed_at,now()),lease_until=null where id=r.id;
 elsif p_phase='release' then
  update public.resource_offer_claims set lease_until=null where id=r.id;
 elsif p_phase='uncertain' then
  update public.resource_offer_claims set state=case when state='pending' then 'uncertain' else state end,
   last_error_code='provider_or_storage_unconfirmed',lease_until=null where id=r.id;
 else raise exception 'Invalid offer checkpoint'; end if;
 update public.resource_offer_claims set updated_at=now() where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.reserve_resource_offer_claim(uuid,text,uuid,text),public.checkpoint_resource_offer_claim(uuid,uuid,text,text,text,text,text,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.reserve_resource_offer_claim(uuid,text,uuid,text),public.checkpoint_resource_offer_claim(uuid,uuid,text,text,text,text,text,text,text,text,bigint) to service_role;
