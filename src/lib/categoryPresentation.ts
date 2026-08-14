import type { EventCategory } from '@/lib/eventCategories';
import { getCategoryOptionsForKind } from '@/lib/eventCategories';
import type { CalendarKind } from '@/lib/calendarKinds';
import { translateCategory } from '@/lib/i18n';
import type { AppLocale } from '@/lib/i18n/types';

export type CategoryColorToken = 'pink' | 'blue' | 'purple' | 'amber' | 'orange' | 'green' | 'teal' | 'red';

type MainCategory = Exclude<EventCategory, 'other'>;

export type CategoryColorMap = Partial<Record<MainCategory, CategoryColorToken>>;

export const DEFAULT_CATEGORY_COLOR_MAP: Record<MainCategory, CategoryColorToken> = {
  couple: 'pink',
  work: 'blue',
  social: 'purple',
  celebration: 'amber',
  important: 'orange',
  travel: 'teal',
  // WORK core hues
  meeting: 'amber',
  production: 'green',
  development: 'blue',
  admin: 'purple',
  personal: 'orange',
  // Legacy
  client: 'teal',
  deadline: 'orange',
  focus: 'purple',
};

/**
 * Month-overview pastels, one step stronger — same hues as MONTH_COLORS.
 */
export type CategoryVisuals = {
  soft: string;
  rail: string;
  ink: string;
  swatch: string;
};

/** Soft edge only — no chrome/glass rim. */
export function silverMarkRim(): string {
  return '0 0.5px 1px rgba(40,30,50,0.06)';
}

/** Solid pastel fill (no white wash). */
export function categoryMarkFill(soft: string, rail: string): string {
  return `linear-gradient(180deg, ${soft} 0%, ${rail} 100%)`;
}

/** @deprecated Prefer silverMarkRim — kept for any leftover call sites. */
export function categoryMarkOutline(_ink?: string, _strength?: number): string {
  return silverMarkRim();
}

const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  pink: {
    soft: '#F5B8C8',
    rail: '#F0A8B8',
    ink: '#A84868',
    swatch: '#F0A8B8',
  },
  blue: {
    soft: '#B8D8F0',
    rail: '#88B8E8',
    ink: '#3A6898',
    swatch: '#88B8E8',
  },
  purple: {
    soft: '#D0B8E8',
    rail: '#C0A8D8',
    ink: '#684888',
    swatch: '#C0A8D8',
  },
  amber: {
    soft: '#F5E098',
    rail: '#E8C878',
    ink: '#8A6820',
    swatch: '#E8C878',
  },
  orange: {
    soft: '#F5C090',
    rail: '#F0B888',
    ink: '#9A5828',
    swatch: '#F0B888',
  },
  green: {
    soft: '#A8E0B8',
    rail: '#90D0B8',
    ink: '#2A7850',
    swatch: '#90D0B8',
  },
  teal: {
    soft: '#90D0B8',
    rail: '#78C4A8',
    ink: '#2A7060',
    swatch: '#78C4A8',
  },
  red: {
    soft: '#F0A8B8',
    rail: '#E898A8',
    ink: '#A84050',
    swatch: '#E898A8',
  },
};

const OTHER_NEUTRAL: CategoryVisuals = {
  soft: 'hsl(var(--muted))',
  rail: 'hsl(var(--muted))',
  ink: 'hsl(var(--muted-foreground))',
  swatch: 'hsl(var(--muted-foreground))',
};

export const COLOR_TOKEN_OPTIONS: CategoryColorToken[] = [
  'pink',
  'blue',
  'purple',
  'amber',
  'orange',
  'green',
  'teal',
  'red',
];

export function getCategoryTokenVisuals(token: CategoryColorToken): CategoryVisuals {
  return TOKEN_PALETTE[token];
}

export function getColorTokenSwatch(token: CategoryColorToken): string {
  return TOKEN_PALETTE[token].swatch;
}

export function resolveCategoryVisuals(
  category: EventCategory | string | null | undefined,
  memberColorMap?: CategoryColorMap | null,
): CategoryVisuals {
  if (!category || category === 'other') return OTHER_NEUTRAL;
  const cat = category as MainCategory;
  if (!(cat in DEFAULT_CATEGORY_COLOR_MAP)) return OTHER_NEUTRAL;
  const token = memberColorMap?.[cat] ?? DEFAULT_CATEGORY_COLOR_MAP[cat];
  return TOKEN_PALETTE[token] ?? TOKEN_PALETTE[DEFAULT_CATEGORY_COLOR_MAP[cat]];
}

export function resolveCategoryLabel(
  category: EventCategory | string | null | undefined,
  categoryLabelOverride?: string | null,
  locale: AppLocale = 'nb',
): string {
  const cat = (category as EventCategory) || 'other';
  if (cat !== 'other') return translateCategory(locale, cat);
  const clean = categoryLabelOverride?.trim();
  return clean ? clean : translateCategory(locale, 'other');
}

/** Read a member's category_color_map from the row (jsonb) */
export function getMemberColorMap(member: { category_color_map?: unknown } | null | undefined): CategoryColorMap | null {
  if (!member) return null;
  const raw = (member as any).category_color_map;
  if (!raw || typeof raw !== 'object') return null;
  return raw as CategoryColorMap;
}

export function getColorableCategoriesForKind(
  kind: CalendarKind | string | null | undefined,
): MainCategory[] {
  return getCategoryOptionsForKind(kind).filter((c): c is MainCategory => c !== 'other');
}
