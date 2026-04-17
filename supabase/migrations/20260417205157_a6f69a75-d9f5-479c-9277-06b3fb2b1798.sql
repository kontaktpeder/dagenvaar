-- Recreate helper function and INSERT policy explicitly to ensure RLS for events works.

CREATE OR REPLACE FUNCTION public.is_own_active_household_member_row(p_member_id uuid, p_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.id = p_member_id
      AND hm.household_id = p_household_id
      AND hm.user_id = auth.uid()
      AND hm.is_active = true
  );
$function$;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_insert_member ON public.events;

CREATE POLICY events_insert_member
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_own_active_household_member_row(owner_member_id, household_id)
);
