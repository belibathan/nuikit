// Generates the Figma variable spec (out/vars.json, out/ember.css, variables.md) from the compiled identities.
// Run from the repo root after `pnpm --filter nuikit-core build`: `node bench/figma/gen.mjs && node bench/figma/emit.mjs`.
// emit.mjs writes out/data-*.json: the compact rows that populate.js turns into variables inside use_figma.
import { mkdirSync } from "node:fs";
import { compileTheme } from "../../packages/core/dist/index.js";
import { readFileSync, writeFileSync } from "node:fs";
const root = new URL("../..", import.meta.url).pathname;
const scratch = new URL("./out", import.meta.url).pathname;
mkdirSync(scratch, { recursive: true });

const ids = ["graphite", "signal", "velvet", "vector"];
const compiled = {};
for (const id of ids) {
  const css = readFileSync(`${root}/packages/core/themes/${id}.css`, "utf8");
  compiled[id] = compileTheme(css, { mode: "dark" }).vars;
}
// Ember: Graphite + identity-tier values only (the "make it yours" proof).
const emberCss = readFileSync(`${root}/packages/core/themes/graphite.css`, "utf8").replace(/\}\s*$/, `
  --brand: oklch(0.74 0.17 50);
  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --font-display: Fraunces, Georgia, ui-serif, serif;
  --font-numeric: "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --radius: 0.375rem;
  --nk-type-ratio: 1.25;
  --nk-weight-strong: 500;
  --nk-weight-display: 600;
  --nk-tracking-display: -0.03em;
  --nk-label-case: none;
  --nk-tracking-label: 0em;
  --nk-surface-opacity: 0.94;
  --nk-surface-tint: 0.08;
  --nk-surface-gradient: 0.06;
  --nk-surface-edge: 0.1;
  --nk-elevation: deep;
  --nk-glow: 0.2;
  --nk-density: 1.05;
  --nk-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --nk-duration: 180ms;
  --nk-motion-feel: smooth;
  --nk-spring-bounce: 0.05;
  --nk-gauge-ticks: 0;
  --nk-gauge-track: 0.375rem;
  --nk-row-indicator: fill;
}`);
const ember = compileTheme(emberCss, { mode: "dark" });
compiled.ember = ember.vars;
writeFileSync(`${scratch}/ember.css`, emberCss);
console.log("ember warnings", ember.warnings);

// ---- parsers
const REM = 16;
function color(s) {
  const m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(s);
  if (!m) throw new Error("not a colour: " + s);
  return { r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255, a: m[4] === undefined ? 1 : +m[4] };
}
function withAlpha(c, a) { return { ...c, a }; }
function px(s) {
  s = String(s).trim();
  if (s === "0" || s === "none") return 0;
  if (s.endsWith("rem")) return parseFloat(s) * REM;
  if (s.endsWith("px")) return parseFloat(s);
  if (/^[\d.]+$/.test(s)) return parseFloat(s);
  throw new Error("not a length: " + s);
}
function pct(s) { // em → Figma percent
  s = String(s).trim();
  if (s.endsWith("em")) return Math.round(parseFloat(s) * 10000) / 100;
  if (s.endsWith("px")) return parseFloat(s) / 16 * 100;
  return parseFloat(s) || 0;
}
function ms(s) { return parseFloat(String(s)); }
function num(s) { return parseFloat(String(s)); }
function family(s) { const m = /^\s*"?([^",]+)"?/.exec(s); return m[1].trim(); }

