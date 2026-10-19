/**
 * nuikit tokens v1 (docs/tokens.md): the theme contract every nuikit UI reads, and the compiler
 * that turns any shadcn / TweakCN paste (or a DTCG file, or a plain object) into it.
 *
 *   const { vars, warnings } = compileTheme(readFileSync("theme.css", "utf8"));
 *
 * Pure: no DOM, runs in the browser, in Node and in the FXServer JS runtime.
 */
import { composite, contrastRatio, formatRgba, mix, oklchToRgb, rgbToOklch, toRgba, type RGBA } from "./color";

export type ThemeVars = Record<string, string>;
export type ThemeMode = "dark" | "light";

/** The token contract version. Bumped only for breaking renames/removals; additions keep v1. */
export const TOKENS_VERSION = 1 as const;

export type TokenType = "color" | "dimension" | "fontFamily" | "number";

export interface TokenSpec {
  name: string;
  type: TokenType;
  /** shadcn: what every shadcn/TweakCN theme has. nuikit: game semantics, derived when absent. */
  group: "shadcn" | "nuikit";
  description: string;
  /** How the value is derived when the theme doesn't set it. */
  fallback: string;
}

const c = (name: string, description: string, fallback = "stock shadcn neutral"): TokenSpec => ({ name, type: "color", group: "shadcn", description, fallback });
const n = (name: string, type: TokenType, description: string, fallback: string): TokenSpec => ({ name, type, group: "nuikit", description, fallback });

/** Every token in the contract, in documentation order. */
export const TOKENS: readonly TokenSpec[] = [
  c("background", "Full-screen surfaces (pause, loading, death scrim)"),
  c("foreground", "Text on full-screen surfaces"),
  c("card", "Raised blocks on a full-screen surface"),
  c("card-foreground", "Text on cards"),
  c("popover", "Every floating panel (nk-panel)"),
  c("popover-foreground", "Text in panels"),
  c("primary", "The one main action per surface, progress fills, selection"),
  c("primary-foreground", "Text on primary"),
  c("secondary", "Secondary buttons"),
  c("secondary-foreground", "Text on secondary"),
  c("muted", "Tracks, slots and wells inside a panel"),
  c("muted-foreground", "Secondary text"),
  c("accent", "Hover and keyboard highlight"),
  c("accent-foreground", "Text on accent"),
  c("destructive", "Danger, damage, low values, death"),
  c("destructive-foreground", "Text on destructive", "foreground or background, whichever contrasts more with destructive"),
  c("border", "Hairlines"),
  c("input", "Field borders"),
  c("ring", "Focus rings"),
  c("chart-1", "Categorical colour 1"),
  c("chart-2", "Categorical colour 2"),
  c("chart-3", "Categorical colour 3"),
  c("chart-4", "Categorical colour 4"),
  c("chart-5", "Categorical colour 5"),
  { name: "radius", type: "dimension", group: "shadcn", description: "Corner radius (panels radius + 4px, controls radius − 2px)", fallback: "0.625rem" },
  { name: "font-sans", type: "fontFamily", group: "shadcn", description: "Text", fallback: "ui-sans-serif, system-ui, sans-serif" },
  { name: "font-mono", type: "fontFamily", group: "shadcn", description: "Codes and IDs a player might type", fallback: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  n("success", "color", "Positive status: done, paid, online", "oklch(L, C, 150): green at the lightness/chroma of destructive"),
  n("success-foreground", "color", "Text on success", "foreground or background, whichever contrasts more"),
  n("warning", "color", "Caution status: low fuel, about to expire", "oklch(L + 0.08, C, 75): amber at the lightness/chroma of destructive"),
  n("warning-foreground", "color", "Text on warning", "foreground or background, whichever contrasts more"),
  n("info", "color", "Neutral status: tips, notices", "primary"),
  n("info-foreground", "color", "Text on info", "primary-foreground"),
  n("hud", "color", "Surfaces drawn straight on the game: HUD chips, hotbar, target eye", "rgba(0, 0, 0, 0.45)"),
  n("hud-foreground", "color", "Text and icons on hud", "rgb(255, 255, 255)"),
  n("vital-health", "color", "Health bar", "chart-1 if red, else another red chart-*, else destructive if red, else oklch(0.68 0.21 25)"),
  n("vital-armor", "color", "Armor bar", "chart-2 if blue, else another blue chart-*, else oklch(0.68 0.16 250)"),
  n("vital-hunger", "color", "Hunger bar", "chart-3 if orange/amber, else another one, else oklch(0.78 0.16 70)"),
  n("vital-thirst", "color", "Thirst bar", "chart-4 if cyan/blue, else another one, else oklch(0.76 0.13 215)"),
  n("vital-stress", "color", "Stress bar", "chart-5 if purple/magenta, else another one, else oklch(0.68 0.2 320)"),
  n("nk-scale", "number", "UI size multiplier (unitless). Players can scale further (0.85–1.25).", "1"),
  n("nk-motion", "number", "1 = animations on, 0 = off. Players can turn motion off.", "1"),
];

export const TOKEN_NAMES: readonly string[] = TOKENS.map((t) => t.name);
const SPEC = new Map(TOKENS.map((t) => [t.name, t]));

/** Stock shadcn neutral (vendor/shadcn/colors/neutral.json): what missing shadcn tokens fall back to. */
export const NEUTRAL: Record<ThemeMode, ThemeVars> = {
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.708 0 0)",
    "chart-1": "oklch(0.87 0 0)",
    "chart-2": "oklch(0.556 0 0)",
    "chart-3": "oklch(0.439 0 0)",
    "chart-4": "oklch(0.371 0 0)",
    "chart-5": "oklch(0.269 0 0)",
    radius: "0.625rem",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.205 0 0)",
    "popover-foreground": "oklch(0.985 0 0)",
    primary: "oklch(0.922 0 0)",
    "primary-foreground": "oklch(0.205 0 0)",
    secondary: "oklch(0.269 0 0)",
    "secondary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.708 0 0)",
    accent: "oklch(0.269 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: "oklch(0.556 0 0)",
    "chart-1": "oklch(0.87 0 0)",
    "chart-2": "oklch(0.556 0 0)",
    "chart-3": "oklch(0.439 0 0)",
    "chart-4": "oklch(0.371 0 0)",
    "chart-5": "oklch(0.269 0 0)",
  },
};

