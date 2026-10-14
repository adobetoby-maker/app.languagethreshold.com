-- Restore the own-profile INSERT rule required by client upserts.
-- Some environments pre-created profiles through a signup trigger but omitted
-- this policy. Upserts still check INSERT even when the row already exists.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles
      FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
  END IF;
END $$;
