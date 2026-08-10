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
 * Clearer pastels — soft fill + rail + ink.
 * Soft enough for Pastelly, but with cleaner hue identity than default Tailwind pastels.
 */
export type CategoryVisuals = {
  /** Soft chip / list row background */
  soft: string;
  /** Calendar rail / mark fill */
  rail: string;
  /** Icon / accent ink */
  ink: string;
  /** Solid swatch for color picker */
  swatch: string;
};

const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  // Rose quartz / blush
  pink: {
    soft: '#FCE8EE',
    rail: '#F0B8C8',
    ink: '#B84E6E',
    swatch: '#E88A9E',
  },
  // Clear sky
  blue: {
    soft: '#E6F2FB',
    rail: '#A8CFF0',
    ink: '#2F6FA8',
    swatch: '#5B9FD4',
  },
  // Soft amethyst
  purple: {
    soft: '#F0E8F8',
    rail: '#C8B0E0',
    ink: '#6B4A9E',
    swatch: '#9B7BC8',
  },
  // Honey
  amber: {
    soft: '#FBF3DC',
    rail: '#E8D078',
    ink: '#9A7420',
    swatch: '#D4B03A',
  },
  // Coral peach
  orange: {
    soft: '#FCEEE4',
    rail: '#F0B888',
    ink: '#B8622E',
    swatch: '#E89050',
  },
  // Sage
  green: {
    soft: '#E8F5EC',
    rail: '#A8D8B8',
    ink: '#2F7A4E',
    swatch: '#5BAF78',
  },
  // Seafoam / jade
  teal: {
    soft: '#E4F4F0',
    rail: '#90D0B8',
    ink: '#2A7A68',
    swatch: '#4AAF96',
  },
  // Soft coral-rose (clearer than muddy red-200)
  red: {
    soft: '#FCE8E8',
    rail: '#F0A8B0',
    ink: '#B84858',
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

/** @deprecated Prefer getCategoryTokenVisuals — kept for call sites expecting a bg class. */
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
