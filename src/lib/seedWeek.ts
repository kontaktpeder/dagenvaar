import { addDays, format } from 'date-fns';
import type { CreateEventInput } from '@/hooks/useEvents';
import type { MessageKey } from '@/lib/i18n';
import type { HomeEventCategory } from '@/lib/eventCategories';
import type { DayPart } from '@/lib/dayParts';

export type SeedTemplateId =
  | 'training'
  | 'dinner_home'
  | 'dinner_out'
  | 'work_late'
  | 'date_night'
  | 'friends'
  | 'weekend'
  | 'alone_time'
  | 'chores';

export type SeedTemplate = {
  id: SeedTemplateId;
  titleKey: MessageKey;
  category: HomeEventCategory;
  /** Suggested day-part when placing */
  defaultDayPart: DayPart;
  /** Preferred weekdays 0=Sun…6=Sat for default date */
  preferWeekdays?: number[];
};

/** Young-couple starters — one pick = one event. */
export const SEED_TEMPLATES: SeedTemplate[] = [
  { id: 'training', titleKey: 'seed.training', category: 'other', defaultDayPart: 'afternoon', preferWeekdays: [2, 4] },
  { id: 'dinner_home', titleKey: 'seed.dinnerHome', category: 'couple', defaultDayPart: 'evening', preferWeekdays: [1, 3, 4] },
  { id: 'dinner_out', titleKey: 'seed.dinnerOut', category: 'couple', defaultDayPart: 'evening', preferWeekdays: [5] },
  { id: 'work_late', titleKey: 'seed.workLate', category: 'work', defaultDayPart: 'evening', preferWeekdays: [1, 2, 3, 4] },
  { id: 'date_night', titleKey: 'seed.dateNight', category: 'couple', defaultDayPart: 'evening', preferWeekdays: [5, 6] },
  { id: 'friends', titleKey: 'seed.friends', category: 'social', defaultDayPart: 'evening', preferWeekdays: [6] },
  { id: 'weekend', titleKey: 'seed.weekend', category: 'travel', defaultDayPart: 'all_day', preferWeekdays: [6] },
  { id: 'alone_time', titleKey: 'seed.aloneTime', category: 'other', defaultDayPart: 'evening', preferWeekdays: [2, 3] },
  { id: 'chores', titleKey: 'seed.chores', category: 'other', defaultDayPart: 'late_morning', preferWeekdays: [0] },
];

export type SeedPlacement = {
  id: SeedTemplateId;
  date: string; // yyyy-MM-dd
  dayPart: DayPart;
};

export const SEED_DAY_PARTS: DayPart[] = ['morning', 'late_morning', 'afternoon', 'evening', 'all_day'];

function atNoon(d: Date): Date {
  const next = new Date(d);
  next.setHours(12, 0, 0, 0);
  return next;
}

export function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Next occurrence of weekday (0=Sun … 6=Sat), including today. */
export function upcomingWeekday(from: Date, weekday: number): Date {
  const start = atNoon(from);
  const delta = (weekday - start.getDay() + 7) % 7;
  return addDays(start, delta);
}

/** Next N calendar days starting today (inclusive). */
export function nextDays(from: Date, count: number): Date[] {
  const start = atNoon(from);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export function defaultDateForTemplate(id: SeedTemplateId, now: Date = new Date()): string {
  const template = SEED_TEMPLATES.find((t) => t.id === id);
  const prefs = template?.preferWeekdays;
  if (prefs?.length) {
    // Soonest preferred weekday within the next week
    let best: Date | null = null;
    for (const wd of prefs) {
      const d = upcomingWeekday(now, wd);
      if (!best || d < best) best = d;
    }
    return toDateStr(best ?? atNoon(now));
  }
  return toDateStr(atNoon(now));
}

export function defaultPlacementFor(id: SeedTemplateId, now: Date = new Date()): SeedPlacement {
  const template = SEED_TEMPLATES.find((t) => t.id === id)!;
  return {
    id,
    date: defaultDateForTemplate(id, now),
    dayPart: template.defaultDayPart,
  };
}

export function buildSeedEvents(
  householdId: string,
  placements: SeedPlacement[],
  titleFor: (key: MessageKey) => string,
): CreateEventInput[] {
  const events: CreateEventInput[] = [];

  for (const placement of placements) {
    const template = SEED_TEMPLATES.find((t) => t.id === placement.id);
    if (!template) continue;
    const dayPart = placement.dayPart;
    const isWeekendBlock = placement.id === 'weekend' && dayPart === 'all_day';
    const endDate = isWeekendBlock
      ? toDateStr(addDays(new Date(placement.date + 'T12:00:00'), 1))
      : placement.date;

    events.push({
      household_id: householdId,
      title: titleFor(template.titleKey),
      event_date: placement.date,
      end_date: endDate,
      day_part: dayPart,
      day_part_start: dayPart,
      day_part_end: dayPart,
      start_time: null,
      end_time: null,
      visibility_type: 'all_members',
      category: template.category,
    });
  }

  return events;
}
