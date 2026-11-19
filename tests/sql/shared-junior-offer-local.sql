-- Isolated local QA only, after shared migrations. Every synthetic row rolls back.
begin;
insert into auth.users(id,email,email_confirmed_at) values('90000000-0000-4000-8000-000000000001','offer-parent@example.invalid',now());
do $$
declare u uuid='90000000-0000-4000-8000-000000000001'; l uuid='91000000-0000-4000-8000-000000000001'; other uuid='91000000-0000-4000-8000-000000000002';c jsonb;failed boolean;
begin
 if has_table_privilege('service_role','public.resource_offer_claims','update') or has_function_privilege('authenticated','public.checkpoint_resource_offer_claim(uuid,uuid,text,text,text,text,text,text,text,text,bigint)','execute') then raise exception 'Journal authority leaked';end if;
 c=public.reserve_resource_offer_claim(u,'jr-guide',l,'claim');
 perform public.checkpoint_resource_offer_claim(u,l,'customer','cus_offerParent');
 perform public.checkpoint_resource_offer_claim(u,l,'issued',p_promotion=>'promo_once');
 perform public.reserve_resource_offer_claim(u,'jr-guide',l,'checkout');
 failed=false;begin perform public.checkpoint_resource_offer_claim(u,l,'attempt_checkout',p_plan=>'junior-annual',p_price=>'price_other',p_product=>'prod_other',p_amount=>7900);exception when others then failed=true;end;if not failed then raise exception 'Wrong Junior catalog accepted';end if;
 c=public.checkpoint_resource_offer_claim(u,l,'attempt_checkout',p_plan=>'junior-annual',p_price=>'price_1TbWqsQjohgWhWidON8lfVxv',p_product=>'prod_UaiHU3ys9H8Dvf',p_amount=>7900);
 if c->>'checkout_trial_days'<>'7' or c->>'checkout_discount_mode'<>'deferred' then raise exception 'Approved Junior seven-day policy lost';end if;
 perform public.checkpoint_resource_offer_claim(u,l,'checkout',p_session=>'cs_test_offer');
 perform public.reserve_resource_offer_claim(u,'jr-guide',l,'invoice');
 perform public.checkpoint_resource_offer_claim(u,l,'invoice',p_invoice=>'in_first');
 perform public.reserve_resource_offer_claim(u,'jr-guide',l,'invoice');
 perform public.checkpoint_resource_offer_claim(u,l,'redeemed',p_invoice=>'in_first');
 c=public.reserve_resource_offer_claim(u,'normal-family',l,'checkout');
 if c->>'state'<>'redeemed' or c->>'lease_id'<>l::text then raise exception 'Redeemed billing customer was not serialized';end if;
 if public.reserve_resource_offer_claim(u,'normal-jr',other,'checkout')->>'busy'<>'true' then raise exception 'Cross-app redeemed lease bypass';end if;
 c=public.checkpoint_resource_offer_claim(u,l,'attempt_family_checkout',p_plan=>'family',p_price=>'price_1TbKk5QjohgWhWidSuAbMeTq');
 c=public.checkpoint_resource_offer_claim(u,l,'family_checkout',p_session=>'cs_test_family');
 if c->>'state'<>'redeemed' or c->>'stripe_promotion_id'<>'promo_once' or c->>'normal_family_checkout_session_id'<>'cs_test_family' then raise exception 'Normal Family reset discount allowance';end if;
 perform public.checkpoint_resource_offer_claim(u,l,'release');
 raise notice 'PASS: exact Junior catalog, owner-approved trial, first-use journal, redeemed cross-app lease and normal-Family isolation.';
end $$;
rollback;
