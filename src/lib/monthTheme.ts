export type MonthTheme = {
  base: string;
  light: string;
  dark: string;
  textOnStrong: string;
  gradient: string;
};

/**
 * Muted blob pastels — one shared family for months, events, and paper.
 * Cream stays a soft summer / neutral wash; never a loud category.
 */
export const PASTEL = {
  mustard: "#F0C060",
  periwinkle: "#A8B8E8",
  cream: "#F0D0C0",
  teal: "#88C0D0",
  coral: "#F89888",
  sage: "#D0E8C0",
  blush: "#F8C8C8",
  /** Clean white — pastels read clearer than on warm cream */
  paper: "#FFFFFF",
  ink: "#3A2A38",
} as const;

/** Seasonal rotation of the 7-tone set across 12 months. */
const MONTH_COLORS = [
  PASTEL.periwinkle, // Jan
  PASTEL.blush, // Feb
  PASTEL.sage, // Mar
  PASTEL.blush, // Apr
  PASTEL.coral, // May
  PASTEL.mustard, // Jun
  PASTEL.cream, // Jul
  PASTEL.mustard, // Aug
  PASTEL.teal, // Sep
  PASTEL.coral, // Oct
  PASTEL.periwinkle, // Nov
  PASTEL.blush, // Dec
];

function clamp(v: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;
  const n = parseInt(value, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mix(hexA: string, hexB: string, amount: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex(
    Math.round(a.r + (b.r - a.r) * t),
    Math.round(a.g + (b.g - a.g) * t),
    Math.round(a.b + (b.b - a.b) * t),
  );
}

/** Same hue as the fill, shaded like month-overview labels. */
export function shadeInk(fill: string): string {
  return mix(fill, PASTEL.ink, 0.46);
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** Calendar month strip uses a paper wash; year chips keep fuller `base`. */
export function getMonthTheme(date: Date): MonthTheme {
  const base = MONTH_COLORS[date.getMonth()];
  const light = mix(base, PASTEL.paper, 0.58);
  const dark = mix(base, PASTEL.ink, 0.42);
  // Pastel fills — white-on-base is unreadable. Use shaded ink on the same hue.
  const textOnStrong = shadeInk(base);
  const gradient = light;
  return { base, light, dark, textOnStrong, gradient };
}
