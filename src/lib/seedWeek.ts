import { addDays, format } from 'date-fns';
import type { CreateEventInput } from '@/hooks/useEvents';
import type { MessageKey } from '@/lib/i18n';
import type { HomeEventCategory } from '@/lib/eventCategories';

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
  hintKey: MessageKey;
  category: HomeEventCategory;
  /** private = only me; default all_members */
  visibility?: 'all_members' | 'private';
};

/** Young-couple focused starters — not family logistics. */
export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    id: 'training',
    titleKey: 'seed.training',
    hintKey: 'seed.trainingHint',
    category: 'other',
  },
  {
    id: 'dinner_home',
    titleKey: 'seed.dinnerHome',
    hintKey: 'seed.dinnerHomeHint',
    category: 'couple',
  },
  {
    id: 'dinner_out',
    titleKey: 'seed.dinnerOut',
    hintKey: 'seed.dinnerOutHint',
    category: 'couple',
  },
  {
    id: 'work_late',
    titleKey: 'seed.workLate',
    hintKey: 'seed.workLateHint',
    category: 'work',
  },
  {
    id: 'date_night',
    titleKey: 'seed.dateNight',
    hintKey: 'seed.dateNightHint',
    category: 'couple',
  },
  {
    id: 'friends',
    titleKey: 'seed.friends',
    hintKey: 'seed.friendsHint',
    category: 'social',
  },
  {
    id: 'weekend',
    titleKey: 'seed.weekend',
    hintKey: 'seed.weekendHint',
    category: 'travel',
  },
  {
    id: 'alone_time',
    titleKey: 'seed.aloneTime',
    hintKey: 'seed.aloneTimeHint',
    category: 'other',
  },
  {
    id: 'chores',
    titleKey: 'seed.chores',
    hintKey: 'seed.choresHint',
    category: 'other',
  },
];

function atNoon(d: Date): Date {
  const next = new Date(d);
  next.setHours(12, 0, 0, 0);
  return next;
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Next occurrence of weekday (0=Sun … 6=Sat), including today. */
export function upcomingWeekday(from: Date, weekday: number): Date {
  const start = atNoon(from);
  const delta = (weekday - start.getDay() + 7) % 7;
  return addDays(start, delta);
}

/** Next N distinct weekdays on/after `from`, cycling through `weekdays`. */
export function upcomingWeekdays(from: Date, weekdays: number[], count: number): Date[] {
  const out: Date[] = [];
  let cursor = atNoon(from);
  let guard = 0;
  while (out.length < count && guard < 60) {
    const day = cursor.getDay();
    if (weekdays.includes(day)) {
      out.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    } else {
      cursor = addDays(cursor, 1);
    }
    guard += 1;
  }
  return out;
}

type TimedSeed = {
  event_date: string;
  end_date?: string;
  day_part: string;
  day_part_start?: string;
  day_part_end?: string;
  start_time?: string | null;
  end_time?: string | null;
};

function evening(date: Date): TimedSeed {
  return {
    event_date: toDateStr(date),
    day_part: 'evening',
    day_part_start: 'evening',
    day_part_end: 'evening',
    start_time: '19:00',
    end_time: '21:00',
  };
}

function afternoon(date: Date, start = '17:00', end = '18:30'): TimedSeed {
  return {
    event_date: toDateStr(date),
    day_part: 'afternoon',
    day_part_start: 'afternoon',
    day_part_end: 'afternoon',
    start_time: start,
    end_time: end,
  };
}

function lateMorning(date: Date): TimedSeed {
  return {
    event_date: toDateStr(date),
    day_part: 'late_morning',
    day_part_start: 'late_morning',
    day_part_end: 'late_morning',
    start_time: '10:00',
    end_time: '12:00',
  };
}

function allDayRange(start: Date, end: Date): TimedSeed {
  return {
    event_date: toDateStr(start),
    end_date: toDateStr(end),
    day_part: 'all_day',
    day_part_start: 'all_day',
    day_part_end: 'all_day',
    start_time: null,
    end_time: null,
  };
}

function resolveSlots(id: SeedTemplateId, now: Date): TimedSeed[] {
  switch (id) {
    case 'training': {
      // Tue + Thu
      const days = upcomingWeekdays(now, [2, 4], 2);
      return days.map((d) => afternoon(d, '17:30', '18:45'));
    }
    case 'dinner_home': {
      // Two evenings Mon/Wed/Thu
      const days = upcomingWeekdays(now, [1, 3, 4], 2);
      return days.map((d) => evening(d));
    }
    case 'dinner_out': {
      return [evening(upcomingWeekday(now, 5))];
    }
    case 'work_late': {
      // Next weekday evening (not weekend)
      const days = upcomingWeekdays(now, [1, 2, 3, 4], 1);
      return [
        {
          event_date: toDateStr(days[0]!),
          day_part: 'evening',
          day_part_start: 'evening',
          day_part_end: 'evening',
          start_time: '18:00',
          end_time: '21:00',
        },
      ];
    }
    case 'date_night': {
      return [evening(upcomingWeekday(now, 5))];
    }
    case 'friends': {
      return [evening(upcomingWeekday(now, 6))];
    }
    case 'weekend': {
      const sat = upcomingWeekday(now, 6);
      const sun = addDays(sat, 1);
      return [allDayRange(sat, sun)];
    }
    case 'alone_time': {
      // Mid-week evening
      const days = upcomingWeekdays(now, [2, 3], 1);
      return [evening(days[0]!)];
    }
    case 'chores': {
      return [lateMorning(upcomingWeekday(now, 0))];
    }
    default:
      return [];
  }
}

export function buildSeedEvents(
  householdId: string,
  selectedIds: SeedTemplateId[],
  titleFor: (key: MessageKey) => string,
  now: Date = new Date(),
): CreateEventInput[] {
  const events: CreateEventInput[] = [];

  for (const id of selectedIds) {
    const template = SEED_TEMPLATES.find((t) => t.id === id);
    if (!template) continue;
    const slots = resolveSlots(id, now);
    const title = titleFor(template.titleKey);
    for (const slot of slots) {
      events.push({
        household_id: householdId,
        title,
        event_date: slot.event_date,
        end_date: slot.end_date ?? slot.event_date,
        day_part: slot.day_part,
        day_part_start: slot.day_part_start ?? slot.day_part,
        day_part_end: slot.day_part_end ?? slot.day_part,
        start_time: slot.start_time,
        end_time: slot.end_time,
        visibility_type: template.visibility ?? 'all_members',
        category: template.category,
      });
    }
  }

  return events;
}

export function countSeedEvents(selectedIds: SeedTemplateId[], now: Date = new Date()): number {
  return selectedIds.reduce((sum, id) => sum + resolveSlots(id, now).length, 0);
}
