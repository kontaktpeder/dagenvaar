export type MonthTheme = {
  base: string;
  light: string;
  dark: string;
  textOnStrong: string;
  gradient: string;
};

const MONTH_COLORS = [
  "#B8D8F0", // Jan – frisk isblå
  "#D0B8E8", // Feb – klar lavendel
  "#A8E0B8", // Mar – frisk mintgrønn
  "#F5B8C8", // Apr – klar blush pink
  "#F0A8B8", // May – frisk rosa
  "#F5E098", // Jun – klar smørgul
  "#F5C090", // Jul – frisk fersken
  "#E8C878", // Aug – varm honninggul
  "#90D0B8", // Sep – frisk jadegrønn
  "#F0B888", // Oct – klar oransje pastell
  "#88B8E8", // Nov – frisk himmelblå
  "#C0A8D8", // Dec – klar ametyst
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
  const dark = mix(base, "#000000", 0.25);
  const textOnStrong = "#FFFFFF";
  const gradient = base;
  return { base, light, dark, textOnStrong, gradient };
}
