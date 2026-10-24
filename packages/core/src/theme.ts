/**
 * Runtime theming that survives Chromium 103.
 *
 * Every theme goes through compileTheme() (tokens.ts): any shadcn/TweakCN paste, DTCG file or
 * object becomes the full nuikit token set (docs/tokens.md) with colours lowered to rgb. Painting
 * sets each token plus the rgb channels vite-plugin-nuikit's opacity rewrites read
 * (--primary-rgb, --primary-a), so bg-primary/50 keeps working after a live theme change.
 *
 *   applyTheme(`.dark { --primary: oklch(0.7 0.2 150); … }`)   // paste from TweakCN
 *   applyTheme(compiled)                                         // what the nuikit resource publishes
 *   applyTheme({ primary: "#22c55e" })                           // patch the current theme
 *   setPrefs({ scale: 1.1, reducedMotion: true })                // player accessibility prefs
 */
import { startGlowBudget } from "./glow";
import {
  compileTheme,
  IDENTITY_TOKENS,
  DEFAULT_PREFS,
  themeMotionLevel,
  importUrls,
  normalizePrefs,
  themeChannels,
  withPrefs,
  type CompiledTheme,
  type NuiPrefs,
  type ThemeInput,
  type ThemeMode,
  type ThemeVars,
} from "./tokens";

export { toRgba } from "./color";
export { parseTheme, type ThemeVars } from "./tokens";

interface Painted {
  theme: CompiledTheme;
  keys: Set<string>;
  /** Painted only to carry prefs before any theme arrived. */
  placeholder?: boolean;
}

const painted = new Map<HTMLElement, Painted>();
/** Identity keywords painted as attributes on the themed element (data-nk-feel="snap"…): every keyword lever with an `attr` in the spec. */
export { KEYWORD_ATTRS } from "./tokens";
import { KEYWORD_ATTRS } from "./tokens";
const DERIVED = new Set(IDENTITY_TOKENS.filter((t) => t.group === "derived").map((t) => t.name));
let prefs: NuiPrefs = { ...DEFAULT_PREFS };
const themeListeners = new Set<(theme: CompiledTheme) => void>();

const isPlainVars = (t: unknown): t is ThemeVars =>
  !!t && typeof t === "object" && !("vars" in (t as object)) && Object.values(t as object).every((v) => typeof v === "string" || typeof v === "number");

/**
 * Compile and apply a theme to an element (default <html>). Strings, DTCG documents and compiled
 * themes replace the current theme; a plain object of a few tokens patches it.
 * Default mode is dark (nuikit UIs are drawn over the game). Returns the painted token values.
 */
export function applyTheme(theme: ThemeInput, target?: HTMLElement, mode?: ThemeMode): ThemeVars {
  const el = target ?? document.documentElement;
  let compiled: CompiledTheme;
  if (isPlainVars(theme)) {
    const patch: ThemeVars = {};
    for (const [k, v] of Object.entries(theme)) patch[k.replace(/^--/, "")] = String(v);
    const p = painted.get(el);
    const prev = p && !p.placeholder ? p.theme : undefined;
    // derived tokens (surface, shadows from keywords…) are re-derived from the patched values
    const base: ThemeVars = {};
    if (prev) for (const [k, v] of Object.entries(prev.vars)) if (!DERIVED.has(k) || k in patch) base[k] = v;
    if ("brand" in patch && !("brand-foreground" in patch)) delete base["brand-foreground"];
    compiled = prev ? compileTheme({ ...prev, vars: { ...base, ...patch } }, { mode }) : compileTheme(patch, { partial: true, mode });
  } else {
    compiled = compileTheme(theme, { mode });
  }
  if (typeof document !== "undefined" && compiled.imports.length) loadImports(compiled.imports);
  const vars = paint(el, compiled);
  if (el === document.documentElement) {
    // the glow budget (tokens 1.4) follows the theme on the page's root
    startGlowBudget(compiled.vars["nk-surface-glow-budget"] ?? 1);
    themeListeners.forEach((l) => l(compiled));
  }
  return vars;
}

