import {
  Heart,
  BriefcaseBusiness,
  Users,
  PartyPopper,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

export type EventCategory = 'couple' | 'work' | 'social' | 'celebration' | 'important';
export type EventPriority = 'normal' | 'high';

type CategoryMeta = {
  label: string;
  Icon: LucideIcon;
  chipBg: string;
  chipText: string;
};

export const EVENT_CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  couple: {
    label: 'Vi to',
    Icon: Heart,
    chipBg: 'bg-primary/20',
    chipText: 'text-foreground',
  },
  work: {
    label: 'Jobb',
    Icon: BriefcaseBusiness,
    chipBg: 'bg-calendar-accent/60',
    chipText: 'text-foreground',
  },
  social: {
    label: 'Sosialt',
    Icon: Users,
    chipBg: 'bg-list-accent/70',
    chipText: 'text-foreground',
  },
  celebration: {
    label: 'Fest',
    Icon: PartyPopper,
    chipBg: 'bg-member-yellow/60',
    chipText: 'text-foreground',
  },
  important: {
    label: 'Viktig',
    Icon: AlertTriangle,
    chipBg: 'bg-member-peach/65',
    chipText: 'text-foreground',
  },
};

export const CATEGORY_OPTIONS: EventCategory[] = ['couple', 'work', 'social', 'celebration', 'important'];

export function getEventCategoryMeta(category: string | null | undefined) {
  if (!category) return null;
  return EVENT_CATEGORY_META[category as EventCategory] ?? null;
}

export function isHighPriority(priority: string | null | undefined) {
  return priority === 'high';
}
