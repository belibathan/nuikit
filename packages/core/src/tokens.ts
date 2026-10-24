/**
 * nuikit tokens v1 (docs/tokens.md): the theme contract every nuikit UI reads, and the compiler
 * that turns any shadcn / TweakCN paste (or a DTCG file, or a plain object) into it.
 *
 *   const { vars, warnings } = compileTheme(readFileSync("theme.css", "utf8"));
 *
 * Pure: no DOM, runs in the browser, in Node and in the FXServer JS runtime.
 */
import { composite, contrastRatio, formatRgba, mix, oklchToRgb, rgbToOklch, toRgba, type RGBA } from "./color";
import { ROLE_DEFAULTS, ROLES } from "./spec/roles";
import type { LeverType } from "./spec/lang";
import { LEVER_ROWS, type LeverRow } from "./tokens.generated";

export type ThemeVars = Record<string, string>;
export type ThemeMode = "dark" | "light";

/** The token contract version. Bumped for breaking renames/removals: 2 is the token language (src/spec). */
export const TOKENS_VERSION = 2 as const;
/** The contract revision: the language's first. */
export const TOKENS_REVISION = "2.0" as const;

/** A lever's type (src/spec/lang.ts). */
export type TokenType = LeverType;

/**
 * One lever as the compiler sees it: a row of the generated table (src/tokens.generated.ts) plus its group. Every
 * table below is a filter of LEVER_ROWS; nothing here names a token by hand.
 */
export interface TokenSpec extends LeverRow {
  /** palette (the v1 colours, radius and faces: what a TweakCN paste sets), identity, semantic, component; derived levers are computed. */
  group: "palette" | "identity" | "semantic" | "component" | "derived";
  /** What a theme that leaves it out gets (the rule for the palette and derived levers, else the CSS default). */
  fallback: string;
}

const spec = (r: LeverRow): TokenSpec => ({
  ...r,
  group: r.derived ? "derived" : r.scope === "" || r.scope === "font" ? "palette" : r.tier,
  fallback: r.rule ?? r.default,
});

/** Every lever, in spec order. */
export const ALL_TOKENS: readonly TokenSpec[] = LEVER_ROWS.map(spec);
export const ALL_TOKEN_NAMES: readonly string[] = ALL_TOKENS.map((t) => t.name);
const SPEC = new Map(ALL_TOKENS.map((t) => [t.name, t]));
/** The palette: shadcn's names and the game families, unprefixed (a TweakCN paste is a theme). Every compiled theme carries them. */
export const TOKENS: readonly TokenSpec[] = ALL_TOKENS.filter((t) => t.group === "palette" || (t.scope === "" && t.derived));
export const TOKEN_NAMES: readonly string[] = TOKENS.map((t) => t.name);
/** Identity levers (what a server chooses) and the derived ones the compiler writes. */
export const IDENTITY_TOKENS: readonly TokenSpec[] = ALL_TOKENS.filter((t) => t.scope !== "" && t.scope !== "font" && (t.tier === "identity" || t.derived));
/** Keyword levers painted as data-nk-<attr> on the themed element, so kit.css switches on an attribute. */
export const KEYWORD_ATTRS: readonly (readonly [string, string])[] = ALL_TOKENS.filter((t) => t.attr).map((t) => [`data-nk-${t.attr}`, t.name] as const);
export { ANATOMY, type Lever, type LeverRow } from "./tokens.generated";

/** The default faces: the premium baseline's two voices (Geist for sentences, Barlow Condensed for anything scanned). */
const face = (n: string) => SPEC.get(n)!.default;
export const DEFAULT_FONT_SANS = face("font-sans");
export const DEFAULT_FONT_DISPLAY = face("font-display");
export const DEFAULT_FONT_MONO = face("font-mono");

