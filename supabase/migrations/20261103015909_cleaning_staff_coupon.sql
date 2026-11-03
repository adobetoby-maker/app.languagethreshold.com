-- Separate, email-restricted staff offer; never consumes a Reddit tester place.
create table public.staff_coupon_recipients (
 email text primary key check(email=lower(trim(email)) and length(email) between 3 and 254 and position('@' in email)>1),
 added_by uuid not null references auth.users(id),
 added_at timestamptz not null default now(),
 user_id uuid unique references auth.users(id) on delete set null,
 claimed_at timestamptz,
 expires_at timestamptz,
 budget_reserved_microusd bigint not null default 0 check(budget_reserved_microusd between 0 and 10000000),
 check((claimed_at is null and expires_at is null) or (claimed_at is not null and expires_at>claimed_at))
);
alter table public.staff_coupon_recipients enable row level security;
revoke all on public.staff_coupon_recipients from public,anon,authenticated;
grant select,insert,update,delete on public.staff_coupon_recipients to service_role;

create function public.add_staff_coupon_recipient(p_actor uuid,p_email text)
returns void language plpgsql security invoker set search_path='' as $$
declare normalized text:=lower(trim(p_email)); linked_user uuid;
begin
 if not exists(select 1 from public.platform_admin_roles where user_id=p_actor and role='owner') then raise exception 'Owner access required'; end if;
 if normalized is null or length(normalized) not between 3 and 254 or position('@' in normalized)<2 then raise exception 'Invalid email'; end if;
 perform pg_advisory_xact_lock(hashtextextended(normalized,1));
 insert into public.staff_coupon_recipients(email,added_by) values(normalized,p_actor) on conflict(email) do nothing;
 linked_user:=public.platform_find_user(normalized);
 if not exists(select 1 from public.owner_crm_contacts where lower(email)=normalized or user_id=linked_user) then
   insert into public.owner_crm_contacts(id,name,email,user_id,expertise,notes)
   values(gen_random_uuid(),left(split_part(normalized,'@',1),120),normalized,linked_user,'Cleaning staff','Cleaning staff offer: CLEANING2MONTHS — two months from first claim; $10 total AI/audio allowance.');
 end if;
 insert into public.platform_audit_events(actor_user_id,action,detail) values(p_actor,'staff_coupon.add',jsonb_build_object('email',normalized));
end $$;

-- Narrow private lookup: service_role cannot read auth.users directly.
create function lt_campaign_private.staff_verified_email(p_user uuid)
returns text language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service access required'; end if;
 return (select lower(email) from auth.users where id=p_user and email_confirmed_at is not null and deleted_at is null);
end $$;
revoke all on function lt_campaign_private.staff_verified_email(uuid) from public,anon,authenticated;
grant usage on schema lt_campaign_private to service_role;
grant execute on function lt_campaign_private.staff_verified_email(uuid) to service_role;

create function public.claim_staff_coupon(p_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare recipient public.staff_coupon_recipients; verified_email text; existing_until timestamptz;
begin
 verified_email:=lt_campaign_private.staff_verified_email(p_user);
 if verified_email is null then raise exception 'Staff coupon is not available for this confirmed email'; end if;
 -- A claimed account cannot gain another claim by changing email.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,2));
 select * into recipient from public.staff_coupon_recipients where user_id=p_user for update;
 if not found then
   select * into recipient from public.staff_coupon_recipients where email=verified_email for update;
 end if;
 if recipient.email is null or (recipient.user_id is not null and recipient.user_id<>p_user) or (recipient.claimed_at is not null and recipient.user_id is null) then raise exception 'Staff coupon is not available for this confirmed email'; end if;
 if recipient.claimed_at is null then
   -- Never reuse an offer already claimed by a deleted/different account.
   select e.period_end into existing_until from public.platform_user_grants g join public.team_entitlements e on e.organization_id=g.organization_id where g.user_id=p_user;
   perform public.platform_grant_user(recipient.added_by,p_user,greatest(now()+interval '2 months',existing_until),'Cleaning staff coupon — CLEANING2MONTHS');
   update public.staff_coupon_recipients set user_id=p_user,claimed_at=now(),expires_at=now()+interval '2 months' where email=recipient.email returning * into recipient;
 end if;
 return jsonb_build_object('email',recipient.email,'claimed_at',recipient.claimed_at,'expires_at',recipient.expires_at,'budget_reserved_microusd',recipient.budget_reserved_microusd);
end $$;

create function public.reserve_staff_generation(p_user uuid,p_amount bigint)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_amount is null or p_amount<=0 or p_amount>10000000 then return false; end if;
 update public.staff_coupon_recipients set budget_reserved_microusd=budget_reserved_microusd+p_amount
 where user_id=p_user and expires_at>now() and budget_reserved_microusd+p_amount<=10000000;
 return found;
end $$;
revoke all on function public.add_staff_coupon_recipient(uuid,text),public.claim_staff_coupon(uuid),public.reserve_staff_generation(uuid,bigint) from public,anon,authenticated;
grant execute on function public.add_staff_coupon_recipient(uuid,text),public.claim_staff_coupon(uuid),public.reserve_staff_generation(uuid,bigint) to service_role;
