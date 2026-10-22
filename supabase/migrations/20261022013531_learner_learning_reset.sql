-- Learning data only: identity, billing, purchases and official/team assessments remain.
alter table public.library_books add column if not exists learning_reset_id uuid;

create or replace function public.guard_learning_reset_profile() returns trigger
language plpgsql set search_path = '' as $$
declare old_reset jsonb; new_reset jsonb;
begin
  old_reset := old.data->'learningResetId'; new_reset := new.data->'learningResetId';
  if current_setting('lt.reset_learning', true) = new.id::text then return new; end if;
  if new.data ?| array['xp','streak','core30Log','userVocab','lessonProgress','vocabByLanguage'] then
    if old_reset is not null and old_reset <> 'null'::jsonb and old_reset is distinct from new_reset then
      raise exception 'Learning progress was reset. Reload before saving.' using errcode='P0001';
    end if;
    -- Keep billing/access metadata when the client submits its learning snapshot.
    new.data := (coalesce(old.data,'{}'::jsonb) - array['__v','learningResetId','selectedLanguage','nativeLanguage','darkMode','currentTab','xp','streak','lastActiveDate','lastPracticeDate','lastPracticeDateByLanguage','practiceStreak','practiceReminderLanguage','level','tier','achievements','userNotes','wordsLookedUp','notesSaved','tutorMessages','conversationExchanges','lessonsCompleted','customTextsAdded','lettersWritten','cultureRead','languagesUsed','cefrLevelsCompleted','speakSecondsByLang','xpSessions','challengesCleared','recentChallenges','purchasedModules','activeModuleId','moduleAssignments','vocabAnswers','userVocab','vocabByLanguage','vocabRevisionsByLanguage','vocabLang','patternProgress','vocabSM2','onboardingComplete','lessonProgress','core30Log','favoriteTeam','departureDate','nextTrips','speakingFocusByLanguage']) || new.data;
  else
    -- Billing/access-only patches preserve learning data and cannot drop its reset boundary.
    new.data := coalesce(old.data,'{}'::jsonb) || new.data;
    if old_reset is not null and old_reset <> 'null'::jsonb then
      new.data := jsonb_set(new.data,'{learningResetId}',old_reset,true);
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_learning_reset_profile() from public, anon, authenticated;
create trigger guard_learning_reset_profile before update on public.profiles
for each row execute function public.guard_learning_reset_profile();

create or replace function public.guard_learning_reset_book() returns trigger
language plpgsql set search_path = '' as $$
declare reset_id text;
begin
  select data->>'learningResetId' into reset_id from public.profiles where id = new.user_id for share;
  if reset_id is distinct from new.learning_reset_id::text then
    raise exception 'Learning progress was reset. Reload before saving Reader books.' using errcode='P0001';
  end if;
  return new;
end $$;
revoke all on function public.guard_learning_reset_book() from public, anon, authenticated;
create trigger guard_learning_reset_book before insert or update on public.library_books
for each row execute function public.guard_learning_reset_book();

create or replace function public.reset_my_learning_data(confirmation text, request_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); reset_id uuid := request_id; saved jsonb;
begin
  if actor is null then raise exception 'Sign in before resetting your learning data.' using errcode='42501'; end if;
  if request_id is null then raise exception 'Reset request is required.' using errcode='22023'; end if;
  if confirmation is distinct from 'RESET' then raise exception 'Type RESET to confirm.' using errcode='22023'; end if;
  insert into public.profiles(id,data) values(actor,'{}'::jsonb) on conflict(id) do nothing;
  select data into saved from public.profiles where id=actor for update;
  if saved->>'learningResetId' = request_id::text then return jsonb_build_object('resetId',request_id,'profile',saved); end if;
  perform set_config('lt.reset_learning', actor::text, true);
  delete from public.library_books where user_id=actor;
  update public.profiles set data=(coalesce(data,'{}'::jsonb) - array['xp','streak','lastActiveDate','lastPracticeDate','lastPracticeDateByLanguage','practiceStreak','practiceReminderLanguage','tier','achievements','userNotes','wordsLookedUp','notesSaved','tutorMessages','conversationExchanges','lessonsCompleted','customTextsAdded','lettersWritten','cultureRead','languagesUsed','cefrLevelsCompleted','speakSecondsByLang','xpSessions','challengesCleared','recentChallenges','vocabAnswers','userVocab','vocabByLanguage','vocabRevisionsByLanguage','vocabLang','patternProgress','vocabSM2','onboardingComplete','lessonProgress','core30Log','speakingFocusByLanguage']) || jsonb_build_object('learningResetId',reset_id,'currentTab','core30','level','Beginner','onboardingComplete',false)
  where id=actor returning data into saved;
  perform set_config('lt.reset_learning', '', true);
  return jsonb_build_object('resetId',reset_id,'profile',saved);
end $$;
revoke all on function public.reset_my_learning_data(text,uuid) from public, anon;
grant execute on function public.reset_my_learning_data(text,uuid) to authenticated;
