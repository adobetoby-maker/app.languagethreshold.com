-- Run only inside BEGIN + the pending migration + this fixture + ROLLBACK.
-- Set lt.qa.actor to an existing dedicated qa-*@example.invalid test identity.
do $test$
declare actor uuid := current_setting('lt.qa.actor')::uuid;
 req uuid := gen_random_uuid(); result jsonb; before_data jsonb; book uuid := gen_random_uuid(); rejected boolean := false;
begin
 if not exists(select 1 from auth.users where id=actor and email like 'qa-%@example.invalid') then raise exception 'Dedicated QA actor required'; end if;
 if has_function_privilege('anon','public.reset_my_learning_data(text,uuid)','execute') or not has_function_privilege('authenticated','public.reset_my_learning_data(text,uuid)','execute') then raise exception 'Incorrect reset permissions'; end if;
 update public.profiles set data=coalesce(data,'{}'::jsonb)||'{"xp":42,"subscription_status":"active","stripe_customer_id":"qa-billing","purchasedModules":["qa-module"],"userNotes":[{"id":"qa-note"}]}'::jsonb where id=actor;
 update public.profiles set data='{"before_reset_meta":true}'::jsonb where id=actor;
 select data into before_data from public.profiles where id=actor;
 if before_data->>'xp'<>'42' or before_data->>'subscription_status'<>'active' then raise exception 'Metadata patch erased progress before reset'; end if;
 insert into public.library_books(id,user_id,title,language,target_label,chapters,learning_reset_id) values(book,actor,'QA rollback before reset','Spanish','Spanish','[]'::jsonb,(before_data->>'learningResetId')::uuid);
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.reset_my_learning_data('RESET',req); exception when insufficient_privilege then rejected:=true; end;
 if not rejected then raise exception 'Missing identity accepted'; end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 rejected:=false;
 begin perform public.reset_my_learning_data('wrong',req); exception when invalid_parameter_value then rejected:=true; end;
 if not rejected then raise exception 'Missing confirmation accepted'; end if;
 result:=public.reset_my_learning_data('RESET',req);
 if result->>'resetId'<>req::text then raise exception 'Reset ID mismatch'; end if;
 if (result->'profile') ?| array['xp','userVocab','core30Log','userNotes'] then raise exception 'Learning fields retained'; end if;
 if (result->'profile')->'purchasedModules' is distinct from before_data->'purchasedModules' or (result->'profile')->>'subscription_status'<>'active' or (result->'profile')->>'stripe_customer_id'<>'qa-billing' then raise exception 'Access or billing changed'; end if;
 if exists(select 1 from public.library_books where user_id=actor) then raise exception 'Books retained'; end if;
 rejected:=false;
 begin update public.profiles set data=before_data||'{"xp":999}'::jsonb where id=actor;
 exception when raise_exception then if sqlerrm like 'Learning progress was reset%' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'Stale profile writer accepted'; end if;
 rejected:=false;
 begin insert into public.library_books(id,user_id,title,language,target_label,chapters) values(book,actor,'QA stale rollback','Spanish','Spanish','[]'::jsonb);
 exception when raise_exception then if sqlerrm like 'Learning progress was reset%' then rejected:=true; else raise; end if; end;
 if not rejected then raise exception 'Stale book writer accepted'; end if;
 insert into public.library_books(id,user_id,title,language,target_label,chapters,learning_reset_id) values(book,actor,'QA new rollback','Spanish','Spanish','[]'::jsonb,req);
 update public.profiles set data=data||'{"xp":7}'::jsonb where id=actor;
 result:=public.reset_my_learning_data('RESET',req);
 if (result->'profile'->>'xp')::int<>7 or not exists(select 1 from public.library_books where id=book) then raise exception 'Retry deleted new data'; end if;
 update public.profiles set data='{"qa_metadata_only":true,"learningResetId":null}'::jsonb where id=actor;
 if not exists(select 1 from public.profiles where id=actor and data->>'learningResetId'=req::text and (data->>'xp')::int=7) then raise exception 'Metadata writer erased reset boundary'; end if;
end $test$;