// Figma font style names per family for a CSS weight.
const STYLE = {
  "Inter": { 400: "Regular", 500: "Medium", 600: "Semi Bold", 700: "Bold" },
  "Inter Tight": { 400: "Regular", 500: "Medium", 600: "Semi Bold", 700: "Bold" },
  "Geist Mono": { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold" },
  "Barlow": { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold" },
  "Barlow Condensed": { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold" },
  "Fraunces": { 400: "Regular", 500: "Regular", 600: "SemiBold", 700: "Bold" },
  "DM Sans": { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold" },
  "IBM Plex Sans": { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold" },
  "Chakra Petch": { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold" },
  "JetBrains Mono": { 400: "Regular", 500: "Medium", 600: "Bold", 700: "Bold" },
};
// Fonts Figma doesn't have: fall back (documented).
const FIGMA_FAMILY = { "Inter Tight": "Inter" };
function fam(v) { const f = family(v); return FIGMA_FAMILY[f] || f; }
function style(familyCss, weight) {
  const f = fam(familyCss);
  const w = Math.round(num(weight) / 100) * 100;
  const t = STYLE[f] || STYLE.Inter;
  return t[w] || t[600];
}

const FILL = ["FRAME_FILL", "SHAPE_FILL"], TEXT = ["TEXT_FILL"], STROKE = ["STROKE_COLOR"], ALLC = ["ALL_FILLS", "STROKE_COLOR", "EFFECT_COLOR"];
const LEN = ["WIDTH_HEIGHT", "GAP"], RAD = ["CORNER_RADIUS"], FS = ["FONT_SIZE"], LS = ["LETTER_SPACING"], FF = ["FONT_FAMILY"], FST = ["FONT_STYLE"], HIDE = [];

const vars = []; // {col, name, type, scopes, code, desc, v: {id: value} | alias: name}
function add(col, name, type, scopes, code, desc, fn) {
  const v = {};
  for (const id of Object.keys(compiled)) v[id] = fn(compiled[id], id);
  vars.push({ col, name, type, scopes, code, desc, v });
}
function alias(col, name, type, scopes, code, desc, target) {
  vars.push({ col, name, type, scopes, code, desc, alias: target });
}
const I = "identity", S = "semantic", C = "component";
const cssv = (n) => `var(--${n})`;

const d = (t) => num(t["nk-density"]);
const ratio = (t) => num(t["nk-type-ratio"]);
const base = 16;
// ---------- identity tier
add(I, "color/brand", "COLOR", ALLC, cssv("brand"), "The server's signature colour: active indicators, gauge needles and fills, focus, logos. Not the action (that's primary). Derived: primary if chromatic, else chart-1.", (t) => color(t.brand));
add(I, "color/brand-foreground", "COLOR", TEXT, cssv("brand-foreground"), "Text on brand. Derived: foreground or background, whichever contrasts more.", (t) => color(t["brand-foreground"]));
add(I, "font/sans", "STRING", FF, cssv("font-sans"), "Text. Figma holds the first family of the stack.", (t) => fam(t["font-sans"]));
add(I, "font/mono", "STRING", FF, cssv("font-mono"), "Codes and IDs a player might type.", (t) => fam(t["font-mono"]));
add(I, "font/display", "STRING", FF, cssv("font-display"), "Headings and big moments. Derived: Inter Tight when sans is the default, else sans. (Figma has no Inter Tight: Inter stands in.)", (t) => fam(t["font-display"]));
add(I, "font/numeric", "STRING", FF, cssv("font-numeric"), "Every number on a gauge, money or timer (always tabular). Derived: sans.", (t) => fam(t["font-numeric"]));
add(I, "radius", "FLOAT", RAD, cssv("radius"), "Corner radius, px at 1080p (1rem = 16px). Panels radius + 4px, controls radius − 2px.", (t) => px(t.radius));
add(I, "nk/scale", "FLOAT", HIDE, cssv("nk-scale"), "UI size multiplier, 0.5–2. html font-size × this; the player's scale pref multiplies again.", (t) => num(t["nk-scale"]));
add(I, "nk/motion", "FLOAT", HIDE, cssv("nk-motion"), "1 animations on, 0 off.", (t) => num(t["nk-motion"]));
add(I, "nk/type-ratio", "FLOAT", HIDE, cssv("nk-type-ratio"), "Step between type sizes, 1–1.6 (1.125 calm … 1.333 dramatic).", (t) => num(t["nk-type-ratio"]));
add(I, "nk/weight-body", "FLOAT", HIDE, cssv("nk-weight-body"), "Body weight, 100–900.", (t) => num(t["nk-weight-body"]));
add(I, "nk/weight-strong", "FLOAT", HIDE, cssv("nk-weight-strong"), "Titles, key numbers, active rows.", (t) => num(t["nk-weight-strong"]));
add(I, "nk/weight-display", "FLOAT", HIDE, cssv("nk-weight-display"), "Display type (full-screen titles, big numbers).", (t) => num(t["nk-weight-display"]));
add(I, "nk/tracking-display", "FLOAT", LS, cssv("nk-tracking-display"), "Letter-spacing of display type. Figma: percent of em (−0.02em = −2).", (t) => pct(t["nk-tracking-display"]) / 100 * base * ratio(t) ** 4 * 1.1);
add(I, "nk/label-case", "STRING", HIDE, cssv("nk-label-case"), "Captions in `uppercase` or `none` (as written).", (t) => t["nk-label-case"]);
add(I, "nk/tracking-label", "FLOAT", LS, cssv("nk-tracking-label"), "Letter-spacing of captions (uppercase wants 0.06–0.12em). Percent of em.", (t) => pct(t["nk-tracking-label"]) / 100 * Math.max(13, base / ratio(t)));
add(I, "nk/border-width", "FLOAT", ["STROKE_FLOAT"], cssv("nk-border-width"), "Hairline weight of panels, rows and fields (px).", (t) => px(t["nk-border-width"]));
add(I, "nk/cut", "FLOAT", HIDE, cssv("nk-cut"), "Chamfered corners (top left, bottom right) by clip-path, px; 0 = off. Not drawn by Figma variables (see docs).", (t) => px(t["nk-cut"]));
add(I, "nk/surface-opacity", "FLOAT", ["OPACITY"], cssv("nk-surface-opacity"), "Panel opacity over the game, 0–1. Floor 0.92 (compiler warning below).", (t) => num(t["nk-surface-opacity"]));
add(I, "nk/surface-tint", "FLOAT", HIDE, cssv("nk-surface-tint"), "How much brand tints the panel surface, 0–0.12.", (t) => num(t["nk-surface-tint"]));
add(I, "nk/surface-gradient", "FLOAT", HIDE, cssv("nk-surface-gradient"), "Top-to-bottom light falloff on panels, 0–0.2 (0 = flat).", (t) => num(t["nk-surface-gradient"]));
add(I, "nk/surface-edge", "FLOAT", HIDE, cssv("nk-surface-edge"), "Inner top highlight, the machined edge (alpha), 0–0.3.", (t) => num(t["nk-surface-edge"]));
add(I, "nk/elevation", "STRING", HIDE, cssv("nk-elevation"), "none / soft / deep shadow recipe.", (t) => t["nk-elevation"]);
add(I, "nk/glow", "FLOAT", HIDE, cssv("nk-glow"), "Brand glow on active rows, chips and meter fills (alpha, 0 = off).", (t) => num(t["nk-glow"]));
add(I, "nk/density", "FLOAT", HIDE, cssv("nk-density"), "Multiplies the kit's spacing step and row/chip/slab/header heights, 0.75–1.3. Never text size.", (t) => num(t["nk-density"]));
add(I, "nk/ease", "STRING", HIDE, cssv("nk-ease"), "The one easing curve (cubic-bezier; no linear(): Chromium 113).", (t) => t["nk-ease"]);
add(I, "nk/duration", "FLOAT", HIDE, cssv("nk-duration"), "Base duration in ms (panel enter, transitions), up to 2000; × nk-motion. The compiler warns above 260.", (t) => ms(t["nk-duration"]));
add(I, "nk/motion-feel", "STRING", HIDE, cssv("nk-motion-feel"), "crisp / snap / smooth / stepped. Painted as html[data-nk-feel].", (t) => t["nk-motion-feel"]);
add(I, "nk/spring-bounce", "FLOAT", HIDE, cssv("nk-spring-bounce"), "Bounce folded into the snap, move and soft springs, 0–0.3.", (t) => num(t["nk-spring-bounce"]));
add(I, "nk/hud-opacity", "FLOAT", ["OPACITY"], cssv("nk-hud-opacity"), "Minimum backplate opacity of HUD chips and tiles.", (t) => num(t["nk-hud-opacity"]));
add(I, "nk/hud-text-shadow", "STRING", HIDE, cssv("nk-hud-text-shadow"), "none / soft / strong shadow under text on the game.", (t) => t["nk-hud-text-shadow"]);
add(I, "nk/gauge-style", "STRING", HIDE, cssv("nk-gauge-style"), "arc / bar / digital (read by the HUD).", (t) => t["nk-gauge-style"]);
add(I, "nk/gauge-track", "FLOAT", LEN, cssv("nk-gauge-track"), "Gauge and meter track thickness (px).", (t) => px(t["nk-gauge-track"]));
add(I, "nk/gauge-ticks", "FLOAT", HIDE, cssv("nk-gauge-ticks"), "Tick marks: 1 on, 0 off.", (t) => num(t["nk-gauge-ticks"]));
add(I, "nk/row-indicator", "STRING", HIDE, cssv("nk-row-indicator"), "How the active row is marked: bar (a brand pill), fill (solid brand), outline (a brand hairline).", (t) => t["nk-row-indicator"]);
// Figma-only font style names (CSS weights become Figma style strings per family)
add(I, "figma/style-body", "STRING", FST, "", "Figma only: the font style for nk/weight-body in font/sans.", (t) => style(t["font-sans"], t["nk-weight-body"]));
add(I, "figma/style-strong", "STRING", FST, "", "Figma only: the font style for nk/weight-strong in font/sans.", (t) => style(t["font-sans"], t["nk-weight-strong"]));
add(I, "figma/style-label", "STRING", FST, "", "Figma only: weight 500 in font/sans (labels, captions, chips).", (t) => style(t["font-sans"], 500));
add(I, "figma/style-display", "STRING", FST, "", "Figma only: nk/weight-display in font/display.", (t) => style(t["font-display"], t["nk-weight-display"]));
add(I, "figma/style-heading", "STRING", FST, "", "Figma only: nk-heading-weight in font/display.", (t) => style(t["font-display"], t["nk-heading-weight"] || t["nk-weight-strong"]));
add(I, "figma/style-numeric", "STRING", FST, "", "Figma only: nk/weight-strong in font/numeric.", (t) => style(t["font-numeric"], t["nk-weight-strong"]));
add(I, "figma/style-numeric-display", "STRING", FST, "", "Figma only: nk/weight-display in font/numeric.", (t) => style(t["font-numeric"], t["nk-weight-display"]));
add(I, "figma/style-caption", "STRING", FST, "", "Figma only: weight 500 in the caption font (sans; Vector: numeric).", (t) => style(t["nk-caption-font"] ? t["font-numeric"] : t["font-sans"], 500));
add(I, "figma/style-mono", "STRING", FST, "", "Figma only: Regular in font/mono.", (t) => style(t["font-mono"], 400));

// ---------- semantic tier (colours)
const SEM = [
  ["background", FILL, "Full-screen surfaces (pause, loading, death scrim)"], ["foreground", TEXT, "Text on full-screen surfaces"],
  ["card", FILL, "Raised blocks on a full-screen surface"], ["card-foreground", TEXT, "Text on cards"],
  ["popover", FILL, "Every floating panel (nk-panel)"], ["popover-foreground", TEXT, "Text in panels"],
  ["primary", ALLC, "The one main action per surface, progress fills, selection"], ["primary-foreground", TEXT, "Text on primary"],
  ["secondary", FILL, "Secondary buttons"], ["secondary-foreground", TEXT, "Text on secondary"],
  ["muted", FILL, "Tracks, slots and wells inside a panel"], ["muted-foreground", TEXT, "Secondary text"],
  ["accent", FILL, "Hover and keyboard highlight"], ["accent-foreground", TEXT, "Text on accent"],
  ["destructive", ALLC, "Danger, damage, low values, death"], ["destructive-foreground", TEXT, "Text on destructive. Derived when absent"],
  ["border", STROKE, "Hairlines"], ["input", STROKE, "Field borders"], ["ring", STROKE, "Focus rings"],
  ["chart-1", ALLC, "Categorical colour 1"], ["chart-2", ALLC, "Categorical colour 2"], ["chart-3", ALLC, "Categorical colour 3"], ["chart-4", ALLC, "Categorical colour 4"], ["chart-5", ALLC, "Categorical colour 5"],
  ["success", ALLC, "Positive status: done, paid, online. Derived: green (hue 150) at destructive's L and C"], ["success-foreground", TEXT, "Text on success"],
  ["warning", ALLC, "Caution: low fuel, about to expire. Derived: amber (hue 75) at destructive's L + 0.08"], ["warning-foreground", TEXT, "Text on warning"],
  ["info", ALLC, "Neutral notices, tips. Derived: primary"], ["info-foreground", TEXT, "Text on info"],
  ["hud", FILL, "Surfaces drawn straight on the game: HUD chips, hotbar tiles, target eye"], ["hud-foreground", ALLC, "Text and icons on hud. Derived: world-foreground"],
  ["scrim", ALLC, "Darkens the game: behind full screens, bar tracks, shadows on the game. Always with opacity"],
  ["vital-health", ALLC, "Health bar (red hue range)"], ["vital-armor", ALLC, "Armor bar (blue)"], ["vital-hunger", ALLC, "Hunger bar (orange/amber)"], ["vital-thirst", ALLC, "Thirst bar (cyan)"], ["vital-stress", ALLC, "Stress bar (purple)"],
  ["world-foreground", ALLC, "Text and icons on the game, no panel. Light in every theme"], ["world-foreground-muted", TEXT, "Secondary text on the game (world-foreground at 80%)"],
];
for (const [n, sc, d] of SEM) add(S, `color/${n}`, "COLOR", sc, cssv(n), d, (t) => color(t[n]));

// ---------- component tier (formulas, resolved per mode)
add(C, "nk/space", "FLOAT", ["GAP", "WIDTH_HEIGHT"], cssv("nk-space"), "The kit's spacing step: 0.25rem × density (px).", (t) => 4 * d(t));
add(C, "nk/text-base", "FLOAT", FS, cssv("nk-text-base"), "Reading text: 16px in every identity.", () => base);
add(C, "nk/text-label", "FLOAT", FS, cssv("nk-text-label"), "max(13px, base ÷ ratio).", (t) => Math.max(13, base / ratio(t)));
add(C, "nk/hud-value-size", "FLOAT", FS, cssv("nk-hud-value-size"), "max(18px, base × ratio): HUD values.", (t) => Math.max(18, base * ratio(t)));
add(C, "nk/text-title", "FLOAT", FS, cssv("nk-text-title"), "base × (1 + (ratio − 1) ÷ 2): panel titles.", (t) => base * (1 + (ratio(t) - 1) / 2));
add(C, "nk/text-section", "FLOAT", FS, cssv("nk-text-section"), "base × ratio².", (t) => base * ratio(t) ** 2);
add(C, "nk/text-display", "FLOAT", FS, cssv("nk-text-display"), "base × ratio⁴ × 1.1: one big moment per screen.", (t) => base * ratio(t) ** 4 * 1.1);
add(C, "nk/edge", "FLOAT", ["GAP", "WIDTH_HEIGHT"], cssv("nk-edge"), "Screen-edge margin for anchored UI: 1.5rem.", () => 24);
// panel
add(C, "nk/panel-bg", "COLOR", FILL, cssv("nk-panel-bg"), "surface (popover tinted toward brand by surface-tint) at surface-opacity.", (t) => withAlpha(color(t.surface), num(t["nk-surface-opacity"])));
alias(C, "nk/panel-fg", "COLOR", TEXT, cssv("nk-panel-fg"), "popover-foreground.", "color/popover-foreground");
alias(C, "nk/panel-border", "COLOR", STROKE, cssv("nk-panel-border"), "border.", "color/border");
add(C, "nk/panel-radius", "FLOAT", RAD, cssv("nk-panel-radius"), "radius (Velvet: radius + 4px).", (t) => px(t.radius) + (t["nk-panel-radius"] ? 4 : 0));
add(C, "nk/panel-edge-color", "COLOR", ["EFFECT_COLOR"], cssv("nk-panel-edge"), "The machined edge: an inset top highlight, popover-foreground at surface-edge (Signal: a 3px brand edge).", (t) => t["nk-panel-edge"] ? color(t.brand) : withAlpha(color(t["popover-foreground"]), num(t["nk-surface-edge"])));
add(C, "nk/panel-edge-y", "FLOAT", ["EFFECT_FLOAT"], "", "Figma only: the edge's inset offset (1px; Signal 3px).", (t) => t["nk-panel-edge"] ? 3 : 1);
add(C, "nk/panel-header-height", "FLOAT", LEN, cssv("nk-panel-header-height"), "3.25rem × density.", (t) => 52 * d(t));
add(C, "nk/panel-header-padding-y", "FLOAT", ["GAP"], "", "Figma only: header padding, 3 × space.", (t) => 12 * d(t));
add(C, "nk/panel-header-padding-x", "FLOAT", ["GAP"], "", "Figma only: header padding, 4 × space.", (t) => 16 * d(t));
add(C, "nk/panel-body-padding", "FLOAT", ["GAP"], cssv("nk-panel-body-padding"), "2 × space (lists).", (t) => 8 * d(t));
add(C, "nk/panel-form-padding", "FLOAT", ["GAP"], "", "Figma only: forms, 4 × space.", (t) => 16 * d(t));
add(C, "nk/panel-bracket", "FLOAT", LEN, cssv("nk-panel-bracket"), "Corner brackets, 0 = off (Vector 0.875rem).", (t) => px(t["nk-panel-bracket"] || "0px"));
alias(C, "nk/panel-bracket-color", "COLOR", STROKE, cssv("nk-panel-bracket-color"), "brand.", "color/brand");
// shadow recipe decomposed into 4 layers (Figma effects can bind colour and floats)
function shadowLayers(t) {
  const s = t["nk-panel-shadow"] || t["nk-elevation-shadow"];
  const out = [];
  const re = /(-?[\d.]+(?:px|rem)?)\s+(-?[\d.]+(?:px|rem)?)\s+(-?[\d.]+(?:px|rem)?)(?:\s+(-?[\d.]+(?:px|rem)?))?\s+(rgba?\(var\(--[\w-]+-rgb\),\s*[\d.]+\)|rgba?\([^)]*\)|oklch\([^)]*\))/g;
  let m;
  while ((m = re.exec(s))) {
    let c;
    const vm = /rgba?\(var\(--([\w-]+)-rgb\),\s*([\d.]+)\)/.exec(m[5]);
    if (vm) c = { ...color(t[vm[1]]), a: +vm[2] };
    else if (m[5].startsWith("oklch")) c = { ...color(t.brand), a: 0.45 }; else c = color(m[5]);
    out.push({ x: px(m[1]), y: px(m[2]), blur: px(m[3]), spread: m[4] ? px(m[4]) : 0, c });
  }
  while (out.length < 4) out.push({ x: 0, y: 0, blur: 0, spread: 0, c: { r: 0, g: 0, b: 0, a: 0 } });
  return out.slice(0, 4);
}
for (let i = 1; i <= 4; i++) {
  add(C, `nk/panel-shadow/${i}/color`, "COLOR", ["EFFECT_COLOR"], i === 1 ? cssv("nk-panel-shadow") : "", `Figma only: layer ${i} of nk-panel-shadow (the nk-elevation recipe in scrim; Vector: its cyan halo).`, (t) => shadowLayers(t)[i - 1].c);
  add(C, `nk/panel-shadow/${i}/y`, "FLOAT", ["EFFECT_FLOAT"], "", `Figma only: layer ${i} offset y.`, (t) => shadowLayers(t)[i - 1].y);
  add(C, `nk/panel-shadow/${i}/blur`, "FLOAT", ["EFFECT_FLOAT"], "", `Figma only: layer ${i} blur.`, (t) => shadowLayers(t)[i - 1].blur);
  add(C, `nk/panel-shadow/${i}/spread`, "FLOAT", ["EFFECT_FLOAT"], "", `Figma only: layer ${i} spread.`, (t) => shadowLayers(t)[i - 1].spread);
}
// heading / display / label / caption / numbers
alias(C, "nk/heading-font", "STRING", FF, cssv("nk-heading-font"), "font/display.", "font/display");
alias(C, "nk/heading-size", "FLOAT", FS, cssv("nk-heading-size"), "nk/text-title.", "nk/text-title");
add(C, "nk/heading-tracking", "FLOAT", LS, cssv("nk-heading-tracking"), "tracking-display ÷ 2 (Signal 0.04em, Vector 0.06em, Velvet 0).", (t) => (t["nk-heading-tracking"] !== undefined ? pct(t["nk-heading-tracking"]) : pct(t["nk-tracking-display"]) / 2) / 100 * base * (1 + (ratio(t) - 1) / 2));
add(C, "nk/heading-case", "STRING", HIDE, cssv("nk-heading-case"), "none (Signal, Vector: uppercase).", (t) => t["nk-heading-case"] || "none");
alias(C, "nk/display-size", "FLOAT", FS, cssv("nk-display-size"), "nk/text-display.", "nk/text-display");
alias(C, "nk/display-tracking", "FLOAT", LS, cssv("nk-display-tracking"), "nk/tracking-display.", "nk/tracking-display");
alias(C, "nk/label-font", "STRING", FF, cssv("nk-label-font"), "font/sans.", "font/sans");
alias(C, "nk/label-size", "FLOAT", FS, cssv("nk-label-size"), "nk/text-label.", "nk/text-label");
add(C, "nk/caption-font", "STRING", FF, cssv("nk-caption-font"), "font/sans (Vector: font/numeric).", (t) => fam(t["nk-caption-font"] ? t["font-numeric"] : t["font-sans"]));
alias(C, "nk/caption-size", "FLOAT", FS, cssv("nk-caption-size"), "nk/text-label.", "nk/text-label");
alias(C, "nk/caption-transform", "STRING", HIDE, cssv("nk-caption-transform"), "nk/label-case.", "nk/label-case");
alias(C, "nk/caption-tracking", "FLOAT", LS, cssv("nk-caption-tracking"), "nk/tracking-label.", "nk/tracking-label");
alias(C, "nk/num-font", "STRING", FF, cssv("nk-num-font"), "font/numeric.", "font/numeric");
add(C, "nk/num-tracking", "FLOAT", LS, cssv("nk-num-tracking"), "−0.02em (identities with display numerals set 0).", (t) => (t["nk-num-tracking"] !== undefined ? pct(t["nk-num-tracking"]) : -2) / 100 * 16);
// row
add(C, "nk/row-height", "FLOAT", LEN, cssv("nk-row-height"), "2.75rem × density.", (t) => 44 * d(t));
add(C, "nk/row-radius", "FLOAT", RAD, cssv("nk-row-radius"), "radius − 2px (Signal 0; Velvet, Daylight: pill).", (t) => t["nk-row-radius"] !== undefined ? Math.min(px(t["nk-row-radius"]), 999) : Math.max(0, px(t.radius) - 2));
add(C, "nk/row-padding-y", "FLOAT", ["GAP"], "", "Figma only: nk-row-padding, 1.5 × space.", (t) => 6 * d(t));
add(C, "nk/row-padding-x", "FLOAT", ["GAP"], "", "Figma only: nk-row-padding, 3 × space.", (t) => 12 * d(t));
alias(C, "nk/row-font-size", "FLOAT", FS, cssv("nk-row-font-size"), "nk/text-base.", "nk/text-base");
alias(C, "nk/row-indicator-color", "COLOR", ALLC, cssv("nk-row-indicator-color"), "brand.", "color/brand");
add(C, "nk/row-bar-width", "FLOAT", LEN, cssv("nk-row-bar-width"), "3px × nk-row-bar (0 unless the indicator is bar).", (t) => 3 * num(t["nk-row-bar"]));
add(C, "nk/row-bar-inset", "FLOAT", ["GAP"], cssv("nk-row-bar-inset"), "2.5 × space.", (t) => 10 * d(t));
add(C, "nk/row-fill-color", "COLOR", FILL, cssv("nk-row-fill-color"), "brand when the indicator is fill, else accent (hover/keyboard highlight).", (t) => num(t["nk-row-fill"]) ? color(t.brand) : color(t.accent));
add(C, "nk/row-fill-foreground", "COLOR", TEXT, cssv("nk-row-fill-foreground"), "brand-foreground when the indicator is fill, else accent-foreground.", (t) => num(t["nk-row-fill"]) ? color(t["brand-foreground"]) : color(t["accent-foreground"]));
add(C, "nk/row-outline-width", "FLOAT", ["STROKE_FLOAT"], cssv("nk-row-outline-width"), "border-width × nk-row-outline.", (t) => px(t["nk-border-width"]) * num(t["nk-row-outline"]));
add(C, "nk/row-outline-color", "COLOR", STROKE, cssv("nk-row-outline-color"), "brand at 70%.", (t) => withAlpha(color(t.brand), 0.7));
add(C, "nk/row-glow-color", "COLOR", ["EFFECT_COLOR"], cssv("nk-row-glow"), "brand at glow × 0.5 (0 0 1rem).", (t) => withAlpha(color(t.brand), num(t["nk-glow"]) * 0.5));
// key
alias(C, "nk/key-bg", "COLOR", FILL, cssv("nk-key-bg"), "muted.", "color/muted");
alias(C, "nk/key-fg", "COLOR", TEXT, cssv("nk-key-fg"), "popover-foreground.", "color/popover-foreground");
alias(C, "nk/key-border", "COLOR", STROKE, cssv("nk-key-border"), "border.", "color/border");
add(C, "nk/key-radius", "FLOAT", RAD, cssv("nk-key-radius"), "max(4px, radius − 4px).", (t) => Math.max(4, px(t.radius) - 4));
add(C, "nk/key-font", "STRING", FF, cssv("nk-key-font"), "font/numeric (Velvet: sans).", (t) => fam(t["nk-key-font"] ? t["font-sans"] : t["font-numeric"]));
add(C, "nk/key-shadow-bottom", "COLOR", ["EFFECT_COLOR"], cssv("nk-key-shadow"), "Keycap: inset dark bottom edge, scrim at 35%.", (t) => withAlpha(color(t.scrim), 0.35));
add(C, "nk/key-shadow-top", "COLOR", ["EFFECT_COLOR"], "", "Keycap: inset light top edge, popover-foreground at surface-edge × 1.5.", (t) => withAlpha(color(t["popover-foreground"]), num(t["nk-surface-edge"]) * 1.5));
// chip / hud
add(C, "nk/chip-height", "FLOAT", LEN, cssv("nk-chip-height"), "2rem × density.", (t) => 32 * d(t));
add(C, "nk/chip-padding", "FLOAT", ["GAP"], cssv("nk-chip-padding"), "2.5 × space.", (t) => 10 * d(t));
add(C, "nk/chip-radius", "FLOAT", RAD, cssv("nk-chip-radius"), "max(4px, radius − 4px) (Velvet: pill; Signal, Vector: 2px).", (t) => t["nk-chip-radius"] !== undefined ? Math.min(px(t["nk-chip-radius"]), 999) : Math.max(4, px(t.radius) - 4));
add(C, "nk/chip-bg", "COLOR", FILL, cssv("nk-chip-bg"), "hud at max(hud alpha, hud-opacity).", (t) => { const c = color(t.hud); return withAlpha(c, Math.max(c.a, num(t["nk-hud-opacity"]))); });
alias(C, "nk/chip-fg", "COLOR", ALLC, cssv("nk-chip-fg"), "hud-foreground.", "color/hud-foreground");
add(C, "nk/chip-font-size", "FLOAT", FS, cssv("nk-chip-font-size"), "0.875rem.", () => 14);
alias(C, "nk/chip-active-bg", "COLOR", FILL, cssv("nk-chip-active-bg"), "brand.", "color/brand");
alias(C, "nk/chip-active-fg", "COLOR", TEXT, cssv("nk-chip-active-fg"), "brand-foreground.", "color/brand-foreground");
add(C, "nk/chip-glow-color", "COLOR", ["EFFECT_COLOR"], cssv("nk-chip-glow"), "brand at glow (0 0 0.75rem).", (t) => withAlpha(color(t.brand), num(t["nk-glow"])));
add(C, "nk/hud-radius", "FLOAT", RAD, cssv("nk-hud-radius"), "max(4px, radius − 2px) (Velvet: radius + 2px).", (t) => t["nk-hud-radius"] ? px(t.radius) + 2 : Math.max(4, px(t.radius) - 2));
add(C, "nk/hud-text-shadow-color", "COLOR", ["EFFECT_COLOR"], cssv("nk-hud-text-shadow"), "The hud-text-shadow recipe in scrim (soft: 0 1px 2px at .6; strong: .9 + .8; none: 0).", (t) => { const k = t["nk-hud-text-shadow"]; return withAlpha(color(t.scrim), k === "none" ? 0 : k === "strong" ? 0.9 : 0.6); });
// meter / gauge
alias(C, "nk/meter-height", "FLOAT", LEN, cssv("nk-meter-height"), "nk/gauge-track.", "nk/gauge-track");
add(C, "nk/meter-radius", "FLOAT", RAD, cssv("nk-meter-radius"), "9999px (Signal, Vector: 0).", (t) => t["nk-meter-radius"] !== undefined ? Math.min(px(t["nk-meter-radius"]), 999) : 999);
add(C, "nk/meter-track", "COLOR", FILL, cssv("nk-meter-track"), "scrim at 35%.", (t) => withAlpha(color(t.scrim), 0.35));
add(C, "nk/meter-glow-color", "COLOR", ["EFFECT_COLOR"], cssv("nk-meter-glow"), "brand at glow (0 0 0.625rem).", (t) => withAlpha(color(t.brand), num(t["nk-glow"])));
add(C, "nk/meter-segments", "FLOAT", HIDE, cssv("nk-meter-segments"), "0 / 1 (Vector: segmented).", (t) => num(t["nk-meter-segments"] || 0));
add(C, "nk/meter-segment", "FLOAT", LEN, cssv("nk-meter-segment"), "0.5rem.", () => 8);
add(C, "nk/meter-gap", "COLOR", FILL, cssv("nk-meter-gap"), "popover at 0.85 × segments.", (t) => withAlpha(color(t.popover), 0.85 * num(t["nk-meter-segments"] || 0)));
add(C, "nk/gauge-track-color", "COLOR", ALLC, cssv("nk-gauge-track-color"), "hud-foreground at 16%.", (t) => withAlpha(color(t["hud-foreground"]), 0.16));
alias(C, "nk/gauge-fill", "COLOR", ALLC, cssv("nk-gauge-fill"), "brand.", "color/brand");
alias(C, "nk/gauge-needle", "COLOR", ALLC, cssv("nk-gauge-needle"), "brand.", "color/brand");
alias(C, "nk/gauge-redline", "COLOR", ALLC, cssv("nk-gauge-redline"), "destructive.", "color/destructive");
add(C, "nk/gauge-tick", "COLOR", ALLC, cssv("nk-gauge-tick"), "hud-foreground at 0.55 × gauge-ticks.", (t) => withAlpha(color(t["hud-foreground"]), 0.55 * num(t["nk-gauge-ticks"])));
add(C, "nk/gauge-tick-major", "COLOR", ALLC, cssv("nk-gauge-tick-major"), "hud-foreground at 0.9 × gauge-ticks.", (t) => withAlpha(color(t["hud-foreground"]), 0.9 * num(t["nk-gauge-ticks"])));
// slab
add(C, "nk/slab-height", "FLOAT", LEN, cssv("nk-slab-height"), "2.5rem × density.", (t) => 40 * d(t));
add(C, "nk/slab-padding-x", "FLOAT", ["GAP"], cssv("nk-slab-padding"), "3 × space.", (t) => 12 * d(t));
add(C, "nk/slab-gap", "FLOAT", ["GAP"], cssv("nk-slab-gap"), "2.5 × space.", (t) => 10 * d(t));
alias(C, "nk/slab-radius", "FLOAT", RAD, cssv("nk-slab-radius"), "nk/chip-radius.", "nk/chip-radius");
alias(C, "nk/slab-bg", "COLOR", FILL, cssv("nk-slab-bg"), "nk/chip-bg.", "nk/chip-bg");
alias(C, "nk/slab-fg", "COLOR", ALLC, cssv("nk-slab-fg"), "hud-foreground.", "color/hud-foreground");
add(C, "nk/slab-border", "COLOR", STROKE, cssv("nk-slab-border"), "hud-foreground at 8%.", (t) => withAlpha(color(t["hud-foreground"]), 0.08));
alias(C, "nk/slab-font-size", "FLOAT", FS, cssv("nk-slab-font-size"), "nk/text-base.", "nk/text-base");
alias(C, "nk/slab-tone", "COLOR", ALLC, cssv("nk-slab-tone-rgb"), "brand: the line's fill, the band's tint and edges.", "color/brand");
add(C, "nk/slab-tile-size", "FLOAT", LEN, cssv("nk-slab-tile-size"), "slab height − 2 × space.", (t) => 40 * d(t) - 8 * d(t));
add(C, "nk/slab-tile-bg", "COLOR", FILL, cssv("nk-slab-tile-bg"), "hud-foreground at 10%.", (t) => withAlpha(color(t["hud-foreground"]), 0.1));
add(C, "nk/slab-tile-radius", "FLOAT", RAD, cssv("nk-slab-tile-radius"), "max(2px, slab radius − space).", (t) => { const r = t["nk-chip-radius"] !== undefined ? Math.min(px(t["nk-chip-radius"]), 999) : Math.max(4, px(t.radius) - 4); return Math.max(2, r - 4 * d(t)); });
alias(C, "nk/slab-delta-up", "COLOR", TEXT, cssv("nk-slab-delta-up"), "success.", "color/success");
alias(C, "nk/slab-delta-down", "COLOR", TEXT, cssv("nk-slab-delta-down"), "destructive.", "color/destructive");
add(C, "nk/slab-key-size", "FLOAT", LEN, cssv("nk-slab-key-size"), "1.5rem.", () => 24);
add(C, "nk/slab-key-font-size", "FLOAT", FS, cssv("nk-slab-key-font-size"), "0.8125rem.", () => 13);
add(C, "nk/slab-line-height", "FLOAT", LEN, cssv("nk-slab-line-height"), "3px.", () => 3);
add(C, "nk/slab-line-track", "COLOR", FILL, cssv("nk-slab-line-track"), "hud-foreground at 18%.", (t) => withAlpha(color(t["hud-foreground"]), 0.18));
add(C, "nk/slab-stack-width", "FLOAT", LEN, cssv("nk-slab-stack-width"), "20rem.", () => 320);
add(C, "nk/slab-band-bg", "COLOR", FILL, cssv("nk-slab-band-bg"), "scrim at 62%.", (t) => withAlpha(color(t.scrim), 0.62));
add(C, "nk/slab-band-tint", "COLOR", FILL, cssv("nk-slab-band-tint"), "The tone at 0.3, over the band.", (t) => withAlpha(color(t.brand), 0.3));
add(C, "nk/slab-band-edge", "COLOR", STROKE, cssv("nk-slab-band-edge"), "The tone at 0.6: top and bottom hairlines.", (t) => withAlpha(color(t.brand), 0.6));
alias(C, "nk/slab-band-title-size", "FLOAT", FS, cssv("nk-slab-band-title-size"), "nk/text-section.", "nk/text-section");
// motion (derived)
for (const [n, desc] of [["time-press", "0.5 × d, 50–100ms: press, toggle, key flash"], ["time-hover", "0.75 × d: pointer hover"], ["time-base", "d: panel enter, indicator, tab switch"], ["time-exit", "0.7 × d: every exit"], ["time-move", "1.5 × d ≤ 300: toasts in, FLIP, meters gaining"], ["time-modal", "1.25 × d: dialog enter"], ["time-screen", "2.5 × d ≤ 400: full-screen enter"], ["time-ambient", "400ms fixed: HUD show-on-change fades"], ["stagger", "0.15 × d ≤ 20 (snap 0.125 × d; smooth ≤ 30): per item, first open only"], ["stagger-max", "100ms fixed"]])
  add(C, `nk/${n}`, "FLOAT", HIDE, cssv(`nk-${n}`), desc + " (ms).", (t) => ms(t[`nk-${n}`]));
for (const [n, desc] of [["ease-out", "nk/ease: enter, hover"], ["ease-in", "exit"], ["ease-in-out", "on-screen moves"], ["ease-emphasized", "full-screen, big moments"], ["ease-linear", "progress, countdowns, needles"], ["spring-snap", "<duration> <bounce>"], ["spring-move", "<duration> <bounce>"], ["spring-soft", "<duration> <bounce>"], ["spring-pop", "<duration> <bounce>"]])
  add(C, `nk/${n}`, "STRING", HIDE, cssv(`nk-${n}`), desc + ".", (t) => t[`nk-${n}`]);

// fonts to preload in Figma (family × style) across all modes
const fonts = new Set();
for (const v of vars) if (v.type === "STRING" && v.v) for (const id in v.v) { /* collected below */ }
for (const id of Object.keys(compiled)) {
  const t = compiled[id];
  const fams = [t["font-sans"], t["font-display"], t["font-numeric"], t["font-mono"]].map(fam);
  const styles = vars.filter((v) => v.name.startsWith("figma/style-")).map((v) => v.v[id]);
  for (const f of fams) for (const s of styles) if ((STYLE[f] || STYLE.Inter) && Object.values(STYLE[f] || STYLE.Inter).includes(s)) fonts.add(f + "|" + s);
  for (const f of fams) for (const s of Object.values(STYLE[f] || STYLE.Inter)) fonts.add(f + "|" + s);
}
const out = { identities: ids, vars, fonts: [...fonts].map((x) => { const [family, style] = x.split("|"); return { family, style }; }) };
writeFileSync(`${scratch}/vars.json`, JSON.stringify(out));
const counts = {}; for (const v of vars) counts[v.col] = (counts[v.col] || 0) + 1;
console.log(counts, "fonts", out.fonts.length, "bytes", JSON.stringify(out).length);
// also a CSV-ish table for docs
const lines = ["| Figma variable | Tier | Type | CSS | Graphite | Signal | Velvet | Vector |", "|---|---|---|---|---|---|---|---|"];
const fmt = (x) => typeof x === "object" ? (x.a === 1 ? `#${[x.r, x.g, x.b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}` : `#${[x.r, x.g, x.b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")} @${Math.round(x.a * 100)}%`) : typeof x === "number" ? String(Math.round(x * 1000) / 1000) : String(x);
for (const v of vars) lines.push(`| \`${v.name}\` | ${v.col} | ${v.type} | ${v.code ? "`" + v.code + "`" : "—"} | ${v.alias ? `→ \`${v.alias}\`` : ids.map((id) => fmt(v.v[id])).join(" | ")} |`);
writeFileSync(new URL("./variables.md", import.meta.url).pathname, lines.join("\n"));
