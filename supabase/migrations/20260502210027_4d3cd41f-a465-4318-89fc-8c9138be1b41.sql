CREATE OR REPLACE FUNCTION public.validate_event_day_parts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  valid_parts text[] := ARRAY[
    'morning', 'late_morning', 'afternoon', 'evening', 'night',
    'all_day', 'full_diem'
  ];
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