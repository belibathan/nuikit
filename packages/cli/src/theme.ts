/**
 * `nuikit theme new` (roadmap D5): a theme file that starts from a shipped theme and lists every lever the theme
 * leaves to the kit, commented out with its default and range (docs/design/levers.md).
 *
 * The lever list is nuikit-core's token tables (ALL_TOKENS), never a list copied here. The shipped themes are the
 * files in nuikit-core/themes. A theme is values only (`theme/values-only`), so the file it writes is too.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { ALL_TOKENS, compileTheme, parseThemeCss, type TokenSpec } from "nuikit-core";
import { themeValuesFindings } from "./check";

const require = createRequire(import.meta.url);
/** The shipped theme files: nuikit-core exports "./themes/*" (its package.json is not exported), so resolve the baseline. */
export const THEMES_DIR = path.dirname(require.resolve("nuikit-core/themes/graphite.css"));

/** The theme `nuikit theme new` starts from when no --from is given: the kit's own baseline (compileTheme("")). */
export const DEFAULT_FROM = "graphite";

export function shippedThemes(): string[] {
  return fs
    .readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith(".css"))
    .map((f) => f.slice(0, -".css".length))
    .sort();
}

/**
 * The levers: every token in the tables except the palette a TweakCN paste sets (the shadcn group: background, primary,
 * chart-*, radius, fonts) and the nuikit status group (success, hud, scrim, vital-*, the player prefs nk-scale and
 * nk-motion). Everything nuikit adds on top of that is a lever: identity, derived and the kit's own levers.
 */
export function levers(): TokenSpec[] {
  return ALL_TOKENS.filter((t) => t.group !== "shadcn" && t.group !== "nuikit");
}

/** The levers.md concepts, in the order a theme author meets them (docs/design/your-language.md). */
export const CONCEPTS = [
  { id: "treatment", heading: "Treatment and vitals: the named treatment, vital chips, alert levels, the pause screen" },
  { id: "geometry", heading: "Geometry: slant, keycap wall, radii, chamfer and hairlines" },
  { id: "depth", heading: "Depth and material: shadows, plates, surface opacity, blur, glow, legibility" },
  { id: "colour", heading: "Colour: role ramps, world text, keycap and plate colours" },
  { id: "type", heading: "Type voices: families, roles, weights, tracking and case" },
  { id: "fills", heading: "Fills, selection and focus: fill style, rows, focus, holds, levels, gauges" },
  { id: "space", heading: "Spacing and size: density, spacing steps, heights, icons, panels" },
  { id: "motion", heading: "Motion: durations, eases, feel, distances and timings" },
] as const;

export type ConceptId = (typeof CONCEPTS)[number]["id"];

/** Ordered: the first rule that matches a lever's name decides its concept. Colours not named here fall to `colour`. */
const RULES: [ConceptId, RegExp][] = [
  ["treatment", /^nk-(treatment|vital-|alert-threshold|fuel-threshold|pause-)/],
  ["motion", /^nk-(time-|duration|stagger|ease|spring|motion-|exit-factor|rest-delay|notify-ms|hold-ms|cooldown-ms|tile-tag-delay|confirm-scale|land-scale|rise$|lift$|deny-x$|press-scale$)/],
  ["depth", /^nk-(glow|elevation|plate-drop|plate$|plate-hair|surface-|material-.*-(opacity|blur|edge|texture)|hud-opacity|hud-text-shadow|hud-shadow|legibility|backdrop|slash|z-)|^(world-shadow|shadow)/],
  ["type", /^nk-(type-|weight-|tracking|num-tracking|label-case|display-style|row-title-size|row-desc-size|text-key|text-body)|^font-/],
  ["space", /^nk-(space|gap-|pad-|density|h-|icon-|edge$|slab-|panel-|row-pad|row-gap|row-icon-box|leading|list-gap|meter-segment-gap|pip-|hold-ring-pad)/],
  ["geometry", /^nk-(skew|tile-skew|tile-wall|tile-press|tile-lift|tile-plate|tile-inset|tile-rim|tile-key-rim|tile-radius|button-wall|cut$|clip|border-width|panel-bracket|panel-edge|r-)|radius$/],
  ["fills", /^nk-(fill-|tile-tint|tile-active|tile-confirm|tile-hold|tile-key|tile-face|tile-ink|tile-light|tile-shade|row-|focus-|hold-|level-|gauge-|ring-|hue-|accent-|alert|tile-tint)/],
];