/** Motion feels: how an identity moves. Painted as data-nk-feel. */
export const MOTION_FEELS = SPEC.get("nk-motion-feel")!.values as readonly ["crisp", "snap", "smooth", "stepped"];
export type MotionFeel = (typeof MOTION_FEELS)[number];
/** The four spring presets (docs/tokens.md#motion), run by nuikit-core/motion as sampled WAAPI keyframes. */
export const SPRING_PRESETS = ["snap", "move", "soft", "pop"] as const;
export type SpringPresetName = (typeof SPRING_PRESETS)[number];

/** Spring period per preset (snap, move, soft, pop) as a multiple of d, per feel. */
const SPRING_RATIO: Record<MotionFeel, readonly [number, number, number, number]> = {
  crisp: [1.15, 1.7, 2.55, 1.85],
  snap: [1.1, 1.65, 2.5, 1.8],
  smooth: [1.08, 1.42, 1.75, 1.5],
  stepped: [1, 1.43, 2.15, 1.7],
};
/** Each preset's ceiling (ms). */
const SPRING_MAX = [400, 400, 450, 400] as const;
/** The slowest base duration the kit allows; the compiler warns above it. */
export const MAX_DURATION_MS = 260;

/** The derived motion levers for a base duration d (ms), feel, bounce and exit factor: the ladder and the springs, as literals. */
export function motionTokens(d: number, feel: MotionFeel = "crisp", bounce = 0, opts: { exitFactor?: number } = {}): ThemeVars {
  const ms = (x: number) => `${Math.round(x)}ms`;
  const exit = opts.exitFactor !== undefined && Number.isFinite(opts.exitFactor) ? opts.exitFactor : 0.7;
  const b = Math.max(0, Math.min(0.3, bounce));
  const r = SPRING_RATIO[feel] ?? SPRING_RATIO.crisp;
  const bounces = [b, Math.max(0.1, b), b, Math.max(0.3, b)];
  const out: ThemeVars = {
    "nk-motion-move": "1",
    "nk-time-instant": "0ms",
    "nk-time-snap": ms(d * 0.5),
    "nk-time-fast": ms(d * 0.667),
    "nk-time-base": ms(d),
    "nk-time-slow": ms(d * 1.556),
    "nk-time-fill": ms(d * 2.333),
    "nk-time-exit": ms(d * exit),
    // written by the compiler (not left to kit.css) so the player's prefs can clamp them
    "nk-time-pulse": "1000ms",
    "nk-stagger": "40ms",
    "nk-stagger-max": "100ms",
  };
  SPRING_PRESETS.forEach((name, i) => {
    const t = Math.min(SPRING_MAX[i]!, Math.round((d * r[i]!) / 10) * 10);
    out[`nk-spring-${name}`] = `${t}ms ${Math.round(bounces[i]! * 1000) / 1000}`;
  });
  return out;
}

/** The time levers the player's prefs clamp. */
export const MOTION_TIME_TOKENS: readonly string[] = ["nk-time-snap", "nk-time-fast", "nk-time-base", "nk-time-slow", "nk-time-fill", "nk-time-exit", "nk-time-pulse", "nk-stagger"];
/** Under reduced motion fades are kept, but no longer than this; a theme's --nk-motion-reduced replaces it. */
export const REDUCED_FADE_MS = 100;

/** Role sets: a frame sets data-hue="<role>", its children read the --hue-* ramp. */
export { ROLE_SETS, ROLES } from "./spec/roles";

