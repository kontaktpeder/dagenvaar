import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  APP_LOCALE_STORAGE_KEY,
  resolveAppLocale,
  resolveEffectiveLocale,
  type AppLocale,
} from '@/lib/i18n/types';
import { t as translate, getDateFnsLocale, getIntlLocale, type MessageKey } from '@/lib/i18n';

type LocaleContextValue = {
  appLocale: AppLocale;
  calendarLocale: AppLocale | null;
  /** Language used for in-calendar UI */
  locale: AppLocale;
  dateLocale: ReturnType<typeof getDateFnsLocale>;
  intlLocale: string;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  setAppLocale: (locale: AppLocale) => Promise<void>;
  setCalendarLocale: (householdId: string, locale: AppLocale) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredAppLocale(): AppLocale {
  try {
    return resolveAppLocale(localStorage.getItem(APP_LOCALE_STORAGE_KEY));
  } catch {
    return 'nb';
  }
}

export function LocaleProvider({
  children,
  calendarLocale: calendarLocaleProp,
}: {
  children: ReactNode;
  /** Active household.locale */
  calendarLocale?: string | null;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [appLocale, setAppLocaleState] = useState<AppLocale>(readStoredAppLocale);

  const prefsQuery = useQuery({
    queryKey: ['user-preferences', user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences' as any)
        .select('app_locale')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { app_locale: string } | null;
    },
  });

  useEffect(() => {
    if (prefsQuery.data?.app_locale) {
      const next = resolveAppLocale(prefsQuery.data.app_locale);
      setAppLocaleState(next);
      try {
        localStorage.setItem(APP_LOCALE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    }
  }, [prefsQuery.data?.app_locale]);

  const calendarLocale = calendarLocaleProp
    ? resolveAppLocale(calendarLocaleProp)
    : null;

  const locale = resolveEffectiveLocale(calendarLocale, appLocale);
  const dateLocale = getDateFnsLocale(locale);
  const intlLocale = getIntlLocale(locale);

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );

  const setAppLocale = useCallback(
    async (next: AppLocale) => {
      setAppLocaleState(next);
      try {
        localStorage.setItem(APP_LOCALE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      if (!user) return;
      const { error } = await supabase.from('user_preferences' as any).upsert(
        { user_id: user.id, app_locale: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['user-preferences', user.id] });
    },
    [user, queryClient],
  );

  const setCalendarLocale = useCallback(
    async (householdId: string, next: AppLocale) => {
      const { error } = await supabase
        .from('households')
        .update({ locale: next } as any)
        .eq('id', householdId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['current-household-context'] });
    },
    [queryClient],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      appLocale,
      calendarLocale,
      locale,
      dateLocale,
      intlLocale,
      t,
      setAppLocale,
      setCalendarLocale,
    }),
    [appLocale, calendarLocale, locale, dateLocale, intlLocale, t, setAppLocale, setCalendarLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Safe fallback outside provider (auth screens before calendar)
    const appLocale = readStoredAppLocale();
    return {
      appLocale,
      calendarLocale: null as AppLocale | null,
      locale: appLocale,
      dateLocale: getDateFnsLocale(appLocale),
      intlLocale: getIntlLocale(appLocale),
      t: (key: MessageKey, params?: Record<string, string | number>) =>
        translate(appLocale, key, params),
      setAppLocale: async (next: AppLocale) => {
        try {
          localStorage.setItem(APP_LOCALE_STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
      },
      setCalendarLocale: async () => {},
    } satisfies LocaleContextValue;
  }
  return ctx;
}