/** Vitals: preferred chart slot, accepted OKLCH hue ranges (degrees), fixed fallback (L, C, H). */
export const VITALS = [
  { name: "vital-health", chart: 1, hues: [[345, 360], [0, 35]], fallback: [0.68, 0.21, 25], theme: "destructive" },
  { name: "vital-armor", chart: 2, hues: [[200, 285]], fallback: [0.68, 0.16, 250] },
  { name: "vital-hunger", chart: 3, hues: [[40, 110]], fallback: [0.78, 0.16, 70] },
  { name: "vital-thirst", chart: 4, hues: [[180, 260]], fallback: [0.76, 0.13, 215] },
  { name: "vital-stress", chart: 5, hues: [[285, 345]], fallback: [0.68, 0.2, 320] },
] as const;

/** Contrast checks: foreground token, background token, minimum WCAG ratio, what it affects. */
export const CONTRAST_PAIRS: readonly [string, string, number, string][] = [
  ["foreground", "background", 4.5, "text on full-screen surfaces (pause, loading, death) will be hard to read"],
  ["popover-foreground", "popover", 4.5, "text in panels will be hard to read"],
  ["card-foreground", "card", 4.5, "text on cards will be hard to read"],
  ["primary-foreground", "primary", 4.5, "text on buttons will be hard to read"],
  ["muted-foreground", "popover", 3, "secondary text in panels will be hard to read"],
  ["hud-foreground", "hud", 3, "HUD text will be hard to read over a bright sky"],
  ["destructive", "popover", 3, "errors and low values in panels won't stand out"],
  ["success-foreground", "success", 3, "text on success badges will be hard to read"],
  ["warning-foreground", "warning", 3, "text on warning badges will be hard to read"],
];

// ─────────────────────────────────────────── public types

export interface CompileOptions {
  /** Which set to use. Default "dark": nuikit UIs are drawn over the game. */
  mode?: ThemeMode;
  /**
   * Only lower the tokens given, without filling or deriving the rest (a patch, e.g.
   * applyTheme({ primary: "#22c55e" }) on top of an existing theme). Default false.
   */
  partial?: boolean;
  /** Player preference: push text and borders to maximum contrast. */
  highContrast?: boolean;
}

export interface ContrastResult {
  fg: string;
  bg: string;
  ratio: number;
  min: number;
  ok: boolean;
}

