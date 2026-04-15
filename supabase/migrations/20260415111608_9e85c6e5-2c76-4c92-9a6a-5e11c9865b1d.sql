
-- Add event category + priority
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS events_household_date_priority_idx
  ON public.events (household_id, event_date, priority);

CREATE INDEX IF NOT EXISTS events_category_idx
  ON public.events (category);
