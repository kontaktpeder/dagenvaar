-- Add multi-day and day-part range columns
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS day_part_start text,
  ADD COLUMN IF NOT EXISTS day_part_end text;

-- Backfill existing rows
UPDATE public.events
SET
  end_date = COALESCE(end_date, event_date),
  day_part_start = COALESCE(day_part_start, day_part),
  day_part_end = COALESCE(day_part_end, day_part)
WHERE end_date IS NULL
   OR day_part_start IS NULL
   OR day_part_end IS NULL;

-- Date range constraint (immutable comparison, safe as CHECK)
ALTER TABLE public.events
  ADD CONSTRAINT events_end_date_not_before_start
  CHECK (end_date IS NULL OR end_date >= event_date);

-- Validation trigger for day_part_start and day_part_end values
CREATE OR REPLACE FUNCTION public.validate_event_day_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  valid_parts text[] := ARRAY['morning', 'late_morning', 'afternoon', 'evening', 'night', 'all_day'];
BEGIN
  IF NEW.day_part_start IS NOT NULL AND NOT (NEW.day_part_start = ANY(valid_parts)) THEN
    RAISE EXCEPTION 'Invalid day_part_start value: %', NEW.day_part_start;
  END IF;
  IF NEW.day_part_end IS NOT NULL AND NOT (NEW.day_part_end = ANY(valid_parts)) THEN
    RAISE EXCEPTION 'Invalid day_part_end value: %', NEW.day_part_end;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_event_day_parts_trigger
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.validate_event_day_parts();

-- Index for range queries
CREATE INDEX IF NOT EXISTS events_household_date_range_idx
  ON public.events (household_id, event_date, end_date);