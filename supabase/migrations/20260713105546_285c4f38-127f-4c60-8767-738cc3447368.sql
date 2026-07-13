DROP POLICY IF EXISTS "events_select_policy" ON public.events;
NOTIFY pgrst, 'reload schema';