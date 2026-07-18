-- Daily morning digest preferences on household members
alter table public.household_members
  add column if not exists daily_digest_enabled boolean not null default true,
  add column if not exists daily_digest_time time not null default '07:00:00',
  add column if not exists timezone text not null default 'Europe/Oslo',
  add column if not exists daily_digest_last_sent_on date;

comment on column public.household_members.daily_digest_enabled is 'Send a morning overview push for today''s events/list';
comment on column public.household_members.daily_digest_time is 'Local time of day to send the digest';
comment on column public.household_members.timezone is 'IANA timezone used for digest scheduling';
comment on column public.household_members.daily_digest_last_sent_on is 'Last local date a digest was sent (dedupe)';
