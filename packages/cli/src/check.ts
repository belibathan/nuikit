/**
 * nuikit check: audit a FiveM resource against the nuikit protocol's conformance levels
 * (docs/protocol.md §10). Regex and tokenizer level only, so it runs in milliseconds on any
 * resource and needs nothing installed.
 */
import fs from "node:fs";
import path from "node:path";
import { COLOR_PROPS, NAMED, colorLiterals, isNeutralShadow, paletteClasses, tokenRefs } from "./colors";
import { lexCss, lexHtml, lexJs, lexLua, locator, luaBlocks, type Span } from "./lex";
import { isTokenDefinition, TOKEN_NAMES } from "./tokens";
import { arsenalLua, arsenalPage } from "./arsenal";

export type Level = 0 | 1 | 2 | 3;
export type Severity = "error" | "warning";

export interface Finding {
  rule: RuleId;
  /** The conformance level this finding blocks; 0 = advisory (performance), never gates a level. */
  level: Level;
  severity: Severity;
  file: string;
  line: number;
  column: number;
  message: string;
  /** In a file synced from packages/create-nuikit/index.css.tpl: fix it there, not here. */
  inherited?: boolean;
}

export type RuleId =
  | "color/hardcoded"
  | "color/palette-class"
  | "tokens/none"
  | "manifest/protocol"
  | "surfaces/none"
  | "focus/direct"
  | "focus/no-release"
  | "escape/adhoc"
  | "native/runtime"
  | "native/components"
  | "perf/remote-asset"
  | "perf/frame-send"
  | "attention/glow"
  | "cef/backdrop-filter"
  | "cef/has"
  | "cef/container"
  | "cef/individual-transform"
  | "cef/color-mix-inline"
  // the kit conventions (tokens 1.5, docs/design/default.md §4): warnings until each directory's wave lands
  | "radius/raw"
  | "radius/pill"
  | "effect/blur"
  | "color/mix"
  | "shadow/soft"
  | "motion/duration"
  | "motion/ease"
  | "motion/property"
  | "type/raw"
  | "selector/class-substring"
  | "state/alert"
  | "theme/unlayered"
  | "theme/values-only"
  | "space/off-scale"
  // the arsenal (packages/core/arsenal.json): every nuikit feature a resource uses is a published, named part
  | "arsenal/unknown"
  | "arsenal/legacy"
  // the invariants (docs/design/baseline.md "Invariants"): a page draws no concept of its own
  | "selection/local"
  | "kit/local-concept";

export const RULES: Record<RuleId, { level: Level; description: string }> = {
  "color/hardcoded": { level: 1, description: "Hex, rgb(), hsl(), oklch()… or named colour literal instead of a theme token" },
  "color/palette-class": { level: 1, description: "Tailwind palette class (bg-emerald-500) instead of a token class (bg-primary)" },
  "tokens/none": { level: 1, description: "The UI never reads a theme token" },
  "manifest/protocol": { level: 2, description: "ui_page without nuikit_protocol metadata in fxmanifest" },
  "surfaces/none": { level: 2, description: "The resource has a ui_page but registers no surface" },
  "focus/direct": { level: 2, description: "SetNuiFocus / SetNuiFocusKeepInput called outside nuikit.lua" },
  "focus/no-release": { level: 2, description: "Focus taken directly and never released when the resource stops" },
  "escape/adhoc": { level: 2, description: "Escape handled with a keydown listener that posts a close callback, not through surfaces" },
  "native/runtime": { level: 3, description: "Doesn't use the nuikit runtime (@nuikit/init.lua or nuikit.lua, + nuikit-core)" },
  "native/components": { level: 3, description: "Doesn't build on shadcn/ui or nuikit registry components" },
  "perf/remote-asset": { level: 0, description: "Font or asset loaded from the network instead of the resource" },
  "perf/frame-send": { level: 0, description: "NUI message sent from a Wait(0) loop (every frame)" },
  "attention/glow": { level: 0, description: "More than one part marked data-nk-glow: the runtime lets --nk-surface-glow-budget (1) glow, so rank them or drop the extra marks" },
  "cef/backdrop-filter": { level: 0, description: "Raw backdrop-filter: go through --nk-panel-backdrop, so --nk-surface-backdrop: off can turn it off where NUI draws it as a black box" },
  "cef/has": { level: 0, description: ":has() is unsupported in Chromium 103 (the build polyfills some uses); don't rely on it for anything essential" },
  "cef/container": { level: 0, description: "@container queries and container-type are unsupported in Chromium 103; use media queries" },
  "cef/individual-transform": { level: 0, description: "Individual scale/translate/rotate properties are Chromium 104+ and clobber transform animations; use transform" },
  "cef/color-mix-inline": { level: 0, description: "color-mix()/oklch() in an inline style: the plugin only lowers stylesheets, so Chromium 103 drops it; use a token class or rgb()" },
  "radius/raw": { level: 0, description: "A radius literal (border-radius: 6px, rounded-md, rounded-[…], calc(var(--radius) - 2px)); use --nk-radius-key / -chip / -control / -surface" },
  "radius/pill": { level: 0, description: "A pill (rounded-full, 9999px, 50%); use --nk-radius-chip, or a Chip dot" },
  "effect/blur": { level: 0, description: "backdrop-filter, backdrop-blur-*, filter: blur / drop-shadow / grayscale, drop-shadow-*; depth is the plate recipe, dimming is opacity" },
  "color/mix": { level: 0, description: "color-mix() (Chromium 103 lacks it); use rgba(var(--…-rgb), a)" },
  "shadow/soft": { level: 0, description: "A soft shadow (blur > 0, shadow-sm…2xl); hard drops only: --nk-plate-drop or the tile plate" },
  "motion/duration": { level: 0, description: "A duration literal (ms / s, duration-*, animationDelay); use --nk-time-* and calc(var(--nk-stagger) * var(--i))" },
  "motion/ease": { level: 0, description: "A cubic-bezier literal or an ease / ease-in / ease-out keyword; use --nk-ease-*" },
  "motion/property": { level: 0, description: "A transition on anything but transform and opacity (transition-all, transition-colors…); switch rims, move with transform" },
  "type/raw": { level: 0, description: "A font-size or font-weight literal, text-[…], text-xs…5xl, font-medium / font-semibold; use .nk-scan / -title / -label / -num / -body and --nk-text-*" },
  "selector/class-substring": { level: 0, description: "[class*=…], [class^=…], [class$=…] selectors; key on data-state, data-tone or data-hue" },
  "state/alert": { level: 0, description: "data-critical, data-low, data-redline, data-danger, data-ink-deny; the one alert spelling is data-state=\"alert\" (deny: data-nk-deny)" },
  "theme/unlayered": { level: 0, description: "Theme CSS outside @layer nk.theme, !important, or app markup (.inv-*, .pause-*) in a theme; a theme sets tokens" },
  "theme/values-only": { level: 0, description: "A selector or a non-token declaration in a theme file (theme.css, themes/*.css); a theme sets values only, and a rule it needs means the kit is missing a lever (docs/design/levers.md)" },
  "selection/local": { level: 0, description: "A page draws its own selected/hover state (hover:bg-*, data-[state=active]:bg-*, aria-selected:bg-*, bg-accent, a .selected/.active/.hover class with a background); one selection, one component: MenuRowList, SelectionTile or Tabs" },
  "kit/local-concept": { level: 0, description: "A page hand-draws a keycap, plate, wall, skew or level fill (transform: skew, box-shadow: 0 Npx 0, border-bottom: Npx solid, a linear-gradient level fill); use Tile, Fill or Chip" },
  "arsenal/unknown": { level: 0, description: "A nk.* / NUI.* call, or a nuikit:* event, that the arsenal (packages/core/arsenal.json) doesn't declare: a private path, not a published part" },
  "arsenal/legacy": { level: 0, description: "An old name (nk.notify, NUI.surface…) the arsenal lists with a replacement and removeIn; use the nk.<domain>.<verb> it names" },
  "space/off-scale": { level: 0, description: "A gap, padding or margin off the 0.25rem step (0.375rem, 0.3125rem, gap-1.5…); use --nk-space-* and gap-(--nk-gap-*)" },
};

