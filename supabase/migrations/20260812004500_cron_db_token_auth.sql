-- Shared cron auth token. Readable by postgres (cron) and service_role (edge).
-- Not exposed to anon/authenticated.

create table if not exists public.app_cron_token (
  id int primary key default 1 check (id = 1),
  token text not null,
  updated_at timestamptz not null default now()
);

revoke all on table public.app_cron_token from public;
revoke all on table public.app_cron_token from anon;
revoke all on table public.app_cron_token from authenticated;
grant select on table public.app_cron_token to service_role;

alter table public.app_cron_token enable row level security;

insert into public.app_cron_token (id, token)
values (1, encode(gen_random_bytes(32), 'hex'))
on conflict (id) do update
  set token = excluded.token,
      updated_at = now();

-- Reschedule jobs to send this token via x-cron-secret (pg_net-safe).
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
      (select token from public.app_cron_token where id = 1)
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
      (select token from public.app_cron_token where id = 1)
    ),
    body := jsonb_build_object('mode', 'cron')
  ) as request_id;
  $job$
);

select jobid, jobname, schedule, active from cron.job order by jobid;
select id, length(token) as token_len, updated_at from public.app_cron_token;
