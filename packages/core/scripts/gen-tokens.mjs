// The token generator: reads the spec (src/spec) and writes everything derived from it.
//   packages/create-nuikit/kit.css   the block between the @generated markers (lever defaults + re-derivations)
//   src/tokens.generated.ts           the tables compileTheme validates against, the Lever union, ANATOMY
//   spec/migration.json               old name → new name, for scripts/migrate-levers.mjs
//   tokens/nuikit.levers.json         DTCG, every lever with $extensions.nuikit (tier, scope, part, range)
//   ../../docs/design/levers.md       the catalog
//   ../../bench/figma/out/levers.json the component tier, for bench/figma/gen.mjs
// Idempotent: running it twice changes nothing. `--check` exits 1 if any output would change (CI).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const core = path.resolve(here, "..");
const repo = path.resolve(core, "../..");
const CHECK = process.argv.includes("--check");

// bundle the spec (TypeScript, extensionless imports) with the esbuild tsup already brings
const esbuild = createRequire(createRequire(path.join(core, "package.json")).resolve("tsup"))("esbuild");
const tmp = path.join(core, "node_modules", ".cache", "nuikit-spec.mjs");
fs.mkdirSync(path.dirname(tmp), { recursive: true });
await esbuild.build({ entryPoints: [path.join(core, "src/spec/index.ts")], bundle: true, format: "esm", platform: "neutral", outfile: tmp, logLevel: "error" });
const spec = await import(`${pathToFileURL(tmp).href}?t=${Date.now()}`);
const { LEVERS, STATE, ANATOMY, COMPONENTS, BY_PATH, pathCss } = spec;

// ─────────────────────────────────────────── values

const refCss = (r) => {
  const name = pathCss(r.path);
  return `var(${name}${r.channel ? `-${r.channel}` : ""}${r.fallback ? `, ${refCss(r.fallback)}` : ""})`;
};
export function render(v) {
  if (v.kind === "lit") return v.value;
  if (v.kind === "ref") return refCss(v);
  let s = v.strings[0];
  v.refs.forEach((r, i) => (s += refCss(r) + v.strings[i + 1]));
  return s;
}

// kit.css declares every lever below the palette and the faces (those come from the compiled theme)
const declared = LEVERS.filter((l) => l.scope !== "" && l.scope !== "font");

// ─────────────────────────────────────────── outputs

const outputs = new Map();
const write = (file, text) => outputs.set(path.resolve(file), text);

// (a) kit.css
const START = "/* @generated levers: packages/core/scripts/gen-tokens.mjs from packages/core/src/spec. Never edit by hand. */";
const END = "/* @end generated levers */";
{
  const lines = [START, "@layer nk.base {", "  :root,", "  [data-nk-theme] {"];
  let scope = null;
  for (const l of declared) {
    if (l.scope !== scope) {
      scope = l.scope;
      lines.push(`    /* ${l.tier} · ${scope} */`);
    }
    lines.push(`    ${l.css}: ${render(l.default)};`);
  }
  lines.push("  }");
  // a subtree that changes --nk-density or --radius re-declares every lever whose default reaches it (computed
  // from the reference graph: CSS resolves var() where a property is declared, so a lever declared on :root
  // keeps :root's density unless the subtree declares it again)
  const refsOf = (v) => (v.kind === "ref" ? [v, ...(v.fallback ? [v.fallback] : [])] : v.kind === "expr" ? v.refs.flatMap((r) => [r, ...(r.fallback ? [r.fallback] : [])]) : []);
  const reaching = (seed) => {
    const set = new Set([seed]);
    for (let changed = true; changed; ) {
      changed = false;
      for (const l of declared) if (!set.has(l.path) && refsOf(l.default).some((r) => set.has(r.path))) (set.add(l.path), (changed = true));
    }
    return declared.filter((l) => set.has(l.path) && l.path !== seed);
  };
  for (const [seed, sel, what] of [["density", "[data-nk-density]", "--nk-density"], ["@radius", "[data-nk-shape]", "--radius"]]) {
    lines.push(`  /* a subtree that changes ${what} re-derives these */`, `  ${sel} {`);
    for (const l of reaching(seed)) lines.push(`    ${l.css}: ${render(l.default)};`);
    lines.push("  }");
  }
  lines.push("}", END);
  const kitPath = path.join(repo, "packages/create-nuikit/kit.css");
  const kit = fs.readFileSync(kitPath, "utf8");
  const a = kit.indexOf(START);
  const b = kit.indexOf(END);
  const block = lines.join("\n");
  let next;
  if (a !== -1 && b !== -1) next = kit.slice(0, a) + block + kit.slice(b + END.length);
  else {
    // first run: after the layer order statement
    const anchor = kit.indexOf("@layer theme, base, nk.base");
    const eol = kit.indexOf("\n", anchor);
    next = kit.slice(0, eol + 1) + "\n" + block + "\n" + kit.slice(eol + 1);
  }
  write(kitPath, next);
}

