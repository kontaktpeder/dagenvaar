const PREFIX = 'pastelly:seed-week-dismissed:';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function isSeedWeekDismissed(householdId: string): boolean {
  const s = storage();
  if (!s) return false;
  return s.getItem(PREFIX + householdId) === '1';
}

export function dismissSeedWeek(householdId: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(PREFIX + householdId, '1');
  } catch {
    // ignore quota / private mode
  }
}
