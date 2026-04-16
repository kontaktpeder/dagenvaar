export const DAY_PART_ORDER = ['morning', 'late_morning', 'afternoon', 'evening', 'night', 'all_day'] as const;
export type DayPart = typeof DAY_PART_ORDER[number];

export const DAY_PART_TIME_RANGES: Record<DayPart, { start: string; end: string; label: string }> = {
  morning:      { start: '06:00', end: '09:00', label: '06–09' },
  late_morning: { start: '09:00', end: '12:00', label: '09–12' },
  afternoon:    { start: '12:00', end: '18:00', label: '12–18' },
  evening:      { start: '18:00', end: '24:00', label: '18–24' },
  night:        { start: '00:00', end: '06:00', label: '00–06' },
  all_day:      { start: '00:00', end: '24:00', label: '00–24' },
} as const;

/** Timeline axis constants */
export const AXIS_START = 6;
export const AXIS_END = 30; // 06:00 → 06:00 next day mapped as 6→30
export const AXIS_SPAN = AXIS_END - AXIS_START;

/** Axis ranges for positioning events on the timeline (hour-based, wraps after midnight) */
export const DAY_PART_AXIS_RANGES: Record<string, [number, number]> = {
  morning:      [6, 9],
  late_morning: [9, 12],
  afternoon:    [12, 18],
  evening:      [18, 24],
  night:        [24, 30],
  all_day:      [6, 30],
};

/** Segment boundaries for the 5-column timeline (excludes all_day) */
export const TIMELINE_SEGMENTS: { key: DayPart; label: string }[] = [
  { key: 'morning',      label: '06–09' },
  { key: 'late_morning', label: '09–12' },
  { key: 'afternoon',    label: '12–18' },
  { key: 'evening',      label: '18–24' },
  { key: 'night',        label: '00–06' },
];

export function dayPartToTimeRange(part: DayPart) {
  return DAY_PART_TIME_RANGES[part];
}

/** Parse "HH:MM" to fractional hour on the axis (wraps < 06:00 to 24+) */
export function parseTimeToAxisHour(value: string | null): number | null {
  if (!value) return null;
  const [hh, mm] = value.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  let hour = hh + mm / 60;
  if (hour < AXIS_START) hour += 24;
  return hour;
}

/** Find the single day-part that best matches a given time, or range for a span */
export function timeRangeToDayParts(startTime: string, endTime: string): [number, number] {
  const startH = parseTimeToAxisHour(startTime) ?? AXIS_START;
  const endH = parseTimeToAxisHour(endTime) ?? startH + 1;

  const parts = DAY_PART_ORDER.slice(0, 5); // exclude all_day
  let bestStart = 2; // default afternoon
  let bestEnd = 2;
  let bestStartOverlap = 0;
  let bestEndOverlap = 0;

  parts.forEach((p, idx) => {
    const [rStart, rEnd] = DAY_PART_AXIS_RANGES[p];
    const overlapStart = Math.max(0, Math.min(rEnd, startH + 0.5) - Math.max(rStart, startH - 0.5));
    if (overlapStart > bestStartOverlap || (overlapStart === bestStartOverlap && startH >= rStart && startH < rEnd)) {
      bestStartOverlap = overlapStart;
      bestStart = idx;
    }
    const overlapEnd = Math.max(0, Math.min(rEnd, endH + 0.5) - Math.max(rStart, endH - 0.5));
    if (overlapEnd > bestEndOverlap || (overlapEnd === bestEndOverlap && endH > rStart && endH <= rEnd)) {
      bestEndOverlap = overlapEnd;
      bestEnd = idx;
    }
  });

  // Simple: find which segment contains start and end
  parts.forEach((p, idx) => {
    const [rStart, rEnd] = DAY_PART_AXIS_RANGES[p];
    if (startH >= rStart && startH < rEnd) bestStart = idx;
    if (endH > rStart && endH <= rEnd) bestEnd = idx;
  });

  return [Math.min(bestStart, bestEnd), Math.max(bestStart, bestEnd)];
}
