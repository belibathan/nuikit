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
export const THEMES_DIR = path.dirname(require.resolve("nuikit-core/themes/default.css"));

/** The theme `nuikit theme new` starts from when no --from is given: Default (the language's own look, a palette on top). */
export const DEFAULT_FROM = "default";

export function shippedThemes(): string[] {
  return fs
    .readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith(".css"))
    .map((f) => f.slice(0, -".css".length))
    .sort();
}

/**
 * The levers: every lever the token language declares beyond the palette (a TweakCN paste's colours, radius and faces)
 * and the levers the compiler derives. Straight from nuikit-core's generated tables, never a list copied here.
 */
export function levers(): TokenSpec[] {
  return ALL_TOKENS.filter((t) => t.group !== "palette" && t.group !== "derived");
}

/** The sections of a theme file: the language's tiers, identity first (what a server chooses), then the detail tiers. */
export const CONCEPTS = [
  { id: "identity", heading: "Identity: what a server chooses (scales, shape, type, surfaces, motion, which drawing each family uses)" },
  { id: "semantic", heading: "Semantic: the roles every component shares (motion ladder, plate, fill, accent, lines)" },
  { id: "component", heading: "Components and parts: one component's own levers (docs/design/levers.md)" },
] as const;

export type ConceptId = (typeof CONCEPTS)[number]["id"];

/** The section a lever belongs to: its tier. */
export function conceptOf(t: TokenSpec): ConceptId {
  return t.tier;
}

/** The range or set of values a lever takes, for its line: `(-20deg..20deg)`, `(solid | soft)`, `(colour)`. */
export function rangeOf(t: TokenSpec): string {
  if (t.values?.length) return `(${t.values.join(" | ")})`;
  if (t.range) {
    const unit = t.type === "time" ? "ms" : t.type === "angle" ? "deg" : "";
    return `(${t.range[0]}${unit}..${t.range[1]}${unit})`;
  }
  return `(${TYPE_HINT[t.type] ?? t.type})`;
}

const TYPE_HINT: Record<string, string> = {
  color: "colour",
  length: "length",
  angle: "angle",
  font: "font stack",
  number: "number",
  time: "duration",
  shadow: "shadow",
  ease: "cubic-bezier",
  paint: "colour or gradient",
  keyword: "keyword",
  string: "value",
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
