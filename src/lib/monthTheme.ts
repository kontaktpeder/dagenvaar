export type MonthTheme = {
  base: string;
  light: string;
  dark: string;
  textOnStrong: string;
  gradient: string;
};

const MONTH_COLORS = [
  "#6BB8F0", // Jan – knall isblå
  "#C48AE8", // Feb – knall lavendel
  "#5EDC98", // Mar – knall mint
  "#F878B0", // Apr – knall blush
  "#F25C98", // May – knall rosa
  "#F5D040", // Jun – knall smørgul
  "#F89858", // Jul – knall fersken
  "#E8B83A", // Aug – knall honning
  "#3DCC9A", // Sep – knall jade
  "#F09048", // Oct – knall oransje
  "#4A9EE8", // Nov – knall himmel
  "#B078E0", // Dec – knall ametyst
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

/** Solid punchy month color — same fill in header and year overview. */
export function getMonthTheme(date: Date): MonthTheme {
  const base = MONTH_COLORS[date.getMonth()];
  const light = base;
  const dark = mix(base, "#2A1C28", 0.48);
  const textOnStrong = "#FFFFFF";
  const gradient = base;
  return { base, light, dark, textOnStrong, gradient };
}