// (b) tokens.generated.ts
{
  const rows = LEVERS.map((l) => {
    const o = { name: l.name, path: l.path, tier: l.tier, scope: l.scope, type: l.type, default: render(l.default), description: l.description };
    if (l.part) o.part = l.part;
    if (l.range) o.range = l.range;
    if (l.values) o.values = l.values;
    if (l.attr) o.attr = l.attr;
    if (l.derived) o.derived = true;
    if (l.rule) o.rule = l.rule;
    return o;
  });
  const ts = [
    "// Generated by scripts/gen-tokens.mjs from src/spec. Never edit by hand: change the spec and run `pnpm --filter nuikit-core gen:tokens`.",
    "/* eslint-disable */",
    'import type { LeverType, Tier } from "./spec/lang";',
    "",
    "export interface LeverRow {",
    "  name: string;",
    "  path: string;",
    "  tier: Tier;",
    "  scope: string;",
    "  part?: string;",
    "  type: LeverType;",
    "  /** The CSS default (kit.css declares it; the palette's is the compiler's stock value). */",
    "  default: string;",
    "  description: string;",
    "  range?: readonly [number, number];",
    "  values?: readonly string[];",
    "  attr?: string;",
    "  derived?: boolean;",
    "  rule?: string;",
    "}",
    "",
    `export const LEVER_ROWS: readonly LeverRow[] = ${JSON.stringify(rows, null, 2)};`,
    "",
    `export type Lever = ${LEVERS.map((l) => JSON.stringify(l.name)).join(" | ")};`,
    "",
    `export const ANATOMY = ${JSON.stringify(ANATOMY, null, 2)} as const;`,
    "",
    `export const STATE_VARS: readonly string[] = ${JSON.stringify(STATE.map((s) => s.css.slice(2)))};`,
    "",
  ].join("\n");
  write(path.join(core, "src/tokens.generated.ts"), ts);
}

// (c) migration.json: every `was` name → the lever (or state var) that replaces it
{
  const map = {};
  for (const l of [...LEVERS, ...STATE]) for (const old of l.was ?? []) {
    const to = l.css.slice(2);
    if (old !== to) map[old] = to;
  }
  write(path.join(core, "spec/migration.json"), JSON.stringify(Object.fromEntries(Object.entries(map).sort()), null, 2) + "\n");
}

// (d) DTCG: every lever as a token, its default as $value (a {reference} where the spec references another lever),
// $extensions.nuikit carrying tier, scope, part, css name, range and values
const DTCG_TYPE = { color: "color", length: "dimension", angle: "number", time: "duration", ease: "cubicBezier", number: "number", font: "fontFamily", shadow: "shadow", paint: "color" };
{
  const doc = { $description: "nuikit token language: every lever, generated from packages/core/src/spec. Values are the language's defaults.", $extensions: { nuikit: { generator: "packages/core/scripts/gen-tokens.mjs" } } };
  const dtcgRef = (r) => `{${r.path.startsWith("@") ? `palette.${r.path.slice(1)}` : r.path}}`;
  for (const l of LEVERS) {
    const keys = l.scope === "" ? ["palette", l.prop] : l.path.split(".");
    let node = doc;
    for (const k of keys.slice(0, -1)) node = node[k] ??= {};
    const leaf = keys[keys.length - 1];
    const v = l.default;
    const value = v.kind === "ref" && !v.channel ? dtcgRef(v) : render(v);
    const ext = { tier: l.tier, scope: l.scope, ...(l.part ? { part: l.part } : {}), css: l.css, type: l.type, ...(l.range ? { range: l.range } : {}), ...(l.values ? { values: l.values } : {}), ...(l.derived ? { derived: true } : {}) };
    // a leaf can share its name with a group (stagger and stagger.max): DTCG puts the leaf's value at "$root"
    const target = typeof node[leaf] === "object" && node[leaf] !== null && !("$value" in node[leaf]) ? (node[leaf].$root = {}) : (node[leaf] = node[leaf] && "$value" in node[leaf] ? node[leaf] : {});
    Object.assign(target, { ...(DTCG_TYPE[l.type] ? { $type: DTCG_TYPE[l.type] } : {}), $value: value, $description: l.description, $extensions: { nuikit: ext } });
  }
  write(path.join(core, "tokens/nuikit.levers.json"), JSON.stringify(doc, null, 2) + "\n");
}

