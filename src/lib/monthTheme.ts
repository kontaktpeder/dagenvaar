export type MonthTheme = {
  base: string;
  light: string;
  dark: string;
  textOnStrong: string;
  gradient: string;
};

const MONTH_COLORS = [
  "#DCEBFF", // Jan
  "#E9D8FF", // Feb
  "#DDF7E3", // Mar
  "#F7CFE0", // Apr
  "#CFF7D9", // May
  "#FFF1B8", // Jun
  "#FFD9B8", // Jul
  "#FFE3A8", // Aug
  "#D6F5EE", // Sep
  "#FFD6E7", // Oct
  "#D9E4FF", // Nov
  "#CFEAF7", // Dec
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

export function getMonthTheme(date: Date): MonthTheme {
  const base = MONTH_COLORS[date.getMonth()];
  const light = mix(base, "#FFFFFF", 0.35);
  const dark = mix(base, "#000000", 0.14);
  const textOnStrong = "#FFFFFF";
  const gradient = `linear-gradient(135deg, ${base} 0%, ${light} 100%)`;
  return { base, light, dark, textOnStrong, gradient };
}
