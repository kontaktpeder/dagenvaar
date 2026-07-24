import { describe, it, expect } from 'vitest';
import {
  upcomingWeekday,
  defaultDateForTemplate,
  defaultPlacementFor,
  buildSeedEvents,
  type SeedPlacement,
} from './seedWeek';

describe('seedWeek dates', () => {
  it('upcomingWeekday includes today when it matches', () => {
    const wed = new Date(2026, 6, 22, 15, 0, 0);
    const nextWed = upcomingWeekday(wed, 3);
    expect(nextWed.getDate()).toBe(22);
  });

  it('upcomingWeekday rolls to next week', () => {
    const wed = new Date(2026, 6, 22, 15, 0, 0);
    const tue = upcomingWeekday(wed, 2);
    expect(tue.getDate()).toBe(28);
  });
});

describe('seed placements', () => {
  const now = new Date(2026, 6, 22, 12, 0, 0); // Wed
  const titleFor = (key: string) => key;

  it('one training = one event', () => {
    const p = defaultPlacementFor('training', now);
    const events = buildSeedEvents('hh', [p], titleFor as any);
    expect(events).toHaveLength(1);
    expect(events[0]!.start_time).toBeNull();
    expect(events[0]!.day_part).toBe('afternoon');
  });

  it('date night defaults to Friday evening', () => {
    const p = defaultPlacementFor('date_night', now);
    expect(p.date).toBe('2026-07-24');
    expect(p.dayPart).toBe('evening');
  });

  it('honors custom day part and date', () => {
    const placements: SeedPlacement[] = [
      { id: 'friends', date: '2026-07-25', dayPart: 'afternoon' },
    ];
    const events = buildSeedEvents('hh', placements, titleFor as any);
    expect(events[0]!.event_date).toBe('2026-07-25');
    expect(events[0]!.day_part).toBe('afternoon');
  });

  it('weekend all-day spans Sat–Sun', () => {
    const p: SeedPlacement = { id: 'weekend', date: '2026-07-25', dayPart: 'all_day' };
    const events = buildSeedEvents('hh', [p], titleFor as any);
    expect(events[0]!.event_date).toBe('2026-07-25');
    expect(events[0]!.end_date).toBe('2026-07-26');
  });

  it('defaultDateForTemplate picks soonest preferred weekday', () => {
    expect(defaultDateForTemplate('chores', now)).toBe('2026-07-26'); // Sun
  });
});
