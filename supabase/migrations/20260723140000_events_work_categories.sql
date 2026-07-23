-- Allow WORK core–aligned work categories (and legacy work keys) on events.
alter table public.events drop constraint if exists events_category_allowed_values;

alter table public.events
  add constraint events_category_allowed_values
  check (
    category in (
      -- home
      'couple',
      'work',
      'social',
      'celebration',
      'important',
      'travel',
      'other',
      -- work (WORK core)
      'meeting',
      'production',
      'development',
      'admin',
      -- legacy work keys still readable in the app
      'client',
      'deadline',
      'focus'
    )
  );
