export type MonthTheme = {
  base: string;
  light: string;
  dark: string;
  textOnStrong: string;
  gradient: string;
};

const MONTH_COLORS = [
  "#B8D8F0", // Jan – myk isblå
  "#D4B8E8", // Feb – myk lavendel
  "#B0E4C4", // Mar – myk mint
  "#F5C0D0", // Apr – myk blush
  "#F2B4C4", // May – myk rosa
  "#F5E4A8", // Jun – myk smørgul
  "#F5C8A8", // Jul – myk fersken
  "#E8D08A", // Aug – myk honning
  "#A8DCC8", // Sep – myk jade
  "#F0C8A0", // Oct – myk oransje
  "#A8C8EC", // Nov – myk himmel
  "#C8B4E0", // Dec – myk ametyst
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

function mix(hexA: string, hexB: string, amount: number) {
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
  return mix(fill, "#3A2A38", 0.46);
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** Month band, year chips, and list header share the same solid pastel. */
export function getMonthTheme(date: Date): MonthTheme {
  const base = MONTH_COLORS[date.getMonth()];
  const light = mix(base, "#FFFFFF", 0.42);
  const dark = mix(base, "#3A2A38", 0.42);
  const textOnStrong = "#FFFFFF";
  const gradient = base;
  return { base, light, dark, textOnStrong, gradient };
}
