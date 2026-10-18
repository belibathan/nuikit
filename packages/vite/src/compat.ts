/**
 * CEF compat compiler: lowers modern CSS (Tailwind v4, shadcn/ui) so it renders in
 * FiveM's NUI, which runs Chromium 103.
 *
 * Pass 1 — Lightning CSS, targets chrome 103:
 *   oklch()/lab() → hex with wide-gamut @supports blocks, flattened nesting,
 *   media range syntax `(width >= 48rem)` → `(min-width: 48rem)`.
 *
 * Pass 2 — what Lightning CSS can't do, because it needs runtime variables:
 *   - `bg-primary/50` → Tailwind emits color-mix(in oklab, var(--primary) 50%, transparent).
 *     We give every color token RGB channels (`--primary-rgb`, `--primary-a`) and rewrite
 *     to rgba(var(--primary-rgb), calc(var(--primary-a) * .5)). Themes stay live.
 *   - individual transforms (translate/scale/rotate, Chromium 104) → one `transform`,
 *     composed from non-inheriting registered properties. Dialog centering works again.
 *   - dvh/svh/lvh → vh (NUI viewport is fixed anyway).
 *   - reports what can't be lowered (:has(), @container, …) so nothing fails silently.
 */
import { transform as lightning } from "lightningcss";

export interface CompatOptions {
  /** Chromium major version of the target CEF. FiveM/RedM: 103. */
  chrome?: number;
  /** Minify the output (build). Default false. */
  minify?: boolean;
  /** Lower translate/scale/rotate into transform. Default true. */
  transforms?: boolean;
  filename?: string;
}

export interface CompatWarning {
  feature: string;
  count: number;
  hint: string;
}

export interface CompatReport {
  colorTokens: number;
  opacityRewrites: number;
  transformRewrites: number;
  gradientRewrites: number;
  viewportUnits: number;
  warnings: CompatWarning[];
}

export interface CompatResult {
  code: string;
  report: CompatReport;
}

const SUPPORTS_COLOR_MIX = /@supports\s*\(\s*color\s*:\s*color-mix\(\s*in\s+lab\s*,\s*red\s*,\s*red\s*\)\s*\)\s*\{/g;

export function lowerCss(input: string, options: CompatOptions = {}): CompatResult {
  const { chrome = 103, transforms = true, filename = "nuikit.css", minify = false } = options;

  // Pass 1 — Lightning CSS
  let code = lightning({
    filename,
    code: Buffer.from(input),
    targets: { chrome: chrome << 16 },
    minify: false,
    errorRecovery: true,
  }).code.toString();

  const report: CompatReport = { colorTokens: 0, opacityRewrites: 0, transformRewrites: 0, gradientRewrites: 0, viewportUnits: 0, warnings: [] };

  // Pass 2a — color tokens get rgb channels
  const colorVars = collectColorVars(code);
  report.colorTokens = colorVars.size;
  code = addChannels(code, colorVars);

  // Pass 2b — var-based color-mix → rgba(channels, alpha)
  code = code.replace(
    /color-mix\(\s*in\s+[a-z-]+\s*,\s*var\((--[\w-]+)\)\s+([\d.]+)%\s*,\s*transparent\s*\)/gi,
    (match, name: string, pct: string) => {
      if (!colorVars.has(name)) return match;
      report.opacityRewrites++;
      const a = trimNum(Number(pct) / 100);
      return `rgba(var(${name}-rgb), calc(var(${name}-a) * ${a}))`;
    },
  );

  // …and unwrap the @supports(color-mix) guards so the rewritten rules apply on 103.
  code = unwrapAtRule(code, SUPPORTS_COLOR_MIX);

  // Pass 2c — individual transforms
  if (transforms) {
    const r = lowerTransforms(code);
    code = r.code;
    report.transformRewrites = r.count;
  }

  // Pass 2d — gradient interpolation spaces (`to right in oklab`, Chromium 111)
  const g = lowerGradientSpaces(code);
  code = g.code;
  report.gradientRewrites = g.count;

  // Pass 2e — dynamic viewport units
  code = code.replace(/(\d)([dsl])v(h|w|min|max)\b/g, (_m, d, _k, unit) => {
    report.viewportUnits++;
    return `${d}v${unit}`;
  });

  report.warnings = audit(code);

  if (minify) {
    code = lightning({ filename, code: Buffer.from(code), targets: { chrome: chrome << 16 }, minify: true, errorRecovery: true }).code.toString();
  }
  return { code, report };
}

// ───────────────────────────────────────────── color tokens

type RGBA = [number, number, number, number];

function collectColorVars(css: string): Map<string, true> {
  const decls = [...css.matchAll(/(?<![\w-])(--[\w-]+)\s*:\s*([^;{}]+?)\s*(?:;|(?=\}))/g)];
  const vars = new Map<string, true>();
  const aliases: [string, string][] = [];
  for (const [, name, value] of decls) {
    if (!name || !value || name.endsWith("-rgb") || name.endsWith("-a")) continue;
    if (parseColor(value)) vars.set(name, true);
    const alias = /^var\((--[\w-]+)\)$/.exec(value.trim());
    if (alias) aliases.push([name, alias[1]!]);
  }
  // resolve alias chains (--color-primary: var(--primary))
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, target] of aliases) {
      if (!vars.has(name) && vars.has(target)) {
        vars.set(name, true);
        changed = true;
      }
    }
  }
  return vars;
}

