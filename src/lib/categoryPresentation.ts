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
 * Light paper pastels — soft fill + clearer ink inside silver-rimmed marks.
 */
export type CategoryVisuals = {
  soft: string;
  rail: string;
  ink: string;
  swatch: string;
};

/** Thin chrome / silver metal rim (highlight + cool edge). */
export function silverMarkRim(): string {
  return [
    'inset 0 0 0 1px rgba(168,176,188,0.75)',
    'inset 0 0.5px 0 rgba(255,255,255,0.85)',
    'inset 0 -0.5px 0 rgba(70,80,100,0.18)',
  ].join(', ');
}

/** Clearer pastel fill for glass calendar marks. */
export function categoryMarkFill(soft: string, rail: string): string {
  return `linear-gradient(165deg, rgba(255,255,255,0.92) 0%, ${soft} 32%, ${rail} 100%)`;
}

/** @deprecated Prefer silverMarkRim */
export function categoryMarkOutline(_ink?: string, _strength?: number): string {
  return silverMarkRim();
}

const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  // Clearer pastels — readable on glass
  pink: {
    soft: '#FCE4EC',
    rail: '#F4B8C8',
    ink: '#C0456A',
    swatch: '#E8789A',
  },
  blue: {
    soft: '#E3F0FA',
    rail: '#A8D0F0',
    ink: '#2E6FA8',
    swatch: '#5B9FD0',
  },
  purple: {
    soft: '#EDE4F7',
    rail: '#C8B0E4',
    ink: '#6B45A0',
    swatch: '#9B72C8',
  },
  amber: {
    soft: '#FBF0D0',
    rail: '#E8D078',
    ink: '#9A6E18',
    swatch: '#D4AE35',
  },
  orange: {
    soft: '#FCE8D8',
    rail: '#F0B888',
    ink: '#B85A28',
    swatch: '#E88848',
  },
  green: {
    soft: '#E0F4E8',
    rail: '#98D8B0',
    ink: '#2A7A48',
    swatch: '#52B078',
  },
  teal: {
    soft: '#DCF4EE',
    rail: '#88D0B8',
    ink: '#247A68',
    swatch: '#48B098',
  },
  red: {
    soft: '#FCE4E6',
    rail: '#F0A8B0',
    ink: '#B84050',
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