// (e) levers.md: the catalog
{
  const md = [];
  const cell = (s) => String(s).replace(/\|/g, "\\|");
  const defaultOf = (l) => (l.scope === "" && l.rule ? l.rule : render(l.default));
  md.push(
    "# Levers",
    "",
    "*Generated by `packages/core/scripts/gen-tokens.mjs` from the token language (`packages/core/src/spec`). Never edit by hand:",
    "change the spec and run `pnpm --filter nuikit-core gen:tokens`.*",
    "",
    "A lever is a custom property a theme may set (values only, in `.dark {}`); kit.css declares every default once, in the",
    "generated `@layer nk.base` block, and components read only levers. Four tiers, each referencing only the tiers above it:",
    "",
    "- **identity**: what a server chooses (palette, faces, scales, shape, type, surfaces, motion, which drawing each family uses). The only tier with literal defaults; those defaults are the premium baseline, so `compileTheme(\"\")` already looks finished.",
    "- **semantic**: roles every component shares (the motion ladder, eases, plate, fill, accent, lines, depth).",
    "- **component** and **part**: `--nk-<component>-<prop>` and `--nk-<component>-<part>-<prop>`; parts are the component's anatomy, its `data-slot` names in render order. A component references only itself, a component it `inherits`, or the tiers above.",
    "",
    `**${LEVERS.length} levers** (${LEVERS.filter((l) => l.tier === "identity").length} identity, ${LEVERS.filter((l) => l.tier === "semantic").length} semantic, ${LEVERS.filter((l) => l.tier === "component").length} component) · **${Object.keys(COMPONENTS).length} components** · **${STATE.length} state variables** (set by kit.css rules per state; not levers). Old names: \`packages/core/spec/migration.json\`, applied by \`node packages/core/scripts/migrate-levers.mjs <path>\`.`,
    "",
  );
  const table = (rows) => {
    md.push("| Lever | Type | Default | Range / values | What it moves |", "|---|---|---|---|---|");
    for (const l of rows) md.push(`| \`${l.css}\` | ${l.type}${l.derived ? " (derived)" : ""} | \`${cell(defaultOf(l))}\` | ${l.values ? l.values.join(" ") : l.range ? `${l.range[0]}–${l.range[1]}` : ""} | ${cell(l.description)} |`);
    md.push("");
  };
  for (const tier of ["identity", "semantic"]) {
    md.push(`## ${tier[0].toUpperCase()}${tier.slice(1)}`, "");
    const scopes = [...new Set(LEVERS.filter((l) => l.tier === tier).map((l) => l.scope))];
    for (const s of scopes) {
      const g = (tier === "identity" ? spec.IDENTITY : spec.SEMANTIC)[s];
      md.push(`### ${s === "" ? "palette" : s}`, "", g.description + ".", "");
      table(LEVERS.filter((l) => l.tier === tier && l.scope === s));
    }
  }
  md.push("## Components", "");
  for (const [k, c] of Object.entries(COMPONENTS)) {
    md.push(`### ${k}`, "", `${c.description}. Anatomy: ${c.anatomy.map((p) => `\`${p}\``).join(" → ")}.${c.inherits?.length ? ` Inherits: ${c.inherits.map((i) => `\`${i}\``).join(", ")}.` : ""}`, "");
    const rows = LEVERS.filter((l) => l.scope === k && l.tier === "component");
    if (rows.length) table(rows);
    const st = STATE.filter((s) => s.scope === k);
    if (st.length) md.push(`State: ${st.map((s) => `\`${s.css}\``).join(", ")}.`, "");
  }
  write(path.join(repo, "docs/design/levers.md"), md.join("\n"));
}

// (f) Figma: the lever table bench/figma/gen.mjs resolves per theme (bench/figma/out is gitignored)
{
  const kitDefaults = Object.fromEntries(declared.map((l) => [l.name, render(l.default)]));
  const levers = LEVERS.map((l) => ({ name: l.name, css: l.css, path: l.path, tier: l.tier, scope: l.scope, prop: l.prop, type: l.type, description: l.description, ...(l.range ? { range: l.range } : {}), ...(l.values ? { values: l.values } : {}) }));
  const file = path.join(repo, "bench/figma/out/levers.json");
  // not part of the idempotency check: an ignored build input
  if (!CHECK) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ levers, kitDefaults }) + "\n");
  }
}

// ─────────────────────────────────────────── flush

let changed = 0;
for (const [file, text] of outputs) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (old === text) continue;
  changed++;
  if (CHECK) console.error(`stale: ${path.relative(repo, file)}`);
  else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
}
console.log(`✓ tokens: ${LEVERS.length} levers, ${STATE.length} state vars, ${Object.keys(COMPONENTS).length} components; ${changed} file(s) ${CHECK ? "stale" : "written"}`);
if (CHECK && changed) process.exit(1);
void BY_PATH;
