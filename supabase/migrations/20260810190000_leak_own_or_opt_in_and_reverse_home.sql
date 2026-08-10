-- Reverse aggressive home leak backfill; leak only own events or per-member opt-in.
-- Add member_leak_events so a user can opt to show someone else's event as busy
-- in their own other calendars (never into a partner's unrelated calendars).

-- ---------------------------------------------------------------------------
-- Reverse home backfill from 20260807140000
-- ---------------------------------------------------------------------------

update public.household_members hm
set show_in_other_calendars = false
from public.households h
where h.id = hm.household_id
  and hm.show_in_other_calendars = true
  and coalesce(h.kind, 'home') = 'home';

update public.households
set show_in_other_calendars = false
where show_in_other_calendars = true
  and coalesce(kind, 'home') = 'home';

-- ---------------------------------------------------------------------------
-- Per-member opt-in to leak another member's event into my other calendars
-- ---------------------------------------------------------------------------

create table if not exists public.member_leak_events (
  member_id uuid not null references public.household_members(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, event_id)
);

comment on table public.member_leak_events is
  'When set, this member opts to show the event as busy in their other calendars (even if they do not own it)';

create index if not exists member_leak_events_event_id_idx
  on public.member_leak_events (event_id);

alter table public.member_leak_events enable row level security;

drop policy if exists member_leak_events_select_own on public.member_leak_events;
create policy member_leak_events_select_own
  on public.member_leak_events for select to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.id = member_id
        and hm.user_id = auth.uid()
        and hm.is_active = true
    )
  );

drop policy if exists member_leak_events_insert_own on public.member_leak_events;
create policy member_leak_events_insert_own
  on public.member_leak_events for insert to authenticated
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.id = member_id
        and hm.user_id = auth.uid()
        and hm.is_active = true
    )
    and exists (
      select 1
      from public.events e
      join public.household_members hm on hm.id = member_id
      where e.id = event_id
        and e.household_id = hm.household_id
    )
  );

drop policy if exists member_leak_events_delete_own on public.member_leak_events;
create policy member_leak_events_delete_own
  on public.member_leak_events for delete to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.id = member_id
        and hm.user_id = auth.uid()
        and hm.is_active = true
    )
  );

grant select, insert, delete on public.member_leak_events to authenticated;

create or replace function public.set_member_event_leak(
  p_event_id uuid,
  p_leak boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select e.household_id into v_household_id
  from public.events e
  where e.id = p_event_id;

  if v_household_id is null then
    raise exception 'Event not found';
  end if;

  select hm.id into v_member_id
  from public.household_members hm
  where hm.household_id = v_household_id
    and hm.user_id = auth.uid()
    and hm.is_active = true
  limit 1;

  if v_member_id is null then
    raise exception 'Not a member of this calendar';
  end if;

  if p_leak then
    insert into public.member_leak_events (member_id, event_id)
    values (v_member_id, p_event_id)
    on conflict do nothing;
  else
    delete from public.member_leak_events
    where member_id = v_member_id
      and event_id = p_event_id;
  end if;
end;
$$;

grant execute on function public.set_member_event_leak(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Overlay: only own events, or events the bridge member opted to leak
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
declare
  v_viewer_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select hm.id into v_viewer_member_id
  from public.household_members hm
  where hm.household_id = p_household_id
    and hm.user_id = auth.uid()
    and hm.is_active = true
  limit 1;

  if v_viewer_member_id is null then
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
   and bridge.show_in_other_calendars = true
  join public.households src
    on src.id = bridge.household_id
  join public.events e
    on e.household_id = src.id
   and e.hide_from_other_calendars = false
   and e.event_date <= p_end_date
   and coalesce(e.end_date, e.event_date) >= p_start_date
  where viewer_peers.household_id = p_household_id
    and viewer_peers.is_active = true
    and not exists (
      select 1
      from public.member_hidden_overlay_events hidden
      where hidden.member_id = v_viewer_member_id
        and hidden.event_id = e.id
    )
    and (
      e.owner_member_id = bridge.id
      or exists (
        select 1
        from public.member_leak_events mle
        where mle.event_id = e.id
          and mle.member_id = bridge.id
      )
    )
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
-- create / join: leak default only for work (home opt-in via profile)
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
  v_kind text;
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

  select h.kind into v_kind
  from public.households h
  where h.id = v_household_id;

  v_show := coalesce(v_kind, 'home') = 'work';

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
