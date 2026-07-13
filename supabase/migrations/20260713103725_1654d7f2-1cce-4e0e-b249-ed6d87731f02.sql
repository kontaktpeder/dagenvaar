
CREATE OR REPLACE FUNCTION public.leave_household()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_member public.household_members;
  v_household_id uuid;
  v_other_count int;
  v_other_owner_count int;
  v_new_owner_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Du må være innlogget for å forlate hjemmet.';
  END IF;

  SELECT * INTO v_member
  FROM public.household_members
  WHERE user_id = v_user_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'Du er ikke medlem av et hjem.';
  END IF;

  v_household_id := v_member.household_id;

  SELECT count(*) INTO v_other_count
  FROM public.household_members
  WHERE household_id = v_household_id
    AND is_active = true
    AND id <> v_member.id;

  IF v_other_count = 0 THEN
    -- Sole member: delete household (cascades to members, events, etc.)
    DELETE FROM public.households WHERE id = v_household_id;
    RETURN jsonb_build_object('status', 'household_deleted');
  END IF;

  IF v_member.role = 'owner' THEN
    SELECT count(*) INTO v_other_owner_count
    FROM public.household_members
    WHERE household_id = v_household_id
      AND is_active = true
      AND id <> v_member.id
      AND role = 'owner';

    IF v_other_owner_count = 0 THEN
      -- Transfer ownership to oldest remaining active member
      SELECT id INTO v_new_owner_id
      FROM public.household_members
      WHERE household_id = v_household_id
        AND is_active = true
        AND id <> v_member.id
      ORDER BY created_at ASC
      LIMIT 1;

      UPDATE public.household_members
      SET role = 'owner'
      WHERE id = v_new_owner_id;
    END IF;
  END IF;

  UPDATE public.household_members
  SET is_active = false
  WHERE id = v_member.id;

  RETURN jsonb_build_object('status', 'left', 'household_id', v_household_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_household() TO authenticated;
