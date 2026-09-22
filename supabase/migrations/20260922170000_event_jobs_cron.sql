-- Applied to production 2026-09-22 via Supabase MCP (name: event_jobs_cron).
-- Every 10 minutes: GET /api/cron/event-jobs (reminders, PSM CRM retries, daily dispensary refresh).
-- Auth header comes from Vault secret 'event_jobs_cron_secret' (= Vercel CRON_SECRET), created by Ambrose.
-- Rollback: select cron.unschedule('event-jobs');
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('event-jobs', '*/10 * * * *', $job$
  select net.http_get(
    url := 'https://privatestock.co/api/cron/event-jobs',
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'event_jobs_cron_secret'), 'unset')),
    timeout_milliseconds := 300000
  );
$job$);
