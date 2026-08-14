-- Vercel Hobby permits only daily crons. Supabase Cron provides the hourly
-- cadence needed to honor each learner's selected local reminder hour.
-- The shared authorization token is provisioned separately in Supabase Vault
-- and Vercel's encrypted production environment; it is never committed here.
do $migration$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'language-threshold-practice-reminders-hourly';

  if exists (
    select 1
    from vault.decrypted_secrets
    where name = 'language_threshold_push_cron_secret'
  ) then
    perform cron.schedule(
      'language-threshold-practice-reminders-hourly',
      '0 * * * *',
      $job$
        select net.http_get(
          url := 'https://app.languagethreshold.com/api/push-cron',
          headers := jsonb_build_object(
            'Authorization',
            'Bearer ' || (
              select decrypted_secret
              from vault.decrypted_secrets
              where name = 'language_threshold_push_cron_secret'
            )
          ),
          timeout_milliseconds := 10000
        ) as request_id;
      $job$
    );
  end if;
end
$migration$;
