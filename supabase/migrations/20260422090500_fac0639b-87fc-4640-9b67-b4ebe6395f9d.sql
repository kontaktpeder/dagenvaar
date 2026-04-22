-- 1) events.category becomes required + add label override
alter table public.events
  add column if not exists category_label_override text;

-- Backfill any null/empty/unknown to 'other'
update public.events
set category = 'other'
where category is null
   or btrim(category) = ''
   or category not in ('couple','work','social','celebration','important','other');

alter table public.events
  alter column category set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_category_allowed_values'
  ) then
    alter table public.events
      add constraint events_category_allowed_values
      check (category in ('couple','work','social','celebration','important','other'));
  end if;
end $$;

-- Override only valid for 'other'
update public.events
set category_label_override = null
where category <> 'other' and category_label_override is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_category_label_override_only_for_other'
  ) then
    alter table public.events
      add constraint events_category_label_override_only_for_other
      check (category_label_override is null or category = 'other');
  end if;
end $$;

-- 2) Per-member category color map
alter table public.household_members
  add column if not exists category_color_map jsonb;

update public.household_members
set category_color_map = jsonb_build_object(
  'couple', 'pink',
  'work', 'blue',
  'social', 'purple',
  'celebration', 'amber',
  'important', 'orange'
)
where category_color_map is null;