function paint(el: HTMLElement, theme: CompiledTheme, placeholder = false): ThemeVars {
  const vars = withPrefs(theme.vars, prefs);
  const all = { ...vars, ...themeChannels(vars) };
  const prev = painted.get(el);
  if (prev) for (const k of prev.keys) if (!(k in all)) el.style.removeProperty(`--${k}`);
  for (const [k, v] of Object.entries(all)) el.style.setProperty(`--${k}`, v);
  // on | reduced (the player's pref: no movement, short fades) | off (the theme's --nk-motion: 0)
  el.setAttribute("data-nk-motion", themeMotionLevel(theme.vars, prefs));
  // a themed subtree: kit.css re-declares its component tokens there, so they derive from this theme's
  // identity tokens (density, radius, HUD…) and not from what <html> resolved
  if (el !== document.documentElement) el.setAttribute("data-nk-theme", "");
  // identity keywords CSS can't branch on (tokens 1.1): kit.css and UIs select on these
  for (const [attr, token] of KEYWORD_ATTRS) {
    if (vars[token]) el.setAttribute(attr, vars[token]!);
    else el.removeAttribute(attr);
  }
  if (prefs.highContrast) el.setAttribute("data-nk-contrast", "high");
  else el.removeAttribute("data-nk-contrast");
  painted.set(el, { theme, keys: new Set(Object.keys(all)), placeholder });
  return vars;
}

/** The theme currently applied to <html> (null until one is). */
export function getTheme(): CompiledTheme | null {
  if (typeof document === "undefined") return null;
  const p = painted.get(document.documentElement);
  return p && !p.placeholder ? p.theme : null;
}

/** Called whenever a theme is applied to <html>. */
export function onTheme(listener: (theme: CompiledTheme) => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

/** Current player preferences (UI scale, reduced motion, high contrast). */
export function getPrefs(): NuiPrefs {
  return { ...prefs };
}

/**
 * Apply player preferences and repaint. nuikit.lua sends them as `nuikit:prefs`; override pages get
 * them with the theme. Without a theme yet, the stock theme is used as the base.
 */
export function setPrefs(next: Partial<NuiPrefs>): NuiPrefs {
  prefs = normalizePrefs({ ...prefs, ...next });
  if (typeof document === "undefined") return getPrefs();
  const html = document.documentElement;
  const current = painted.get(html);
  if (!current || current.placeholder) paint(html, prefs.highContrast ? compileTheme("") : compileTheme({}, { partial: true }), true);
  for (const [el, p] of painted) if (el !== html || !p.placeholder) paint(el, p.theme, p.placeholder);
  return getPrefs();
}

/** `@import url("https://fonts.googleapis.com/…")` lines (or URLs) → <link> tags, once each. */
export function loadImports(css: string | string[]): string[] {
  const urls: string[] = [];
  if (Array.isArray(css)) urls.push(...css.filter((u) => /^https?:\/\//.test(u)));
  else urls.push(...importUrls(css));
  if (typeof document === "undefined") return urls;
  for (const href of urls) {
    const seen = [...document.querySelectorAll<HTMLLinkElement>("link[data-nuikit-import]")].some((l) => l.dataset.nuikitImport === href);
    if (seen) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.nuikitImport = href;
    document.head.appendChild(link);
  }
  return urls;
}

/** Remove everything applyTheme() set on an element (or the given vars). */
export function clearTheme(vars?: ThemeVars, target?: HTMLElement) {
  const el = target ?? document.documentElement;
  const keys = new Set<string>(painted.get(el)?.keys ?? []);
  for (const key of Object.keys(vars ?? {})) {
    const name = key.replace(/^--/, "");
    keys.add(name).add(`${name}-rgb`).add(`${name}-a`);
  }
  for (const k of keys) el.style.removeProperty(`--${k}`);
  el.removeAttribute("data-nk-motion");
  for (const [attr] of KEYWORD_ATTRS) el.removeAttribute(attr);
  el.removeAttribute("data-nk-contrast");
  el.removeAttribute("data-nk-theme");
  painted.delete(el);
}

/** For tests. */
export function __resetTheme() {
  painted.clear();
  prefs = { ...DEFAULT_PREFS };
  themeListeners.clear();
}
