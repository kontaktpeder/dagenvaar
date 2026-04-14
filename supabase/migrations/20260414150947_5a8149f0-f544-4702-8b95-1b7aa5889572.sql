
-- Make visibility/edit check functions SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.can_current_user_view_event(p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
      or ev.owner_member_id = me.id
      or (
        ev.visibility_type = 'selected_members'
        and exists (
          select 1
          from public.event_visible_members evm
          where evm.event_id = ev.id
            and evm.member_id = me.id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_current_user_edit_event(p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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

CREATE OR REPLACE FUNCTION public.can_current_user_view_list_item(p_list_item_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  with me as (
    select hm.id, hm.household_id
    from public.household_members hm
    where hm.user_id = auth.uid()
      and hm.is_active = true
  ),
  li as (
    select l.*
    from public.list_items l
    where l.id = p_list_item_id
  )
  select exists (
    select 1
    from li
    join me on me.household_id = li.household_id
    where
      li.visibility_type = 'all_members'
      or li.owner_member_id = me.id
      or (
        li.visibility_type = 'selected_members'
        and exists (
          select 1
          from public.list_item_visible_members livm
          where livm.list_item_id = li.id
            and livm.member_id = me.id
        )
      )
  );
$$;
