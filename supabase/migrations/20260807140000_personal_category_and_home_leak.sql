-- Allow "personal" on work calendars; default leak for home as well as work.

alter table public.events drop constraint if exists events_category_allowed_values;

alter table public.events
  add constraint events_category_allowed_values
  check (
    category in (
      -- home
      'couple',
      'work',
      'social',
      'celebration',
      'important',
      'travel',
      'other',
      -- work (WORK core)
      'meeting',
      'production',
      'development',
      'admin',
      'personal',
      -- legacy work keys still readable in the app
      'client',
      'deadline',
      'focus'
    )
  );

-- Existing home memberships: enable leak so home events can appear on work.
update public.household_members hm
set show_in_other_calendars = true
from public.households h
where h.id = hm.household_id
  and hm.show_in_other_calendars = false
  and coalesce(h.kind, 'home') = 'home';

update public.households
set show_in_other_calendars = true
where show_in_other_calendars = false
  and coalesce(kind, 'home') = 'home';

-- ---------------------------------------------------------------------------
-- create_household_with_owner — leak default on for all kinds
-- ---------------------------------------------------------------------------

drop function if exists public.create_household_with_owner(text, text, text);
drop function if exists public.create_household_with_owner(text, text, text, text, boolean);
drop function if exists public.create_household_with_owner(text, text, text, text, boolean, text);

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

  v_show := coalesce(p_show_in_other_calendars, true);

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
    is_active,
    show_in_other_calendars
  )
  values (
    v_household.id,
    v_user_id,
    'owner',
    coalesce(nullif(trim(p_display_name), ''), 'Me'),
    coalesce(nullif(trim(p_color_token), ''), 'pastel-blue'),
    true,
    v_show
  )
  on conflict (household_id, user_id) do update
    set is_active = true,
        role = excluded.role,
        display_name = excluded.display_name,
        color_token = excluded.color_token,
        show_in_other_calendars = excluded.show_in_other_calendars;

  return v_household;
end;
$$;

grant execute on function public.create_household_with_owner(text, text, text, text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- join_household_by_code — leak default on for all kinds
-- ---------------------------------------------------------------------------

create or replace function public.join_household_by_code(
  p_invite_code text,
  p_display_name text,
  p_color_token text default 'pastel-blue'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_household_id uuid;
  v_show boolean;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select hi.household_id
  into v_household_id
  from public.household_invites hi
  where upper(hi.code) = upper(trim(p_invite_code))
    and hi.used_at is null
    and (hi.expires_at is null or hi.expires_at > now())
  order by hi.created_at desc
  limit 1;

  if v_household_id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  if exists (
    select 1
    from public.household_members hm
    where hm.household_id = v_household_id
      and hm.user_id = v_user_id
      and hm.is_active = true
  ) then
    raise exception 'Du er allerede medlem av denne kalenderen';
  end if;

  v_show := true;

  insert into public.household_members (
    household_id,
    user_id,
    role,
    display_name,
    color_token,
    is_active,
    show_in_other_calendars
  )
  values (
    v_household_id,
    v_user_id,
    'member',
    coalesce(nullif(trim(p_display_name), ''), 'Meg'),
    coalesce(nullif(trim(p_color_token), ''), 'pastel-blue'),
    true,
    v_show
  )
  on conflict (household_id, user_id) do update
    set is_active = true,
        display_name = excluded.display_name,
        color_token = excluded.color_token;

  update public.household_invites
  set used_at = now(), used_by = v_user_id
  where upper(code) = upper(trim(p_invite_code))
    and used_at is null;

  return v_household_id;
end;
$$;

grant execute on function public.join_household_by_code(text, text, text) to authenticated;
