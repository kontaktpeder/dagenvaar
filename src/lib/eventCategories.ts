import {
  Heart,
  BriefcaseBusiness,
  Users,
  PartyPopper,
  AlertTriangle,
  Plane,
  MoreHorizontal,
  UsersRound,
  Handshake,
  Flag,
  Target,
  ClipboardList,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { CalendarKind } from '@/lib/calendarKinds';
import { resolveCalendarKind } from '@/lib/calendarKinds';

export type HomeEventCategory =
  | 'couple'
  | 'work'
  | 'social'
  | 'celebration'
  | 'important'
  | 'travel'
  | 'other';

/** WORK core–aligned categories for jobbkalender. */
export type WorkEventCategory =
  | 'meeting'
  | 'production'
  | 'development'
  | 'admin'
  | 'personal'
  | 'travel'
  | 'other';

/** Legacy work keys still readable on old events. */
export type LegacyWorkEventCategory = 'client' | 'deadline' | 'focus';

/** All persisted category keys (home + work + legacy). */
export type EventCategory = HomeEventCategory | WorkEventCategory | LegacyWorkEventCategory;

export type EventPriority = 'normal' | 'high';

type CategoryMeta = {
  label: string;
  Icon: LucideIcon;
  chipBg: string;
  chipText: string;
  iconColor: string;
};

export const EVENT_CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  couple: {
    label: 'Vi to',
    Icon: Heart,
    chipBg: 'bg-primary/20',
    chipText: 'text-foreground',
    iconColor: 'text-pink-500',
  },
  work: {
    label: 'Jobb',
    Icon: BriefcaseBusiness,
    chipBg: 'bg-calendar-accent/60',
    chipText: 'text-foreground',
    iconColor: 'text-blue-500',
  },
  social: {
    label: 'Sosialt',
    Icon: Users,
    chipBg: 'bg-list-accent/70',
    chipText: 'text-foreground',
    iconColor: 'text-purple-500',
  },
  celebration: {
    label: 'Fest',
    Icon: PartyPopper,
    chipBg: 'bg-member-yellow/60',
    chipText: 'text-foreground',
    iconColor: 'text-amber-500',
  },
  important: {
    label: 'Viktig',
    Icon: AlertTriangle,
    chipBg: 'bg-member-peach/65',
    chipText: 'text-foreground',
    iconColor: 'text-orange-500',
  },
  travel: {
    label: 'Reise',
    Icon: Plane,
    chipBg: 'bg-member-mint/60',
    chipText: 'text-foreground',
    iconColor: 'text-teal-500',
  },
  meeting: {
    label: 'Møte',
    Icon: UsersRound,
    chipBg: 'bg-amber-100',
    chipText: 'text-foreground',
    iconColor: 'text-amber-500',
  },
  production: {
    label: 'Produksjon',
    Icon: BriefcaseBusiness,
    chipBg: 'bg-green-100',
    chipText: 'text-foreground',
    iconColor: 'text-green-500',
  },
  development: {
    label: 'Utvikling',
    Icon: Target,
    chipBg: 'bg-blue-100',
    chipText: 'text-foreground',
    iconColor: 'text-blue-500',
  },
  admin: {
    label: 'Administrasjon',
    Icon: ClipboardList,
    chipBg: 'bg-purple-100',
    chipText: 'text-foreground',
    iconColor: 'text-purple-500',
  },
  personal: {
    label: 'Personal',
    Icon: User,
    chipBg: 'bg-orange-100',
    chipText: 'text-foreground',
    iconColor: 'text-orange-500',
  },
  // Legacy — still render old events
  client: {
    label: 'Kunde',
    Icon: Handshake,
    chipBg: 'bg-teal-100',
    chipText: 'text-foreground',
    iconColor: 'text-teal-500',
  },
  deadline: {
    label: 'Frist',
    Icon: Flag,
    chipBg: 'bg-orange-100',
    chipText: 'text-foreground',
    iconColor: 'text-orange-500',
  },
  focus: {
    label: 'Fokus',
    Icon: Target,
    chipBg: 'bg-purple-100',
    chipText: 'text-foreground',
    iconColor: 'text-purple-500',
  },
  other: {
    label: 'Annet',
    Icon: MoreHorizontal,
    chipBg: 'bg-muted',
    chipText: 'text-foreground',
    iconColor: 'text-muted-foreground',
  },
};

export const HOME_CATEGORY_OPTIONS: EventCategory[] = [
  'couple',
  'work',
  'social',
  'celebration',
  'important',
  'travel',
  'other',
];

/** Aligns with WORK core work_types (+ Personal, Reise). */
export const WORK_CATEGORY_OPTIONS: EventCategory[] = [
  'meeting',
  'production',
  'development',
  'admin',
  'personal',
  'travel',
  'other',
];

/** @deprecated Prefer getCategoryOptionsForKind — kept for callers that assume home. */
export const CATEGORY_OPTIONS = HOME_CATEGORY_OPTIONS;

export function getCategoryOptionsForKind(
  kind: CalendarKind | string | null | undefined,
): EventCategory[] {
  return resolveCalendarKind(kind) === 'work'
    ? WORK_CATEGORY_OPTIONS
    : HOME_CATEGORY_OPTIONS;
}

export function getEventCategoryMeta(category: string | null | undefined) {
  if (!category) return null;
  return EVENT_CATEGORY_META[category as EventCategory] ?? null;
}

export function isHighPriority(priority: string | null | undefined) {
  return priority === 'high';
}

/** Sort rank for calendar day marks (lower = earlier). */
export const CATEGORY_SORT_ORDER: Record<string, number> = {
  important: 0,
  deadline: 1,
  work: 2,
  meeting: 3,
  production: 4,
  development: 5,
  admin: 6,
  personal: 7,
  client: 8,
  focus: 9,
  couple: 10,
  celebration: 11,
  social: 12,
  travel: 13,
  other: 14,
};
