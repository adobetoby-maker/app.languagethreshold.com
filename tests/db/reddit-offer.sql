-- Run only against the isolated synthetic fixture described in docs/reddit-offer.md.
begin;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000101','reviewer@example.invalid');
do $$ begin
 if (select count(*) from public.owner_crm_contacts where user_id='00000000-0000-4000-8000-000000000101')<>1 then raise exception 'signup not mirrored'; end if;
end $$;
update auth.users set email='changed@example.invalid' where id='00000000-0000-4000-8000-000000000101';
set local role service_role;
select public.redeem_reddit_month('00000000-0000-4000-8000-000000000101','changed@example.invalid',false);
select public.redeem_reddit_month('00000000-0000-4000-8000-000000000101','changed@example.invalid',true);
reset role;
do $$ begin
 if (select count(*) from public.owner_crm_contacts where user_id='00000000-0000-4000-8000-000000000101')<>1 then raise exception 'CRM duplicate'; end if;
 if (select email from public.owner_crm_contacts where user_id='00000000-0000-4000-8000-000000000101')<>'changed@example.invalid' then raise exception 'email not synced'; end if;
 if exists(select 1 from public.promo_redemptions where expires_at<>redeemed_at+interval '1 month') then raise exception 'wrong expiry'; end if;
 if exists(select 1 from public.promo_redemptions where feedback_email_consent) then raise exception 'retry changed consent'; end if;
 if (select count(*) from public.promo_redemptions)<>1 then raise exception 'duplicate redemption'; end if;
 if has_table_privilege('authenticated','public.promo_redemptions','SELECT') or has_table_privilege('anon','public.product_feedback','INSERT') then raise exception 'browser privileges exposed'; end if;
 if has_function_privilege('authenticated','public.redeem_reddit_month(uuid,text,boolean)','EXECUTE') then raise exception 'claim RPC exposed'; end if;
end $$;
set local role authenticated;
do $$ begin
 begin perform * from public.promo_redemptions; raise exception 'authenticated read unexpectedly succeeded'; exception when insufficient_privilege then null; end;
 begin perform public.redeem_reddit_month('00000000-0000-4000-8000-000000000101','changed@example.invalid',false); raise exception 'authenticated claim unexpectedly succeeded'; exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Existing manual contacts are linked rather than duplicated on signup.
insert into public.owner_crm_contacts(id,name,email,notes) values('00000000-0000-4000-8000-000000000201','Manual reviewer','manual@example.invalid','Keep this private note');
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000102','manual@example.invalid');
do $$ begin
 if (select count(*) from public.owner_crm_contacts where email='manual@example.invalid')<>1 then raise exception 'manual contact duplicated'; end if;
 if (select notes from public.owner_crm_contacts where user_id='00000000-0000-4000-8000-000000000102')<>'Keep this private note' then raise exception 'notes overwritten'; end if;
end $$;
set local role service_role;
select public.save_product_feedback('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000101','idea','A useful suggestion');
select public.save_product_feedback('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000101','idea','A useful suggestion');
reset role;
do $$ begin
 if (select count(*) from public.product_feedback)<>1 then raise exception 'feedback retry duplicated'; end if;
end $$;
do $$ declare prior_expiry timestamptz; rewarded_expiry timestamptz; begin
 select expires_at into prior_expiry from public.promo_redemptions where user_id='00000000-0000-4000-8000-000000000101';
 perform public.reward_reddit_feedback('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000101');
 select expires_at into rewarded_expiry from public.promo_redemptions where user_id='00000000-0000-4000-8000-000000000101';
 if rewarded_expiry<>prior_expiry+interval '2 months' then raise exception 'reward shortened or incorrect'; end if;
 perform public.reward_reddit_feedback(null,'00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000101','Specific feedback also received by email');
 if (select expires_at from public.promo_redemptions where user_id='00000000-0000-4000-8000-000000000101')<>rewarded_expiry then raise exception 'duplicate reward across email/site'; end if;
 if has_function_privilege('authenticated','public.reward_reddit_feedback(uuid,uuid,uuid,text)','EXECUTE') then raise exception 'reward exposed to learner'; end if;
end $$;
do $$ declare received bigint; begin
 select feedback_count into received from public.reddit_feedback_summary(array['00000000-0000-4000-8000-000000000101'::uuid]);
 if received<>1 then raise exception 'cohort feedback tracking incorrect'; end if;
end $$;
select public.redeem_reddit_month('00000000-0000-4000-8000-000000000102','manual@example.invalid',false);
select public.reward_reddit_feedback(null,'00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102','Specific emailed feedback from a coupon user');
do $$ begin
 if (select count(*) from public.product_feedback where user_id='00000000-0000-4000-8000-000000000102' and source='email')<>1 then raise exception 'email reward did not record received feedback'; end if;
end $$;
rollback;
