-- Add explicit SELECT policy on events using the visibility helper function.
-- This is required for insert(...).select() to return the new row, and for
-- list/calendar reads to respect per-event visibility (all_members / selected_members / private).

drop policy if exists "events_select_visible" on public.events;

create policy "events_select_visible"
on public.events
for select
to authenticated
using (public.can_current_user_view_event(id));

notify pgrst, 'reload schema';
