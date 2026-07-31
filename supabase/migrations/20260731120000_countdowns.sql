-- Countdown module: opt-in shared countdowns with themed UI + scheduled pushes

create table if not exists public.countdowns (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by_member_id uuid not null references public.household_members (id) on delete cascade,
  title text not null,
  target_at timestamptz not null,
  theme text not null default 'rose'
    check (theme in ('rose', 'mint', 'peach', 'lavender', 'sky', 'sunset')),
  emoji text,
  status text not null default 'active'
    check (status in ('active', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists countdowns_household_status_idx
  on public.countdowns (household_id, status);

create index if not exists countdowns_target_at_idx
  on public.countdowns (target_at)
  where status = 'active';

drop trigger if exists countdowns_set_updated_at on public.countdowns;
create trigger countdowns_set_updated_at
  before update on public.countdowns
  for each row execute function public.set_updated_at();

create table if not exists public.countdown_participants (
  id uuid primary key default gen_random_uuid(),
  countdown_id uuid not null references public.countdowns (id) on delete cascade,
  member_id uuid not null references public.household_members (id) on delete cascade,
  status text not null default 'invited'
    check (status in ('invited', 'joined', 'declined')),
  invited_by_member_id uuid references public.household_members (id) on delete set null,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (countdown_id, member_id)
);

create index if not exists countdown_participants_member_idx
  on public.countdown_participants (member_id, status);

create table if not exists public.countdown_push_log (
  id uuid primary key default gen_random_uuid(),
  countdown_id uuid not null references public.countdowns (id) on delete cascade,
  member_id uuid not null references public.household_members (id) on delete cascade,
  kind text not null check (kind in ('weekly', 'daily', 'moment')),
  sent_on date not null,
  sent_at timestamptz not null default now(),
  unique (countdown_id, member_id, kind, sent_on)
);

comment on table public.countdowns is 'Shared opt-in countdowns (holidays, date nights)';
comment on table public.countdown_participants is 'Invite / join status per member';
comment on table public.countdown_push_log is 'Dedupe log for weekly/daily/moment countdown pushes';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_current_user_view_countdown(p_countdown_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.countdown_participants cp
    join public.household_members hm on hm.id = cp.member_id
    where cp.countdown_id = p_countdown_id
      and hm.user_id = auth.uid()
      and hm.is_active = true
      and cp.status in ('invited', 'joined')
  );
$$;

create or replace function public.can_current_user_manage_countdown(p_countdown_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.countdowns c
    join public.household_members hm on hm.id = c.created_by_member_id
    where c.id = p_countdown_id
      and hm.user_id = auth.uid()
      and hm.is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.countdowns enable row level security;
alter table public.countdown_participants enable row level security;
alter table public.countdown_push_log enable row level security;

drop policy if exists countdowns_select_participant on public.countdowns;
create policy countdowns_select_participant
  on public.countdowns for select to authenticated
  using (public.can_current_user_view_countdown(id));

-- Writes go through RPCs (security definer)
drop policy if exists countdowns_no_direct_insert on public.countdowns;
drop policy if exists countdowns_no_direct_update on public.countdowns;
drop policy if exists countdowns_no_direct_delete on public.countdowns;

drop policy if exists countdown_participants_select_visible on public.countdown_participants;
create policy countdown_participants_select_visible
  on public.countdown_participants for select to authenticated
  using (public.can_current_user_view_countdown(countdown_id));

-- Push log: service role only (no policies for authenticated)
revoke all on public.countdown_push_log from authenticated, anon;

grant select on public.countdowns to authenticated;
grant select on public.countdown_participants to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_countdown(
  p_household_id uuid,
  p_title text,
  p_target_at timestamptz,
  p_theme text default 'rose',
  p_emoji text default null,
  p_invite_member_ids uuid[] default null
)
returns public.countdowns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_row public.countdowns;
  v_invitee uuid;
  v_theme text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;

  if p_target_at is null or p_target_at <= now() then
    raise exception 'Target must be in the future';
  end if;

  v_theme := coalesce(nullif(trim(p_theme), ''), 'rose');
  if v_theme not in ('rose', 'mint', 'peach', 'lavender', 'sky', 'sunset') then
    raise exception 'Invalid theme';
  end if;

  select hm.id into v_member_id
  from public.household_members hm
  where hm.user_id = auth.uid()
    and hm.household_id = p_household_id
    and hm.is_active = true
  order by hm.created_at asc
  limit 1;

  if v_member_id is null then
    raise exception 'Not an active member of this household';
  end if;

  insert into public.countdowns (
    household_id,
    created_by_member_id,
    title,
    target_at,
    theme,
    emoji
  )
  values (
    p_household_id,
    v_member_id,
    trim(p_title),
    p_target_at,
    v_theme,
    nullif(trim(p_emoji), '')
  )
  returning * into v_row;

  insert into public.countdown_participants (
    countdown_id, member_id, status, invited_by_member_id, joined_at
  )
  values (
    v_row.id, v_member_id, 'joined', v_member_id, now()
  );

  if p_invite_member_ids is not null then
    foreach v_invitee in array p_invite_member_ids
    loop
      if v_invitee = v_member_id then
        continue;
      end if;
      if not exists (
        select 1 from public.household_members hm
        where hm.id = v_invitee
          and hm.household_id = p_household_id
          and hm.is_active = true
      ) then
        continue;
      end if;
      insert into public.countdown_participants (
        countdown_id, member_id, status, invited_by_member_id
      )
      values (v_row.id, v_invitee, 'invited', v_member_id)
      on conflict (countdown_id, member_id) do nothing;
    end loop;
  end if;

  return v_row;
end;
$$;

grant execute on function public.create_countdown(uuid, text, timestamptz, text, text, uuid[]) to authenticated;

create or replace function public.invite_to_countdown(
  p_countdown_id uuid,
  p_member_ids uuid[]
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_countdown public.countdowns;
  v_self uuid;
  v_invitee uuid;
  v_count int := 0;
  v_existing text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_countdown from public.countdowns where id = p_countdown_id;
  if v_countdown.id is null or v_countdown.status <> 'active' then
    raise exception 'Countdown not found';
  end if;

  -- Only joined participants may invite
  select hm.id into v_self
  from public.household_members hm
  join public.countdown_participants cp on cp.member_id = hm.id
  where hm.user_id = auth.uid()
    and hm.household_id = v_countdown.household_id
    and hm.is_active = true
    and cp.countdown_id = p_countdown_id
    and cp.status = 'joined'
  limit 1;

  if v_self is null then
    raise exception 'Only joined members can invite';
  end if;

  if p_member_ids is null then
    return 0;
  end if;

  foreach v_invitee in array p_member_ids
  loop
    if v_invitee = v_self then
      continue;
    end if;
    if not exists (
      select 1 from public.household_members hm
      where hm.id = v_invitee
        and hm.household_id = v_countdown.household_id
        and hm.is_active = true
    ) then
      continue;
    end if;

    select cp.status into v_existing
    from public.countdown_participants cp
    where cp.countdown_id = p_countdown_id and cp.member_id = v_invitee;

    if v_existing is null then
      insert into public.countdown_participants (
        countdown_id, member_id, status, invited_by_member_id
      )
      values (p_countdown_id, v_invitee, 'invited', v_self);
      v_count := v_count + 1;
    elsif v_existing = 'declined' then
      update public.countdown_participants
      set status = 'invited',
          invited_by_member_id = v_self,
          invited_at = now(),
          joined_at = null
      where countdown_id = p_countdown_id and member_id = v_invitee;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.invite_to_countdown(uuid, uuid[]) to authenticated;

create or replace function public.respond_to_countdown(
  p_countdown_id uuid,
  p_accept boolean
)
returns public.countdown_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.countdown_participants;
  v_member_id uuid;
  v_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select c.household_id into v_household_id
  from public.countdowns c
  where c.id = p_countdown_id and c.status = 'active';

  if v_household_id is null then
    raise exception 'Countdown not found';
  end if;

  select hm.id into v_member_id
  from public.household_members hm
  where hm.user_id = auth.uid()
    and hm.household_id = v_household_id
    and hm.is_active = true
  limit 1;

  if v_member_id is null then
    raise exception 'Not a member';
  end if;

  update public.countdown_participants
  set
    status = case when p_accept then 'joined' else 'declined' end,
    joined_at = case when p_accept then now() else null end
  where countdown_id = p_countdown_id
    and member_id = v_member_id
    and status = 'invited'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'No pending invite';
  end if;

  return v_row;
end;
$$;

grant execute on function public.respond_to_countdown(uuid, boolean) to authenticated;

create or replace function public.cancel_countdown(p_countdown_id uuid)
returns public.countdowns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.countdowns;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_current_user_manage_countdown(p_countdown_id) then
    raise exception 'Only the creator can cancel';
  end if;

  update public.countdowns
  set status = 'cancelled'
  where id = p_countdown_id
    and status = 'active'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Countdown not found';
  end if;

  return v_row;
end;
$$;

grant execute on function public.cancel_countdown(uuid) to authenticated;
