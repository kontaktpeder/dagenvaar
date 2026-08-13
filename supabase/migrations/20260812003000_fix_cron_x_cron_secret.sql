-- Fix cron 401: pg_net strips Authorization headers.
-- Send Vault service_role_key via x-cron-secret instead.
-- Requires edge functions that accept x-cron-secret === service role
-- (deploy send-daily-digests + send-countdown-reminders first).
--
-- Vault secret `service_role_key` must already exist (from previous fix).
-- If missing, create it first with your Settings → API → service_role key.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $check$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'service_role_key' limit 1
  ) then
    raise exception 'Vault secret service_role_key missing. Create it with your service_role key first.';
  end if;
end
$check$;

do $do$
begin
  if exists (select 1 from cron.job where jobname = 'send-daily-digests-every-15m') then
    perform cron.unschedule('send-daily-digests-every-15m');
  end if;
  if exists (select 1 from cron.job where jobname = 'send-countdown-reminders-every-15m') then
    perform cron.unschedule('send-countdown-reminders-every-15m');
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
      (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := jsonb_build_object('mode', 'cron')
  ) as request_id;
  $job$
);

select cron.schedule(
  'send-countdown-reminders-every-15m',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := 'https://tvaggvidklnsgxsxxnde.supabase.co/functions/v1/send-countdown-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := jsonb_build_object('mode', 'cron')
  ) as request_id;
  $job$
);

select jobid, jobname, schedule, active from cron.job order by jobid;
