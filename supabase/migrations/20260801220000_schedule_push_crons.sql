-- Schedule the push edge functions. Without these cron jobs nothing ever
-- calls send-daily-digests / send-countdown-reminders automatically —
-- only the in-app "send now" button worked.
--
-- NOTE: Prefer 20260812002000_fix_cron_auth_bearer.sql — auth via
-- Vault service_role_key (Bearer), which matches what the edge functions
-- already accept. The x-cron-secret / CRON_SECRET path often 401s when
-- Vault and Edge secrets drift.

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
