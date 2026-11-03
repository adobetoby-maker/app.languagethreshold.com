-- Isolated synthetic database only. Rolls back all people/grants/wallets.
begin;
set local request.jwt.claim.role='service_role';
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-8000-000000000801','owner@example.invalid',now()),
('00000000-0000-4000-8000-000000000802','staff@example.invalid',now()),
('00000000-0000-4000-8000-000000000803','stranger@example.invalid',now()),
('00000000-0000-4000-8000-000000000804','unconfirmed@example.invalid',null);
insert into public.platform_admin_roles(user_id,role) values('00000000-0000-4000-8000-000000000801','owner');
set local role service_role;
select public.add_staff_coupon_recipient('00000000-0000-4000-8000-000000000801',' STAFF@example.invalid ');
select public.add_staff_coupon_recipient('00000000-0000-4000-8000-000000000801','staff@example.invalid');
select public.add_staff_coupon_recipient('00000000-0000-4000-8000-000000000801','unconfirmed@example.invalid');
select public.add_staff_coupon_recipient('00000000-0000-4000-8000-000000000801','future@example.invalid');
do $$ begin
 if (select count(*) from public.staff_coupon_recipients where email='staff@example.invalid')<>1 then raise exception 'duplicate staff'; end if;
 if (select count(*) from public.owner_crm_contacts where email='future@example.invalid')<>1 then raise exception 'missing CRM contact'; end if;
 begin perform public.add_staff_coupon_recipient('00000000-0000-4000-8000-000000000803','bad@example.invalid'); raise exception 'nonowner added staff'; exception when raise_exception then if sqlerrm<>'Owner access required' then raise; end if; end;
 begin perform public.claim_staff_coupon('00000000-0000-4000-8000-000000000803'); raise exception 'stranger claimed'; exception when raise_exception then if sqlerrm<>'Staff coupon is not available for this confirmed email' then raise; end if; end;
 begin perform public.claim_staff_coupon('00000000-0000-4000-8000-000000000804'); raise exception 'unconfirmed claimed'; exception when raise_exception then if sqlerrm<>'Staff coupon is not available for this confirmed email' then raise; end if; end;
end $$;
select public.claim_staff_coupon('00000000-0000-4000-8000-000000000802');
do $$ declare expires timestamptz; begin
 select expires_at into expires from public.staff_coupon_recipients where email='staff@example.invalid';
 if expires<>now()+interval '2 months' then raise exception 'wrong two month term'; end if;
 if not exists(select 1 from public.platform_user_grants g join public.team_entitlements e on e.organization_id=g.organization_id where g.user_id='00000000-0000-4000-8000-000000000802' and e.status='manual' and e.period_end=expires and e.stripe_subscription_id is null) then raise exception 'access not granted'; end if;
 if not public.reserve_staff_generation('00000000-0000-4000-8000-000000000802',6000000) then raise exception 'first reservation denied'; end if;
 if public.reserve_staff_generation('00000000-0000-4000-8000-000000000802',6000000) then raise exception 'budget overspent'; end if;
 perform public.claim_staff_coupon('00000000-0000-4000-8000-000000000802');
 if (select expires_at from public.staff_coupon_recipients where email='staff@example.invalid')<>expires then raise exception 'retry extended access'; end if;
 if (select budget_reserved_microusd from public.staff_coupon_recipients where email='staff@example.invalid')<>6000000 then raise exception 'retry refilled budget'; end if;
 update public.staff_coupon_recipients set claimed_at=now()-interval '3 months',expires_at=now()-interval '1 month' where email='staff@example.invalid';
 if public.reserve_staff_generation('00000000-0000-4000-8000-000000000802',1) then raise exception 'expired reservation allowed'; end if;
end $$;
reset role;
-- Signup links the existing manual CRM contact without losing offer notes.
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000805','future@example.invalid',now());
set local role service_role;
select public.claim_staff_coupon('00000000-0000-4000-8000-000000000805');
do $$ begin
 if (select count(*) from public.owner_crm_contacts where email='future@example.invalid')<>1 then raise exception 'CRM duplicate on signup'; end if;
end $$;
reset role;
set local role authenticated;
do $$ begin
 begin perform * from public.staff_coupon_recipients; raise exception 'staff list exposed'; exception when insufficient_privilege then null; end;
 begin perform public.claim_staff_coupon('00000000-0000-4000-8000-000000000803'); raise exception 'RPC exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