/** The kit conventions (docs/design/default.md §4): all warnings (level 0) for now. */
export const KIT_RULES: readonly RuleId[] = ["radius/raw", "radius/pill", "effect/blur", "color/mix", "shadow/soft", "motion/duration", "motion/ease", "motion/property", "type/raw", "selector/class-substring", "state/alert", "theme/unlayered", "theme/values-only", "space/off-scale", "selection/local", "kit/local-concept"];

export const LEVEL_NAMES: Record<Level, string> = { 0: "not conformant", 1: "themed", 2: "well-behaved", 3: "native" };

export type Kind = "resource" | "override" | "web";

export interface CheckResult {
  /** Folder that was checked (as given, joined). */
  root: string;
  name: string;
  kind: Kind;
  /** ui_page / loadscreen from fxmanifest. */
  page?: { type: "ui_page" | "loadscreen"; path: string };
  /** nuikit_protocol from fxmanifest. */
  protocol?: string;
  /** Highest level reached; null when the resource has no UI at all (nothing to grade). */
  level: Level | null;
  findings: Finding[];
  /** Rules that don't apply to this kind of folder. */
  skipped: RuleId[];
  stats: { files: number; uiFiles: number; luaFiles: number; tokenRefs: number };
}

export interface CheckOptions {
  /** Treat files under dist/ and build/ as the UI even when sources exist. */
  includeBuilt?: boolean;
}

const IGNORED_DIRS = new Set(["node_modules", ".git", ".turbo", ".vite", "coverage", ".next", ".cache"]);
const BUILT_DIRS = new Set(["dist", "build", "out"]);
const UI_EXT = /\.(css|scss|sass|less|html?|tsx|jsx|ts|js|mjs|cjs|vue|svelte)$/i;
const SKIP_FILE = /(\.d\.ts|\.test\.[jt]sx?|\.spec\.[jt]sx?|\.stories\.[jt]sx?|\.min\.js|\.map)$|(^|\/)(dev\.[jt]sx?|vite\.config\.[jt]s|tailwind\.config\.[jt]s|postcss\.config\.[cm]?js|vitest\.config\.[jt]s|tsup\.config\.[jt]s|eslint\.config\.[cm]?js)$/i;
// test code, and server-side scripts (never part of a page); and theme sources (the nuikit resource's
// theme.css and the identities in themes/): they define the colours every page reads, so a colour there
// is the theme itself, not a page bypassing it
const SKIP_DIR_IN_PATH = /(^|\/)(test|tests|__tests__|__mocks__|fixtures)\/|^server\/|^themes\/[^/]+\.css$|^theme\.css$/;

function walk(dir: string, rel = "", out: { rel: string; built: boolean }[] = [], built = false): typeof out {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (IGNORED_DIRS.has(e.name) || e.name.startsWith(".")) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), r, out, built || BUILT_DIRS.has(e.name));
    else if (e.isFile()) out.push({ rel: r, built });
  }
  return out;
}