function addChannels(css: string, colorVars: Map<string, true>): string {
  return css.replace(/(?<![\w-])(--[\w-]+)(\s*:\s*)([^;{}]+?)(\s*)(;|(?=\}))/g, (full, name: string, _sep, value: string, _ws, end) => {
    if (!colorVars.has(name)) return full;
    const v = value.trim();
    const alias = /^var\((--[\w-]+)\)$/.exec(v);
    let extra: string | null = null;
    if (alias && colorVars.has(alias[1]!)) {
      extra = `${name}-rgb: var(${alias[1]}-rgb); ${name}-a: var(${alias[1]}-a)`;
    } else {
      const c = parseColor(v);
      if (c) extra = `${name}-rgb: ${c[0]}, ${c[1]}, ${c[2]}; ${name}-a: ${trimNum(c[3])}`;
    }
    if (!extra) return full; // e.g. lab() inside a wide-gamut @supports block: channels already set outside
    return `${full}${end ? "" : ";"} ${extra}${end ? ";" : ""}`;
  });
}

const NAMED: Record<string, RGBA> = {
  transparent: [0, 0, 0, 0],
  black: [0, 0, 0, 1],
  white: [255, 255, 255, 1],
  red: [255, 0, 0, 1],
};

export function parseColor(value: string): RGBA | null {
  const v = value.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v]!;
  let m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (m) {
    let h = m[1]!;
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(v);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [Math.round(+m[1]!), Math.round(+m[2]!), Math.round(+m[3]!), a];
  }
  return null;
}

// ───────────────────────────────────────────── transforms

const TRANSFORM_PROPS = `@property --nk-translate { syntax: "*"; inherits: false; initial-value: translate(0); }
@property --nk-rotate { syntax: "*"; inherits: false; initial-value: rotate(0); }
@property --nk-scale { syntax: "*"; inherits: false; initial-value: scale(1); }
`;

function lowerTransforms(css: string): { code: string; count: number } {
  let count = 0;
  // Leave @keyframes alone: custom properties with syntax "*" don't interpolate.
  const parts = splitKeyframes(css);
  const out = parts.map(({ text, keyframes }) => {
    if (keyframes) return text;
    return text.replace(/(^|[;{\s])(translate|scale|rotate)\s*:\s*([^;{}]+?)\s*(;|(?=\}))/g, (full, pre, prop: string, value: string, end) => {
      const v = value.trim();
      if (v === "none" || v.startsWith("var(--nk")) return full;
      const fn = toTransformFn(prop, v);
      if (!fn) return full;
      count++;
      return `${pre}--nk-${prop}: ${fn}; transform: var(--nk-translate) var(--nk-rotate) var(--nk-scale)${end || ";"}`;
    });
  });
  const code = out.join("");
  return { code: count ? TRANSFORM_PROPS + code : code, count };
}