export interface CompiledTheme {
  /** Token contract version (1). */
  version: typeof TOKENS_VERSION;
  /** The set that was used ("light" when a paste has no dark colours). */
  mode: ThemeMode;
  /** Token → value any Chromium reads (colours as rgb()/rgba()). Names have no leading `--`. */
  vars: ThemeVars;
  /** Font stylesheet URLs from @import lines. */
  imports: string[];
  /** Human-readable problems: low contrast, missing dark set, values FiveM can't read. */
  warnings: string[];
  /** Every contrast check that ran. */
  contrast: ContrastResult[];
  /** Short hash of vars + imports, for change detection. */
  hash: string;
}

export type ThemeInput = string | ThemeVars | CompiledTheme | DtcgDocument;
export type DtcgDocument = { [key: string]: unknown };

// ─────────────────────────────────────────── parsing

interface Parsed {
  light: ThemeVars;
  dark: ThemeVars;
  /** Literal values from @theme blocks (lowest priority). */
  theme: ThemeVars;
  imports: string[];
}

/** `@import url("…")` / `@import "…"` statements; quoted URLs may contain `;` (Google Fonts weights). */
const IMPORT_RE = /@import\s+(?:url\(\s*(["'])(.*?)\1\s*\)|url\(\s*([^)\s]+)\s*\)|(["'])(.*?)\4)[^;]*;/g;

/** The http(s) URLs of a theme's @import lines. */
export function importUrls(css: string): string[] {
  const urls: string[] = [];
  for (const m of css.matchAll(IMPORT_RE)) {
    const url = (m[2] ?? m[3] ?? m[5] ?? "").trim();
    if (/^https?:\/\//.test(url)) urls.push(url);
  }
  return urls;
}

/** Parse a pasted shadcn / TweakCN theme: :root, .dark, @theme inline, @media (prefers-color-scheme), @import. */
export function parseThemeCss(css: string): Parsed {
  const out: Parsed = { light: {}, dark: {}, theme: {}, imports: [] };
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  out.imports = importUrls(src);
  const body = src.replace(IMPORT_RE, "");

  const stack: string[] = [];
  let seg = "";
  const target = (): ThemeVars | null => {
    if (stack.length === 0) return out.light; // bare declarations
    if (stack.some((s) => /^@theme\b/.test(s))) return out.theme;
    if (stack.some((s) => /\.dark\b|\[data-theme=["']?dark|\[data-mode=["']?dark|prefers-color-scheme:\s*dark/.test(s))) return out.dark;
    const last = stack[stack.length - 1]!;
    if (/(^|[\s,])(:root|:host|html)\b/.test(last)) return out.light;
    return null;
  };
  const decl = (text: string) => {
    const m = /^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(text);
    if (!m) return;
    const into = target();
    if (!into) return;
    const value = m[2]!.replace(/\s*!important$/, "").trim();
    // @theme inline mostly maps Tailwind names onto the vars (--color-primary: var(--primary)):
    // only its literal values count, and --color-x is token x.
    if (into === out.theme) {
      if (/var\(/.test(value)) return;
      into[m[1]!.replace(/^color-/, "")] = value;
      return;
    }
    into[m[1]!] = value;
  };
  let paren = 0;
  for (const ch of body) {
    if (ch === "(") paren++;
    else if (ch === ")") paren = Math.max(0, paren - 1);
    if (paren > 0) {
      seg += ch;
      continue;
    }
    if (ch === "{") {
      stack.push(seg.trim());
      seg = "";
    } else if (ch === "}") {
      decl(seg);
      seg = "";
      stack.pop();
    } else if (ch === ";") {
      decl(seg);
      seg = "";
    } else seg += ch;
  }
  decl(seg);
  return out;
}

/** Compat: the { light, dark } variable maps of a pasted theme. */
export function parseTheme(css: string): { light: ThemeVars; dark: ThemeVars } {
  const p = parseThemeCss(css);
  return { light: p.light, dark: p.dark };
}

/** Is this object a DTCG token document (has $value somewhere in its first levels)? */
function isDtcg(o: Record<string, unknown>): boolean {
  if (Object.keys(o).some((k) => k.startsWith("$"))) return true;
  return Object.values(o).some((v) => v !== null && typeof v === "object" && ("$value" in (v as object) || Object.values(v as object).some((x) => x !== null && typeof x === "object" && "$value" in (x as object))));
}

function isCompiled(o: unknown): o is CompiledTheme {
  return !!o && typeof o === "object" && typeof (o as CompiledTheme).version === "number" && !!(o as CompiledTheme).vars && typeof (o as CompiledTheme).vars === "object";
}

/** Read a DTCG 2025.10 document into token vars. Groups map to names: color.primary → primary, font.sans → font-sans, nk.scale → nk-scale. */
export function parseDtcg(doc: DtcgDocument): ThemeVars {
  const flat = new Map<string, { value: unknown; type?: string }>();
  const walk = (node: Record<string, unknown>, path: string[], type?: string) => {
    const t = typeof node.$type === "string" ? node.$type : type;
    if ("$value" in node) {
      flat.set(path.join("."), { value: node.$value, type: t });
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("$") || !v || typeof v !== "object") continue;
      walk(v as Record<string, unknown>, [...path, k], t);
    }
  };
  walk(doc as Record<string, unknown>, []);

  const resolve = (value: unknown, depth = 0): unknown => {
    if (typeof value === "string") {
      const ref = /^\{([^}]+)\}$/.exec(value);
      if (ref && depth < 10) return resolve(flat.get(ref[1]!)?.value, depth + 1);
    }
    return value;
  };
  const vars: ThemeVars = {};
  for (const [path, { value, type }] of flat) {
    const parts = path.split(".");
    if (parts[0] === "color" || parts[0] === "colors" || parts[0] === "dimension") parts.shift();
    const name = parts.join("-");
    const v = dtcgValue(resolve(value), type);
    if (name && v !== null) vars[name] = v;
  }
  return vars;
}

function dtcgValue(value: unknown, type?: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((f) => (/[\s"']/.test(String(f)) && !/^["']/.test(String(f)) ? `"${f}"` : String(f))).join(", ");
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("colorSpace" in o || "components" in o || "hex" in o || type === "color") {
      const alpha = typeof o.alpha === "number" ? o.alpha : 1;
      const comps = Array.isArray(o.components) ? (o.components as unknown[]) : null;
      const space = String(o.colorSpace ?? "srgb");
      if (comps && comps.every((x) => typeof x === "number" || x === "none")) {
        const num = comps.map((x) => (x === "none" ? 0 : (x as number)));
        if (space === "srgb") return formatRgba([...num.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255)), alpha] as RGBA);
        if (space === "oklch") return formatRgba([...oklchToRgb(num[0]!, num[1]!, num[2]!).map((x) => Math.round(Math.max(0, Math.min(255, x)))), alpha] as RGBA);
        if (space === "hsl") return `hsl(${num[0]} ${num[1]}% ${num[2]}% / ${alpha})`;
      }
      if (typeof o.hex === "string") return o.hex;
      return null;
    }
    if ("value" in o && "unit" in o) return `${o.value}${o.unit}`;
  }
  return null;
}

// ─────────────────────────────────────────── compile

/**
 * Compile any theme into the token contract: parse, pick the dark set, resolve var() references,
 * lower every colour to rgb()/rgba(), fill missing shadcn tokens from stock neutral, derive the
 * nuikit tokens, and check contrast.
 */
export function compileTheme(input: ThemeInput, opts: CompileOptions = {}): CompiledTheme {
  const warnings: string[] = [];
  const requested: ThemeMode = opts.mode ?? "dark";
  let mode: ThemeMode = requested;
  let raw: ThemeVars = {};
  let imports: string[] = [];

  if (typeof input === "string" && /^\s*\{/.test(input)) {
    try {
      input = JSON.parse(input) as DtcgDocument;
    } catch {
      warnings.push("The theme looks like JSON but doesn't parse; it was read as CSS.");
    }
  }

  if (typeof input === "string") {
    const p = parseThemeCss(input);
    imports = p.imports;
    const hasDark = Object.keys(p.dark).length > 0;
    const hasLight = Object.keys(p.light).length > 0;
    if (requested === "dark" && !hasDark && hasLight && !opts.partial) {
      mode = "light";
      warnings.push("The theme has no dark colours (.dark block), so its light colours are used in game. Paste the full TweakCN export, including .dark.");
    }
    raw = mode === "dark" ? { ...p.theme, ...p.light, ...p.dark } : { ...p.theme, ...p.light };
    if (!hasDark && !hasLight && Object.keys(p.theme).length === 0 && !opts.partial) warnings.push("The theme has no variables; the stock theme is used.");
  } else if (isCompiled(input)) {
    raw = { ...input.vars };
    // through Lua an empty array arrives as {}
    imports = (Array.isArray(input.imports) ? input.imports : Object.values(input.imports ?? {})).filter((u): u is string => typeof u === "string");
    mode = input.mode ?? mode;
  } else if (input && typeof input === "object" && isDtcg(input as Record<string, unknown>)) {
    raw = parseDtcg(input as DtcgDocument);
    const ext = (input as { $extensions?: Record<string, { mode?: string; imports?: string[] }> }).$extensions?.["dev.nuikit"];
    if (ext?.mode === "light" || ext?.mode === "dark") mode = ext.mode;
    if (Array.isArray(ext?.imports)) imports = ext.imports.filter((u) => typeof u === "string");
  } else if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input)) if (typeof v === "string" || typeof v === "number") raw[k.replace(/^--/, "")] = String(v);
  }

  // var(--x) references between tokens → their values (FiveM can read var(), but derivations and
  // contrast checks need the colour itself).
  const resolved: ThemeVars = {};
  const base = opts.partial ? raw : { ...NEUTRAL[mode], ...raw };
  const lookup = (name: string, depth: number): string | undefined => {
    const v = base[name];
    if (v === undefined || depth > 8) return undefined;
    return resolveRefs(v, depth + 1);
  };
  const resolveRefs = (value: string, depth: number): string =>
    value.replace(/var\(\s*--([\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (m, ref: string, fb?: string) => lookup(ref, depth) ?? fb?.trim() ?? m);

  const missing: string[] = [];
  for (const t of TOKENS) if (t.group === "shadcn" && t.type === "color" && raw[t.name] === undefined && NEUTRAL[mode][t.name] !== undefined) missing.push(t.name);
  if (!opts.partial && missing.length && missing.length < 23) {
    warnings.push(`The theme doesn't set ${missing.map((m) => `--${m}`).join(", ")}; stock shadcn values are used.`);
  }

  for (const [name, value] of Object.entries(base)) {
    const v = resolveRefs(String(value), 0);
    const lowered = lower(v);
    if (lowered === null) {
      const stock = opts.partial ? undefined : NEUTRAL[mode][name];
      warnings.push(
        `--${name} uses ${/color-mix/.test(v) ? "color-mix()" : "a colour format"} that FiveM's browser can't read (${v}); ${stock ? "the stock value is used" : "it was left out"}.`,
      );
      if (stock) resolved[name] = lower(stock)!;
      continue;
    }
    resolved[name] = lowered;
  }

  if (!opts.partial) derive(resolved, mode, warnings);
  else if (resolved["nk-scale"] !== undefined || resolved["nk-motion"] !== undefined) derive(resolved, mode, warnings, true);
  if (opts.highContrast) highContrast(resolved);

  const contrast = checkContrast(resolved);
  for (const r of contrast) {
    if (r.ok) continue;
    const reason = CONTRAST_PAIRS.find(([f, b]) => f === r.fg && b === r.bg)?.[3] ?? "it will be hard to read";
    warnings.push(`${r.fg} on ${r.bg} is ${r.ratio.toFixed(1)}:1 (needs ${r.min}:1); ${reason}.`);
  }

  const vars = order(resolved);
  return { version: TOKENS_VERSION, mode, vars, imports, warnings, contrast, hash: hash(JSON.stringify([vars, imports])) };
}

/** A value FiveM's Chromium 103 reads: colours → rgb()/rgba(), colours inside compound values (shadows) too. null if it can't be lowered. */
export function lowerValue(value: string): string | null {
  return lower(value);
}

function lower(value: string): string | null {
  const v = value.trim();
  const whole = toRgba(v);
  if (whole) return formatRgba(whole);
  if (/color-mix\(|\b(?:lab|lch|color)\(/.test(v)) return null;
  let failed = false;
  const out = v.replace(/\b(?:oklch|oklab|hsla?|rgba?)\([^()]*\)/g, (m) => {
    const c = toRgba(m);
    if (!c) failed = true;
    return c ? formatRgba(c) : m;
  });
  return failed && /okl(?:ch|ab)\(/.test(out) ? null : out;
}

// ─────────────────────────────────────────── derived tokens

function rgba(vars: ThemeVars, name: string): RGBA | null {
  const v = vars[name];
  return v === undefined ? null : toRgba(v);
}

const fmtOklch = (L: number, C: number, H: number): string => formatRgba([...oklchToRgb(L, C, H).map((x) => Math.round(Math.max(0, Math.min(255, x)))), 1] as RGBA);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const WHITE: RGBA = [255, 255, 255, 1];
const BLACK: RGBA = [0, 0, 0, 1];

/** Of the theme's foreground and background (one light, one dark), the one that reads best on `bg`. */
function bestText(vars: ThemeVars, bg: RGBA): string {
  const solid = opaque(bg, vars);
  const candidates = [rgba(vars, "foreground"), rgba(vars, "background"), WHITE, BLACK].filter((x): x is RGBA => !!x && x[3] === 1);
  let best = candidates[0]!;
  let bestRatio = 0;
  for (const cand of candidates) {
    const r = contrastRatio(cand, solid);
    // the theme's own colours win unless they're clearly worse than pure white/black
    if (r > bestRatio + 0.5) {
      best = cand;
      bestRatio = r;
    }
  }
  return formatRgba(best);
}

/** What a translucent colour looks like where it's used: over the popover, over the background, over black. */
function opaque(c: RGBA, vars: ThemeVars, over: string[] = ["background"]): RGBA {
  if (c[3] >= 1) return c;
  let under: RGBA = BLACK;
  for (const name of [...over].reverse()) {
    const u = rgba(vars, name);
    if (u) under = composite(u, under);
  }
  return composite(c, under);
}

function inHue(h: number, ranges: readonly (readonly [number, number])[]): boolean {
  return ranges.some(([a, b]) => h >= a && h <= b);
}

/** Usable as a vital bar on the game: colourful, not too dark or washed out, and in the vital's hue range. */
function vitalFit(c: RGBA | null, ranges: readonly (readonly [number, number])[]): boolean {
  if (!c || c[3] < 1) return false;
  const o = rgbToOklch(c);
  return o.c >= 0.06 && o.l >= 0.45 && o.l <= 0.93 && inHue(o.h, ranges);
}

function derive(vars: ThemeVars, mode: ThemeMode, warnings: string[], onlyNumbers = false) {
  // numbers
  const scale = vars["nk-scale"] === undefined ? 1 : parseFloat(vars["nk-scale"]);
  if (Number.isNaN(scale) || scale < 0.5 || scale > 2) {
    warnings.push(`--nk-scale must be a number between 0.5 and 2 (got ${vars["nk-scale"]}); 1 is used.`);
    vars["nk-scale"] = "1";
  } else vars["nk-scale"] = String(scale);
  const motion = vars["nk-motion"];
  if (motion !== undefined && motion !== "0" && motion !== "1") {
    warnings.push(`--nk-motion must be 0 or 1 (got ${motion}); 1 is used.`);
    vars["nk-motion"] = "1";
  } else vars["nk-motion"] = motion ?? "1";
  if (onlyNumbers) return;

  for (const t of TOKENS) if (t.group === "shadcn" && t.type !== "color" && vars[t.name] === undefined) vars[t.name] = t.fallback;

  const destructive = rgba(vars, "destructive") ?? toRgba(NEUTRAL[mode].destructive!)!;
  const d = rgbToOklch(destructive);
  const L = clamp(d.l, mode === "dark" ? 0.62 : 0.5, 0.8);
  const C = clamp(d.c, 0.12, 0.2);

  if (vars["destructive-foreground"] === undefined) vars["destructive-foreground"] = bestText(vars, destructive);
  if (vars.success === undefined) vars.success = fmtOklch(L, C, 150);
  if (vars["success-foreground"] === undefined) vars["success-foreground"] = bestText(vars, toRgba(vars.success)!);
  if (vars.warning === undefined) vars.warning = fmtOklch(clamp(L + 0.08, 0, 0.86), C, 75);
  if (vars["warning-foreground"] === undefined) vars["warning-foreground"] = bestText(vars, toRgba(vars.warning)!);
  if (vars.info === undefined) vars.info = vars.primary!;
  if (vars["info-foreground"] === undefined) vars["info-foreground"] = vars["primary-foreground"]!;
  if (vars.hud === undefined) vars.hud = "rgba(0, 0, 0, 0.45)";
  if (vars["hud-foreground"] === undefined) vars["hud-foreground"] = "rgb(255, 255, 255)";

  const used = new Set<number>();
  for (const v of VITALS) {
    if (vars[v.name] !== undefined) continue;
    const chart = (i: number) => rgba(vars, `chart-${i}`);
    let pick: string | undefined;
    if (vitalFit(chart(v.chart), v.hues) && !used.has(v.chart)) {
      pick = vars[`chart-${v.chart}`];
      used.add(v.chart);
    } else {
      for (let i = 1; i <= 5 && !pick; i++) {
        if (used.has(i) || !vitalFit(chart(i), v.hues)) continue;
        pick = vars[`chart-${i}`];
        used.add(i);
      }
    }
    if (!pick && "theme" in v && vitalFit(rgba(vars, v.theme), v.hues)) pick = vars[v.theme];
    vars[v.name] = pick ?? fmtOklch(v.fallback[0], v.fallback[1], v.fallback[2]);
  }
}

/** Player preference: maximum-contrast text, stronger borders, a darker HUD surface. Pure on lowered vars. */
export function highContrast(vars: ThemeVars): ThemeVars {
  const best = (bg: string) => {
    const b = rgba(vars, bg);
    if (!b) return undefined;
    const solid = opaque(b, vars);
    return contrastRatio(WHITE, solid) >= contrastRatio(BLACK, solid) ? WHITE : BLACK;
  };
  for (const [fg, bg] of [
    ["foreground", "background"],
    ["popover-foreground", "popover"],
    ["card-foreground", "card"],
    ["accent-foreground", "accent"],
    ["secondary-foreground", "secondary"],
    ["primary-foreground", "primary"],
  ] as const) {
    const b = best(bg);
    if (b) vars[fg] = formatRgba(b);
  }
  const text = rgba(vars, "popover-foreground");
  const panel = rgba(vars, "popover");
  const muted = rgba(vars, "muted-foreground");
  if (text && panel && muted) {
    let m = muted;
    for (let t = 0.1; t <= 1 && contrastRatio(opaque(m, vars), opaque(panel, vars)) < 7; t += 0.1) m = mix(muted, text, t);
    vars["muted-foreground"] = formatRgba(m);
    vars.border = formatRgba([text[0], text[1], text[2], 0.35]);
    vars.input = formatRgba([text[0], text[1], text[2], 0.45]);
  }
  vars.hud = "rgba(0, 0, 0, 0.72)";
  vars["hud-foreground"] = "rgb(255, 255, 255)";
  return vars;
}

/** Run the contract's contrast checks on lowered vars. Translucent colours are composited where they're drawn. */
export function checkContrast(vars: ThemeVars): ContrastResult[] {
  const out: ContrastResult[] = [];
  for (const [fg, bg, min] of CONTRAST_PAIRS) {
    const f = rgba(vars, fg);
    const b = rgba(vars, bg);
    if (!f || !b) continue;
    // the HUD sits on the game: judge it over a bright scene (worst case), everything else over the theme
    const under = bg === "hud" ? composite(b, WHITE) : opaque(b, vars, bg === "background" ? [] : ["background"]);
    const over = composite(f, under);
    const ratio = Math.round(contrastRatio(over, under) * 100) / 100;
    out.push({ fg, bg, ratio, min, ok: ratio >= min });
  }
  return out;
}

function order(vars: ThemeVars): ThemeVars {
  const out: ThemeVars = {};
  for (const name of TOKEN_NAMES) if (vars[name] !== undefined) out[name] = vars[name]!;
  for (const name of Object.keys(vars).sort()) if (!(name in out)) out[name] = vars[name]!;
  return out;
}

/** FNV-1a, 32 bit, hex. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// ─────────────────────────────────────────── outputs

/** --x-rgb / --x-a channels for every colour var (what vite-plugin-nuikit's bg-x/50 rewrites read). */
export function themeChannels(vars: ThemeVars): ThemeVars {
  const out: ThemeVars = {};
  for (const [name, value] of Object.entries(vars)) {
    const c = toRgba(value);
    if (!c) continue;
    out[`${name}-rgb`] = `${c[0]}, ${c[1]}, ${c[2]}`;
    out[`${name}-a`] = String(c[3]);
  }
  return out;
}

/** The compiled theme as CSS (with channels), e.g. for a download or a page that can't run JS. */
export function themeToCss(theme: CompiledTheme | ThemeVars, selector = ":root"): string {
  const vars = isCompiled(theme) ? theme.vars : theme;
  const imports = isCompiled(theme) ? theme.imports : [];
  const all = { ...vars, ...themeChannels(vars) };
  const lines = Object.entries(all).map(([k, v]) => `  --${k}: ${v};`);
  return `${imports.map((u) => `@import url("${u}");\n`).join("")}${selector} {\n${lines.join("\n")}\n}\n`;
}

/** The compiled theme as a W3C Design Tokens (DTCG 2025.10) document. */
export function toDtcg(theme: CompiledTheme, description = "nuikit theme"): DtcgDocument {
  const color: Record<string, unknown> = { $type: "color" };
  const doc: DtcgDocument = {
    $description: `${description} (nuikit tokens v${TOKENS_VERSION}, ${theme.mode})`,
    $extensions: { "dev.nuikit": { tokens: TOKENS_VERSION, mode: theme.mode, ...(theme.imports.length ? { imports: theme.imports } : {}) } },
    color,
  };
  const font: Record<string, unknown> = { $type: "fontFamily" };
  const nk: Record<string, unknown> = { $type: "number" };
  for (const [name, value] of Object.entries(theme.vars)) {
    const spec = SPEC.get(name);
    const desc = spec ? { $description: spec.description } : {};
    const col = toRgba(value);
    if (col && (spec?.type ?? "color") === "color") {
      const hex = `#${col.slice(0, 3).map((x) => x.toString(16).padStart(2, "0")).join("")}`;
      color[name] = {
        $value: { colorSpace: "srgb", components: col.slice(0, 3).map((x) => Math.round((x / 255) * 10000) / 10000), alpha: col[3], hex },
        ...desc,
      };
    } else if (name === "radius") {
      const m = /^([\d.]+)(px|rem)$/.exec(value);
      if (m) doc.radius = { $type: "dimension", $value: { value: parseFloat(m[1]!), unit: m[2] }, ...desc };
    } else if (name.startsWith("font-")) {
      font[name.slice(5)] = { $value: value.split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")), ...desc };
    } else if (name.startsWith("nk-")) {
      nk[name.slice(3)] = { $value: Number(value), ...desc };
    }
  }
  if (Object.keys(font).length > 1) doc.font = font;
  if (Object.keys(nk).length > 1) doc.nk = nk;
  return doc;
}

/** JSON Schema (2020-12) for a compiled theme (theme.json, GlobalState.nuikitTheme). */
export function themeJsonSchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const t of TOKENS) {
    properties[t.name] =
      t.type === "color"
        ? { type: "string", pattern: "^rgba?\\(", description: t.description }
        : t.type === "number"
          ? { type: "string", pattern: "^\\d+(\\.\\d+)?$", description: t.description }
          : { type: "string", description: t.description };
  }
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://nuikit.vercel.app/schema/theme.v1.json",
    title: "nuikit compiled theme (tokens v1)",
    description: "What compileTheme() returns and the nuikit resource publishes: every token, lowered so FiveM's browser can read it.",
    type: "object",
    required: ["version", "vars"],
    properties: {
      version: { const: TOKENS_VERSION },
      mode: { enum: ["dark", "light"] },
      hash: { type: "string" },
      imports: { type: "array", items: { type: "string", format: "uri" } },
      warnings: { type: "array", items: { type: "string" } },
      vars: {
        type: "object",
        required: [...TOKEN_NAMES],
        properties,
        additionalProperties: { type: "string" },
      },
    },
  };
}

// ─────────────────────────────────────────── player preferences

export interface NuiPrefs {
  /** UI size multiplier, 0.85–1.25 (on top of the theme's --nk-scale). */
  scale: number;
  reducedMotion: boolean;
  highContrast: boolean;
}

export const DEFAULT_PREFS: NuiPrefs = { scale: 1, reducedMotion: false, highContrast: false };

export function normalizePrefs(p: Partial<NuiPrefs> | null | undefined): NuiPrefs {
  const scale = Number(p?.scale);
  return {
    scale: Number.isFinite(scale) && scale > 0 ? Math.round(clamp(scale, 0.85, 1.25) * 100) / 100 : 1,
    reducedMotion: p?.reducedMotion === true,
    highContrast: p?.highContrast === true,
  };
}

/** The vars to paint for a compiled theme and a player's preferences. */
export function withPrefs(vars: ThemeVars, prefs: Partial<NuiPrefs> = DEFAULT_PREFS): ThemeVars {
  const p = normalizePrefs(prefs);
  const out = { ...vars };
  if (p.highContrast) highContrast(out);
  const scale = (parseFloat(out["nk-scale"] ?? "1") || 1) * p.scale;
  out["nk-scale"] = String(Math.round(scale * 1000) / 1000);
  out["nk-motion"] = p.reducedMotion || out["nk-motion"] === "0" ? "0" : "1";
  return out;
}
