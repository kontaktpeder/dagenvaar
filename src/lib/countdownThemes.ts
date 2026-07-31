export type CountdownThemeId = 'rose' | 'mint' | 'peach' | 'lavender' | 'sky' | 'sunset';

export type CountdownTheme = {
  id: CountdownThemeId;
  labelNb: string;
  labelEn: string;
  /** Soft card / sheet background */
  softBg: string;
  /** Accent for numbers / CTAs */
  accentText: string;
  accentBg: string;
  /** CSS linear-gradient for hero */
  gradient: string;
  confetti: string[];
};

export const COUNTDOWN_THEMES: Record<CountdownThemeId, CountdownTheme> = {
  rose: {
    id: 'rose',
    labelNb: 'Rose',
    labelEn: 'Rose',
    softBg: 'bg-pink-100',
    accentText: 'text-pink-700',
    accentBg: 'bg-pink-200',
    gradient: 'linear-gradient(145deg, #fce7f3 0%, #fda4af 55%, #fb7185 100%)',
    confetti: ['#f9a8d4', '#fb7185', '#fda4af', '#fde68a', '#c4b5fd'],
  },
  mint: {
    id: 'mint',
    labelNb: 'Mint',
    labelEn: 'Mint',
    softBg: 'bg-emerald-100',
    accentText: 'text-emerald-800',
    accentBg: 'bg-emerald-200',
    gradient: 'linear-gradient(145deg, #d1fae5 0%, #6ee7b7 55%, #34d399 100%)',
    confetti: ['#a7f3d0', '#6ee7b7', '#fde68a', '#93c5fd', '#f9a8d4'],
  },
  peach: {
    id: 'peach',
    labelNb: 'Fersken',
    labelEn: 'Peach',
    softBg: 'bg-orange-100',
    accentText: 'text-orange-800',
    accentBg: 'bg-orange-200',
    gradient: 'linear-gradient(145deg, #ffedd5 0%, #fdba74 55%, #fb923c 100%)',
    confetti: ['#fdba74', '#fb923c', '#fde68a', '#f9a8d4', '#a7f3d0'],
  },
  lavender: {
    id: 'lavender',
    labelNb: 'Lavendel',
    labelEn: 'Lavender',
    softBg: 'bg-violet-100',
    accentText: 'text-violet-800',
    accentBg: 'bg-violet-200',
    gradient: 'linear-gradient(145deg, #ede9fe 0%, #c4b5fd 55%, #a78bfa 100%)',
    confetti: ['#c4b5fd', '#a78bfa', '#f9a8d4', '#93c5fd', '#fde68a'],
  },
  sky: {
    id: 'sky',
    labelNb: 'Himmel',
    labelEn: 'Sky',
    softBg: 'bg-sky-100',
    accentText: 'text-sky-800',
    accentBg: 'bg-sky-200',
    gradient: 'linear-gradient(145deg, #e0f2fe 0%, #7dd3fc 55%, #38bdf8 100%)',
    confetti: ['#93c5fd', '#7dd3fc', '#a7f3d0', '#fde68a', '#f9a8d4'],
  },
  sunset: {
    id: 'sunset',
    labelNb: 'Solnedgang',
    labelEn: 'Sunset',
    softBg: 'bg-amber-100',
    accentText: 'text-amber-900',
    accentBg: 'bg-amber-200',
    gradient: 'linear-gradient(145deg, #fef3c7 0%, #fcd34d 40%, #fb7185 100%)',
    confetti: ['#fcd34d', '#fb7185', '#fdba74', '#f9a8d4', '#c4b5fd'],
  },
};

export const COUNTDOWN_THEME_IDS = Object.keys(COUNTDOWN_THEMES) as CountdownThemeId[];

export function getCountdownTheme(id: string | null | undefined): CountdownTheme {
  if (id && id in COUNTDOWN_THEMES) return COUNTDOWN_THEMES[id as CountdownThemeId];
  return COUNTDOWN_THEMES.rose;
}
