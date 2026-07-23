export type AppLocale = 'nb' | 'en';

export const APP_LOCALES: { value: AppLocale; label: string; nativeLabel: string }[] = [
  { value: 'nb', label: 'Norwegian', nativeLabel: 'Norsk' },
  { value: 'en', label: 'English', nativeLabel: 'English' },
];

export function resolveAppLocale(value: string | null | undefined): AppLocale {
  const v = (value ?? '').toLowerCase().trim();
  if (v === 'en' || v.startsWith('en')) return 'en';
  return 'nb';
}

/** Default calendar locale from kind. */
export function defaultLocaleForKind(kind: string | null | undefined): AppLocale {
  const k = (kind ?? '').toLowerCase();
  return k === 'work' || k === 'jobb' ? 'en' : 'nb';
}

/**
 * effective = calendar locale if set, else app locale, else nb.
 * Pass calendarLocale from households.locale.
 */
export function resolveEffectiveLocale(
  calendarLocale: string | null | undefined,
  appLocale: string | null | undefined,
): AppLocale {
  if (calendarLocale) return resolveAppLocale(calendarLocale);
  if (appLocale) return resolveAppLocale(appLocale);
  return 'nb';
}

export const APP_LOCALE_STORAGE_KEY = 'pastelly_app_locale';
