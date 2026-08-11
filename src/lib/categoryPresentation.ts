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
 * Clear pastel marks — solid color sitting on the daypart aura (no glass/chrome).
 */
export type CategoryVisuals = {
  soft: string;
  rail: string;
  ink: string;
  swatch: string;
};

/** Soft depth only — no metallic rim. */
export function silverMarkRim(): string {
  return '0 0.5px 1.5px rgba(40,30,50,0.08)';
}

/** Clear pastel fill for event marks. */
export function categoryMarkFill(soft: string, rail: string): string {
  return `linear-gradient(180deg, ${soft} 0%, ${rail} 100%)`;
}

/** @deprecated Prefer silverMarkRim */
export function categoryMarkOutline(_ink?: string, _strength?: number): string {
  return silverMarkRim();
}

const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  // Clear, vivid pastels
  pink: {
    soft: '#F9C8D6',
    rail: '#F09AB0',
    ink: '#B03858',
    swatch: '#E8789A',
  },
  blue: {
    soft: '#B8DCF5',
    rail: '#7EBBE8',
    ink: '#246898',
    swatch: '#5B9FD0',
  },
  purple: {
    soft: '#D8C4F0',
    rail: '#B898E0',
    ink: '#5C3898',
    swatch: '#9B72C8',
  },
  amber: {
    soft: '#F5E08A',
    rail: '#E8C848',
    ink: '#8A6810',
    swatch: '#D4AE35',
  },
  orange: {
    soft: '#F5C89A',
    rail: '#ECA068',
    ink: '#A84E20',
    swatch: '#E88848',
  },
  green: {
    soft: '#A8E0BE',
    rail: '#6EC898',
    ink: '#207048',
    swatch: '#52B078',
  },
  teal: {
    soft: '#9EE0D0',
    rail: '#5EC8B0',
    ink: '#1C6E60',
    swatch: '#48B098',
  },
  red: {
    soft: '#F5B8C0',
    rail: '#E88898',
    ink: '#A83848',
    swatch: '#E06878',
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
