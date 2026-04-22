import type { EventCategory } from '@/lib/eventCategories';

export type CategoryColorToken = 'pink' | 'blue' | 'purple' | 'amber' | 'orange' | 'green' | 'teal' | 'red';

type MainCategory = Exclude<EventCategory, 'other'>;

export type CategoryColorMap = Partial<Record<MainCategory, CategoryColorToken>>;

export const DEFAULT_CATEGORY_COLOR_MAP: Record<MainCategory, CategoryColorToken> = {
  couple: 'pink',
  work: 'blue',
  social: 'purple',
  celebration: 'amber',
  important: 'orange',
};

type Visuals = {
  iconColor: string;
  dotColor: string;
  softBg: string;
  chipBg: string;
};

const TOKEN_TO_TW: Record<CategoryColorToken, Visuals> = {
  pink:   { iconColor: 'text-pink-500',   dotColor: 'bg-pink-500',   softBg: 'bg-pink-100',   chipBg: 'bg-pink-100' },
  blue:   { iconColor: 'text-blue-500',   dotColor: 'bg-blue-500',   softBg: 'bg-blue-100',   chipBg: 'bg-blue-100' },
  purple: { iconColor: 'text-purple-500', dotColor: 'bg-purple-500', softBg: 'bg-purple-100', chipBg: 'bg-purple-100' },
  amber:  { iconColor: 'text-amber-500',  dotColor: 'bg-amber-500',  softBg: 'bg-amber-100',  chipBg: 'bg-amber-100' },
  orange: { iconColor: 'text-orange-500', dotColor: 'bg-orange-500', softBg: 'bg-orange-100', chipBg: 'bg-orange-100' },
  green:  { iconColor: 'text-green-500',  dotColor: 'bg-green-500',  softBg: 'bg-green-100',  chipBg: 'bg-green-100' },
  teal:   { iconColor: 'text-teal-500',   dotColor: 'bg-teal-500',   softBg: 'bg-teal-100',   chipBg: 'bg-teal-100' },
  red:    { iconColor: 'text-red-500',    dotColor: 'bg-red-500',    softBg: 'bg-red-100',    chipBg: 'bg-red-100' },
};

const OTHER_NEUTRAL: Visuals = {
  iconColor: 'text-muted-foreground',
  dotColor: 'bg-muted-foreground',
  softBg: 'bg-muted',
  chipBg: 'bg-muted',
};

export const COLOR_TOKEN_OPTIONS: CategoryColorToken[] = ['pink', 'blue', 'purple', 'amber', 'orange', 'green', 'teal', 'red'];

export function getColorTokenSwatch(token: CategoryColorToken): string {
  return TOKEN_TO_TW[token].dotColor;
}

export function resolveCategoryVisuals(
  category: EventCategory | string | null | undefined,
  memberColorMap?: CategoryColorMap | null,
): Visuals {
  if (!category || category === 'other') return OTHER_NEUTRAL;
  const cat = category as MainCategory;
  if (!(cat in DEFAULT_CATEGORY_COLOR_MAP)) return OTHER_NEUTRAL;
  const token = memberColorMap?.[cat] ?? DEFAULT_CATEGORY_COLOR_MAP[cat];
  return TOKEN_TO_TW[token] ?? TOKEN_TO_TW[DEFAULT_CATEGORY_COLOR_MAP[cat]];
}

const DEFAULT_LABELS: Record<EventCategory, string> = {
  couple: 'Vi to',
  work: 'Jobb',
  social: 'Sosialt',
  celebration: 'Fest',
  important: 'Viktig',
  other: 'Annet',
};

export function resolveCategoryLabel(
  category: EventCategory | string | null | undefined,
  categoryLabelOverride?: string | null,
): string {
  const cat = (category as EventCategory) || 'other';
  if (cat !== 'other') return DEFAULT_LABELS[cat] ?? DEFAULT_LABELS.other;
  const clean = categoryLabelOverride?.trim();
  return clean ? clean : DEFAULT_LABELS.other;
}

/** Read a member's category_color_map from the row (jsonb) */
export function getMemberColorMap(member: { category_color_map?: unknown } | null | undefined): CategoryColorMap | null {
  if (!member) return null;
  const raw = (member as any).category_color_map;
  if (raw && typeof raw === 'object') return raw as CategoryColorMap;
  return null;
}
