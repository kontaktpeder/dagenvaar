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
 * Airy pastels — same weight as month-overview chips (monthTheme.light / base).
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

/** Flat pastel fill (no white gloss). */
export function categoryMarkFill(soft: string, rail: string): string {
  return `linear-gradient(180deg, ${soft} 0%, ${rail} 100%)`;
}

/** @deprecated Prefer silverMarkRim — kept for any leftover call sites. */
export function categoryMarkOutline(_ink?: string, _strength?: number): string {
  return silverMarkRim();
}

const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  // Tuned to month-overview pastels (MONTH_COLORS + light mix)
  pink: {
    soft: '#F8D4DE',
    rail: '#F0B8C8',
    ink: '#9A5068',
    swatch: '#E8A8BC',
  },
  blue: {
    soft: '#D4E8F6',
    rail: '#B8D8F0',
    ink: '#4A7898',
    swatch: '#98C4E4',
  },
  purple: {
    soft: '#E6D8F2',
    rail: '#D0B8E8',
    ink: '#6E5898',
    swatch: '#B8A0D8',
  },
  amber: {
    soft: '#F8ECC0',
    rail: '#F0DC98',
    ink: '#8A7040',
    swatch: '#E0C870',
  },
  orange: {
    soft: '#F8DCC8',
    rail: '#F0C0A0',
    ink: '#9A6040',
    swatch: '#E8B088',
  },
  green: {
    soft: '#D0ECD8',
    rail: '#B0E0C0',
    ink: '#3A7858',
    swatch: '#88C8A0',
  },
  teal: {
    soft: '#CCEAE0',
    rail: '#A8DCC8',
    ink: '#3A7868',
    swatch: '#78C4B0',
  },
  red: {
    soft: '#F6D8DC',
    rail: '#EEC0C8',
    ink: '#985058',
    swatch: '#E0A0A8',
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
