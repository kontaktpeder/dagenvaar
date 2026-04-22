import {
  Heart,
  BriefcaseBusiness,
  Users,
  PartyPopper,
  AlertTriangle,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

export type EventCategory = 'couple' | 'work' | 'social' | 'celebration' | 'important' | 'other';
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
  other: {
    label: 'Annet',
    Icon: MoreHorizontal,
    chipBg: 'bg-muted',
    chipText: 'text-foreground',
    iconColor: 'text-muted-foreground',
  },
};

export const CATEGORY_OPTIONS: EventCategory[] = ['couple', 'work', 'social', 'celebration', 'important', 'other'];

export function getEventCategoryMeta(category: string | null | undefined) {
  if (!category) return null;
  return EVENT_CATEGORY_META[category as EventCategory] ?? null;
}

export function isHighPriority(priority: string | null | undefined) {
  return priority === 'high';
}