/** The chamfer (top left and bottom right) as a clip-path of a cut size. */
export const chamferClip = (cut: string) =>
  `polygon(${cut} 0, 100% 0, 100% calc(100% - ${cut}), calc(100% - ${cut}) 100%, 0 100%, 0 ${cut})`;

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
  /** Contract revision ("1.1": identity tokens). Absent from themes compiled by nuikit-core ≤ 0.6. */
  revision?: string;
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
  if (Array.isArray(value) && type === "cubicBezier" && value.length === 4) return `cubic-bezier(${value.join(", ")})`;
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
  // A token that is empty or an unresolvable alias is invalid at computed time, as in CSS: a var()
  // pointing at it takes its fallback, and the token itself is reported below.
  const DANGLING = /^var\(\s*--([\w-]+)\s*\)$/;
  const nothing = (v: string) => v.trim() === "" || DANGLING.test(v.trim());
  const lookup = (name: string, depth: number): string | undefined => {
    const v = base[name];
    if (v === undefined || depth > 8) return undefined;
    const r = resolveRefs(v, depth + 1);
    return nothing(r) ? undefined : r;
  };
  const resolveRefs = (value: string, depth: number): string =>
    value.replace(/var\(\s*--([\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (m, ref: string, fb?: string) => lookup(ref, depth) ?? fb?.trim() ?? m);

  const missing: string[] = [];
  for (const name of Object.keys(NEUTRAL[mode])) if (name !== "radius" && raw[name] === undefined) missing.push(name);
  if (!opts.partial && missing.length && missing.length < 23) {
    warnings.push(`The theme doesn't set ${missing.map((m) => `--${m}`).join(", ")}; stock shadcn values are used.`);
  }

  for (const [name, value] of Object.entries(base)) {
    const v = resolveRefs(String(value), 0);
    // Empty (`--primary: ;`), or an alias that leads nowhere (`var(--nope)`, or to an empty token):
    // the token would paint nothing. Use the stock value, or leave it out of a patch.
    if (nothing(v)) {
      const stock = opts.partial ? undefined : NEUTRAL[mode][name];
      const ref = DANGLING.exec(v.trim())?.[1];
      const why = v.trim() === "" ? "is empty" : `is ${v.trim()}, which ${ref !== undefined && base[ref] !== undefined ? "resolves to nothing" : "isn't defined"}`;
      warnings.push(`--${name} ${why}; ${stock ? "the stock value is used" : "it was left out"}.`);
      if (stock) resolved[name] = lower(stock)!;
      continue;
    }
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

  if (!opts.partial) {
    const given = new Set(Object.keys(resolved));
    derive(resolved, mode, warnings);
    deriveLevers(resolved, warnings, given);
  }
  else if (resolved["nk-scale"] !== undefined || resolved["nk-motion"] !== undefined) derive(resolved, mode, warnings, true);
  if (opts.highContrast) highContrast(resolved);

  const contrast = checkContrast(resolved);
  for (const r of contrast) {
    if (r.ok) continue;
    const reason = CONTRAST_PAIRS.find(([f, b]) => f === r.fg && b === r.bg)?.[3] ?? "it will be hard to read";
    warnings.push(`${r.fg} on ${r.bg} is ${r.ratio.toFixed(1)}:1 (needs ${r.min}:1); ${reason}.`);
  }

  const vars = order(resolved);
  return { version: TOKENS_VERSION, revision: TOKENS_REVISION, mode, vars, imports, warnings, contrast, hash: hash(JSON.stringify([vars, imports])) };
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
/** Legibility of text drawn straight on the game: a tight dark edge plus a soft halo, in black (the game, not the theme). */
export const WORLD_SHADOW = "0 1px 2px rgba(0, 0, 0, 0.65), 0 0 0.5rem rgba(0, 0, 0, 0.35)";
/** Mid-grey: the game's average frame. Text on the game must be lighter than it and clear it by 3:1. */
const MID_GREY: RGBA = [128, 128, 128, 1];

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
  // the player-facing numbers
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

  // radius and the faces: the palette's non-colours
  if (vars.radius === undefined) vars.radius = SPEC.get("radius")!.default;
  const sans = vars["font-sans"];
  if (sans === undefined) vars["font-sans"] = DEFAULT_FONT_SANS;
  if (vars["font-display"] === undefined) vars["font-display"] = sans === undefined ? DEFAULT_FONT_DISPLAY : sans;
  if (vars["font-numeric"] === undefined) vars["font-numeric"] = sans === undefined ? face("font-numeric") : sans;
  if (vars["font-mono"] === undefined) vars["font-mono"] = DEFAULT_FONT_MONO;

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
  const world = rgba(vars, "world-foreground") ?? WHITE;
  if (vars["world-foreground"] === undefined) vars["world-foreground"] = formatRgba(world);
  if (vars["world-foreground-muted"] === undefined) vars["world-foreground-muted"] = formatRgba([world[0], world[1], world[2], 0.8]);
  if (vars["world-shadow"] === undefined) vars["world-shadow"] = WORLD_SHADOW;
  for (const [w, status] of [["world-success", "success"], ["world-destructive", "destructive"]] as const) {
    const c = vars[w] === undefined ? rgba(vars, status) : null;
    if (!c) continue;
    const o = rgbToOklch(c);
    vars[w] = fmtOklch(Math.max(o.l, 0.7), o.c, o.h);
  }
  if (vars["hud-foreground"] === undefined) vars["hud-foreground"] = vars["world-foreground"]!;
  if (vars.scrim === undefined) vars.scrim = "rgb(0, 0, 0)";
  for (const k of ["pause-surface", "pause-ink"]) if (vars[k] === undefined) vars[k] = lower(SPEC.get(k)!.default)!;

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

// ─────────────────────────────────────────── levers

const NUM = /^-?(?:\d+\.?\d*|\.\d+)$/;
const DIM = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em|%)$/;
const DUR = /^(\d+\.?\d*|\.\d+)(ms|s)$/;
const BEZIER = /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/;
const EASE_KEYWORDS: Record<string, string> = {
  linear: "cubic-bezier(0, 0, 1, 1)",
  ease: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  "ease-in": "cubic-bezier(0.42, 0, 1, 1)",
  "ease-out": "cubic-bezier(0, 0, 0.58, 1)",
  "ease-in-out": "cubic-bezier(0.42, 0, 0.58, 1)",
};
const trimNum = (n: number) => String(Math.round(n * 10000) / 10000);

/** Normalise one lever value by its type and range; null if it isn't valid. */
function leverValue(spec: TokenSpec, raw: string): string | null {
  const v = raw.trim();
  switch (spec.type) {
    case "angle": {
      if (v === "0") return "0deg";
      const m = /^(-?\d*\.?\d+)deg$/.exec(v);
      if (!m) return null;
      const n = parseFloat(m[1]!);
      const [lo, hi] = spec.range ?? [-360, 360];
      return n >= lo && n <= hi ? `${trimNum(n)}deg` : null;
    }
    case "number": {
      if (!NUM.test(v)) return null;
      const n = parseFloat(v);
      if (spec.range && (n < spec.range[0] || n > spec.range[1])) return null;
      return trimNum(n);
    }
    case "length": {
      if (v === "0") return "0px";
      const m = DIM.exec(v);
      return m ? `${trimNum(parseFloat(m[1]!))}${m[2]}` : null;
    }
    case "time": {
      const m = DUR.exec(v);
      if (!m) return null;
      const ms = parseFloat(m[1]!) * (m[2] === "s" ? 1000 : 1);
      const [lo, hi] = spec.range ?? [0, 2000];
      return ms >= lo && ms <= hi ? `${trimNum(ms)}ms` : null;
    }
    case "ease": {
      const k = EASE_KEYWORDS[v];
      if (k) return k;
      const m = BEZIER.exec(v);
      if (!m) return null;
      const [x1, y1, x2, y2] = m.slice(1).map(Number) as [number, number, number, number];
      if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null;
      return `cubic-bezier(${[x1, y1, x2, y2].map(trimNum).join(", ")})`;
    }
    case "keyword":
      return spec.values?.includes(v) ? v : null;
    default:
      return v || null;
  }
}
const want = (spec: TokenSpec) =>
  spec.values ? spec.values.join(", ") : spec.range ? `a number from ${spec.range[0]} to ${spec.range[1]}` : spec.type === "length" ? "a length in px, rem, em or %" : spec.type === "time" ? "a duration up to 2000ms" : spec.type === "angle" ? "an angle in deg" : spec.type === "ease" ? "cubic-bezier(x1, y1, x2, y2)" : "a valid value";

const chromatic = (c: RGBA | null) => !!c && c[3] > 0 && rgbToOklch(c).c >= 0.06;

/** The box-shadow behind each surface.elevation, in the theme's scrim colour (s = "r, g, b"). */
export function elevationShadow(level: string, s: string): string {
  if (level === "none") return `0 0 0 0 rgba(${s}, 0)`;
  if (level === "hard") return `0 0.25rem 0 0 rgba(${s}, 0.5)`;
  if (level === "deep") return `0 0 0 1px rgba(${s}, 0.3), 0 2px 4px rgba(${s}, 0.2), 0 18px 40px -10px rgba(${s}, 0.55), 0 44px 96px -28px rgba(${s}, 0.75)`;
  return `0 0 0 1px rgba(${s}, 0.25), 0 12px 32px -16px rgba(${s}, 0.6)`;
}

/** The text-shadow behind each hud.text, in the theme's scrim colour. */
export function hudTextShadow(level: string, s: string): string {
  if (level === "none") return "none";
  if (level === "strong") return `0 0 2px rgba(${s}, 0.9), 0 1px 3px rgba(${s}, 0.8)`;
  return `0 1px 2px rgba(${s}, 0.6)`;
}

/** The HUD backplate (hud at no less than the hud material's opacity) over a white sky: what HUD text is judged against. */
function hudPlateOverWhite(vars: ThemeVars): RGBA | null {
  const hud = rgba(vars, "hud");
  if (!hud) return null;
  const a = Math.max(hud[3], parseFloat(vars["nk-material-hud-opacity"] ?? "0") || 0);
  return composite([hud[0], hud[1], hud[2], a], WHITE);
}

/** Roles: each role's colour and its deep / light steps. */
function deriveRoles(vars: ThemeVars) {
  for (const role of ROLES) {
    const name = `role-${role}`;
    if (vars[name] === undefined) {
      const d = ROLE_DEFAULTS[role]!;
      vars[name] = typeof d === "string" ? (vars[d] ?? vars.foreground!) : fmtOklch(d[0], d[1], d[2]);
    }
    const c = rgba(vars, name);
    if (!c) continue;
    const { l, c: ch, h } = rgbToOklch(c);
    if (vars[`${name}-deep`] === undefined) vars[`${name}-deep`] = fmtOklch(clamp(l - 0.12, 0.2, 1), ch * 0.9, h);
    if (vars[`${name}-light`] === undefined) vars[`${name}-light`] = fmtOklch(clamp(l + 0.1, 0, 0.95), ch * 0.85, h);
  }
}

/**
 * The levers: validate every value the theme set (identity, semantic, component) against its type and range; an
 * invalid one falls back to the default with a warning. Identity levers are written into the compiled theme (the
 * compiler derives from them); semantic and component levers are kept only when the theme set them (kit.css holds
 * their defaults, so a subtree's density or radius re-derives them). A formula (calc(), var()) is the theme's call.
 */
function deriveLevers(vars: ThemeVars, warnings: string[], given: ReadonlySet<string> = new Set()) {
  for (const spec of ALL_TOKENS) {
    if (spec.group === "palette" || spec.scope === "") continue;
    const value = vars[spec.name];
    const literal = spec.tier === "identity" && !spec.derived && !/var\(|calc\(/.test(spec.default);
    if (value === undefined) {
      if (literal && spec.type !== "color" && spec.type !== "font" && spec.type !== "shadow" && spec.type !== "paint") vars[spec.name] = spec.default;
      continue;
    }
    if (spec.type === "color" || spec.type === "font" || spec.type === "shadow" || spec.type === "paint" || spec.type === "string") continue;
    if (/^(calc|var|max|min|clamp)\(/.test(value.trim())) continue;
    const v = leverValue(spec, value);
    if (v === null) {
      warnings.push(`--${spec.name} must be ${want(spec)} (got ${value}); ${literal ? spec.default : "the kit default"} is used.`);
      if (literal) vars[spec.name] = spec.default;
      else delete vars[spec.name];
    } else vars[spec.name] = v;
  }

  // brand: the primary when it has colour, else the first chart colour
  if (vars.brand === undefined) {
    const primary = rgba(vars, "primary");
    vars.brand = chromatic(primary) || !vars["chart-1"] ? vars.primary! : vars["chart-1"]!;
  }
  const brand = rgba(vars, "brand") ?? rgba(vars, "primary")!;
  if (vars["brand-foreground"] === undefined) vars["brand-foreground"] = bestText(vars, brand);

  // surface: the panel colour, tinted toward the brand
  if (vars.surface === undefined) {
    const pop = rgba(vars, "popover");
    if (pop) vars.surface = formatRgba(mix(pop, [brand[0], brand[1], brand[2], pop[3]], parseFloat(vars["nk-surface-tint"]!)));
  }

  // keywords → values CSS can use without branching
  const scrim = rgba(vars, "scrim") ?? BLACK;
  const s = `${scrim[0]}, ${scrim[1]}, ${scrim[2]}`;
  if (vars["nk-depth-elevation"] === undefined) vars["nk-depth-elevation"] = elevationShadow(vars["nk-surface-elevation"]!, s);
  if (vars["nk-depth-text"] === undefined) vars["nk-depth-text"] = hudTextShadow(vars["nk-hud-text"]!, s);
  const cut = parseFloat(vars["nk-shape-cut"]!);
  if (vars["nk-line-clip"] === undefined) vars["nk-line-clip"] = cut > 0 ? chamferClip("var(--nk-shape-cut)") : "none";
  if (vars["nk-line-clip-sm"] === undefined) vars["nk-line-clip-sm"] = cut > 0 ? chamferClip("calc(var(--nk-shape-cut) / 2)") : "none";

  // motion: the ladder and the springs, as literals, from d, the feel, the bounce and the exit factor
  const d = parseFloat(vars["nk-motion-duration"]!);
  const motion = motionTokens(d, vars["nk-motion-feel"] as MotionFeel, parseFloat(vars["nk-motion-bounce"]!), { exitFactor: parseFloat(vars["nk-motion-exit-factor"]!) });
  for (const [k, v] of Object.entries(motion)) if (vars[k] === undefined) vars[k] = v;
  if (d > MAX_DURATION_MS) warnings.push(`--nk-motion-duration is ${d}ms (the kit's ceiling is ${MAX_DURATION_MS}ms); panels and menus will feel slow to a player who opens them hundreds of times.`);

  deriveRoles(vars);

  // floors: warn, never block
  const op = parseFloat(vars["nk-material-menu-opacity"]!);
  if (op < 0.92) warnings.push(`--nk-material-menu-opacity is ${op} (floor 0.92); the game will show through text in panels, and a bright sky will wash it out.`);
  const plate = hudPlateOverWhite(vars);
  const hudFg = rgba(vars, "hud-foreground");
  if (plate && hudFg) {
    const ratio = contrastRatio(composite(hudFg, plate), plate);
    if (ratio < 4.5)
      warnings.push(`hud-foreground on the HUD backplate over a white sky is ${ratio.toFixed(1)}:1 (needs 4.5:1); raise --nk-material-hud-opacity or darken --hud so HUD text reads over snow and midday sky.`);
  }
  for (const name of ["world-foreground", "world-foreground-muted"]) {
    if (!given.has(name)) continue;
    const c = rgba(vars, name);
    if (!c) continue;
    const onGrey = composite(c, MID_GREY);
    const ratio = contrastRatio(onGrey, MID_GREY);
    const lighter = contrastRatio(onGrey, BLACK) > contrastRatio(MID_GREY, BLACK);
    if (!lighter || ratio < 3)
      warnings.push(`--${name} is ${lighter ? `${ratio.toFixed(1)}:1 against a mid-grey frame (needs 3:1)` : "darker than a mid-grey frame"}; text drawn straight on the game (death text, unplated HUD values) will be hard to read. Keep it light, whatever the theme's mode.`);
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
  vars["world-foreground"] = "rgb(255, 255, 255)";
  vars["world-foreground-muted"] = "rgba(255, 255, 255, 0.85)";
  // identity (1.1): opaque panels, a solid HUD plate
  if (vars["nk-material-menu-opacity"] !== undefined) vars["nk-material-menu-opacity"] = "1";
  if (vars["nk-material-hud-opacity"] !== undefined) vars["nk-material-hud-opacity"] = "0.72";
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
  for (const name of ALL_TOKEN_NAMES) if (vars[name] !== undefined) out[name] = vars[name]!;
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
    $description: `${description} (nuikit tokens v${TOKENS_REVISION}, ${theme.mode})`,
    $extensions: { "dev.nuikit": { tokens: TOKENS_VERSION, revision: TOKENS_REVISION, mode: theme.mode, ...(theme.imports.length ? { imports: theme.imports } : {}) } },
    color,
  };
  const font: Record<string, unknown> = { $type: "fontFamily" };
  const nk: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(theme.vars)) {
    const spec = SPEC.get(name);
    // derived tokens are outputs: compiling the file derives them again
    if (spec?.group === "derived") continue;
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
      nk[name.slice(3)] = dtcgNk(spec, value, desc);
    }
  }
  if (Object.keys(font).length > 1) doc.font = font;
  doc.nk = nk;
  // a derived token the theme set itself (Default's eases) differs from what compiling the file derives: keep it
  const again = compileTheme(doc, { mode: theme.mode }).vars;
  for (const [name, value] of Object.entries(theme.vars)) {
    const spec = SPEC.get(name);
    if (spec?.group === "derived" && name.startsWith("nk-") && again[name] !== value) nk[name.slice(3)] = dtcgNk(spec, value, { $description: spec.description });
  }
  if (Object.keys(nk).length === 0) delete doc.nk;
  return doc;
}

/** One nk-* token as DTCG: number, dimension, duration, cubicBezier, or a keyword (string, no standard type). */
function dtcgNk(spec: TokenSpec | undefined, value: string, desc: Record<string, unknown>): Record<string, unknown> {
  const dim = DIM.exec(value);
  const dur = DUR.exec(value);
  const bez = BEZIER.exec(value);
  if (NUM.test(value) && (spec?.type ?? "number") === "number") return { $type: "number", $value: Number(value), ...desc };
  if (dim) return { $type: "dimension", $value: { value: parseFloat(dim[1]!), unit: dim[2] }, ...desc };
  if (dur) return { $type: "duration", $value: { value: parseFloat(dur[1]!), unit: dur[2] }, ...desc };
  if (bez) return { $type: "cubicBezier", $value: bez.slice(1).map(Number), ...desc };
  return { $value: value, ...desc, $extensions: { "dev.nuikit": { type: spec?.type ?? "keyword" } } };
}

/** JSON Schema (2020-12) for a compiled theme (theme.json, GlobalState.nuikitTheme). */
export function themeJsonSchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const t of ALL_TOKENS) {
    const since = { $comment: `${t.tier} · ${t.path}` };
    properties[t.name] =
      t.type === "color"
        ? { type: "string", pattern: "^rgba?\\(", description: t.description, ...since }
        : t.type === "number"
          ? { type: "string", pattern: "^-?\\d+(\\.\\d+)?$", description: t.description, ...since }
          : t.type === "keyword" && t.values
            ? { enum: [...(t.values ?? [])], description: t.description, ...since }
            : { type: "string", description: t.description, ...since };
  }
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://nuikit.vercel.app/schema/theme.v2.json",
    title: "nuikit compiled theme (tokens v2: the token language)",
    description: "What compileTheme() returns and the nuikit resource publishes: every token, lowered so FiveM's browser can read it.",
    type: "object",
    required: ["version", "vars"],
    properties: {
      version: { const: TOKENS_VERSION },
      revision: { type: "string", description: "Contract revision" },
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
  /** Spacing multiplier, 0.85–1.2 (on top of the theme's --nk-density). */
  density?: number;
  /** The look the player picked (the Lua side applies it as the theme; pages only read it). */
  identity?: string | null;
}

export const DEFAULT_PREFS: NuiPrefs = { scale: 1, reducedMotion: false, highContrast: false, density: 1 };

export function normalizePrefs(p: Partial<NuiPrefs> | null | undefined): NuiPrefs {
  const scale = Number(p?.scale);
  return {
    scale: Number.isFinite(scale) && scale > 0 ? Math.round(clamp(scale, 0.85, 1.25) * 100) / 100 : 1,
    reducedMotion: p?.reducedMotion === true,
    highContrast: p?.highContrast === true,
    density: Number.isFinite(Number(p?.density)) && Number(p?.density) > 0 ? Math.round(clamp(Number(p?.density), 0.85, 1.2) * 100) / 100 : 1,
  };
}

/** The vars to paint for a compiled theme and a player's preferences. */
export function withPrefs(vars: ThemeVars, prefs: Partial<NuiPrefs> = DEFAULT_PREFS): ThemeVars {
  const p = normalizePrefs(prefs);
  const out = { ...vars };
  if (p.highContrast) highContrast(out);
  const scale = (parseFloat(out["nk-scale"] ?? "1") || 1) * p.scale;
  out["nk-scale"] = String(Math.round(scale * 1000) / 1000);
  if (p.density !== undefined && p.density !== 1 && out["nk-density"] !== undefined) {
    out["nk-density"] = String(Math.round((parseFloat(out["nk-density"]) || 1) * p.density * 1000) / 1000);
  }
  const level = themeMotionLevel(vars, p);
  out["nk-motion"] = level === "on" ? "1" : "0";
  if (level !== "on") {
    // off: nothing animates. reduced: no movement, fades kept but at most --nk-motion-reduced (REDUCED_FADE_MS by default).
    const cap = parseFloat(out["nk-motion-reduced"] ?? "") || REDUCED_FADE_MS;
    if (out["nk-motion-move"] !== undefined || out["nk-time-base"] !== undefined) out["nk-motion-move"] = "0";
    for (const name of MOTION_TIME_TOKENS) {
      const v = out[name];
      if (v === undefined) continue;
      const ms = parseFloat(v) * (/\ds$/.test(v) && !/ms$/.test(v) ? 1000 : 1);
      out[name] = level === "off" || name === "nk-stagger" ? "0ms" : `${Math.min(Number.isFinite(ms) ? ms : 0, cap)}ms`;
    }
  }
  return out;
}

/**
 * The motion level for a theme and a player's prefs: "off" when the theme sets --nk-motion: 0, "reduced" when
 * the player asked for reduced motion, else "on". applyTheme paints it as html[data-nk-motion].
 */
export function themeMotionLevel(vars: ThemeVars, prefs: Partial<NuiPrefs> = DEFAULT_PREFS): "on" | "reduced" | "off" {
  if (vars["nk-motion"] === "0" || vars["nk-motion-profile"] === "instant") return "off";
  return prefs.reducedMotion === true || vars["nk-motion-profile"] === "reduced" ? "reduced" : "on";
}
