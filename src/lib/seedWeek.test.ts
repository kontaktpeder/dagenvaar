import { describe, it, expect } from 'vitest';
import {
  upcomingWeekday,
  upcomingWeekdays,
  buildSeedEvents,
  countSeedEvents,
  type SeedTemplateId,
} from './seedWeek';

describe('seedWeek dates', () => {
  it('upcomingWeekday includes today when it matches', () => {
    // Wednesday 2026-07-22
    const wed = new Date(2026, 6, 22, 15, 0, 0);
    const nextWed = upcomingWeekday(wed, 3);
    expect(nextWed.getFullYear()).toBe(2026);
    expect(nextWed.getMonth()).toBe(6);
    expect(nextWed.getDate()).toBe(22);
  });

  it('upcomingWeekday rolls to next week', () => {
    const wed = new Date(2026, 6, 22, 15, 0, 0);
    const tue = upcomingWeekday(wed, 2);
    expect(tue.getDate()).toBe(28); // next Tuesday
  });

  it('upcomingWeekdays picks Tue+Thu for training', () => {
    const wed = new Date(2026, 6, 22, 12, 0, 0);
    const days = upcomingWeekdays(wed, [2, 4], 2);
    expect(days.map((d) => d.getDay())).toEqual([4, 2]); // Thu 23, Tue 28
    expect(days[0]!.getDate()).toBe(23);
    expect(days[1]!.getDate()).toBe(28);
  });
});

describe('buildSeedEvents', () => {
  const now = new Date(2026, 6, 22, 12, 0, 0); // Wed
  const titleFor = (key: string) => key;

  it('creates two training events', () => {
    const events = buildSeedEvents('hh', ['training'], titleFor as any, now);
    expect(events).toHaveLength(2);
    expect(events[0]!.event_date).toBe('2026-07-23');
    expect(events[1]!.event_date).toBe('2026-07-28');
    expect(events[0]!.start_time).toBe('17:30');
  });

  it('date night lands on Friday', () => {
    const events = buildSeedEvents('hh', ['date_night'], titleFor as any, now);
    expect(events).toHaveLength(1);
    expect(events[0]!.event_date).toBe('2026-07-24');
    expect(events[0]!.category).toBe('couple');
  });

  it('alone time is visible to household', () => {
    const events = buildSeedEvents('hh', ['alone_time'], titleFor as any, now);
    expect(events[0]!.visibility_type).toBe('all_members');
  });

  it('weekend is multi-day all-day', () => {
    const events = buildSeedEvents('hh', ['weekend'], titleFor as any, now);
    expect(events[0]!.event_date).toBe('2026-07-25');
    expect(events[0]!.end_date).toBe('2026-07-26');
    expect(events[0]!.day_part).toBe('all_day');
    expect(events[0]!.start_time).toBeNull();
  });

  it('countSeedEvents matches build length', () => {
    const ids: SeedTemplateId[] = ['training', 'date_night', 'friends'];
    expect(countSeedEvents(ids, now)).toBe(buildSeedEvents('hh', ids, titleFor as any, now).length);
  });
});
