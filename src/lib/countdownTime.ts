/** Calendar days from local "today" to target (can be negative). */
export function calendarDaysUntil(targetAt: string | Date, now = new Date()): number {
  const target = typeof targetAt === 'string' ? new Date(targetAt) : targetAt;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

export type CountdownRemaining = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  isZero: boolean;
};

export function getCountdownRemaining(targetAt: string | Date, now = new Date()): CountdownRemaining {
  const target = typeof targetAt === 'string' ? new Date(targetAt) : targetAt;
  const totalMs = target.getTime() - now.getTime();
  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, isZero: true };
  }
  const days = Math.floor(totalMs / 86400000);
  const hours = Math.floor((totalMs % 86400000) / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  return { totalMs, days, hours, minutes, seconds, isPast: false, isZero: false };
}

export function targetDateStr(targetAt: string | Date): string {
  const d = typeof targetAt === 'string' ? new Date(targetAt) : targetAt;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Build ISO timestamptz from local date + HH:mm */
export function localDateAndTimeToIso(date: Date, timeHm: string): string {
  const [h, m] = timeHm.split(':').map(Number);
  const local = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    h || 0,
    m || 0,
    0,
    0,
  );
  return local.toISOString();
}
