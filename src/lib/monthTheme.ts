export type MonthTheme = {
  base: string;
  light: string;
  dark: string;
  textOnStrong: string;
  gradient: string;
};

const MONTH_COLORS = [
  "#C8DCF0", // Jan – kald vinterblå
  "#D8C8E8", // Feb – dempet lilla, vinter
  "#C8E8D0", // Mar – tidlig vårgrønn
  "#F0E0A0", // Apr – varm gul, påske
  "#E0A8B8", // May – rosa, vår
  "#F0E0A0", // Jun – varm sommerul
  "#F0C8A0", // Jul – varm aprikossommer
  "#E8D098", // Aug – gyllen sensommer
  "#B8D8D0", // Sep – dempet havgrønn, høst
  "#E0B0A0", // Oct – varm rust, høstløv
  "#A8C8E8", // Nov – klar blå, sen høst
  "#A8C8D8", // Dec – kald isblå, vinter
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
