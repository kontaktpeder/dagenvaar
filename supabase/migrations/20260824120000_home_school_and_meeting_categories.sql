-- Allow home categories "school" and keep "meeting" shared with work.

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
      'school',
      'meeting',
      'other',
      -- work (WORK core)
      'production',
      'development',
      'admin',
      'personal',
      -- legacy work keys still readable in the app
      'client',
      'deadline',
      'focus'
    )
  );
