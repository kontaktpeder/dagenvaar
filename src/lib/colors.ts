export const MEMBER_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'pastel-blue': { bg: 'bg-member-blue', text: 'text-foreground', dot: 'bg-member-blue' },
  'pastel-peach': { bg: 'bg-member-peach', text: 'text-foreground', dot: 'bg-member-peach' },
  'pastel-lavender': { bg: 'bg-member-lavender', text: 'text-foreground', dot: 'bg-member-lavender' },
  'pastel-mint': { bg: 'bg-member-mint', text: 'text-foreground', dot: 'bg-member-mint' },
  'pastel-rose': { bg: 'bg-member-rose', text: 'text-foreground', dot: 'bg-member-rose' },
  'pastel-yellow': { bg: 'bg-member-yellow', text: 'text-foreground', dot: 'bg-member-yellow' },
};

export const COLOR_TOKEN_OPTIONS = [
  'pastel-blue',
  'pastel-peach',
  'pastel-lavender',
  'pastel-mint',
  'pastel-rose',
  'pastel-yellow',
] as const;

export const DAY_PART_LABELS: Record<string, string> = {
  morning: 'Morgen',
  late_morning: 'Formiddag',
  afternoon: 'Ettermiddag',
  evening: 'Kveld',
  night: 'Natt',
  all_day: 'Hele dagen',
};

export const DAY_PART_COLORS: Record<string, string> = {
  morning: 'bg-daypart-morning',
  late_morning: 'bg-daypart-late-morning',
  afternoon: 'bg-daypart-afternoon',
  evening: 'bg-daypart-evening',
  night: 'bg-daypart-night',
};

export function getMemberColor(token: string) {
  return MEMBER_COLORS[token] || MEMBER_COLORS['pastel-blue'];
}
