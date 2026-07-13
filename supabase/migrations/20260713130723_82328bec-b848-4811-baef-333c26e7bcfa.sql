ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_category_allowed_values;
ALTER TABLE public.events ADD CONSTRAINT events_category_allowed_values
  CHECK (category IN ('couple','work','social','celebration','important','travel','other'));

UPDATE public.household_members
SET category_color_map = coalesce(category_color_map, '{}'::jsonb) || jsonb_build_object('travel','teal')
WHERE category_color_map IS NULL OR NOT (category_color_map ? 'travel');