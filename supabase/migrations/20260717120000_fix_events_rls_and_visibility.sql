-- Fix event INSERT/SELECT RLS, visibility enforcement, and reliable create/sync RPCs.
-- Root causes addressed:
-- 1) events_select_policy (household-wide) OR'd with events_select_visible → everyone saw everything
-- 2) INSERT WITH CHECK subquery on household_members could fail under RLS
-- 3) insert().select() RETURNING blocked when SELECT policy rejected the new row
-- 4) event_visible_members junction writes need SECURITY DEFINER sync

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_own_active_household_member_row(
  p_member_id uuid,
  p_household_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.id = p_member_id
      and hm.household_id = p_household_id
      and hm.user_id = auth.uid()
      and hm.is_active = true
  );
$$;

create or replace function public.can_current_user_view_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select hm.id, hm.household_id
    from public.household_members hm
    where hm.user_id = auth.uid()
      and hm.is_active = true
  ),
  ev as (
    select e.*
    from public.events e
    where e.id = p_event_id
  )
  select exists (
    select 1
    from ev
    join me on me.household_id = ev.household_id
    where
      ev.visibility_type = 'all_members'
      or (ev.visibility_type = 'private' and ev.owner_member_id = me.id)
      or (
        ev.visibility_type = 'selected_members'
        and (
          ev.owner_member_id = me.id
          or exists (
            select 1
            from public.event_visible_members evm
            where evm.event_id = ev.id
              and evm.member_id = me.id
          )
        )
      )
  );
$$;

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
    join public.household_members hm
      on hm.id = e.owner_member_id
    where e.id = p_event_id
      and hm.user_id = auth.uid()
      and hm.is_active = true
  );
$$;

grant execute on function public.is_own_active_household_member_row(uuid, uuid) to authenticated;
grant execute on function public.can_current_user_view_event(uuid) to authenticated;
grant execute on function public.can_current_user_edit_event(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- events policies — single SELECT policy with visibility helper
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;

drop policy if exists "events_select_policy" on public.events;
drop policy if exists "events_select_visible" on public.events;
drop policy if exists events_insert_member on public.events;
drop policy if exists "events_insert_policy" on public.events;
drop policy if exists "events_update_policy" on public.events;
drop policy if exists "events_delete_policy" on public.events;

create policy "events_select_visible"
on public.events
for select
to authenticated
using (public.can_current_user_view_event(id));

create policy "events_insert_policy"
on public.events
for insert
to authenticated
with check (
  public.is_own_active_household_member_row(owner_member_id, household_id)
);

create policy "events_update_policy"
on public.events
for update
to authenticated
using (
  public.can_current_user_edit_event(id)
)
with check (
  public.can_current_user_edit_event(id)
);

create policy "events_delete_policy"
on public.events
for delete
to authenticated
using (
  public.can_current_user_edit_event(id)
);

grant select, insert, update, delete on public.events to authenticated;

-- ---------------------------------------------------------------------------
-- event_visible_members policies
-- ---------------------------------------------------------------------------

alter table public.event_visible_members enable row level security;

drop policy if exists event_visible_members_select_if_event_visible on public.event_visible_members;
drop policy if exists event_visible_members_manage_by_event_owner on public.event_visible_members;

create policy event_visible_members_select_if_event_visible
on public.event_visible_members
for select
to authenticated
using (public.can_current_user_view_event(event_id));

create policy event_visible_members_manage_by_event_owner
on public.event_visible_members
for all
to authenticated
using (public.can_current_user_edit_event(event_id))
with check (public.can_current_user_edit_event(event_id));

grant select, insert, update, delete on public.event_visible_members to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: create event — resolves owner_member_id server-side from auth.uid()
-- ---------------------------------------------------------------------------

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
  p_category_label_override text default null
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
    category_label_override
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
    p_category_label_override
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.create_event_for_current_member(
  uuid, text, date, date, text, text, text, text, text, text, text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: sync visible members for selected_members events
-- ---------------------------------------------------------------------------

create or replace function public.sync_event_visible_members(
  p_event_id uuid,
  p_member_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_current_user_edit_event(p_event_id) then
    raise exception 'Not allowed to edit this event';
  end if;

  delete from public.event_visible_members
  where event_id = p_event_id;

  if p_member_ids is not null and coalesce(array_length(p_member_ids, 1), 0) > 0 then
    insert into public.event_visible_members (event_id, member_id)
    select p_event_id, mid
    from unnest(p_member_ids) as mid;
  end if;
end;
$$;

grant execute on function public.sync_event_visible_members(uuid, uuid[]) to authenticated;

notify pgrst, 'reload schema';
