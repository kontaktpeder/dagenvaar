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
    'inset 0 0 0 1px #A8B0BC',
    'inset 0 0.5px 0 #F7F8FA',
    'inset 0 -0.5px 0 rgba(70,80,100,0.22)',
  ].join(', ');
}

/** Soft pastel fill with extra depth for pill marks. */
export function categoryMarkFill(soft: string, rail: string): string {
  return `linear-gradient(165deg, #FFFFFF 0%, ${soft} 38%, ${rail} 100%)`;
}

/** @deprecated Prefer silverMarkRim — kept for any leftover call sites. */
export function categoryMarkOutline(_ink?: string, _strength?: number): string {
  return silverMarkRim();
}

const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  // Rose — wet paper, not chalk
  pink: {
    soft: '#FDF2F5',
    rail: '#F8DCE5',
    ink: '#C45F7C',
    swatch: '#E89AAE',
  },
  // Sky
  blue: {
    soft: '#F2F8FC',
    rail: '#D0E8F6',
    ink: '#3D7EB0',
    swatch: '#6BA8D4',
  },
  // Lilac
  purple: {
    soft: '#F7F3FB',
    rail: '#E2D6EF',
    ink: '#7A58A8',
    swatch: '#A488C8',
  },
  // Honey wash
  amber: {
    soft: '#FCF9EE',
    rail: '#F2E8B4',
    ink: '#A67E28',
    swatch: '#D4B44A',
  },
  // Peach
  orange: {
    soft: '#FDF5EE',
    rail: '#F7D9BE',
    ink: '#C06E38',
    swatch: '#E89860',
  },
  // Sage mist
  green: {
    soft: '#F1F8F4',
    rail: '#CDE9D6',
    ink: '#3A8558',
    swatch: '#68B484',
  },
  // Seafoam
  teal: {
    soft: '#EFF8F5',
    rail: '#BEE4D6',
    ink: '#348A76',
    swatch: '#56B49C',
  },
  // Soft coral
  red: {
    soft: '#FDF2F3',
    rail: '#F6D5DA',
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
