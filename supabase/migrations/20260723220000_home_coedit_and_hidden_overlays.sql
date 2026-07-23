-- Home co-edit for shared events + per-viewer mute of overlay events.

-- ---------------------------------------------------------------------------
-- can_current_user_edit_event: owner always; home members can edit non-private
-- ---------------------------------------------------------------------------

create or replace function public.can_current_user_edit_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.events e
    join public.households h
      on h.id = e.household_id
    join public.household_members me
      on me.household_id = e.household_id
     and me.user_id = auth.uid()
     and me.is_active = true
    where e.id = p_event_id
      and (
        e.owner_member_id = me.id
        or (
          h.kind = 'home'
          and e.visibility_type is distinct from 'private'
          and (
            e.visibility_type = 'all_members'
            or (
              e.visibility_type = 'selected_members'
              and exists (
                select 1
                from public.event_visible_members evm
                where evm.event_id = e.id
                  and evm.member_id = me.id
              )
            )
          )
        )
      )
  );
$$;

grant execute on function public.can_current_user_edit_event(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Viewer-side hide of overlays (mute in this calendar only)
-- ---------------------------------------------------------------------------

create table if not exists public.member_hidden_overlay_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.household_members (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (member_id, event_id)
);

create index if not exists member_hidden_overlay_events_member_idx
  on public.member_hidden_overlay_events (member_id);

create index if not exists member_hidden_overlay_events_event_idx
  on public.member_hidden_overlay_events (event_id);

comment on table public.member_hidden_overlay_events is
  'Per-viewer mute: do not show this source event as an overlay in the calendar of member_id';

alter table public.member_hidden_overlay_events enable row level security;

drop policy if exists member_hidden_overlay_select_own on public.member_hidden_overlay_events;
create policy member_hidden_overlay_select_own
  on public.member_hidden_overlay_events for select to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.id = member_id
        and hm.user_id = auth.uid()
        and hm.is_active = true
    )
  );

drop policy if exists member_hidden_overlay_insert_own on public.member_hidden_overlay_events;
create policy member_hidden_overlay_insert_own
  on public.member_hidden_overlay_events for insert to authenticated
  with check (
    exists (
      select 1 from public.household_members hm
      where hm.id = member_id
        and hm.user_id = auth.uid()
        and hm.is_active = true
    )
  );

drop policy if exists member_hidden_overlay_delete_own on public.member_hidden_overlay_events;
create policy member_hidden_overlay_delete_own
  on public.member_hidden_overlay_events for delete to authenticated
  using (
    exists (
      select 1 from public.household_members hm
      where hm.id = member_id
        and hm.user_id = auth.uid()
        and hm.is_active = true
    )
  );

grant select, insert, delete on public.member_hidden_overlay_events to authenticated;

-- ---------------------------------------------------------------------------
-- Overlay RPC: exclude events muted by the current viewer in this calendar
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
-- hide / unhide overlay for current viewer
-- ---------------------------------------------------------------------------

create or replace function public.hide_overlay_event_for_viewer(
  p_viewer_household_id uuid,
  p_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select hm.id into v_member_id
  from public.household_members hm
  where hm.household_id = p_viewer_household_id
    and hm.user_id = auth.uid()
    and hm.is_active = true
  limit 1;

  if v_member_id is null then
    raise exception 'Not a member of this calendar';
  end if;

  insert into public.member_hidden_overlay_events (member_id, event_id)
  values (v_member_id, p_event_id)
  on conflict (member_id, event_id) do nothing;
end;
$$;

create or replace function public.unhide_overlay_event_for_viewer(
  p_viewer_household_id uuid,
  p_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select hm.id into v_member_id
  from public.household_members hm
  where hm.household_id = p_viewer_household_id
    and hm.user_id = auth.uid()
    and hm.is_active = true
  limit 1;

  if v_member_id is null then
    raise exception 'Not a member of this calendar';
  end if;

  delete from public.member_hidden_overlay_events
  where member_id = v_member_id
    and event_id = p_event_id;
end;
$$;

grant execute on function public.hide_overlay_event_for_viewer(uuid, uuid) to authenticated;
grant execute on function public.unhide_overlay_event_for_viewer(uuid, uuid) to authenticated;
