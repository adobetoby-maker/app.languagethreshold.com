-- Keep bearer-capability push data inaccessible even if table grants change in
-- a later migration. The server-side service role bypasses RLS intentionally.
create policy "Push subscriptions deny client access"
  on public.push_subscriptions
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Push preferences deny client access"
  on public.push_reminder_preferences
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);
