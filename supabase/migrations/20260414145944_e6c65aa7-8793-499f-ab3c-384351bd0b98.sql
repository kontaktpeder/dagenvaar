
-- Create a security definer function to check household membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id = p_user_id
      AND is_active = true
  );
$$;

-- Create a function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_household_owner(p_household_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id = p_user_id
      AND role = 'owner'
      AND is_active = true
  );
$$;

-- Fix households policies
DROP POLICY IF EXISTS "households_select_member" ON public.households;
CREATE POLICY "households_select_member" ON public.households
  FOR SELECT USING (public.is_household_member(id, auth.uid()));

DROP POLICY IF EXISTS "households_update_owner" ON public.households;
CREATE POLICY "households_update_owner" ON public.households
  FOR UPDATE
  USING (public.is_household_owner(id, auth.uid()))
  WITH CHECK (public.is_household_owner(id, auth.uid()));

-- Fix household_members policies
DROP POLICY IF EXISTS "household_members_select_same_household" ON public.household_members;
CREATE POLICY "household_members_select_same_household" ON public.household_members
  FOR SELECT USING (public.is_household_member(household_id, auth.uid()));

DROP POLICY IF EXISTS "household_members_insert_owner_only" ON public.household_members;
CREATE POLICY "household_members_insert_owner_only" ON public.household_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_household_owner(household_id, auth.uid()));

DROP POLICY IF EXISTS "household_members_update_self_or_owner" ON public.household_members;
CREATE POLICY "household_members_update_self_or_owner" ON public.household_members
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_household_owner(household_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_household_owner(household_id, auth.uid()));
