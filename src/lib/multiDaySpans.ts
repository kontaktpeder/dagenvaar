import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { differenceInCalendarDays } from 'date-fns';
import type { Event } from '@/hooks/useEvents';

export function isMultiDayEvent(ev: Event): boolean {
  const end = (ev as any).end_date as string | null | undefined;
  return !!end && end > ev.event_date;
}

export function formatMultiDayLabel(ev: Event): string | null {
  if (!isMultiDayEvent(ev)) return null;
  const start = new Date(ev.event_date + 'T12:00:00');
  const end = new Date(((ev as any).end_date as string) + 'T12:00:00');
  const days = differenceInCalendarDays(end, start) + 1;
  if (days < 2) return null;
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const range = sameMonth
    ? `${format(start, 'd.', { locale: nb })}–${format(end, 'd. MMM', { locale: nb })}`
    : `${format(start, 'd. MMM', { locale: nb })}–${format(end, 'd. MMM', { locale: nb })}`;
  return `${range} · ${days} dager`;
}

export type SpanSegment = {
  event: Event;
  lane: number;
  isStart: boolean;
  isEnd: boolean;
};

const MAX_SPAN_LANES = 3;

/**
 * Assign vertical lanes for multi-day events week-by-week so overlapping
 * spans stack (never side-by-side). Segments break at week boundaries.
 */
export function buildSpanSegmentsByDate(
  days: Date[],
  eventsByDate: Record<string, Event[]>,
  neighbourEventsByDate?: Record<string, Event[]>,
): Map<string, SpanSegment[]> {
  const byId = new Map<string, Event>();
  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const list = eventsByDate[dateStr] || neighbourEventsByDate?.[dateStr] || [];
    for (const ev of list) {
      if (isMultiDayEvent(ev)) byId.set(ev.id, ev);
    }
  }

  const multiEvents = [...byId.values()].sort((a, b) => {
    if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
    const aEnd = (a as any).end_date || a.event_date;
    const bEnd = (b as any).end_date || b.event_date;
    const aLen = aEnd.localeCompare(a.event_date);
    const bLen = bEnd.localeCompare(b.event_date);
    if (aLen !== bLen) return bLen - aLen; // longer first
    return a.id.localeCompare(b.id);
  });

  const result = new Map<string, SpanSegment[]>();
  for (const day of days) {
    result.set(format(day, 'yyyy-MM-dd'), []);
  }

  for (let w = 0; w < days.length; w += 7) {
    const weekDays = days.slice(w, w + 7);
    if (weekDays.length === 0) continue;
    const weekStart = format(weekDays[0], 'yyyy-MM-dd');
    const weekEnd = format(weekDays[weekDays.length - 1], 'yyyy-MM-dd');

    const overlapping = multiEvents.filter((ev) => {
      const s = ev.event_date;
      const e = ((ev as any).end_date as string) || ev.event_date;
      return s <= weekEnd && e >= weekStart;
    });

    const laneEndDate: (string | null)[] = [];

    for (const ev of overlapping) {
      const s = ev.event_date;
      const e = ((ev as any).end_date as string) || ev.event_date;
      const segStart = s > weekStart ? s : weekStart;
      const segEnd = e < weekEnd ? e : weekEnd;

      let lane = 0;
      while (lane < MAX_SPAN_LANES) {
        const occupiedUntil = laneEndDate[lane];
        if (!occupiedUntil || occupiedUntil < segStart) break;
        lane += 1;
      }
      if (lane >= MAX_SPAN_LANES) continue;

      laneEndDate[lane] = segEnd;

      for (const day of weekDays) {
        const ds = format(day, 'yyyy-MM-dd');
        if (ds < segStart || ds > segEnd) continue;
        result.get(ds)!.push({
          event: ev,
          lane,
          isStart: ds === s,
          isEnd: ds === e,
        });
      }
    }
  }

  return result;
}

export function maxSpanLane(segments: SpanSegment[]): number {
  if (segments.length === 0) return -1;
  return Math.max(...segments.map((s) => s.lane));
}

export { MAX_SPAN_LANES };