function toTransformFn(prop: string, value: string): string | null {
  const parts = splitTop(value);
  if (prop === "translate") {
    if (parts.length === 1) return `translate(${parts[0]})`;
    if (parts.length === 2) return `translate(${parts[0]}, ${parts[1]})`;
    if (parts.length === 3) return `translate3d(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  if (prop === "scale") {
    if (parts.length === 1) return `scale(${parts[0]})`;
    if (parts.length === 2) return `scale(${parts[0]}, ${parts[1]})`;
    if (parts.length === 3) return `scale3d(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  if (prop === "rotate") {
    if (parts.length === 1) return `rotate(${parts[0]})`;
    // "<axis> <angle>" / "x y z <angle>"
    if (parts.length === 2) {
      const axis = parts[0]!.toLowerCase();
      if (axis === "x") return `rotateX(${parts[1]})`;
      if (axis === "y") return `rotateY(${parts[1]})`;
      if (axis === "z") return `rotateZ(${parts[1]})`;
    }
    if (parts.length === 4) return `rotate3d(${parts[0]}, ${parts[1]}, ${parts[2]}, ${parts[3]})`;
  }
  return null;
}

/** Split a value on top-level whitespace (respects parentheses). */
export function splitTop(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of value.trim()) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (/\s/.test(ch) && depth === 0) {
      if (cur) out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function splitKeyframes(css: string): { text: string; keyframes: boolean }[] {
  const out: { text: string; keyframes: boolean }[] = [];
  const re = /@(?:-webkit-)?keyframes\s+[^{]+\{/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const end = matchBrace(css, m.index + m[0].length - 1);
    if (end < 0) break;
    out.push({ text: css.slice(last, m.index), keyframes: false });
    out.push({ text: css.slice(m.index, end + 1), keyframes: true });
    last = end + 1;
    re.lastIndex = last;
  }
  out.push({ text: css.slice(last), keyframes: false });
  return out;
}

// ───────────────────────────────────────────── gradients

const SPACE = String.raw`in\s+(?:oklab|oklch|srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|lab|lch|hsl|hwb|xyz|xyz-d50|xyz-d65)(?:\s+(?:shorter|longer|increasing|decreasing)\s+hue)?`;

/**
 * Tailwind v4 interpolates gradients in oklab (`--tw-gradient-position: to right in oklab`).
 * Chromium 103 rejects the whole gradient. Drop the color space; keep the direction.
 */
function lowerGradientSpaces(css: string): { code: string; count: number } {
  let count = 0;
  // inside guarded @supports blocks it's fine as-is
  const parts = splitSupports(css);
  const out = parts.map(({ text, guarded }) => {
    if (guarded) return text;
    // 1) a bare `in oklab` position: pick a neutral default for the gradient type in that rule
    text = text.replace(/\{[^{}]*\}/g, (block) => {
      if (!new RegExp(String.raw`--tw-gradient-position\s*:\s*${SPACE}\s*[;}]`).test(block)) return block;
      const kind = /radial-gradient\(/.test(block) ? "ellipse" : /conic-gradient\(/.test(block) ? "from 0deg" : "180deg";
      count++;
      return block.replace(new RegExp(String.raw`(--tw-gradient-position\s*:\s*)${SPACE}`), `$1${kind}`);
    });
    // 2) `<direction> in oklab` → `<direction>` (custom props and literal gradients)
    text = text.replace(new RegExp(String.raw`([\w%)])\s+${SPACE}(?=\s*[,;})])`, "g"), (_m, pre) => {
      count++;
      return pre;
    });
    // 3) literal `linear-gradient(in oklab, …)`
    text = text.replace(new RegExp(String.raw`(-gradient\(\s*)${SPACE}\s*,\s*`, "g"), (_m, pre) => {
      count++;
      return pre;
    });
    return text;
  });
  return { code: out.join(""), count };
}

function splitSupports(css: string): { text: string; guarded: boolean }[] {
  const out: { text: string; guarded: boolean }[] = [];
  const re = /@supports[^{]*\{/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const close = matchBrace(css, m.index + m[0].length - 1);
    if (close < 0) break;
    out.push({ text: css.slice(last, m.index), guarded: false });
    out.push({ text: css.slice(m.index, close + 1), guarded: true });
    last = close + 1;
    re.lastIndex = last;
  }
  out.push({ text: css.slice(last), guarded: false });
  return out;
}

// ───────────────────────────────────────────── helpers

function matchBrace(css: string, open: number): number {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
    else if (c === '"' || c === "'") {
      const close = css.indexOf(c, i + 1);
      if (close > 0) i = close;
    }
  }
  return -1;
}

/** Replace `@rule { body }` with `body` for every match of `opener` (which must end at the `{`). */
export function unwrapAtRule(css: string, opener: RegExp): string {
  let out = "";
  let last = 0;
  const re = new RegExp(opener.source, opener.flags.includes("g") ? opener.flags : opener.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(css, open);
    if (close < 0) break;
    out += css.slice(last, m.index) + unwrapAtRule(css.slice(open + 1, close), opener);
    last = close + 1;
    re.lastIndex = last;
  }
  return out + css.slice(last);
}

function trimNum(n: number) {
  return String(Math.round(n * 1000) / 1000).replace(/^0\./, ".");
}

const CHECKS: { feature: string; re: RegExp; hint: string }[] = [
  { feature: ":has()", re: /:has\(/g, hint: "Chromium 105+. Rules using it are ignored in game; avoid has-* variants for anything that matters." },
  { feature: "@container", re: /@container\b/g, hint: "Chromium 105+. Container-query styles won't apply in game; use breakpoints or plain flex/grid." },
  { feature: "color-mix() (non-token)", re: /color-mix\(/g, hint: "Couldn't be lowered (e.g. currentColor/50 or two variables). The solid fallback color is used." },
  { feature: "oklch()/oklab()", re: /okl(?:ch|ab)\(/g, hint: "Unsupported color syntax left in output." },
  { feature: "relative color rgb(from …)", re: /\b(?:rgb|hsl|oklch)\(\s*from\b/g, hint: "Chromium 119+." },
  { feature: "light-dark()", re: /light-dark\(/g, hint: "Chromium 123+. Use the .dark class instead." },
  { feature: "@starting-style", re: /@starting-style/g, hint: "Chromium 117+. Entry transitions won't play in game." },
  { feature: "field-sizing", re: /field-sizing/g, hint: "Chromium 123+. Auto-growing textareas won't grow." },
];

function audit(css: string): CompatWarning[] {
  // ignore features that only appear inside @supports guards (progressive enhancement is fine)
  const unguarded = stripSupportsBlocks(css);
  const warnings: CompatWarning[] = [];
  for (const c of CHECKS) {
    const count = unguarded.match(c.re)?.length ?? 0;
    if (count) warnings.push({ feature: c.feature, count, hint: c.hint });
  }
  return warnings;
}

function stripSupportsBlocks(css: string): string {
  let out = "";
  let last = 0;
  const re = /@supports[^{]*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const close = matchBrace(css, m.index + m[0].length - 1);
    if (close < 0) break;
    out += css.slice(last, m.index);
    last = close + 1;
    re.lastIndex = last;
  }
  return out + css.slice(last);
}

/** Pretty one-screen summary for terminals. */
export function formatReport(report: CompatReport, file?: string): string {
  const c = (n: number, s: string) => `\x1b[${n}m${s}\x1b[0m`;
  const lines = [
    `${c(35, "◆ nuikit")} ${c(2, "CEF compat" + (file ? ` · ${file}` : ""))}`,
    `  ${c(32, "✓")} ${report.colorTokens} color tokens with live channels`,
    `  ${c(32, "✓")} ${report.opacityRewrites} opacity modifiers rewritten ${c(2, "(bg-primary/50 …)")}`,
  ];
  if (report.transformRewrites) lines.push(`  ${c(32, "✓")} ${report.transformRewrites} translate/scale/rotate → transform`);
  if (report.gradientRewrites) lines.push(`  ${c(32, "✓")} ${report.gradientRewrites} gradient color spaces dropped ${c(2, "(to right in oklab → to right)")}`);
  if (report.viewportUnits) lines.push(`  ${c(32, "✓")} ${report.viewportUnits} dvh/svh → vh`);
  for (const w of report.warnings) lines.push(`  ${c(33, "!")} ${w.feature} ×${w.count} ${c(2, "— " + w.hint)}`);
  if (!report.warnings.length) lines.push(`  ${c(32, "✓")} nothing left that Chromium 103 can't render`);
  return lines.join("\n");
}
