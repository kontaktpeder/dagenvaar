-- App + calendar locales (nb | en)

alter table public.households
  add column if not exists locale text not null default 'nb';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'households_locale_check'
  ) then
    alter table public.households
      add constraint households_locale_check
      check (locale in ('nb', 'en'));
  end if;
end $$;

-- Work calendars default to English; home stays Norwegian
update public.households
set locale = 'en'
where kind = 'work' and locale = 'nb';

comment on column public.households.locale is 'UI language for this calendar (nb|en)';

-- Per-user app language (auth/profile chrome outside a calendar)
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  app_locale text not null default 'nb',
  updated_at timestamptz not null default now(),
  constraint user_preferences_app_locale_check check (app_locale in ('nb', 'en'))
);

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_preferences_upsert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
  on public.user_preferences for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.user_preferences to authenticated;

-- create_household_with_owner: set locale from kind (or explicit p_locale)
drop function if exists public.create_household_with_owner(text, text, text);
drop function if exists public.create_household_with_owner(text, text, text, text, boolean);

create or replace function public.create_household_with_owner(
  p_name text,
  p_display_name text,
  p_color_token text default 'pastel-blue',
  p_kind text default 'home',
  p_show_in_other_calendars boolean default null,
  p_locale text default null
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_household public.households;
  v_kind text;
  v_show boolean;
  v_locale text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_kind := lower(coalesce(nullif(trim(p_kind), ''), 'home'));
  if v_kind not in ('home', 'work') then
    raise exception 'Invalid calendar kind';
  end if;

  v_show := coalesce(p_show_in_other_calendars, v_kind = 'work');

  v_locale := lower(coalesce(nullif(trim(p_locale), ''), case when v_kind = 'work' then 'en' else 'nb' end));
  if v_locale not in ('nb', 'en') then
    raise exception 'Invalid locale';
  end if;

  insert into public.households (name, created_by, kind, show_in_other_calendars, locale)
  values (
    coalesce(nullif(trim(p_name), ''), case when v_kind = 'work' then 'Work' else 'Our home' end),
    v_user_id,
    v_kind,
    v_show,
    v_locale
  )
  returning * into v_household;

  insert into public.household_members (
    household_id,
    user_id,
    role,
    display_name,
    color_token,
    is_active
  )
  values (
    v_household.id,
    v_user_id,
    'owner',
    coalesce(nullif(trim(p_display_name), ''), 'Me'),
    coalesce(nullif(trim(p_color_token), ''), 'pastel-blue'),
    true
  )
  on conflict (household_id, user_id) do update
    set is_active = true,
        role = excluded.role,
        display_name = excluded.display_name,
        color_token = excluded.color_token;

  return v_household;
end;
$$;

grant execute on function public.create_household_with_owner(text, text, text, text, boolean, text) to authenticated;
