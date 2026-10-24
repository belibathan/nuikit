// Generates the Figma variable spec (out/vars.json, variables.md) from the token language: every lever in
// packages/core/src/spec, per shipped theme, resolved to a number, a colour or a string. Run from the repo root
// after `pnpm --filter nuikit-core build`: `node bench/figma/gen.mjs && node bench/figma/emit.mjs`.
// Contract (emit.mjs, populate.js): out/vars.json = { identities, vars: [{ col, name, type, scopes, code, desc, v | alias }], fonts }.
// The input is generated: packages/core/scripts/gen-tokens.mjs writes out/levers.json (every lever with its tier,
// type, CSS name and CSS default); this file only resolves them per theme.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { compileTheme, themeChannels } from "../../packages/core/dist/index.js";
import { subst, plainVar, toNumber, toColor } from "./resolve.mjs";

const root = new URL("../..", import.meta.url).pathname;
const scratch = new URL("./out", import.meta.url).pathname;
mkdirSync(scratch, { recursive: true });
const leversFile = `${scratch}/levers.json`;
if (!existsSync(leversFile)) throw new Error("run `pnpm --filter nuikit-core gen:tokens` first (writes bench/figma/out/levers.json)");
const { levers, kitDefaults } = JSON.parse(readFileSync(leversFile, "utf8"));

// Four modes (the Pro plan's cap): the shipped themes.
const ids = ["default", "neon-pop", "flat", "square"];
const compiled = {};
for (const id of ids) {
  const r = compileTheme(readFileSync(`${root}/packages/core/themes/${id}.css`, "utf8"), { mode: "dark" });
  if (r.warnings.length) console.log(id, "warnings", r.warnings);
  compiled[id] = r.vars;
}
const envs = Object.fromEntries(ids.map((id) => [id, { ...kitDefaults, ...compiled[id], ...themeChannels(compiled[id]) }]));

const FIGMA_FAMILY = { "Inter Tight": "Inter" };
const fam = (v) => { const m = /^\s*"?([^",]+)"?/.exec(v); const f = m ? m[1].trim() : v; return FIGMA_FAMILY[f] || f; };

const FILL = ["FRAME_FILL", "SHAPE_FILL"], ALLC = ["ALL_FILLS", "STROKE_COLOR", "EFFECT_COLOR"];
const LEN = ["WIDTH_HEIGHT", "GAP"], RAD = ["CORNER_RADIUS"], FS = ["FONT_SIZE"], LS = ["LETTER_SPACING"], FF = ["FONT_FAMILY"], HIDE = [];
const COL = { identity: "identity", semantic: "semantic", component: "component" };
// Figma names: the lever's path with / for each level (tile/face/color), the palette under color/, faces under font/
const figmaName = (l) => (l.scope === "" ? (l.name === "radius" ? "radius" : `color/${l.name}`) : l.scope === "font" ? `font/${l.prop}` : l.path.replace(/\./g, "/"));
const byCss = new Map(levers.map((l) => [l.name, l]));
function scopesFor(l, type) {
  if (type === "COLOR") return l.scope === "" ? ALLC : FILL;
  if (l.type === "font") return FF;
  if (l.type === "length") {
    if (/radius/.test(l.path)) return RAD;
    if (/^text\.|size$/.test(l.path)) return FS;
    if (/tracking/.test(l.path)) return LS;
    return LEN;
  }
  return HIDE;
}

const vars = [];
const types = new Map();
for (const l of levers) {
  if (l.type === "shadow" || l.type === "string" || l.type === "ease") continue; // Figma variables can't hold them
  const raw = {}, res = {};
  let ok = true;
  for (const id of ids) {
    raw[id] = compiled[id][l.name] ?? (l.scope === "" || l.scope === "font" ? undefined : kitDefaults[l.name]);
    if (raw[id] === undefined) { ok = false; break; }
    try { res[id] = subst(String(raw[id]), envs[id]); } catch { ok = false; break; }
  }
  if (!ok) continue;
  const all = (f) => { try { return Object.fromEntries(ids.map((id) => [id, f(res[id])])); } catch { return null; } };
  let type = "STRING", v = null;
  if (l.type === "color" || l.type === "paint") { v = all(toColor); if (v) type = "COLOR"; }
  else if (["length", "number", "time", "angle"].includes(l.type)) { v = all((c) => toNumber(c.replace(/deg$/, ""), { em: /tracking/.test(l.path) })); if (v) type = "FLOAT"; }
  if (!v) v = all((c) => (l.type === "font" ? fam(c) : c.trim()));
  if (!v) continue;
  // a plain var() to the same lever in every theme becomes an alias
  let alias = null;
  if (!/tracking/.test(l.path)) {
    const names = ids.map((id) => plainVar(String(raw[id]), envs[id]));
    const target = names[0] && names.every((n) => n === names[0]) ? byCss.get(names[0]) : null;
    if (target && target !== l && types.get(target.name) === type) alias = figmaName(target);
  }
  types.set(l.name, type);
  const desc = `${l.description}.${l.values ? ` One of: ${l.values.join(", ")}.` : ""}${l.range ? ` Range ${l.range[0]}–${l.range[1]}.` : ""}${/tracking/.test(l.path) ? " Percent of em." : ""}`;
  const row = { col: COL[l.tier], name: figmaName(l), type, scopes: scopesFor(l, type), code: `var(${l.css})`, desc };
  vars.push(alias ? { ...row, alias } : { ...row, v });
}

// fonts to preload in Figma (family × style) across all modes
const STYLE = { 400: "Regular", 500: "Medium", 600: "Semi Bold", 700: "Bold", 800: "Extra Bold" };
const fonts = new Set();
for (const id of ids) for (const f of ["font-sans", "font-display", "font-numeric", "font-mono"]) for (const s of Object.values(STYLE)) fonts.add(`${fam(compiled[id][f])}|${s}`);
const out = { identities: ids, vars, fonts: [...fonts].map((x) => { const [family, style] = x.split("|"); return { family, style }; }) };
writeFileSync(`${scratch}/vars.json`, JSON.stringify(out));
const counts = {}; for (const v of vars) counts[v.col] = (counts[v.col] || 0) + 1;
console.log(counts, "fonts", out.fonts.length, "bytes", JSON.stringify(out).length);
const fmt = (x) => typeof x === "object" ? `#${[x.r, x.g, x.b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}${x.a === 1 ? "" : ` @${Math.round(x.a * 100)}%`}` : typeof x === "number" ? String(Math.round(x * 1000) / 1000) : String(x);
const lines = ["| Figma variable | Tier | Type | CSS | Default | Neon Pop | Flat | Square |", "|---|---|---|---|---|---|---|---|"];
for (const v of vars) lines.push(`| \`${v.name}\` | ${v.col} | ${v.type} | \`${v.code}\` | ${v.alias ? `→ \`${v.alias}\`` : ids.map((id) => fmt(v.v[id])).join(" | ")} |`);
writeFileSync(new URL("./variables.md", import.meta.url).pathname, lines.join("\n") + "\n");
