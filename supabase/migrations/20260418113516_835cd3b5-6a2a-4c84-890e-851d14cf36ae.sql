-- 1) Sørg for at RLS er på
alter table public.events enable row level security;

-- 2) Slett gamle policyer på events (alle kjente navn)
drop policy if exists "events_select_visible" on public.events;
drop policy if exists "events_insert_member" on public.events;
drop policy if exists "events_update_owner_only" on public.events;
drop policy if exists "events_delete_owner_only" on public.events;
drop policy if exists "events_select_policy" on public.events;
drop policy if exists "events_insert_policy" on public.events;
drop policy if exists "events_update_policy" on public.events;
drop policy if exists "events_delete_policy" on public.events;

-- 3) SELECT: bruker kan lese events i household der de selv er aktivt medlem
create policy "events_select_policy"
on public.events
for select
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.household_id = events.household_id
      and hm.user_id = auth.uid()
      and hm.is_active = true
  )
);

-- 4) INSERT: bruker kan kun opprette event for sin egen aktive medlemsrad
create policy "events_insert_policy"
on public.events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.id = events.owner_member_id
      and hm.household_id = events.household_id
      and hm.user_id = auth.uid()
      and hm.is_active = true
  )
);

-- 5) UPDATE: kun eier (medlemsraden bak owner_member_id) kan endre
create policy "events_update_policy"
on public.events
for update
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.id = events.owner_member_id
      and hm.household_id = events.household_id
      and hm.user_id = auth.uid()
      and hm.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.household_members hm
    where hm.id = events.owner_member_id
      and hm.household_id = events.household_id
      and hm.user_id = auth.uid()
      and hm.is_active = true
  )
);

-- 6) DELETE: kun eier kan slette
create policy "events_delete_policy"
on public.events
for delete
to authenticated
using (
  exists (
    select 1
    from public.household_members hm
    where hm.id = events.owner_member_id
      and hm.household_id = events.household_id
      and hm.user_id = auth.uid()
      and hm.is_active = true
  )
);

-- 7) Eksplisitte tabellrettigheter (idempotent)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.events to authenticated;

-- 8) Tving PostgREST til å laste skjema på nytt
notify pgrst, 'reload schema';
