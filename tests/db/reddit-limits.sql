-- Synthetic fixture only, after both Reddit migrations.
begin;
do $$ declare learner uuid; first_learner uuid; granted integer; allowed boolean; begin
 for n in 1..100 loop
  learner:=gen_random_uuid();
  insert into auth.users(id,email) values(learner,'limit-'||n||'@example.invalid');
  perform public.redeem_reddit_month(learner,'limit-'||n||'@example.invalid',false);
  if n=1 then first_learner:=learner; end if;
 end loop;
 learner:=gen_random_uuid();insert into auth.users(id,email) values(learner,'over-cap@example.invalid');
 begin
  perform public.redeem_reddit_month(learner,'over-cap@example.invalid',false);
  raise exception '101st tester was admitted';
 exception when others then
  if sqlerrm<>'Reddit tester places are full' then raise; end if;
 end;
 -- Retry still works with all places taken.
 perform public.redeem_reddit_month(first_learner,'limit-1@example.invalid',true);
 if (select count(*) from public.promo_redemptions)<>100 then raise exception 'claim cap incorrect'; end if;
 update public.promo_redemptions set expires_at=now()-interval '1 second' where user_id=first_learner;
 if public.reserve_reddit_generation(first_learner,1) then raise exception 'expired access admitted'; end if;
 update public.promo_redemptions set expires_at=now()+interval '1 month' where user_id=first_learner;
 for learner in select user_id from public.promo_redemptions loop
  if not public.reserve_reddit_generation(learner,10000000) then raise exception '$10 allocation rejected early'; end if;
  if public.reserve_reddit_generation(learner,1) then raise exception 'individual budget exceeded'; end if;
 end loop;
 if (select reserved_microusd from public.promo_campaign_budget where code='REDDITMONTH')<>1000000000 then raise exception 'campaign total incorrect'; end if;
 if (select sum(budget_reserved_microusd) from public.promo_redemptions)<>1000000000 then raise exception 'wallet totals incorrect'; end if;
 perform public.reward_reddit_feedback(null,first_learner,first_learner,'Specific useful feedback for the campaign review');
 if (select budget_reserved_microusd from public.promo_redemptions where user_id=first_learner)<>10000000 then raise exception 'reward reset the usage budget'; end if;
 if has_function_privilege('authenticated','public.reserve_reddit_generation(uuid,bigint)','EXECUTE') then raise exception 'budget RPC exposed'; end if;
end $$;
rollback;
