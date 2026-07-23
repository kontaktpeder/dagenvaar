export type CalendarKind = 'home' | 'work';

export const CALENDAR_KINDS: {
  value: CalendarKind;
  label: string;
  defaultName: string;
  description: string;
}[] = [
  {
    value: 'home',
    label: 'Hjem',
    defaultName: 'Vårt hjem',
    description: 'For deg og de nærmeste',
  },
  {
    value: 'work',
    label: 'Jobb',
    defaultName: 'Jobb',
    description: 'For jobb og samarbeid',
  },
];

export function calendarKindLabel(kind: string | null | undefined): string {
  if (kind === 'work') return 'Jobb';
  return 'Hjem';
}

export function defaultShowInOtherCalendars(kind: CalendarKind): boolean {
  return kind === 'work';
}
