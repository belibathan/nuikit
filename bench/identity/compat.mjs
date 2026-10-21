// Every CSS feature the identity layer uses, checked against Chromium 103 (FiveM's CEF) with MDN's
// browser-compat-data. See results.md.
//
//   npm i --no-save @mdn/browser-compat-data   (anywhere), then
//   BCD=<path to @mdn/browser-compat-data> node bench/identity/compat.mjs
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const bcd = require(process.env.BCD ?? "@mdn/browser-compat-data");
const TARGET = 103;

/** [feature path in BCD, how the identity layer uses it, needed?] */
const FEATURES = [
  ["css.properties.custom-property", "every token", true],
  ["css.types.calc", "spacing × density, type ratio, radius maths", true],
  ["css.types.calc.nested", "calc() inside calc() (component formulas)", true],
  ["css.properties.clip-path", "cut corners (--nk-cut)", true],
  ["css.properties.clip-path.basic_shape", "clip-path: polygon(…)", true],
  ["css.types.basic-shape.polygon", "polygon() with calc() points", true],
  ["css.types.gradient.linear-gradient", "surface light falloff", true],
  ["css.types.gradient.conic-gradient", "arc gauges and rings", false],
  ["css.properties.box-shadow", "elevation, edge (inset), glow", true],
  ["css.properties.box-shadow.inset", "inner top edge highlight", true],
  ["css.properties.filter", "drop-shadow on cut-corner wrappers (optional)", false],
  ["css.properties.text-shadow", "HUD text shadow", true],
  ["css.properties.text-transform", "--nk-label-case", true],
  ["css.properties.letter-spacing", "tracking tokens", true],
  ["css.properties.font-variant-numeric", "tabular numerals", true],
  ["css.properties.font-feature-settings", "tnum / ss01 on identity fonts", false],
  ["css.at-rules.font-face", "bundled / nuikit-served fonts", true],
  ["css.at-rules.font-face.src", "url() lists: nuikit-served first, bundled next (woff2: Chrome 36)", true],
  ["css.at-rules.font-face.font-display", "font-display: swap", true],
  ["css.at-rules.font-face.unicode-range", "latin subsets", true],
  ["css.at-rules.font-face.font-weight", "variable weight ranges (100 900)", true],
  ["css.properties.font-variation-settings", "variable fonts", false],
  ["css.properties.border-radius", "radius tokens", true],
  ["css.properties.outline", "row outline indicator", true],
  ["css.properties.outline-offset", "row outline indicator", true],
  ["css.properties.inset", "absolutely placed indicator bar", true],
  ["css.properties.transition-timing-function", "--nk-ease (cubic-bezier)", true],
  ["css.types.easing-function.linear-function", "linear() easing (NOT used)", false],
  ["css.types.color.color-mix", "color-mix() (stylesheets only: the plugin lowers it)", false],
  ["css.selectors.has", ":has() (NOT used)", false],
  ["css.at-rules.container", "@container (NOT used)", false],
  ["css.properties.scale", "individual scale (NOT used)", false],
  ["css.properties.translate", "individual translate (NOT used)", false],
  ["css.types.sin", "trig functions (NOT used: gauge maths stays in JS)", false],
  ["css.types.round", "round() (NOT used)", false],
  ["css.properties.mask-image", "mask-image unprefixed (NOT used; -webkit-mask-image is)", false],
  ["css.at-rules.property", "@property (NOT used)", false],
];

const get = (path) => path.split(".").reduce((o, k) => o?.[k], bcd);
const since = (support) => {
  const list = Array.isArray(support) ? support : [support];
  const plain = list.find((s) => !s.prefix && !s.alternative_name && !s.flags && !s.partial_implementation) ?? list[0];
  if (!plain) return null;
  const v = plain.version_added;
  return typeof v === "string" ? parseFloat(v.replace(/^≤/, "")) : v === true ? 1 : null;
};

let bad = 0;
console.log(`| Feature | Used for | Chrome since | Chromium ${TARGET} |`);
console.log("|---|---|---|---|");
for (const [path, use, needed] of FEATURES) {
  const node = get(path);
  const v = node?.__compat ? since(node.__compat.support.chrome) : undefined;
  const ok = typeof v === "number" && v <= TARGET;
  if (needed && !ok) bad++;
  const verdict = v === undefined ? "not in BCD" : ok ? "yes" : needed ? "**NO**" : "no (avoided)";
  console.log(`| \`${path.replace(/^css\./, "")}\` | ${use} | ${v ?? "–"} | ${verdict} |`);
}
console.log(`\n${bad === 0 ? "Every feature the identity layer needs is in Chromium 103." : `${bad} needed feature(s) missing in Chromium 103.`}`);
process.exitCode = bad ? 1 : 0;
