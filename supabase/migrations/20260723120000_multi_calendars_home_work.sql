-- Multi-calendar: home/work kinds, cross-calendar visibility overlays, multi-membership RPCs.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.households
  add column if not exists kind text not null default 'home';

alter table public.households
  add column if not exists show_in_other_calendars boolean not null default false;

alter table public.events
  add column if not exists hide_from_other_calendars boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'households_kind_check'
  ) then
    alter table public.households
      add constraint households_kind_check
      check (kind in ('home', 'work'));
  end if;
end $$;

-- Existing calendars stay home; work defaults to showing in other calendars when created.
comment on column public.households.kind is 'Scalable calendar kind; UI currently offers home|work only';
comment on column public.households.show_in_other_calendars is 'When true, members'' visible events appear in their other calendars as name+time';
comment on column public.events.hide_from_other_calendars is 'Per-event opt-out from show_in_other_calendars';

-- ---------------------------------------------------------------------------
-- create_household_with_owner — multi-membership + kind
-- ---------------------------------------------------------------------------

drop function if exists public.create_household_with_owner(text, text, text);

create or replace function public.create_household_with_owner(
  p_name text,
  p_display_name text,
  p_color_token text default 'pastel-blue',
  p_kind text default 'home',
  p_show_in_other_calendars boolean default null
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

  insert into public.households (name, created_by, kind, show_in_other_calendars)
  values (
    coalesce(nullif(trim(p_name), ''), case when v_kind = 'work' then 'Jobb' else 'Vårt hjem' end),
    v_user_id,
    v_kind,
    v_show
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
    coalesce(nullif(trim(p_display_name), ''), 'Meg'),
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

-- ---------------------------------------------------------------------------
-- join_household_by_code — allow additional memberships
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

  insert into public.household_members (
    household_id,
    user_id,
    role,
    display_name,
    color_token,
    is_active
  )
  values (
    v_household_id,
    v_user_id,
    'member',
    coalesce(nullif(trim(p_display_name), ''), 'Meg'),
    coalesce(nullif(trim(p_color_token), ''), 'pastel-blue'),
    true
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

-- ---------------------------------------------------------------------------
-- create_household_invite — scoped to a calendar
-- ---------------------------------------------------------------------------

drop function if exists public.create_household_invite();

create or replace function public.create_household_invite(
  p_household_id uuid default null
)
returns table (
  invite_id uuid,
  code text,
  household_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_household_id uuid;
  v_code text;
  v_expires_at timestamptz;
  v_invite_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_household_id is not null then
    v_household_id := p_household_id;
  else
    select hm.household_id
    into v_household_id
    from public.household_members hm
    where hm.user_id = v_user_id
      and hm.role = 'owner'
      and hm.is_active = true
    order by hm.created_at asc
    limit 1;
  end if;

  if v_household_id is null then
    raise exception 'Only owners can create invites';
  end if;

  if not exists (
    select 1
    from public.household_members hm
    where hm.household_id = v_household_id
      and hm.user_id = v_user_id
      and hm.role = 'owner'
      and hm.is_active = true
  ) then
    raise exception 'Only owners can create invites';
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4))
            || '-'
            || upper(substr(md5(clock_timestamp()::text || random()::text), 1, 4));
  v_expires_at := now() + interval '7 days';

  insert into public.household_invites (household_id, code, created_by, expires_at)
  values (v_household_id, v_code, v_user_id, v_expires_at)
  returning id into v_invite_id;

  return query
  select v_invite_id, v_code, v_household_id, v_expires_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_household — scoped to a calendar
-- ---------------------------------------------------------------------------

drop function if exists public.leave_household();

create or replace function public.leave_household(
  p_household_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_member public.household_members;
  v_household_id uuid;
  v_other_count int;
  v_other_owner_count int;
  v_new_owner_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Du må være innlogget for å forlate kalenderen.';
  end if;

  if p_household_id is not null then
    select * into v_member
    from public.household_members
    where user_id = v_user_id
      and household_id = p_household_id
      and is_active = true
    limit 1;
  else
    select * into v_member
    from public.household_members
    where user_id = v_user_id and is_active = true
    order by created_at asc
    limit 1;
  end if;

  if v_member.id is null then
    raise exception 'Du er ikke medlem av denne kalenderen.';
  end if;

  v_household_id := v_member.household_id;

  select count(*) into v_other_count
  from public.household_members
  where household_id = v_household_id
    and is_active = true
    and id <> v_member.id;

  if v_other_count = 0 then
    delete from public.households where id = v_household_id;
    return jsonb_build_object('status', 'household_deleted', 'household_id', v_household_id);
  end if;

  if v_member.role = 'owner' then
    select count(*) into v_other_owner_count
    from public.household_members
    where household_id = v_household_id
      and is_active = true
      and id <> v_member.id
      and role = 'owner';

    if v_other_owner_count = 0 then
      select id into v_new_owner_id
      from public.household_members
      where household_id = v_household_id
        and is_active = true
        and id <> v_member.id
      order by created_at asc
      limit 1;

      update public.household_members
      set role = 'owner'
      where id = v_new_owner_id;
    end if;
  end if;

  update public.household_members
  set is_active = false
  where id = v_member.id;

  return jsonb_build_object('status', 'left', 'household_id', v_household_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Overlay events: members' other calendars → name + time in this calendar
-- ---------------------------------------------------------------------------

create or replace function public.get_overlay_events_for_household(
  p_household_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  id uuid,
  source_household_id uuid,
  source_household_name text,
  source_household_kind text,
  event_date date,
  end_date date,
  day_part text,
  day_part_start text,
  day_part_end text,
  start_time time,
  end_time time,
  source_member_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = auth.uid()
      and hm.is_active = true
  ) then
    raise exception 'Not a member of this calendar';
  end if;

  return query
  select distinct on (e.id)
    e.id,
    src.id as source_household_id,
    src.name as source_household_name,
    src.kind as source_household_kind,
    e.event_date,
    e.end_date,
    e.day_part,
    e.day_part_start,
    e.day_part_end,
    e.start_time,
    e.end_time,
    bridge.id as source_member_id
  from public.household_members viewer_peers
  join public.household_members bridge
    on bridge.user_id = viewer_peers.user_id
   and bridge.is_active = true
   and bridge.household_id <> p_household_id
  join public.households src
    on src.id = bridge.household_id
   and src.show_in_other_calendars = true
  join public.events e
    on e.household_id = src.id
   and e.hide_from_other_calendars = false
   and e.event_date <= p_end_date
   and coalesce(e.end_date, e.event_date) >= p_start_date
  where viewer_peers.household_id = p_household_id
    and viewer_peers.is_active = true
    and (
      e.visibility_type = 'all_members'
      or (e.visibility_type = 'private' and e.owner_member_id = bridge.id)
      or (
        e.visibility_type = 'selected_members'
        and (
          e.owner_member_id = bridge.id
          or exists (
            select 1
            from public.event_visible_members evm
            where evm.event_id = e.id
              and evm.member_id = bridge.id
          )
        )
      )
    )
  order by e.id, e.event_date, e.start_time nulls last;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_event_for_current_member — hide_from_other_calendars
-- ---------------------------------------------------------------------------

drop function if exists public.create_event_for_current_member(
  uuid, text, date, date, text, text, text, text, text, text, text, text, text, text
);

create or replace function public.create_event_for_current_member(
  p_household_id uuid,
  p_title text,
  p_event_date date,
  p_end_date date default null,
  p_day_part text default 'morning',
  p_day_part_start text default null,
  p_day_part_end text default null,
  p_start_time text default null,
  p_end_time text default null,
  p_visibility_type text default 'all_members',
  p_location text default null,
  p_notes text default null,
  p_category text default 'other',
  p_category_label_override text default null,
  p_hide_from_other_calendars boolean default false
)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_row public.events;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select hm.id
  into v_member_id
  from public.household_members hm
  where hm.user_id = auth.uid()
    and hm.household_id = p_household_id
    and hm.is_active = true
  order by hm.created_at asc
  limit 1;

  if v_member_id is null then
    raise exception 'Not an active member of this household';
  end if;

  insert into public.events (
    household_id,
    owner_member_id,
    title,
    event_date,
    end_date,
    day_part,
    day_part_start,
    day_part_end,
    start_time,
    end_time,
    visibility_type,
    location,
    notes,
    category,
    category_label_override,
    hide_from_other_calendars
  ) values (
    p_household_id,
    v_member_id,
    p_title,
    p_event_date,
    coalesce(p_end_date, p_event_date),
    p_day_part,
    p_day_part_start,
    p_day_part_end,
    nullif(p_start_time, '')::time,
    nullif(p_end_time, '')::time,
    p_visibility_type,
    p_location,
    p_notes,
    p_category,
    p_category_label_override,
    coalesce(p_hide_from_other_calendars, false)
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_household_with_owner(text, text, text, text, boolean) to authenticated;
grant execute on function public.join_household_by_code(text, text, text) to authenticated;
grant execute on function public.create_household_invite(uuid) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
grant execute on function public.get_overlay_events_for_household(uuid, date, date) to authenticated;
grant execute on function public.create_event_for_current_member(
  uuid, text, date, date, text, text, text, text, text, text, text, text, text, text, boolean
) to authenticated;

notify pgrst, 'reload schema';
