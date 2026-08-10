/**
 * Pending calendar day to open after a push tap (yyyy-MM-dd),
 * optionally switching to a specific household first.
 */
export type PendingOpenDay = {
  dateStr: string;
  householdId?: string | null;
};

let pending: PendingOpenDay | null = null;
const listeners = new Set<(value: PendingOpenDay) => void>();

export function setPendingOpenDay(dateStr: string, householdId?: string | null): void {
  pending = { dateStr, householdId: householdId || null };
  listeners.forEach((fn) => fn(pending!));
}

export function peekPendingOpenDay(): PendingOpenDay | null {
  return pending;
}

export function consumePendingOpenDay(): PendingOpenDay | null {
  const v = pending;
  pending = null;
  return v;
}

/** @deprecated Prefer consumePendingOpenDay().dateStr */
export function consumePendingOpenDayDate(): string | null {
  return consumePendingOpenDay()?.dateStr ?? null;
}

export function subscribePendingOpenDay(fn: (value: PendingOpenDay) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