/** The concept a lever belongs to, or "other" (a lever the rules don't yet name: the test fails on it). */
export function conceptOf(t: TokenSpec): ConceptId | "other" {
  for (const [id, re] of RULES) if (re.test(t.name)) return id;
  if (t.type === "color") return "colour";
  return "other";
}

/** The range or set of values a lever takes, for its line: `(-20deg..20deg)`, `(solid | soft)`, `(colour)`. */
export function rangeOf(t: TokenSpec): string {
  if (t.values?.length) return `(${t.values.join(" | ")})`;
  if (t.range) {
    const unit = t.type === "duration" ? "ms" : "";
    return `(${t.range[0]}${unit}..${t.range[1]}${unit})`;
  }
  // a dimension's range is written in its description ("at most ±20deg"), not in the table
  const m = /±\s*(\d+(?:\.\d+)?)([a-z%]*)/.exec(t.description);
  if (m) return `(-${m[1]}${m[2]}..${m[1]}${m[2]})`;
  return `(${TYPE_HINT[t.type] ?? t.type})`;
}

const TYPE_HINT: Record<string, string> = {
  color: "colour",
  dimension: "length",
  fontFamily: "font stack",
  number: "number",
  duration: "duration",
  shadow: "shadow",
  cubicBezier: "cubic-bezier",
  image: "image",
  keyword: "keyword",
};

export interface RenderOptions {
  /** The theme's name, written into the header. */
  name: string;
  /** A shipped theme's name (see shippedThemes). */
  from: string;
  /** The shipped theme's CSS. */
  css: string;
}

export interface RenderResult {
  text: string;
  set: number;
  unset: number;
}

/** A theme file: the chosen theme's values in `@layer nk.theme { .dark { … } }` (the block compileTheme reads for dark mode), then every lever it leaves out, commented. */
export function renderTheme({ name, from, css }: RenderOptions): RenderResult {
  const parsed = parseThemeCss(css);
  // the same merge compileTheme makes for dark mode: light, then dark, so the file compiles to what the theme compiles to
  const values: Record<string, string> = { ...parsed.theme, ...parsed.light, ...parsed.dark };
  const all = levers();
  const unset = all.filter((t) => !(t.name in values));
  const lines: string[] = [];
  lines.push(
    "/*",
    ` * ${name}: a theme started from ${from} (nuikit theme new). Values only (docs/design/levers.md).`,
    " * The lines in .dark set a value. The commented lines are the levers this theme leaves to the kit, each with its",
    " * default and range: uncomment one to change it, or leave it out to keep the kit's default.",
    " * Use it: copy this file over nuikit/theme.css, then `nuikit theme reload`.",
    " */",
  );
  for (const url of parsed.imports) lines.push(`@import url("${url}");`);
  lines.push("", "@layer nk.theme {", "  .dark {");
  for (const [k, v] of Object.entries(values)) lines.push(`    --${k}: ${v};`);
  for (const concept of CONCEPTS) {
    const group = unset.filter((t) => conceptOf(t) === concept.id);
    if (!group.length) continue;
    lines.push("", `    /* ${concept.heading} */`);
    for (const t of group) lines.push(`    /* --${t.name}: ${String(t.fallback).replace(/\*\//g, "* /")}  ${rangeOf(t)} */`);
  }
  lines.push("  }", "}", "");
  return { text: lines.join("\n"), set: Object.keys(values).length, unset: unset.length };
}

/** The shipped theme's CSS, or undefined when there is no such theme. */
export function shippedCss(name: string): string | undefined {
  if (!shippedThemes().includes(name)) return undefined;
  return fs.readFileSync(path.join(THEMES_DIR, `${name}.css`), "utf8");
}

/** Values-only findings and compile warnings for a rendered theme; both must be empty. */
export function problems(text: string): string[] {
  const out = themeValuesFindings(text, "theme.css").map((f) => `${f.rule} ${f.line}: ${f.message}`);
  out.push(...compileTheme(text).warnings);
  return out;
}