/** Is a finding at `line` silenced by a `nuikit-ignore` comment (same line) or `nuikit-ignore-next-line` (line above)? */
function ignored(lines: string[], line: number, rule: RuleId): boolean {
  const test = (text: string | undefined, directive: RegExp) => {
    if (!text) return false;
    const m = directive.exec(text);
    if (!m) return false;
    const rules = (m[1] ?? "").split(/[\s,]+/).filter((r) => r.includes("/"));
    return rules.length === 0 || rules.some((r) => rule === r || rule.startsWith(r.replace(/\*$/, "")));
  };
  // nuikit-ignore-start [rules] … nuikit-ignore-end: a block of data the theme can't know
  for (let i = line - 1; i >= 0; i--) {
    if (/nuikit-ignore-end/.test(lines[i]!) && i !== line - 1) break;
    if (test(lines[i], /nuikit-ignore-start(?:\s+([\w/*,\s-]+))?/)) return true;
  }
  const above = lines[line - 2];
  const aboveIsComment = !!above && /^\s*(\/\/|\/\*|\*|--|<!--|\{\/\*)/.test(above);
  return (
    test(lines[line - 1], /nuikit-ignore(?!-next-line|-start|-end)(?:\s+([\w/*,\s-]+))?/) ||
    test(above, /nuikit-ignore-next-line(?:\s+([\w/*,\s-]+))?/) ||
    (aboveIsComment && test(above, /nuikit-ignore(?!-next-line|-start|-end)(?:\s+([\w/*,\s-]+))?/))
  );
}

class Collector {
  findings: Finding[] = [];
  constructor(private root: string) {}
  file(rel: string, src: string) {
    const loc = locator(src);
    const lines = src.split("\n");
    const inherited = /nuikit kit layer/.test(src) && /(^|\/)index\.css$/.test(rel);
    return (rule: RuleId, offset: number, message: string, severity: Severity = "error", levelOverride?: Level) => {
      const { line, column } = loc(offset);
      if (ignored(lines, line, rule)) return;
      const level = levelOverride ?? RULES[rule].level;
      this.findings.push({ rule, level, severity: level === 0 ? "warning" : severity, file: rel, line, column, message, ...(inherited ? { inherited } : {}) });
    };
  }
}

type Report = ReturnType<Collector["file"]>;

// ───────────────────────────────── kit conventions (docs/design/default.md §4), all warnings

/** Blank every var(…) (with its fallback): a token reference is never a literal. */
function blankVars(value: string): string {
  let out = "";
  let i = 0;
  while (i < value.length) {
    const j = value.indexOf("var(", i);
    if (j < 0) {
      out += value.slice(i);
      break;
    }
    out += value.slice(i, j);
    let depth = 1;
    let k = j + 4;
    while (k < value.length && depth > 0) {
      if (value[k] === "(") depth++;
      else if (value[k] === ")") depth--;
      k++;
    }
    out += " ".repeat(k - j);
    i = k;
  }
  return out;
}

/** Split at top-level commas, keeping each part's offset. */
function layers(value: string): { text: string; at: number }[] {
  const out: { text: string; at: number }[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if ((ch === "," && depth === 0) || i === value.length) {
      out.push({ text: value.slice(start, i), at: start });
      start = i + 1;
    }
  }
  return out;
}

const LENGTH = /(?<![\w.#-])(-?\d*\.?\d+)(px|rem|em|%)(?![\w-])/g;
const TIME = /(?<![\w.#-])(\d*\.?\d+)(ms|s)(?![\w-])/g;
const EASE_WORD = /(?<![\w-])(ease|ease-in|ease-out|ease-in-out)(?![\w-])/g;
const MOTION_OK = new Set(["transform", "opacity", "none", "-webkit-transform"]);
const ALERT_ATTR = /\bdata-(critical|low|redline|danger|ink-deny)\b/g;

/** A hard-drop layer: `0 0.25rem 0 …` (no blur) is a keycap wall. */
const WALL_SHADOW = /(?:^|,)\s*(?:inset\s+)?0(?:px)?\s+(-?[\d.]+)(px|rem)\s+0(?:px|rem)?(?=\s|,|$)/gi;
/** A wall is a drop of 3px / 0.1875rem or more; the 1-2px neutral drop of the plate recipe is allowed. */
const isWall = (v: string) => [...v.matchAll(WALL_SHADOW)].some((m) => Math.abs(parseFloat(m[1]!)) >= (m[2] === "rem" ? 0.1875 : 3));
const LEVEL_VAR = /--(?:level|value|progress|fill|pct|percent)\b/;

/** Invariant 3: a page's own plate, wall, skew or level fill (Tile, Fill and Chip draw these). */
function localConcept(p: string, v: string, raw: string, at: number, report: Report) {
  if (p === "transform" && /\bskew[xy]?\(/i.test(v)) report("kit/local-concept", at, "transform: skew is a hand-drawn slant; Tile and the theme's --nk-shape-slab draw it");
  else if (p === "box-shadow" && isWall(v)) report("kit/local-concept", at, "box-shadow: 0 Npx 0 is a hand-drawn keycap wall; use Tile (the plate recipe)");
  else if (/^border-bottom(-width)?$/.test(p) && (p.endsWith("width") || /\bsolid\b/.test(v)) && [...v.matchAll(LENGTH)].some((m) => (m[2] === "px" ? parseFloat(m[1]!) >= 2 : m[2] === "rem" && parseFloat(m[1]!) >= 0.125)))
    report("kit/local-concept", at, "border-bottom: Npx solid is a hand-drawn wall or underline; use Tile or the row indicator");
  else if (/^background(-image)?$/.test(p) && /linear-gradient\(/i.test(raw) && LEVEL_VAR.test(raw)) report("kit/local-concept", at, "a linear-gradient level fill; use Fill");
}

/** One CSS declaration against the Default rules. `at` is the declaration's offset, `vat` its value's. */
function kitDeclaration(prop: string, value: string, at: number, vat: number, report: Report) {
  const p = prop.toLowerCase();
  const v = blankVars(value);
  if (/color-mix\(/i.test(value)) report("color/mix", at, `${prop}: color-mix() isn't in Chromium 103; use rgba(var(--…-rgb), a)`);
  if (p.startsWith("--")) return;
  localConcept(p, v, value, at, report);
  if (/^border(-(top|bottom)-(left|right))?-radius$/.test(p)) {
    if (/(?<![\w.-])(9999px|999px|50%)/.test(v)) report("radius/pill", at, `${prop}: a pill; use --nk-radius-chip (or a Chip dot)`);
    else if ([...v.matchAll(LENGTH)].some((m) => parseFloat(m[1]!) !== 0)) report("radius/raw", at, `${prop}: a radius literal; use --nk-radius-key / -chip / -control / -surface`);
  }
  if (/^(-webkit-)?backdrop-filter$/.test(p) || (/^(-webkit-)?filter$/.test(p) && /\b(blur|drop-shadow|grayscale)\(/.test(value)))
    report("effect/blur", at, `${prop}: blur, drop-shadow and grayscale draw badly over the game; depth is the plate recipe, dimming is opacity`);
  if (p === "box-shadow") {
    for (const l of layers(v)) {
      const nums = l.text
        .replace(/\binset\b/g, " ")
        .replace(/\b(rgba?|hsla?|oklch|oklab)\([^)]*\)/g, " ")
        .trim()
        .split(/\s+/)
        .filter((t) => /^-?\d*\.?\d+(px|rem|em)?$/.test(t));
      if (nums.length >= 3 && parseFloat(nums[2]!) !== 0) {
        report("shadow/soft", vat + l.at, "a soft shadow (blur > 0); hard drops only: --nk-plate-drop or the tile plate");
        break;
      }
    }
  }
  if (/^(transition|animation)(-duration|-delay)?$/.test(p)) {
    const m = TIME.exec(v);
    TIME.lastIndex = 0;
    if (m && parseFloat(m[1]!) !== 0) report("motion/duration", vat + m.index, `${prop}: ${m[0]} is a literal; use --nk-time-* (the ladder) or calc(var(--nk-stagger) * var(--i))`);
  }
  if (/^(transition|animation)(-timing-function)?$/.test(p)) {
    const bez = /cubic-bezier\(/.exec(v);
    const word = EASE_WORD.exec(v);
    EASE_WORD.lastIndex = 0;
    if (bez) report("motion/ease", vat + bez.index, `${prop}: a cubic-bezier literal; use --nk-ease-*`);
    else if (word) report("motion/ease", vat + word.index, `${prop}: ${word[1]} is a keyword ease; use --nk-ease-*`);
  }
  if (p === "transition-property" || p === "transition") {
    for (const l of layers(value)) {
      const first = l.text.trim().split(/\s+/)[0] ?? "";
      if (!first || first.startsWith("var(") || /^\d/.test(first)) continue;
      if (!MOTION_OK.has(first.toLowerCase())) {
        report("motion/property", vat + l.at, `a transition on ${first}; only transform and opacity move (switch rims, move with transform)`);
        break;
      }
    }
  }
  if (p === "font-size" && [...v.matchAll(LENGTH)].length) report("type/raw", at, `${prop}: a size literal; use a role class (.nk-scan, .nk-title, .nk-label, .nk-num, .nk-body) or --nk-text-*`);
  if (p === "font-weight" && /^\s*(\d{3}|bold|bolder|lighter)\s*$/.test(v)) report("type/raw", at, `${prop}: a weight literal; use a role class or --nk-type-*-weight`);
  if (/^(gap|row-gap|column-gap|padding(-(top|right|bottom|left|inline|block)(-start|-end)?)?|margin(-(top|right|bottom|left|inline|block)(-start|-end)?)?)$/.test(p)) {
    for (const m of v.matchAll(LENGTH)) {
      const n = Math.abs(parseFloat(m[1]!));
      const off = m[2] === "rem" ? Math.abs(n * 4 - Math.round(n * 4)) > 1e-6 : m[2] === "px" ? n > 2 && n % 4 !== 0 : false;
      if (off) {
        report("space/off-scale", vat + m.index!, `${prop}: ${m[0]} is off the 0.25rem step; use --nk-space-* or gap-(--nk-gap-*)`);
        break;
      }
    }
  }
}

/** A rule's selector against the Default rules. */
function kitSelector(prelude: string, at: number, report: Report) {
  const sub = /\[class\s*[*^$]=/.exec(prelude);
  if (sub) report("selector/class-substring", at + sub.index, "a class-substring selector; key on data-state, data-tone or data-hue");
  for (const m of prelude.matchAll(ALERT_ATTR)) report("state/alert", at + m.index!, `${m[0]}: the one alert spelling is data-state="alert" (deny: data-nk-deny)`);
}

/** A page rule that backs its own selected/hover state: .selected, .active, .hover (and .is-*). */
const LOCAL_STATE_SELECTOR = /\.(is-)?(selected|active|hover)(?![\w-])/;

// class names in markup and script strings
const CLASS_RULES: [RegExp, RuleId, string][] = [
  [/(?<![\w-])rounded(-[trblse]{1,2})?-full(?![\w-])/g, "radius/pill", "a pill; use rounded-(--nk-radius-chip) or a Chip dot"],
  [/(?<![\w-])rounded(-[trblse]{1,2})?-(xs|sm|md|lg|xl|2xl|3xl|\[[^\]]+\])(?![\w-])/g, "radius/raw", "a radius class; use rounded-(--nk-radius-key / -chip / -control / -surface)"],
  [/(?<![\w-])(backdrop-blur(-\w+)?|drop-shadow(-\w+)?|blur-(sm|md|lg|xl|2xl|3xl)|grayscale)(?![\w-])/g, "effect/blur", "blur, drop-shadow and grayscale draw badly over the game; use the plate recipe or opacity"],
  [/(?<![\w-])shadow-(sm|md|lg|xl|2xl)(?![\w-])/g, "shadow/soft", "a soft shadow; hard drops only (--nk-plate-drop)"],
  [/(?<![\w-])(duration|delay)-(\d+|\[\d[^\]]*\])(?![\w-])/g, "motion/duration", "a duration literal; use duration-(--nk-time-*)"],
  [/(?<![\w-])ease-(in|out|in-out|\[cubic-bezier[^\]]*\])(?![\w-])/g, "motion/ease", "a literal ease; use ease-(--nk-ease-*)"],
  [/(?<![\w-])transition(-all|-colors|-shadow|-\[(?!transform|opacity)[^\]]+\])?(?![\w-])/g, "motion/property", "a transition beyond transform and opacity; use transition-transform or transition-opacity"],
  [/(?<![\w-])(text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)|text-\[\d[^\]]*\]|font-(medium|semibold))(?![\w-])/g, "type/raw", "a type literal; use a role class (nk-scan, nk-title, nk-label, nk-num, nk-body)"],
  [/(?<![\w-])(?:[\w-]+:)*(hover:bg-|data-\[state=(?:active|checked|selected|open)\]:bg-|aria-selected:bg-|aria-checked:bg-)(?!transparent|none)[\w\[(-][^\s"'`]*/g, "selection/local", "a page-drawn selected/hover background; use MenuRowList, SelectionTile or Tabs"],
  [/(?<![\w:-])bg-accent(?![\w-])/g, "selection/local", "bg-accent on a row is a page-drawn selection; use MenuRowList, SelectionTile or Tabs"],
  [/(?<![\w-])-?skew(-[xy])?-(\d+|\[[^\]]+\])|(?<![\w-])skew[XY]?\(|\[transform:skew/g, "kit/local-concept", "a hand-drawn slant; Tile and --nk-shape-slab draw it"],
  [/shadow-\[(?:inset_)?0(?:px)?_-?(?:[3-9]|\d{2,}|0?\.(?:1[89]|[2-9])\d*(?=rem))[\d.]*(?:px|rem)_0(?:px|rem)?[_\],]/g, "kit/local-concept", "a hand-drawn keycap wall (box-shadow 0 Npx 0); use Tile"],
  [/(?<![\w-])(?:[\w-]+:)*border-b-(?:[2-9]|\[[2-9]\d*px\])(?![\w-])/g, "kit/local-concept", "a hand-drawn wall or underline; use Tile or the row indicator"],
  [/(?<![\w-])-?(gap(-[xy])?|p[xytrblse]?|m[xytrblse]?|space-[xy])-\d+\.5(?![\w-])/g, "space/off-scale", "off the 0.25rem step; use gap-(--nk-gap-*) or --nk-space-*"],
];

function kitClasses(text: string, base: number, report: Report) {
  // only things that look like class lists (no sentences): a token with a dash or a colon
  for (const [re, rule, msg] of CLASS_RULES) {
    for (const m of text.matchAll(re)) {
      // `transition` alone is only a class when it sits in a class list
      if (rule === "motion/property" && m[0] === "transition" && !/(^|\s)transition(\s|$)/.test(text)) continue;
      report(rule, base + m.index!, `${m[0]}: ${msg}`);
    }
  }
  for (const m of text.matchAll(ALERT_ATTR)) report("state/alert", base + m.index!, `${m[0]}: use data-state="alert" (deny: data-nk-deny)`);
}

/** Script code (not strings): JSX alert attributes, animationDelay / transitionDuration literals. */
function kitScript(code: string, report: Report) {
  for (const m of code.matchAll(ALERT_ATTR)) report("state/alert", m.index!, `${m[0]}: the one alert spelling is data-state="alert" (deny: data-nk-deny)`);
  for (const m of code.matchAll(/\b(animationDelay|animationDuration|transitionDelay|transitionDuration)\s*:\s*(\d+)/g))
    report("motion/duration", m.index!, `${m[1]}: ${m[2]} is a literal; use --nk-time-* or calc(var(--nk-stagger) * var(--i))`);
}

/** The blocks a values-only theme file may open: a mode block, Tailwind's @theme, the nk.theme layer, a colour-scheme media query. */
const MODE_BLOCK = /^(:root|\.dark|\.light|html|@theme\b.*|@layer\s+nk\.theme|@media\s*\(\s*prefers-color-scheme:[^)]*\))$/;

/**
 * A theme stylesheet: token values in @layer nk.theme only (theme/unlayered). A theme *file* (theme.css, themes/*.css;
 * `valuesOnly`) also sets values only: any other block, or a non-token declaration, is theme/values-only.
 */
function scanThemeCss(css: string, report: Report, valuesOnly = false) {
  const src = lexCss(css);
  const stack: string[] = [];
  let buf = "";
  let bufStart = 0;
  let paren = 0;
  const inTheme = () => stack.some((s) => /^@layer\s+nk\.theme\b/.test(s));
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (ch === "(") paren++;
    if (ch === ")") paren = Math.max(0, paren - 1);
    if (paren === 0 && ch === "{") {
      const prelude = buf.trim();
      const at = bufStart + buf.indexOf(prelude);
      if (!prelude.startsWith("@") && /(^|[\s,>+~(])\.(inv|pause|hud|ox|ia)-[\w-]/.test(prelude)) report("theme/unlayered", at, `${prelude.slice(0, 40)}: app markup in a theme; a theme sets tokens and styles documented data attributes`);
      else if (valuesOnly && !MODE_BLOCK.test(prelude)) report("theme/values-only", at, `${prelude.slice(0, 40)}: a rule in a theme file; a theme sets values, so the kit is missing a lever (docs/design/levers.md)`);
      stack.push(prelude);
      buf = "";
      bufStart = i + 1;
      continue;
    }
    if (paren === 0 && (ch === ";" || ch === "}")) {
      const t = buf.trim();
      if (t && !t.startsWith("@")) {
        const lead = bufStart + buf.indexOf(t);
        if (/!important\s*$/.test(t)) report("theme/unlayered", lead, "!important in a theme; put it in @layer nk.theme and set a token");
        else if (!t.startsWith("--") && stack.length && !inTheme() && !stack.some((s) => /^@(font-face|keyframes|property)\b/.test(s))) report("theme/unlayered", lead, `${t.split(":")[0]} outside @layer nk.theme; a theme writes into nk.theme (token values and data-attribute rules)`);
        else if (valuesOnly && !t.startsWith("--") && stack.length && stack.every((s) => MODE_BLOCK.test(s))) report("theme/values-only", lead, `${t.split(":")[0]}: a property in a theme file; a theme sets tokens only`);
      }
      buf = "";
      bufStart = i + 1;
      if (ch === "}") stack.pop();
      continue;
    }
    if (!buf) bufStart = i;
    buf += ch;
  }
}

// ───────────────────────────────── CSS

const THEME_SELECTOR = /(^|[\s,])(:root|\.dark|html|:host|@theme\b|\[data-theme|\.theme-)/;
const SHADOW_PROPS = /^(box-shadow|-webkit-box-shadow|text-shadow|filter|-webkit-filter|drop-shadow)$/i;
/** Masks use colour only as alpha. */
const MASK_PROPS = /^(-webkit-)?mask(-image|-border|-border-source)?$/i;

/** Blank `var(--token, fallback)` fallbacks for known tokens: a fallback for a token is a default, not a hard-code. */
function blankTokenFallbacks(value: string): string {
  const re = /var\(\s*--([\w-]+)\s*,/g;
  let out = value;
  for (const m of value.matchAll(re)) {
    if (!TOKEN_NAMES.has(m[1]!) && !/^nk-/.test(m[1]!)) continue;
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    while (i < value.length && depth > 0) {
      if (value[i] === "(") depth++;
      else if (value[i] === ")") depth--;
      i++;
    }
    out = out.slice(0, start) + " ".repeat(i - 1 - start) + out.slice(i - 1);
  }
  return out;
}

function scanCss(css: string, base: number, report: Report, ctx: FileContext) {
  const src = lexCss(css);
  ctx.tokenRefs += tokenRefs(src);
  const selectors: string[] = [];
  let buf = "";
  let bufStart = 0;
  let quote: string | null = null;
  let paren = 0;

  const statement = (text: string, at: number) => {
    const t = text.trim();
    if (!t) return;
    const lead = at + text.indexOf(t);
    if (t.startsWith("@")) {
      if (/^@import\b/i.test(t)) remoteInCss(t, base + lead, report);
      if (/^@apply\b/i.test(t)) for (const h of paletteClasses(t)) report("color/palette-class", base + lead + h.index, `${h.text} is a fixed palette colour; use a token class (bg-primary, text-muted-foreground…)`);
      return;
    }
    const colon = t.indexOf(":");
    if (colon <= 0) return;
    const prop = t.slice(0, colon).trim();
    const valueOffset = lead + colon + 1;
    const value = t.slice(colon + 1);
    remoteInCss(value, base + valueOffset, report);
    if (!ctx.built) {
      if (/^backdrop-filter$/i.test(prop)) report("cef/backdrop-filter", base + lead, "backdrop-filter draws a black box over the game in NUI; set --nk-panel-backdrop instead (kit.css applies it behind --nk-surface-backdrop, which a server turns off)");
      else if (/^container(-type|-name)?$/i.test(prop)) report("cef/container", base + lead, `${prop} is unsupported in Chromium 103`);
      else if (/^(scale|translate|rotate)$/i.test(prop)) report("cef/individual-transform", base + lead, `${prop}: is Chromium 104+ and clobbers transform animations; use transform: ${prop}(…)`);
      if (ctx.inlineStyle) for (const m of value.matchAll(/\b(color-mix|oklch|oklab)\(/gi)) report("cef/color-mix-inline", base + valueOffset + m.index!, `${m[1]}() in an inline style isn't lowered (the plugin only rewrites stylesheets); use a token class or rgb()`);
    }
    if (ctx.kit) kitDeclaration(prop, value, base + lead, base + valueOffset, report);
    if (ctx.kit && /^background(-color|-image)?$/i.test(prop) && selectors.length && LOCAL_STATE_SELECTOR.test(selectors[selectors.length - 1]!))
      report("selection/local", base + lead, `${selectors[selectors.length - 1]!.trim().slice(0, 40)}: a page-drawn selected/hover background; use MenuRowList, SelectionTile or Tabs`);
    const inTheme = selectors.some((s) => THEME_SELECTOR.test(s));
    if (prop.startsWith("--")) {
      const name = prop.slice(2);
      if (inTheme && isTokenDefinition(name)) {
        ctx.tokenRefs++; // a token definition (a theme, or a theme default)
        return;
      }
      for (const h of colorLiterals(blankTokenFallbacks(value)))
        report("color/hardcoded", base + valueOffset + h.index, `--${name} hard-codes ${h.text}; a local colour variable bypasses the theme, use a token`);
      return;
    }
    if (MASK_PROPS.test(prop)) return;
    const shadow = SHADOW_PROPS.test(prop) || /drop-shadow\(/i.test(value);
    for (const h of colorLiterals(blankTokenFallbacks(value))) {
      if (shadow && isNeutralShadow(h.text)) continue;
      report("color/hardcoded", base + valueOffset + h.index, `${prop}: ${h.text} is a fixed colour; use a theme token (var(--…))`);
    }
    if (COLOR_PROPS.test(prop)) {
      for (const m of value.matchAll(/(?<![\w-])([a-z]+)(?![\w-(])/gi)) {
        if (NAMED.has(m[1]!.toLowerCase())) report("color/hardcoded", base + valueOffset + m.index!, `${prop}: ${m[1]} is a fixed colour; use a theme token`);
      }
    }
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === "(") paren++;
    if (ch === ")") paren = Math.max(0, paren - 1);
    if (paren === 0 && ch === "{") {
      const prelude = buf.trim();
      if (!ctx.built) {
        const at = base + bufStart + buf.indexOf(prelude);
        if (/^@container\b/i.test(prelude)) report("cef/container", at, "@container is unsupported in Chromium 103 (ignored); use a media query");
        else if (!prelude.startsWith("@") && /:has\(/i.test(prelude)) report("cef/has", at + prelude.search(/:has\(/i), ":has() is unsupported in Chromium 103; don't depend on it for anything essential");
      }
      if (ctx.kit && !prelude.startsWith("@")) kitSelector(prelude, base + bufStart + buf.indexOf(prelude), report);
      selectors.push(prelude);
      buf = "";
      bufStart = i + 1;
      continue;
    }
    if (paren === 0 && (ch === ";" || ch === "}")) {
      statement(buf, bufStart);
      buf = "";
      bufStart = i + 1;
      if (ch === "}") selectors.pop();
      continue;
    }
    if (!buf) bufStart = i;
    buf += ch;
  }
  statement(buf, bufStart);
}

const REMOTE_HOST_OK = /^https?:\/\/(cfx-nui-|nui-img|localhost|127\.0\.0\.1)/i;

function remoteInCss(text: string, base: number, report: Report) {
  for (const m of text.matchAll(/(?:@import\s+(?:url\()?|url\()\s*["']?(https?:\/\/[^"')\s]+)/gi)) {
    const url = m[1]!;
    if (REMOTE_HOST_OK.test(url)) continue;
    report("perf/remote-asset", base + m.index!, `${url} is fetched from the network by every client; ship it in the resource`);
  }
}

// ───────────────────────────────── markup and scripts

interface FileContext {
  tokenRefs: number;
  importsCore: boolean;
  usesComponents: boolean;
  handshakeOff: boolean;
  hasScript: boolean;
  /** data-nk-glow marks seen across the resource's UI files (tokens 1.4 glow budget). */
  glowMarks: number;
  /** Scanning a style="" attribute (the plugin doesn't lower CSS inside it). */
  inlineStyle?: boolean;
  /** The file is build output (compiled Tailwind legitimately uses these features). */
  built?: boolean;
  /** Grade it against the kit conventions: the page's own source, not a synced copy (components/ui, lib/utils, the kit layer of index.css). */
  kit?: boolean;
}

const GLOW_MARK = /\bdata-nk-glow(?![-\w])/g;
/** The glow budget: a page whose source marks more than one part as glowing gets one warning. */
function scanGlow(text: string, base: number, report: Report, ctx: FileContext) {
  for (const m of text.matchAll(GLOW_MARK)) {
    if (++ctx.glowMarks === 2) report("attention/glow", base + m.index!, "a second part is marked data-nk-glow; only --nk-surface-glow-budget (1) glows at a time, the focused one first: give each a rank (data-nk-glow=\"2\") or keep one");
  }
}

const REMOTE_EXT = /^https?:\/\/[^\s"'`]+\.(woff2?|ttf|otf|eot|css|png|jpe?g|webp|gif|svg|mp3|ogg|wav|mp4|webm|js)(\?[^\s"'`]*)?$/i;
const REMOTE_HOST = /^https?:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|cdn\.|cdnjs\.|unpkg\.com)/i;
const isRemoteAsset = (url: string) => (REMOTE_EXT.test(url) || REMOTE_HOST.test(url)) && !REMOTE_HOST_OK.test(url) && !url.includes("${");

function scanStrings(src: string, strings: Span[], report: Report, ctx: FileContext) {
  for (const s of strings) {
    const text = src.slice(s.start, s.end);
    if (!text) continue;
    ctx.tokenRefs += tokenRefs(text);
    const before = src.slice(Math.max(0, s.start - 24), s.start - 1);
    const isLinkish = /(?:href|to|id|xlinkHref|xlink:href|htmlFor|selector)\s*=\s*\{?\s*$/.test(before);
    const shadowProp = /shadow\w*["']?\s*:\s*$/i.test(before);
    for (const h of colorLiterals(text)) {
      if (h.text.startsWith("#") && isLinkish) continue;
      // [text-shadow:0_1px_2px_rgb(0_0_0/0.6)], drop-shadow-[…], boxShadow: "…": black/white shadows are fine
      const token = text.slice(text.lastIndexOf(" ", h.index) + 1, h.index);
      if ((shadowProp || /shadow/i.test(token)) && isNeutralShadow(h.text)) continue;
      report("color/hardcoded", s.start + h.index, `${h.text} is a fixed colour; use a theme token (var(--…) or a token class)`);
    }
    for (const h of paletteClasses(text)) report("color/palette-class", s.start + h.index, `${h.text} is a fixed palette colour; use a token class (bg-primary, text-muted-foreground…)`);
    if (ctx.kit) kitClasses(text, s.start, report);
    const url = text.trim();
    if (isRemoteAsset(url)) {
      report("perf/remote-asset", s.start, `${url} is fetched from the network by every client; ship it in the resource`);
    }
  }
}

const ESCAPE_TOKEN = /(["'`])Esc(?:ape)?\1|\bkeyCode\s*={2,3}\s*27\b|\bwhich\s*={2,3}\s*27\b/g;
const KEY_LISTENER = /\b(keydown|keyup|keypress|onKeyDown|onKeyUp|onkeydown|onkeyup|useKeyPress|useHotkeys|useKeyboard)\b/;
const POST = /(?<![.\w])(fetchNui|fetchNUI|nuiFetch|fetch|closeNui|closeUI|\$\.post|axios\.post|sendNui|sendNUI|nuiCallback|postNui|callNui|post|send|nuiPost)\s*\(\s*(.{0,80})/g;

/** Local helpers an Escape handler typically calls to close; flagged when the same file posts to Lua. */
const CLOSER = /\b((?:handle|on|do)?(?:close|exit|hide|release|finish|dismiss|cancel)(?:Menu|Ui|UI|Nui|NUI|Panel|Dialog)?)\s*\(/gi;

function scanEscape(code: string, report: Report, ctx: FileContext, severity: Severity) {
  if (!KEY_LISTENER.test(code)) return;
  const filePosts = [...code.matchAll(POST)].some((p) => !/nuikit:escape/.test(p[2] ?? ""));
  const level = severity === "warning" ? 0 : undefined;
  const why = ctx.handshakeOff
    ? "fine when the overridden resource's protocol requires it, otherwise route it through surfaces"
    : "declare the surface's escape mode and let nuikit handle it (protocol §3.5)";
  const seen = new Set<number>();
  for (const m of code.matchAll(ESCAPE_TOKEN)) {
    // the handler body that follows: up to 15 lines
    const tail = code.slice(m.index!, m.index! + 1200).split("\n").slice(0, 15).join("\n");
    if (/nuikit:escape/.test(tail)) continue; // routed through the protocol
    let hit: string | null = null;
    for (const p of tail.matchAll(POST)) {
      const args = p[2] ?? "";
      const at = m.index! + p.index!;
      if (seen.has(at)) break;
      seen.add(at);
      hit = `${p[1]}(${args.split(/[,)]/)[0]}…)`;
      break;
    }
    if (!hit && filePosts) {
      const c = [...tail.matchAll(CLOSER)][0];
      if (c && !seen.has(m.index! + c.index!)) {
        seen.add(m.index! + c.index!);
        hit = `${c[1]}(), which posts to Lua`;
      }
    }
    if (hit) report("escape/adhoc", m.index!, `Escape calls ${hit} directly; ${why}`, severity, level);
  }
}

function scanScript(src: string, base: number, report: Report, ctx: FileContext) {
  const { code, strings } = lexJs(src);
  if (code.trim()) ctx.hasScript = true;
  const shifted = (r: Report): Report => (rule, offset, message, severity, level) => r(rule, base + offset, message, severity, level);
  const rep = shifted(report);
  scanStrings(src, strings, rep, ctx);
  if (/from\s+["']nuikit-core(\/[\w-]+)?["']|import\(\s*["']nuikit-core|require\(\s*["']nuikit-core/.test(code)) ctx.importsCore = true;
  if (/from\s+["'][^"']*components\/ui\/[^"']+["']/.test(code)) ctx.usesComponents = true;
  scanEscape(code, rep, ctx, ctx.handshakeOff ? "warning" : "error");
  if (!ctx.built) arsenalPage(strings, src, rep);
  scanGlow(code, base, report, ctx);
  if (ctx.kit) kitScript(code, rep);
  if (!ctx.built) scanOldCefScript(src, code, strings, rep);
}

const BACKDROP_MSG = "backdrop-filter draws a black box over the game in NUI; set --nk-panel-backdrop instead (kit.css applies it behind --nk-surface-backdrop, which a server turns off)";
/** Inline styles in script: backdropFilter keys, and colour functions the plugin can't lower (it only rewrites stylesheets). */
function scanOldCefScript(src: string, code: string, strings: Span[], report: Report) {
  for (const m of code.matchAll(/\b(?:Webkit)?[bB]ackdropFilter\b/g)) report("cef/backdrop-filter", m.index!, BACKDROP_MSG);
  for (const s of strings) {
    const text = src.slice(s.start, s.end);
    const before = src.slice(Math.max(0, s.start - 40), s.start - 1);
    if (/(^|[^\w$-])(-webkit-)?backdrop-filter\s*:/.test(text) || (/^(-webkit-)?backdrop-filter$/.test(text.trim()) && /\bsetProperty\s*\(\s*$/.test(before))) report("cef/backdrop-filter", s.start, BACKDROP_MSG);
    const fn = /\b(?:color-mix|oklch|oklab)\(/i.exec(text);
    // a style value (style={{ background: "color-mix(…)" }}, el.style.x = …, setProperty), not a class string
    if (fn && (/[\w$"']\s*:\s*$/.test(before) || /\bstyle\b[^=]*=\s*\{?\s*$/.test(before) || /\bstyle\.\w+\s*=\s*$/.test(before) || /\bsetProperty\s*\([^,]*,\s*$/.test(before)))
      report("cef/color-mix-inline", s.start + fn.index, "color-mix()/oklch() in an inline style isn't lowered (the plugin only rewrites stylesheets); use a token class or rgb()");
  }
}

function scanHtml(src: string, report: Report, ctx: FileContext) {
  const { markup, styles, scripts } = lexHtml(src);
  if (/<meta[^>]+name=["']nuikit-handshake["'][^>]+content=["']off["']/i.test(markup)) ctx.handshakeOff = true;
  for (const s of styles) scanCss(src.slice(s.start, s.end), s.start, report, ctx);
  for (const s of scripts) scanScript(src.slice(s.start, s.end), s.start, report, ctx);
  scanGlow(markup, 0, report, ctx);
  // attributes: class, style, fill…
  for (const m of markup.matchAll(/\s([\w:@.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    const attr = m[1]!.toLowerCase();
    const value = m[3] ?? m[4] ?? "";
    const start = m.index! + m[0].indexOf(m[2]!) + 1;
    ctx.tokenRefs += tokenRefs(value);
    if (attr === "style" || attr === ":style") {
      ctx.inlineStyle = true;
      scanCss(`x{${value}}`, start - 2, report, ctx);
      ctx.inlineStyle = false;
      continue;
    }
    if (/^(href|src|id|for|name|content|data-[\w-]+|alt|title|action)$/.test(attr)) {
      if ((attr === "href" || attr === "src") && isRemoteAsset(value)) {
        const tag = markup.lastIndexOf("<", m.index!);
        const tagName = /^<(\w+)/.exec(markup.slice(tag))?.[1]?.toLowerCase();
        if (tagName === "link" || tagName === "script" || tagName === "img" || tagName === "audio" || tagName === "video" || tagName === "source")
          report("perf/remote-asset", start, `${value} is fetched from the network by every client; ship it in the resource`);
      }
      continue;
    }
    for (const h of colorLiterals(value)) report("color/hardcoded", start + h.index, `${attr}="${h.text}" is a fixed colour; use a theme token`);
    for (const h of paletteClasses(value)) report("color/palette-class", start + h.index, `${h.text} is a fixed palette colour; use a token class`);
    if (ctx.kit && (attr === "class" || attr === "classname" || attr === ":class")) kitClasses(value, start, report);
  }
  if (ctx.kit) for (const m of markup.matchAll(ALERT_ATTR)) report("state/alert", m.index!, `${m[0]}: the one alert spelling is data-state="alert" (deny: data-nk-deny)`);
}

// ───────────────────────────────── Lua

interface LuaContext {
  focusCalls: { file: string; offset: number }[];
  releasesOnStop: boolean;
  surfaces: boolean;
  usesNuikitLua: boolean;
  /** Events this resource declares itself (its own nuikit:* names are not the arsenal's to judge: none should exist). */
  declaredEvents?: Set<string>;
}

function isNuikitLua(rel: string, src: string) {
  return /(^|\/)nuikit\.lua$/.test(rel) || /nuikit\.lua: the Lua half of nuikit/.test(src.slice(0, 400));
}

function scanLua(rel: string, src: string, report: Report, ctx: LuaContext) {
  const { code, bare } = lexLua(src);
  const own = isNuikitLua(rel, src);
  if (own) ctx.usesNuikitLua = true;
  if (!own) {
    for (const m of bare.matchAll(/\bSetNuiFocus(KeepInput)?\s*\(/g)) {
      ctx.focusCalls.push({ file: rel, offset: m.index! });
      report("focus/direct", m.index!, `${m[0].replace(/\s*\($/, "")} called directly; declare a surface (nk.surface) and let nuikit own focus (protocol §3.2)`);
    }
    if (/\b(?:NUI|nk)\s*\.\s*(surface|open|toggle)\s*\(/.test(bare)) ctx.surfaces = true;
  }
  // the runtime's own files (synced into lib/ or vendored into client/) implement the arsenal; they aren't graded by it
  const runtime = own || /(^|\/)(lib|client)\/(bridge|camera|controls|host|intents|intents\.schema|keys|settings|api)\.lua$/.test(rel) && /MIT · https:\/\/github\.com\/belibathan\/nuikit|^\s*nk\.(keys|settings):/m.test(src.slice(0, 600));
  if (!runtime) arsenalLua(src, bare, code, report, ctx.declaredEvents);
  const blocks = luaBlocks(bare);
  // focus release in a stop handler
  for (const m of code.matchAll(/AddEventHandler\s*\(\s*["']on(?:Client)?ResourceStop["']/g)) {
    const fn = blocks.filter((b) => b.kind === "function" && b.start > m.index!).sort((a, b) => a.start - b.start)[0];
    const body = fn ? bare.slice(fn.start, fn.end) : bare.slice(m.index!, m.index! + 600);
    if (/\bSetNuiFocus\s*\(\s*false/.test(body)) ctx.releasesOnStop = true;
  }
  // per-frame sends: innermost loop containing the send has Wait(0)
  const loops = blocks.filter((b) => b.kind === "while" || b.kind === "repeat");
  for (const m of bare.matchAll(/\b(SendNUIMessage|SendNuiMessage|NUI\s*\.\s*send)\s*\(/g)) {
    const at = m.index!;
    const inner = loops.filter((l) => l.start < at && at < l.end).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    if (!inner) continue;
    if (/\b(?:Citizen\s*\.\s*)?Wait\s*\(\s*0\s*\)/.test(bare.slice(inner.start, inner.end)))
      report("perf/frame-send", at, `${m[1]!.replace(/\s+/g, "")} inside a Wait(0) loop runs every frame; send on change or throttle to ≤ 10 Hz`);
  }
}

// ───────────────────────────────── manifest

interface Manifest {
  file: string;
  src: string;
  page?: { type: "ui_page" | "loadscreen"; path: string; offset: number };
  protocol?: string;
  loadsNuikitLua: boolean;
  /** Has a files { } entry (themes, chat_theme) */
}

function readManifest(root: string): Manifest | null {
  for (const file of ["fxmanifest.lua", "__resource.lua"]) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, "utf8");
    const { code } = lexLua(src);
    const page = /^\s*(ui_page|loadscreen)\s*\(?\s*["']([^"']+)["']/m.exec(code);
    const protocol = /^\s*nuikit_protocol\s*\(?\s*["']?([\w.]+)["']?/m.exec(code);
    return {
      file,
      src,
      page: page ? { type: page[1] as "ui_page" | "loadscreen", path: page[2]!, offset: page.index! + page[0].indexOf(page[1]!) } : undefined,
      protocol: protocol?.[1],
      // a copy of nuikit.lua, or the runtime imported from the nuikit resource
      loadsNuikitLua: /["'][^"']*nuikit\.lua["']/.test(code) || /["']@nuikit\/init\.lua["']/.test(code),
    };
  }
  return null;
}

// ───────────────────────────────── entry

/** Check one resource (or override / web) folder. */
export function checkResource(root: string, options: CheckOptions = {}): CheckResult {
  const abs = path.resolve(root);
  const collector = new Collector(abs);
  const manifest = readManifest(abs);
  const all = walk(abs);
  const ui = all.filter((f) => UI_EXT.test(f.rel) && !SKIP_FILE.test(f.rel) && !SKIP_DIR_IN_PATH.test(f.rel));
  const sources = ui.filter((f) => !f.built);
  // Only built output (a downloaded resource): grade what ships, but skip bundled JS (vendor code).
  const uiFiles = options.includeBuilt || sources.length === 0 ? ui.filter((f) => !f.built || !/\.(m?js|cjs)$/.test(f.rel) || options.includeBuilt) : sources;
  const luaFiles = all.filter((f) => /\.lua$/.test(f.rel) && f.rel !== manifest?.file && !SKIP_DIR_IN_PATH.test(f.rel));

  const ctx: FileContext = { tokenRefs: 0, importsCore: false, usesComponents: false, handshakeOff: false, hasScript: false, glowMarks: 0 };
  // HTML first so the handshake-off meta is known before scripts are graded.
  const ordered = [...uiFiles].sort((a, b) => Number(/\.html?$/.test(b.rel)) - Number(/\.html?$/.test(a.rel)));
  for (const f of ordered) {
    const src = fs.readFileSync(path.join(abs, f.rel), "utf8");
    const report = collector.file(f.rel, src);
    if (/(^|\/)components\/ui\//.test(f.rel)) ctx.usesComponents = true;
    ctx.built = f.built;
    ctx.kit = !f.built && !/(^|\/)(components\/ui\/|lib\/utils\.ts$)/.test(f.rel) && !(/(^|\/)index\.css$/.test(f.rel) && /nuikit kit (layer|utilities)/.test(src));
    if (/\.(css|scss|sass|less)$/i.test(f.rel)) scanCss(src, 0, report, ctx);
    else if (/\.(html?|vue|svelte)$/i.test(f.rel)) scanHtml(src, report, ctx);
    else scanScript(src, 0, report, ctx);
  }

  // theme stylesheets (theme.css, themes/, theme/): token values in @layer nk.theme only
  // theme files (theme.css, themes/*.css) set values only; a theme's rule sheets (theme/*.css) may hold data-attribute rules
  // A cfx `chat_theme` stylesheet (nuikit_chat's theme/style.css) is page CSS for the chat resource, not a nuikit theme.
  const chatTheme = /\bchat_theme\b/.test(manifest?.src ?? "");
  for (const f of all.filter((f) => !f.built && /^(theme\.css|themes?\/[^/]+\.css)$/.test(f.rel) && !(chatTheme && /^theme\//.test(f.rel)))) {
    const src = fs.readFileSync(path.join(abs, f.rel), "utf8");
    scanThemeCss(src, collector.file(f.rel, src), /^(theme\.css|themes\/)/.test(f.rel));
  }

  const lua: LuaContext = { focusCalls: [], releasesOnStop: false, surfaces: false, usesNuikitLua: false };
  for (const f of luaFiles) {
    const src = fs.readFileSync(path.join(abs, f.rel), "utf8");
    scanLua(f.rel, src, collector.file(f.rel, src), lua);
  }

  const kind: Kind = manifest ? "resource" : ctx.handshakeOff ? "override" : "web";
  const skipped: RuleId[] = [];
  const hasUi = uiFiles.length > 0 || !!manifest?.page;
  const isUiPage = manifest?.page?.type === "ui_page";

  if (hasUi && ctx.tokenRefs === 0) {
    collector.file(uiFiles[0]?.rel ?? manifest?.file ?? ".", "")("tokens/none", 0, "No theme token is read anywhere (var(--primary), bg-primary, nk-*): the server theme can't reach this UI");
  }

  if (manifest) {
    const report = collector.file(manifest.file, manifest.src);
    if (isUiPage && !manifest.protocol) report("manifest/protocol", manifest.page!.offset, "ui_page without nuikit_protocol '1': declare the protocol version this UI speaks (protocol §2.1)");
    if (!isUiPage) skipped.push("manifest/protocol", "surfaces/none");
    else if (!lua.surfaces) report("surfaces/none", manifest.page!.offset, "This UI registers no surface (nk.surface / nk.open), so nuikit can't coordinate its focus, stacking or Escape");
    if (lua.focusCalls.length && !lua.releasesOnStop) {
      const first = lua.focusCalls[0]!;
      const src = fs.readFileSync(path.join(abs, first.file), "utf8");
      collector.file(first.file, src)("focus/no-release", first.offset, "Focus is taken here but no onClientResourceStop handler calls SetNuiFocus(false, false): a restart can leave the cursor stuck");
    }
    if (hasUi && !manifest.page) skipped.push("native/runtime", "native/components");
    else if (hasUi) {
      const missing = [isUiPage && !lua.usesNuikitLua && !manifest.loadsNuikitLua ? "the nuikit runtime isn't loaded (shared_script '@nuikit/init.lua')" : null, ctx.hasScript && !ctx.importsCore ? "the page doesn't import nuikit-core" : null].filter(Boolean);
      if (!uiFiles.some((f) => /\.(m?[jt]sx?|vue|svelte|html?)$/.test(f.rel) && !f.built)) missing.push("no page source to run nuikit-core");
      if (missing.length) report("native/runtime", manifest.page?.offset ?? 0, `Not on the nuikit runtime: ${missing.join("; ")}`);
    } else skipped.push("native/runtime");
  } else {
    skipped.push("manifest/protocol", "surfaces/none", "focus/direct", "focus/no-release", "perf/frame-send");
    const first = uiFiles.find((f) => /\.html?$/.test(f.rel)) ?? uiFiles[0];
    if (first && !ctx.importsCore) collector.file(first.rel, "")("native/runtime", 0, "The page doesn't import nuikit-core");
  }
  if (hasUi && !ctx.usesComponents && !skipped.includes("native/components")) {
    const first = uiFiles[0];
    collector.file(first?.rel ?? manifest?.file ?? ".", "")("native/components", 0, "No shadcn/ui or nuikit registry components (components/ui/…)");
  }
  if (!hasUi) skipped.push("color/hardcoded", "color/palette-class", "tokens/none", "escape/adhoc", "native/components", "perf/remote-asset");

  const findings = collector.findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);
  let level: Level | null = null;
  if (hasUi) {
    // A resource with styles but no page of its own (a chat theme, the theme resource) can only be graded as themed.
    level = manifest && !manifest.page ? 1 : 3;
    for (const f of findings) if (f.severity === "error" && f.level > 0 && f.level <= level) level = (f.level - 1) as Level;
  }

  return {
    root,
    name: path.basename(abs),
    kind,
    page: manifest?.page ? { type: manifest.page.type, path: manifest.page.path } : undefined,
    protocol: manifest?.protocol,
    level,
    findings,
    skipped: [...new Set(skipped)],
    stats: { files: all.length, uiFiles: uiFiles.length, luaFiles: luaFiles.length, tokenRefs: ctx.tokenRefs },
  };
}

/** Is `dir` a resource (fxmanifest) or a bare UI folder (web/ or index.html)? */
export function isResourceRoot(dir: string): boolean {
  return ["fxmanifest.lua", "__resource.lua"].some((f) => fs.existsSync(path.join(dir, f))) || fs.existsSync(path.join(dir, "web")) || fs.existsSync(path.join(dir, "index.html"));
}

/** A resource folder → [it]; a folder of resources ([resources], systems/) → every resource under it. */
export function findResources(dir: string, depth = 4): string[] {
  if (isResourceRoot(dir)) return [dir];
  if (depth === 0) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    // build output repeats its sources; check it by pointing at it directly
    .filter((e) => e.isDirectory() && !IGNORED_DIRS.has(e.name) && !BUILT_DIRS.has(e.name) && !e.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => findResources(path.join(dir, e.name), depth - 1));
}

export function check(target: string, options: CheckOptions = {}): CheckResult[] {
  return findResources(target).map((r) => checkResource(r, options));
}

/** The theme/values-only and theme/unlayered findings for one theme file's text (what `nuikit check` reports for theme.css and themes/*.css). */
export function themeValuesFindings(css: string, file = "theme.css"): Finding[] {
  const collector = new Collector("");
  scanThemeCss(css, collector.file(file, css), true);
  return collector.findings;
}
