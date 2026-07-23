import { format } from 'date-fns';
import type { EventCategory } from '@/lib/eventCategories';

export interface EventUpdatePatchInput {
  title: string;
  startDate: Date;
  endDate: Date | null;
  dayPartStart: string | null;
  dayPartEnd: string | null;
  startTime: string;
  endTime: string;
  category: EventCategory;
  otherLabel: string;
  visibility: 'all_members' | 'private' | 'selected_members';
  location: string;
  notes: string;
  hideFromOtherCalendars?: boolean;
}

export function buildEventUpdatePatch(input: EventUpdatePatchInput) {
  const eventEndDate = input.endDate
    ? format(input.endDate, 'yyyy-MM-dd')
    : format(input.startDate, 'yyyy-MM-dd');
  const dayPartCompat =
    !input.dayPartStart || input.dayPartStart === 'all_day' || input.dayPartStart === 'full_diem'
      ? 'morning'
      : input.dayPartStart;
  const isFullDiem = input.dayPartStart === 'full_diem' && input.dayPartEnd === 'full_diem';

  return {
    title: input.title.trim(),
    event_date: format(input.startDate, 'yyyy-MM-dd'),
    end_date: eventEndDate,
    day_part: dayPartCompat,
    day_part_start: input.dayPartStart || null,
    day_part_end: input.dayPartEnd || null,
    start_time: isFullDiem ? '00:00' : (input.startTime || null),
    end_time: isFullDiem ? '23:59' : (input.endTime || null),
    visibility_type: input.visibility,
    location: input.location || null,
    notes: input.notes || null,
    category: input.category,
    category_label_override:
      input.category === 'other' ? input.otherLabel.trim() || null : null,
    hide_from_other_calendars: input.hideFromOtherCalendars ?? false,
  } as any;
}
