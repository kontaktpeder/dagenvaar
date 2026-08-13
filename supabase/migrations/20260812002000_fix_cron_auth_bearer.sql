-- Fix morning digest / countdown cron 401 Unauthorized.
-- Cron already supports Authorization: Bearer <service_role>.
-- Store the service_role key in Vault once, then point both jobs at it.
--
-- BEFORE RUNNING: replace PASTE_SERVICE_ROLE_KEY below with
--   Supabase Dashboard → Settings → API → service_role (secret)
-- Then paste this whole file into the SQL Editor (or db push).

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $vault$
declare
  sid uuid;
  -- >>> PASTE your service_role key between the quotes <<<
  k text := 'PASTE_SERVICE_ROLE_KEY';
begin
  if k is null or k = '' or k = 'PASTE_SERVICE_ROLE_KEY' then
    raise exception 'Replace PASTE_SERVICE_ROLE_KEY with your service_role key from Settings → API';
  end if;

  select id into sid from vault.secrets where name = 'service_role_key' limit 1;
  if sid is null then
    perform vault.create_secret(k, 'service_role_key');
  else
    perform vault.update_secret(sid, k);
  end if;
end
$vault$;

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
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
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
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
    ),
    body := jsonb_build_object('mode', 'cron')
  ) as request_id;
  $job$
);

select jobid, jobname, schedule, active from cron.job order by jobid;
