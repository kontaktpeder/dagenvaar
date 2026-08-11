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
  meeting: 'amber',
  production: 'green',
  development: 'blue',
  admin: 'purple',
  personal: 'orange',
  client: 'teal',
  deadline: 'orange',
  focus: 'purple',
};

/**
 * Milky pastels — clear on glass without neon punch.
 */
export type CategoryVisuals = {
  soft: string;
  rail: string;
  ink: string;
  swatch: string;
};

/** Soft lift only — no metal rim. */
export function silverMarkRim(): string {
  return '0 1px 2px rgba(40,30,50,0.07)';
}

/** Soft candy fill for marks on frosted glass. */
export function categoryMarkFill(soft: string, rail: string): string {
  return `linear-gradient(180deg, ${soft} 0%, ${rail} 100%)`;
}

/** @deprecated Prefer silverMarkRim */
export function categoryMarkOutline(_ink?: string, _strength?: number): string {
  return silverMarkRim();
}

const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  pink: {
    soft: '#F8D6E0',
    rail: '#ECA8BC',
    ink: '#B04868',
    swatch: '#E0809C',
  },
  blue: {
    soft: '#CDE6F7',
    rail: '#96C8EC',
    ink: '#2E6FA0',
    swatch: '#5BA8D4',
  },
  purple: {
    soft: '#E4D4F4',
    rail: '#C4A8E4',
    ink: '#6848A0',
    swatch: '#9B78C8',
  },
  amber: {
    soft: '#F7EBB0',
    rail: '#EAD070',
    ink: '#8F7018',
    swatch: '#D4B040',
  },
  orange: {
    soft: '#F8D8BC',
    rail: '#F0B080',
    ink: '#B05828',
    swatch: '#E89058',
  },
  green: {
    soft: '#C4E8D4',
    rail: '#88D0A8',
    ink: '#2A7850',
    swatch: '#58B480',
  },
  teal: {
    soft: '#C0E8DC',
    rail: '#78D0BC',
    ink: '#247868',
    swatch: '#48B4A0',
  },
  red: {
    soft: '#F8D0D6',
    rail: '#ECA0AC',
    ink: '#B04050',
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
