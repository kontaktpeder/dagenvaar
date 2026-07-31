-- In-app account deletion.
--
-- Shared calendars must survive: a partner's events reference the leaving
-- member row, so we detach (user_id = null) instead of deleting membership
-- rows unless the household has no other members.

alter table public.household_members
  alter column user_id drop not null;

comment on column public.household_members.user_id is
  'auth.users id, or null when the account was deleted and the row is kept for history';

-- ---------------------------------------------------------------------------
-- purge_account_data — app-level cleanup for the calling user
-- ---------------------------------------------------------------------------

create or replace function public.purge_account_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_member record;
  v_other_count int;
  v_other_owner_count int;
  v_new_owner_id uuid;
  v_deleted_households int := 0;
  v_detached_members int := 0;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Du må være innlogget for å slette kontoen.';
  end if;

  -- Households where this user is the only active member are removed entirely
  -- (cascades events, countdowns, invites). Ownership is handed over when the
  -- user is the sole owner of a shared calendar.
  for v_member in
    select id, household_id, role, is_active
    from public.household_members
    where user_id = v_user_id
    order by created_at asc
  loop
    select count(*) into v_other_count
    from public.household_members
    where household_id = v_member.household_id
      and is_active = true
      and id <> v_member.id;

    if v_other_count = 0 then
      delete from public.households where id = v_member.household_id;
      v_deleted_households := v_deleted_households + 1;
      continue;
    end if;

    if v_member.is_active and v_member.role = 'owner' then
      select count(*) into v_other_owner_count
      from public.household_members
      where household_id = v_member.household_id
        and is_active = true
        and id <> v_member.id
        and role = 'owner';

      if v_other_owner_count = 0 then
        select id into v_new_owner_id
        from public.household_members
        where household_id = v_member.household_id
          and is_active = true
          and id <> v_member.id
        order by created_at asc
        limit 1;

        update public.household_members
        set role = 'owner'
        where id = v_new_owner_id;
      end if;
    end if;

    -- Keep the row so shared history stays intact, but strip the identity.
    update public.household_members
    set user_id = null,
        is_active = false,
        role = 'member',
        display_name = 'Slettet bruker',
        avatar_url = null,
        daily_digest_enabled = false
    where id = v_member.id;

    v_detached_members := v_detached_members + 1;
  end loop;

  -- Unused invites created by this user must not let anyone join later.
  delete from public.household_invites
  where created_by = v_user_id
    and used_at is null;

  delete from public.user_preferences where user_id = v_user_id;

  return jsonb_build_object(
    'user_id', v_user_id,
    'households_deleted', v_deleted_households,
    'memberships_detached', v_detached_members
  );
end;
$$;

grant execute on function public.purge_account_data() to authenticated;

comment on function public.purge_account_data() is
  'Removes the calling user from all calendars and deletes personal rows. Auth user deletion happens in the delete-account edge function.';
