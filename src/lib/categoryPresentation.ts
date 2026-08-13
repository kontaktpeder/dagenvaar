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
 * Clear candy pastels — solid fills, no glass wash.
 */
export type CategoryVisuals = {
  soft: string;
  rail: string;
  ink: string;
  swatch: string;
};

/** Soft edge only — no chrome/glass rim. */
export function silverMarkRim(): string {
  return '0 0.5px 1px rgba(40,30,50,0.08)';
}

/** Flat pastel fill (no white gloss). */
export function categoryMarkFill(soft: string, rail: string): string {
  return `linear-gradient(180deg, ${soft} 0%, ${rail} 100%)`;
}

/** @deprecated Prefer silverMarkRim — kept for any leftover call sites. */
export function categoryMarkOutline(_ink?: string, _strength?: number): string {
  return silverMarkRim();
}

const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  pink: {
    soft: '#F6C8D6',
    rail: '#E898B0',
    ink: '#A83858',
    swatch: '#E0809C',
  },
  blue: {
    soft: '#B8DCF4',
    rail: '#7CB8E4',
    ink: '#286898',
    swatch: '#5BA8D4',
  },
  purple: {
    soft: '#D8C0F0',
    rail: '#B090DC',
    ink: '#5C3898',
    swatch: '#9B78C8',
  },
  amber: {
    soft: '#F5E48A',
    rail: '#E4C848',
    ink: '#8A6810',
    swatch: '#D4B040',
  },
  orange: {
    soft: '#F5C8A0',
    rail: '#E89860',
    ink: '#A84820',
    swatch: '#E89058',
  },
  green: {
    soft: '#A8E0C0',
    rail: '#68C898',
    ink: '#247848',
    swatch: '#58B480',
  },
  teal: {
    soft: '#A0E0D0',
    rail: '#58C8B0',
    ink: '#1C7060',
    swatch: '#48B4A0',
  },
  red: {
    soft: '#F4C0C8',
    rail: '#E48898',
    ink: '#A83848',
    swatch: '#E07080',
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
