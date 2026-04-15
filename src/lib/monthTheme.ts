export type MonthTheme = {
  base: string;
  light: string;
  dark: string;
  textOnStrong: string;
  gradient: string;
};

const MONTH_COLORS = [
  "#C8DCF0", // Jan – kald vinterblå (sky blue)
  "#D8C8E8", // Feb – lavendel
  "#C8E8D0", // Mar – mint cream grønn
  "#F0C8D0", // Apr – blush pink
  "#F2D0D8", // May – lyserød/rosa
  "#F5E8B0", // Jun – butter yellow sommer
  "#F0D8B8", // Jul – soft peach sommer
  "#F0E0A8", // Aug – butter yellow sensommer
  "#C8DCC8", // Sep – mint cream høst
  "#F0C8A0", // Oct – soft peach/oransje høstløv
  "#B8CDE8", // Nov – sky blue sen høst
  "#C8C0D8", // Dec – lavendel vinter
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
