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

type KindSource = {
  kind?: string | null;
  show_in_other_calendars?: boolean | null;
};

/** Resolve home|work even if older rows miss `kind`. */
export function resolveCalendarKind(source: KindSource | string | null | undefined): CalendarKind {
  if (typeof source === 'string' || source == null) {
    const k = (source ?? '').toLowerCase().trim();
    if (k === 'work' || k === 'jobb') return 'work';
    return 'home';
  }
  const k = (source.kind ?? '').toLowerCase().trim();
  if (k === 'work' || k === 'jobb') return 'work';
  if (k === 'home' || k === 'hjem') return 'home';
  // Work calendars defaulted show_in_other_calendars=true at create time
  if (source.show_in_other_calendars === true) return 'work';
  return 'home';
}

export function calendarKindLabel(source: KindSource | string | null | undefined): string {
  return resolveCalendarKind(source) === 'work' ? 'Jobb' : 'Hjem';
}

/** Localized kind label — prefer over calendarKindLabel in UI. */
export function calendarKindLabelLocalized(
  source: KindSource | string | null | undefined,
  t: (key: 'kind.home' | 'kind.work', params?: Record<string, string | number>) => string,
): string {
  return resolveCalendarKind(source) === 'work' ? t('kind.work') : t('kind.home');
}

export function defaultShowInOtherCalendars(kind: CalendarKind): boolean {
  return kind === 'work';
}
