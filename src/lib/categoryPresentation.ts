import type { EventCategory } from '@/lib/eventCategories';
import { getCategoryOptionsForKind } from '@/lib/eventCategories';
import type { CalendarKind } from '@/lib/calendarKinds';
import { translateCategory } from '@/lib/i18n';
import type { AppLocale } from '@/lib/i18n/types';
import { PASTEL, mix, shadeInk, withAlpha } from '@/lib/monthTheme';

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
 * Soft pastels — same family as month overview. Ink stays deep so icons read.
 */
export type CategoryVisuals = {
  soft: string;
  rail: string;
  ink: string;
  swatch: string;
};

function tokenVisuals(rail: string): CategoryVisuals {
  return {
    soft: mix(rail, PASTEL.paper, 0.22),
    rail,
    ink: shadeInk(rail),
    swatch: rail,
  };
}

/** Soft edge only — no chrome/glass rim. */
export function silverMarkRim(): string {
  return 'none';
}

/** Airy pastel fill so paper shows through. */
export function categoryMarkFill(_soft: string, rail: string): string {
  if (rail.startsWith('hsl')) return rail;
  return withAlpha(rail, 0.78);
}

/** @deprecated Prefer silverMarkRim — kept for any leftover call sites. */
export function categoryMarkOutline(_ink?: string, _strength?: number): string {
  return silverMarkRim();
}

/** Same hex family as month bands — tokens are aliases into PASTEL. */
const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  pink: tokenVisuals(PASTEL.blush),
  blue: tokenVisuals(PASTEL.periwinkle),
  // No dedicated purple in the blob set — periwinkle nudged toward blush.
  purple: tokenVisuals(mix(PASTEL.periwinkle, PASTEL.blush, 0.35)),
  amber: tokenVisuals(PASTEL.mustard),
  orange: tokenVisuals(mix(PASTEL.coral, PASTEL.cream, 0.28)),
  green: tokenVisuals(PASTEL.sage),
  teal: tokenVisuals(PASTEL.teal),
  red: tokenVisuals(PASTEL.coral),
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
