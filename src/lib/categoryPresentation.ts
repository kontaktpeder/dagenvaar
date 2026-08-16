import type { EventCategory } from '@/lib/eventCategories';
import { getCategoryOptionsForKind } from '@/lib/eventCategories';
import type { CalendarKind } from '@/lib/calendarKinds';
import { translateCategory } from '@/lib/i18n';
import type { AppLocale } from '@/lib/i18n/types';
import { PASTEL, mix, punchInk } from '@/lib/monthTheme';

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

/**
 * Event fills share the knæsj PASTEL family — soft wash, punchy icons.
 */
const EVENT_PASTEL: Record<CategoryColorToken, string> = {
  pink: PASTEL.blush,
  blue: PASTEL.periwinkle,
  purple: mix(PASTEL.periwinkle, PASTEL.blush, 0.4),
  amber: PASTEL.mustard,
  orange: mix(PASTEL.coral, PASTEL.cream, 0.35),
  green: PASTEL.sage,
  teal: PASTEL.teal,
  red: PASTEL.coral,
};

function tokenVisuals(base: string): CategoryVisuals {
  // Keep fill airy but closer to the knæsj hue; ink pops hard.
  const rail = mix(base, PASTEL.paper, 0.06);
  const soft = mix(base, PASTEL.paper, 0.18);
  return {
    soft,
    rail,
    ink: punchInk(base),
    swatch: rail,
  };
}

/** Soft edge only — no chrome/glass rim. */
export function silverMarkRim(): string {
  return 'none';
}

/** Calendar marks use the knæsj rail (soft wash kept for list/detail cards). */
export function categoryMarkFill(_soft: string, rail: string): string {
  if (rail.startsWith('hsl')) return rail;
  return rail;
}

/** @deprecated Prefer silverMarkRim — kept for any leftover call sites. */
export function categoryMarkOutline(_ink?: string, _strength?: number): string {
  return silverMarkRim();
}

/** Category tokens → soft member-like fills (detail-card aesthetic). */
const TOKEN_PALETTE: Record<CategoryColorToken, CategoryVisuals> = {
  pink: tokenVisuals(EVENT_PASTEL.pink),
  blue: tokenVisuals(EVENT_PASTEL.blue),
  purple: tokenVisuals(EVENT_PASTEL.purple),
  amber: tokenVisuals(EVENT_PASTEL.amber),
  orange: tokenVisuals(EVENT_PASTEL.orange),
  green: tokenVisuals(EVENT_PASTEL.green),
  teal: tokenVisuals(EVENT_PASTEL.teal),
  red: tokenVisuals(EVENT_PASTEL.red),
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
