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
 * Light paper pastels — airy rail fill, clearer midtone ink.
 */
export type CategoryVisuals = {
  soft: string;
  rail: string;
  ink: string;
  swatch: string;
};

const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  // Rose — wet paper, not chalk
  pink: {
    soft: '#FDF0F3',
    rail: '#F6D6DF',
    ink: '#C45F7C',
    swatch: '#E89AAE',
  },
  // Sky
  blue: {
    soft: '#F0F7FC',
    rail: '#C9E2F4',
    ink: '#3D7EB0',
    swatch: '#6BA8D4',
  },
  // Lilac
  purple: {
    soft: '#F6F1FA',
    rail: '#DCCFEA',
    ink: '#7A58A8',
    swatch: '#A488C8',
  },
  // Honey wash
  amber: {
    soft: '#FCF8EA',
    rail: '#F0E4A8',
    ink: '#A67E28',
    swatch: '#D4B44A',
  },
  // Peach
  orange: {
    soft: '#FDF4EC',
    rail: '#F5D2B4',
    ink: '#C06E38',
    swatch: '#E89860',
  },
  // Sage mist
  green: {
    soft: '#F0F8F3',
    rail: '#C5E6D0',
    ink: '#3A8558',
    swatch: '#68B484',
  },
  // Seafoam
  teal: {
    soft: '#EEF8F5',
    rail: '#B5E0D0',
    ink: '#348A76',
    swatch: '#56B49C',
  },
  // Soft coral
  red: {
    soft: '#FDF0F1',
    rail: '#F5CFD4',
    ink: '#C45666',
    swatch: '#E0808E',
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
