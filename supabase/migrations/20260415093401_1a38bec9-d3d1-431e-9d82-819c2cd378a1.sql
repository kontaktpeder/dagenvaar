
-- 1) Ensure no duplicate membership rows for same household/user
create unique index if not exists household_members_household_user_uidx
  on public.household_members (household_id, user_id);

-- 2) Invite table
create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique,
  created_by uuid not null,
  expires_at timestamptz,
  used_at timestamptz,
  used_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists household_invites_household_id_idx
  on public.household_invites (household_id);

create index if not exists household_invites_used_at_idx
  on public.household_invites (used_at);

create index if not exists household_invites_expires_at_idx
  on public.household_invites (expires_at);

alter table public.household_invites enable row level security;

drop policy if exists "household_invites_select_member" on public.household_invites;
create policy "household_invites_select_member"
  on public.household_invites
  for select
  using (public.is_household_member(household_id, auth.uid()));

drop policy if exists "household_invites_insert_none" on public.household_invites;
create policy "household_invites_insert_none"
  on public.household_invites
  for insert
  with check (false);

drop policy if exists "household_invites_update_none" on public.household_invites;
create policy "household_invites_update_none"
  on public.household_invites
  for update
  using (false)
  with check (false);

drop policy if exists "household_invites_delete_none" on public.household_invites;
create policy "household_invites_delete_none"
  on public.household_invites
  for delete
  using (false);

-- 3) Recreate create_household_with_owner with one-household guard
create or replace function public.create_household_with_owner(
  p_name text,
  p_display_name text,
  p_color_token text default 'pastel-blue'
)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_household public.households;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1
    from public.household_members hm
    where hm.user_id = v_user_id
      and hm.is_active = true
  ) then
    raise exception 'User already belongs to a household';
  end if;

  insert into public.households (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Vårt hjem'), v_user_id)
  returning * into v_household;

  insert into public.household_members (
    household_id,
    user_id,
    role,
    display_name,
    color_token,
    is_active
  )
  values (
    v_household.id,
    v_user_id,
    'owner',
    coalesce(nullif(trim(p_display_name), ''), 'Meg'),
    coalesce(nullif(trim(p_color_token), ''), 'pastel-blue'),
    true
  )
  on conflict (household_id, user_id) do update
    set is_active = true;

  return v_household;
end;
$$;

-- 4) Owner creates invite code
create or replace function public.create_household_invite()
returns table (
  invite_id uuid,
  code text,
  household_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_household_id uuid;
  v_code text;
  v_expires_at timestamptz;
  v_invite_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select hm.household_id
  into v_household_id
  from public.household_members hm
  where hm.user_id = v_user_id
    and hm.role = 'owner'
    and hm.is_active = true
  order by hm.created_at asc
  limit 1;

  if v_household_id is null then
    raise exception 'Only owners can create invites';
  end if;

  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4))
            || '-'
            || upper(substr(md5(clock_timestamp()::text || random()::text), 1, 4));
  v_expires_at := now() + interval '7 days';

  insert into public.household_invites (household_id, code, created_by, expires_at)
  values (v_household_id, v_code, v_user_id, v_expires_at)
  returning id into v_invite_id;

  return query
  select v_invite_id, v_code, v_household_id, v_expires_at;
end;
$$;

-- 5) Join by invite code
create or replace function public.join_household_by_code(
  p_invite_code text,
  p_display_name text,
  p_color_token text default 'pastel-blue'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_household_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1
    from public.household_members hm
    where hm.user_id = v_user_id
      and hm.is_active = true
  ) then
    raise exception 'User already belongs to a household';
  end if;

  select hi.household_id
  into v_household_id
  from public.household_invites hi
  where upper(hi.code) = upper(trim(p_invite_code))
    and hi.used_at is null
    and (hi.expires_at is null or hi.expires_at > now())
  order by hi.created_at desc
  limit 1;

  if v_household_id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  insert into public.household_members (
    household_id,
    user_id,
    role,
    display_name,
    color_token,
    is_active
  )
  values (
    v_household_id,
    v_user_id,
    'member',
    coalesce(nullif(trim(p_display_name), ''), 'Meg'),
    coalesce(nullif(trim(p_color_token), ''), 'pastel-blue'),
    true
  )
  on conflict (household_id, user_id) do update
    set is_active = true;

  update public.household_invites
  set used_at = now(), used_by = v_user_id
  where upper(code) = upper(trim(p_invite_code))
    and used_at is null;

  return v_household_id;
end;
$$;
