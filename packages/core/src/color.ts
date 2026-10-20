/**
 * Colour math for themes: parse any CSS colour FiveM's Chromium 103 may not read, convert to sRGB
 * bytes, and measure contrast. Pure, no DOM.
 */

export type RGBA = [number, number, number, number];

/** Convert oklch / oklab / hsl / rgb / hex / a few names to sRGB bytes. Returns null for non-colours. */
export function toRgba(input: string): RGBA | null {
  const v = input.trim().toLowerCase();
  if (v in NAMED) return [...NAMED[v]!] as RGBA;
  let m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (m) {
    let h = m[1]!;
    if (h.length === 5 || h.length === 7) return null;
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? round(n(6) / 255) : 1];
  }
  m = /^(rgba?|hsla?|oklch|oklab)\((.*)\)$/.exec(v);
  if (!m) return null;
  const fn = m[1]!;
  if (/var\(|calc\(|from\s/.test(m[2]!)) return null;
  const [main, alphaRaw] = m[2]!.split("/");
  const parts = main!.replace(/,/g, " ").trim().split(/\s+/);
  let alphaStr = alphaRaw?.trim();
  if (!alphaStr && parts.length === 4) alphaStr = parts.pop();
  const alpha = alphaStr === undefined ? 1 : pct(alphaStr, 1);
  if (parts.length < 3) return null;

  let rgb: [number, number, number];
  if (fn.startsWith("rgb")) rgb = parts.slice(0, 3).map((p) => pct(p, 255)) as [number, number, number];
  else if (fn.startsWith("hsl")) rgb = hsl(hue(parts[0]!), pct(parts[1]!, 1, true), pct(parts[2]!, 1, true));
  else if (fn === "oklch") rgb = oklchToRgb(pct(parts[0]!, 1), pct(parts[1]!, 0.4), hue(parts[2]!));
  else rgb = oklab(pct(parts[0]!, 1), pct(parts[1]!, 0.4), pct(parts[2]!, 0.4));

  if (rgb.some((c) => Number.isNaN(c)) || Number.isNaN(alpha)) return null;
  return [...rgb.map((c) => Math.round(Math.max(0, Math.min(255, c)))), round(Math.max(0, Math.min(1, alpha)))] as RGBA;
}

/** `rgb(r, g, b)` or `rgba(r, g, b, a)`: the form every Chromium reads. */
export function formatRgba(c: RGBA): string {
  return c[3] === 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`;
}

/** OKLCH (L 0–1, C, H degrees) → sRGB bytes, gamut-mapped like Lightning CSS. */
export function oklchToRgb(L: number, C: number, Hdeg: number): [number, number, number] {
  return gamutMap(L, C, (Hdeg * Math.PI) / 180);
}

/** sRGB bytes → OKLCH { l 0–1, c, h degrees }. */
export function rgbToOklch(c: RGBA | [number, number, number]): { l: number; c: number; h: number } {
  const lin = (x: number) => {
    const s = x / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = lin(c[0]);
  const g = lin(c[1]);
  const b = lin(c[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: C < 1e-4 ? 0 : H };
}

/** `top` drawn over `bottom` (alpha compositing); the result is opaque when `bottom` is. */
export function composite(top: RGBA, bottom: RGBA): RGBA {
  const a = top[3] + bottom[3] * (1 - top[3]);
  if (a === 0) return [0, 0, 0, 0];
  const ch = (i: number) => Math.round((top[i]! * top[3] + bottom[i]! * bottom[3] * (1 - top[3])) / a);
  return [ch(0), ch(1), ch(2), round(a)];
}

/** WCAG 2 relative luminance of an opaque colour. */
export function luminance(c: RGBA | [number, number, number]): number {
  const ch = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
}

/** WCAG 2 contrast ratio (1–21) between two opaque colours. */
export function contrastRatio(a: RGBA | [number, number, number], b: RGBA | [number, number, number]): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Linear mix in sRGB: t = 0 → a, t = 1 → b. */
export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  const ch = (i: number) => Math.round(a[i]! + (b[i]! - a[i]!) * t);
  return [ch(0), ch(1), ch(2), round(a[3] + (b[3] - a[3]) * t)];
}

// ─────────────────────────────────────────── internals

const NAMED: Record<string, RGBA> = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [255, 255, 255, 1],
};

/** "50%" → 0.5·scale; "0.5" → 0.5 (or n/100 when the unit is a percentage written without %). */
function pct(s: string, scale: number, alwaysPercentLike = false): number {
  if (s === "none") return 0;
  if (s.endsWith("%")) return (parseFloat(s) / 100) * scale;
  const n = parseFloat(s);
  return alwaysPercentLike && n > 1 ? n / 100 : n;
}

function hue(s: string) {
  const n = parseFloat(s);
  if (s.endsWith("rad")) return (n * 180) / Math.PI;
  if (s.endsWith("turn")) return n * 360;
  return Number.isNaN(n) ? 0 : n;
}

function hsl(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** CSS Color 4 style gamut mapping: lower chroma until the colour fits sRGB (matches Lightning CSS). */
function gamutMap(L: number, C: number, H: number): [number, number, number] {
  const at = (c: number) => oklab(L, c * Math.cos(H), c * Math.sin(H));
  const inGamut = (rgb: number[]) => rgb.every((x) => x >= -0.5 && x <= 255.5);
  let rgb = at(C);
  if (inGamut(rgb) || L >= 1 || L <= 0) return rgb;
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const candidate = at(mid);
    const clipped = candidate.map((x) => Math.max(0, Math.min(255, x)));
    // close enough to its clipped self (ΔE-ish in 0–255 space) → stop reducing chroma
    const delta = Math.hypot(...candidate.map((x, j) => x - clipped[j]!));
    if (inGamut(candidate)) lo = mid;
    else if (delta < 5) return clipped as [number, number, number];
    else hi = mid;
    rgb = at(lo);
  }
  return rgb;
}

function oklab(L: number, a: number, b: number): [number, number, number] {
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
  const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  return [gamma(r) * 255, gamma(g) * 255, gamma(bl) * 255];
}

const round = (n: number) => Math.round(n * 1000) / 1000;
