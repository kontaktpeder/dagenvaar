import type { CalendarMembership } from '@/hooks/useCurrentHouseholdContext';

/** Stable stack order: all home calendars first, then work — oldest within each kind. */
export function sortCalendarMemberships(
  memberships: CalendarMembership[],
): CalendarMembership[] {
  return [...memberships].sort((a, b) => {
    const ak = a.household.kind === 'home' ? 0 : 1;
    const bk = b.household.kind === 'home' ? 0 : 1;
    if (ak !== bk) return ak - bk;
    return a.created_at.localeCompare(b.created_at);
  });
}

export function adjacentCalendarId(
  memberships: CalendarMembership[],
  currentId: string,
  direction: 1 | -1,
): string | null {
  const ordered = sortCalendarMemberships(memberships);
  const idx = ordered.findIndex((m) => m.household_id === currentId);
  if (idx < 0) return null;
  const next = ordered[idx + direction];
  return next?.household_id ?? null;
}
