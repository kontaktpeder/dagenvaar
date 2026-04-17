DROP POLICY IF EXISTS events_insert_member ON public.events;

CREATE POLICY events_insert_member
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.id = events.owner_member_id
      AND hm.user_id = auth.uid()
      AND hm.household_id = events.household_id
      AND hm.is_active = true
  )
);