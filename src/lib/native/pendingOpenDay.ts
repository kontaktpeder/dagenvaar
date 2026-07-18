/**
 * Pending calendar day to open after a push tap (yyyy-MM-dd).
 */
let pendingDateStr: string | null = null;
const listeners = new Set<(dateStr: string) => void>();

export function setPendingOpenDay(dateStr: string): void {
  pendingDateStr = dateStr;
  listeners.forEach((fn) => fn(dateStr));
}

export function consumePendingOpenDay(): string | null {
  const v = pendingDateStr;
  pendingDateStr = null;
  return v;
}

export function subscribePendingOpenDay(fn: (dateStr: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
