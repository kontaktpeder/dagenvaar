let pendingCountdownId: string | null = null;
const listeners = new Set<(countdownId: string) => void>();

export function setPendingOpenCountdown(countdownId: string): void {
  if (!countdownId) return;
  const changed = pendingCountdownId !== countdownId;
  pendingCountdownId = countdownId;
  if (!changed) return;
  listeners.forEach((fn) => fn(countdownId));
}

export function peekPendingOpenCountdown(): string | null {
  return pendingCountdownId;
}

export function consumePendingOpenCountdown(): string | null {
  const id = pendingCountdownId;
  pendingCountdownId = null;
  return id;
}

export function subscribePendingOpenCountdown(fn: (countdownId: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
