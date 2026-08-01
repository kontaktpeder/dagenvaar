-- Schedule the push edge functions. Without these cron jobs nothing ever
-- calls send-daily-digests / send-countdown-reminders automatically —
-- only the in-app "send now" button worked.
--
-- ONE-TIME SETUP (SQL editor, run once per environment):
--   select vault.create_secret('<same value as the CRON_SECRET function secret>', 'cron_secret');
-- The secret is read from Vault at runtime, so it is never stored in this file
-- or in the cron.job table.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Daily digests — every 15 min; the function itself picks members whose local
-- preferred time falls in the current 15-minute window (see isDueNow).
-- ---------------------------------------------------------------------------

do $do$
begin
  if exists (select 1 from cron.job where jobname = 'send-daily-digests-every-15m') then
    perform cron.unschedule('send-daily-digests-every-15m');
  end if;
end
$do$;

select cron.schedule(
  'send-daily-digests-every-15m',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://tvaggvidklnsgxsxxnde.supabase.co/functions/v1/send-daily-digests',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := jsonb_build_object('mode', 'cron')
  ) as request_id;
  $job$
);

-- ---------------------------------------------------------------------------
-- Countdown reminders — same auth pattern, function dedupes via log rows.
-- ---------------------------------------------------------------------------

do $do$
begin
  if exists (select 1 from cron.job where jobname = 'send-countdown-reminders-every-15m') then
    perform cron.unschedule('send-countdown-reminders-every-15m');
  end if;
end
$do$;

select cron.schedule(
  'send-countdown-reminders-every-15m',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://tvaggvidklnsgxsxxnde.supabase.co/functions/v1/send-countdown-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := jsonb_build_object('mode', 'cron')
  ) as request_id;
  $job$
);
