import { nb as nbMessages, type MessageKey } from './nb';
import { en as enMessages } from './en';
import type { AppLocale } from './types';
import { nb, enUS } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';

const dictionaries: Record<AppLocale, Record<MessageKey, string>> = {
  nb: nbMessages,
  en: enMessages,
};

export type { MessageKey };

export function t(
  locale: AppLocale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let text = dictionaries[locale]?.[key] ?? dictionaries.nb[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

export function getDateFnsLocale(locale: AppLocale): DateFnsLocale {
  return locale === 'en' ? enUS : nb;
}

export function getIntlLocale(locale: AppLocale): string {
  return locale === 'en' ? 'en-GB' : 'nb-NO';
}

export function categoryMessageKey(category: string): MessageKey | null {
  const key = `cat.${category}` as MessageKey;
  if (key in nbMessages) return key;
  return null;
}

export function dayPartMessageKey(part: string): MessageKey | null {
  const key = `dayPart.${part}` as MessageKey;
  if (key in nbMessages) return key;
  return null;
}

export function translateCategory(locale: AppLocale, category: string | null | undefined): string {
  if (!category) return t(locale, 'cat.other');
  const key = categoryMessageKey(category);
  return key ? t(locale, key) : category;
}

export function translateDayPart(locale: AppLocale, part: string | null | undefined): string {
  if (!part) return '';
  const key = dayPartMessageKey(part);
  return key ? t(locale, key) : part;
}
