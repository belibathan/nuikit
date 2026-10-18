/**
 * Runtime theming that survives Chromium 103.
 *
 * vite-plugin-nuikit gives every color token rgb channels (--primary-rgb, --primary-a) so
 * opacity modifiers like bg-primary/50 work in FiveM. When you change a theme at
 * runtime, those channels must change too — applyTheme() sets both, converting
 * oklch/hsl/hex/rgb in JS because the game's browser can't.
 *
 *   applyTheme(`.dark { --primary: oklch(0.7 0.2 150); … }`)   // paste from TweakCN
 *   applyTheme({ primary: "#22c55e", radius: "0.5rem" })
 */

export type ThemeVars = Record<string, string>;
type RGBA = [number, number, number, number];

/** Parse a pasted shadcn/TweakCN theme. Returns the vars for :root and .dark. */
export function parseTheme(css: string): { light: ThemeVars; dark: ThemeVars } {
  const light: ThemeVars = {};
  const dark: ThemeVars = {};
  const blocks = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  let any = false;
  for (const [, selector, body] of blocks) {
    const target = /\.dark/.test(selector!) ? dark : /:root|:host|html/.test(selector!) ? light : null;
    if (!target) continue;
    any = true;
    readDecls(body!, target);
  }
  if (!any) readDecls(css, light); // bare declarations
  return { light, dark };
}

function readDecls(body: string, into: ThemeVars) {
  for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);?/g)) into[m[1]!] = m[2]!.trim();
}

/**
 * Apply theme variables (object or pasted CSS) to an element, with Chromium-103-safe channels.
 * When given CSS with both :root and .dark, picks by `mode` (default: .dark if the element
 * or <html> has the dark class).
 */
export function applyTheme(theme: ThemeVars | string, target?: HTMLElement, mode?: "light" | "dark"): ThemeVars {
  const el = target ?? document.documentElement;
  let vars: ThemeVars;
  if (typeof theme === "string") {
    const { light, dark } = parseTheme(theme);
    const isDark = mode ? mode === "dark" : el.closest(".dark") !== null || document.documentElement.classList.contains("dark");
    vars = isDark ? { ...light, ...dark } : light;
  } else vars = theme;

  for (const [key, value] of Object.entries(vars)) {
    const name = key.startsWith("--") ? key : `--${key}`;
    el.style.setProperty(name, value);
    const rgba = toRgba(value);
    if (rgba) {
      el.style.setProperty(`${name}-rgb`, `${rgba[0]}, ${rgba[1]}, ${rgba[2]}`);
      el.style.setProperty(`${name}-a`, String(rgba[3]));
      // and a value the old browser can read
      if (!/^#|^rgb/.test(value.trim())) el.style.setProperty(name, `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3]})`);
    }
  }
  return vars;
}

/** Remove everything applyTheme() set. */
export function clearTheme(vars: ThemeVars, target?: HTMLElement) {
  const el = target ?? document.documentElement;
  for (const key of Object.keys(vars)) {
    const name = key.startsWith("--") ? key : `--${key}`;
    el.style.removeProperty(name);
    el.style.removeProperty(`${name}-rgb`);
    el.style.removeProperty(`${name}-a`);
  }
}

// ─────────────────────────────────────────── color math

/** Convert oklch / oklab / hsl / rgb / hex to sRGB bytes. Returns null for non-colors. */
export function toRgba(input: string): RGBA | null {
  const v = input.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (m) {
    let h = m[1]!;
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? round(n(6) / 255) : 1];
  }
  m = /^(rgba?|hsla?|oklch|oklab)\((.*)\)$/.exec(v);
  if (!m) return null;
  const fn = m[1]!;
  const [main, alphaRaw] = m[2]!.split("/");
  const parts = main!.replace(/,/g, " ").trim().split(/\s+/);
  let alphaStr = alphaRaw?.trim();
  if (!alphaStr && parts.length === 4) alphaStr = parts.pop();
  const alpha = alphaStr === undefined ? 1 : pct(alphaStr, 1);
  if (parts.length < 3) return null;

  let rgb: [number, number, number];
  if (fn.startsWith("rgb")) rgb = parts.slice(0, 3).map((p) => pct(p, 255)) as [number, number, number];
  else if (fn.startsWith("hsl")) rgb = hsl(hue(parts[0]!), pct(parts[1]!, 1, true), pct(parts[2]!, 1, true));
  else if (fn === "oklch") {
    const L = pct(parts[0]!, 1);
    const C = pct(parts[1]!, 0.4);
    const H = (hue(parts[2]!) * Math.PI) / 180;
    rgb = gamutMap(L, C, H);
  } else rgb = oklab(pct(parts[0]!, 1), pct(parts[1]!, 0.4), pct(parts[2]!, 0.4));

  return [...rgb.map((c) => Math.round(Math.max(0, Math.min(255, c)))), round(alpha)] as RGBA;
}

/** "50%" → 0.5·scale; "0.5" → 0.5 (or 0.5·scale when `numIsFraction` is false and scale=255). */
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

/** CSS Color 4 style gamut mapping: lower chroma until the color fits sRGB (matches Lightning CSS). */
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
