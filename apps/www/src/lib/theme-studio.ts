// The theme studio's model: a pasted theme (TweakCN / shadcn CSS variables) plus token tweaks,
// compiled exactly as the nuikit resource compiles nuikit/theme.css, and exported back as a
// theme.css that compiles to the same tokens. Shared by /theme and the /blocks theme switcher.
import { IDENTITY_TOKENS, TREATMENTS, TREATMENT_PRESETS, compileTheme, toRgba, type CompiledTheme, type ThemeVars } from "nuikit-core";

const DERIVED = new Set(IDENTITY_TOKENS.filter((t) => t.group === "derived").map((t) => t.name));

/** Tokens the studio lets you tweak directly, grouped as the page shows them. */
export const TWEAKS: { group: string; tokens: { name: string; label: string }[] }[] = [
  {
    group: "Surfaces",
    tokens: [
      { name: "background", label: "Background" },
      { name: "foreground", label: "Text" },
      { name: "popover", label: "Panel" },
      { name: "popover-foreground", label: "Panel text" },
      { name: "muted-foreground", label: "Secondary text" },
      { name: "accent", label: "Highlight" },
    ],
  },
  {
    group: "Actions and status",
    tokens: [
      { name: "primary", label: "Primary" },
      { name: "primary-foreground", label: "On primary" },
      { name: "destructive", label: "Danger" },
      { name: "success", label: "Success" },
      { name: "warning", label: "Warning" },
      { name: "info", label: "Info" },
    ],
  },
  {
    group: "On the game",
    tokens: [
      { name: "hud", label: "HUD surface" },
      { name: "hud-foreground", label: "HUD text" },
      { name: "vital-health", label: "Health" },
      { name: "vital-armor", label: "Armor" },
      { name: "vital-hunger", label: "Hunger" },
      { name: "vital-thirst", label: "Thirst" },
      { name: "vital-stress", label: "Stress" },
    ],
  },
];

/** A control on the identity tier (tokens 1.1 / 1.2): a slider over a range, a choice, or a font. */
export type IdentityControl =
  | { name: string; label: string; kind: "range"; min: number; max: number; step: number; unit?: "" | "rem" | "px" | "ms" | "em" | "deg"; hint?: string; def?: number }
  | { name: string; label: string; kind: "choice"; options: readonly { value: string; label: string }[]; hint?: string }
  | { name: string; label: string; kind: "font"; hint?: string };

/** The bundled identity families (docs/tokens.md#fonts), as a theme would name them with their stacks. */
export const FONT_CHOICES: readonly { label: string; value: string }[] = [
  { label: "Inter", value: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { label: "Inter Tight", value: '"Inter Tight", Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: "Barlow", value: "Barlow, ui-sans-serif, system-ui, sans-serif" },
  { label: "Barlow Condensed", value: '"Barlow Condensed", Barlow, ui-sans-serif, system-ui, sans-serif' },
  { label: "DM Sans", value: '"DM Sans", ui-sans-serif, system-ui, sans-serif' },
  { label: "Fraunces", value: "Fraunces, Georgia, ui-serif, serif" },
  { label: "IBM Plex Sans", value: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif' },
  { label: "Chakra Petch", value: '"Chakra Petch", "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif' },
  { label: "Geist Mono", value: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace' },
  { label: "JetBrains Mono", value: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace' },
];

/**
 * The identity tier as the studio shows it (docs/archive/design-v2.md §1): type, shape, surface, density,
 * motion, HUD. Every control writes one token; the compiler derives the rest and warns on the floors.
 */
export const IDENTITY: { group: string; controls: IdentityControl[] }[] = [
  {
    group: "Type",
    controls: [
      { name: "font-sans", label: "Text", kind: "font" },
      { name: "font-display", label: "Display", kind: "font", hint: "Titles, timers, the balance" },
      { name: "font-numeric", label: "Numbers", kind: "font", hint: "Gauges, money, timers (tabular)" },
      { name: "nk-type-ratio", label: "Type ratio", kind: "range", min: 1.125, max: 1.4, step: 0.025, hint: "1.125 calm … 1.333 dramatic" },
      { name: "nk-weight-display", label: "Display weight", kind: "range", min: 300, max: 900, step: 100 },
      { name: "nk-label-case", label: "Captions", kind: "choice", options: [{ value: "uppercase", label: "Uppercase" }, { value: "none", label: "As written" }] },
    ],
  },
  {
    group: "Shape",
    controls: [
      { name: "radius", label: "Corner radius", kind: "range", min: 0, max: 1.5, step: 0.125, unit: "rem" },
      { name: "nk-cut", label: "Chamfer", kind: "range", min: 0, max: 1, step: 0.125, unit: "rem", hint: "Cut corners, 0 = off" },
      { name: "nk-border-width", label: "Hairline", kind: "range", min: 0, max: 3, step: 1, unit: "px" },
    ],
  },
  {
    group: "Surface",
    controls: [
      { name: "nk-surface-opacity", label: "Panel opacity", kind: "range", min: 0.8, max: 1, step: 0.01, hint: "Floor 0.92 for text panels" },
      { name: "nk-surface-tint", label: "Brand tint", kind: "range", min: 0, max: 0.12, step: 0.01 },
      { name: "nk-surface-gradient", label: "Gradient", kind: "range", min: 0, max: 0.2, step: 0.01 },
      { name: "nk-surface-edge", label: "Machined edge", kind: "range", min: 0, max: 0.3, step: 0.01 },
      { name: "nk-elevation", label: "Elevation", kind: "choice", options: [{ value: "none", label: "None" }, { value: "soft", label: "Soft" }, { value: "deep", label: "Deep" }, { value: "hard", label: "Hard" }] },
      { name: "nk-glow", label: "Glow", kind: "range", min: 0, max: 0.6, step: 0.05, hint: "Brand glow on active parts" },
      { name: "nk-row-indicator", label: "Active row", kind: "choice", options: [{ value: "bar", label: "Bar" }, { value: "fill", label: "Fill" }, { value: "outline", label: "Outline" }, { value: "sweep", label: "Sweep" }] },
    ],
  },
  {
    group: "Density",
    controls: [{ name: "nk-density", label: "Density", kind: "range", min: 0.75, max: 1.3, step: 0.025, hint: "Spacing and row heights; text stays 16px" }],
  },
  {
    group: "Motion",
    controls: [
      { name: "nk-motion-feel", label: "Feel", kind: "choice", options: [{ value: "crisp", label: "Crisp" }, { value: "snap", label: "Snap" }, { value: "smooth", label: "Smooth" }, { value: "stepped", label: "Stepped" }] },
      { name: "nk-duration", label: "Duration", kind: "range", min: 60, max: 400, step: 10, unit: "ms", hint: "Warns above 260ms" },
      { name: "nk-spring-bounce", label: "Bounce", kind: "range", min: 0, max: 0.3, step: 0.05 },
      { name: "nk-motion", label: "Animations", kind: "choice", options: [{ value: "1", label: "On" }, { value: "0", label: "Off" }] },
    ],
  },
  {
    group: "HUD",
    controls: [
      { name: "nk-hud-opacity", label: "Backplate", kind: "range", min: 0.3, max: 1, step: 0.01, hint: "HUD text is checked over a white sky" },
      { name: "nk-hud-text-shadow", label: "Text shadow", kind: "choice", options: [{ value: "none", label: "None" }, { value: "soft", label: "Soft" }, { value: "strong", label: "Strong" }] },
      { name: "nk-gauge-style", label: "Gauges", kind: "choice", options: [{ value: "arc", label: "Arc" }, { value: "bar", label: "Bar" }, { value: "digital", label: "Digital" }] },
      { name: "nk-gauge-track", label: "Track", kind: "range", min: 0.125, max: 0.625, step: 0.0625, unit: "rem", hint: "Gauge and meter thickness" },
      { name: "nk-gauge-ticks", label: "Ticks", kind: "choice", options: [{ value: "1", label: "On" }, { value: "0", label: "Off" }] },
    ],
  },
];

/**
 * The component tier (kit.css component tokens): one part of the kit, set outright over what the identity
 * derives for it. Left alone, each follows the identity (density, radius, gauges); `def` is where the
 * slider sits then (the Graphite value), since the derived value is a formula.
 */
export const COMPONENTS: { group: string; controls: IdentityControl[] }[] = [
  {
    group: "Panels and rows",
    controls: [
      { name: "nk-panel-radius", label: "Panel corners", kind: "range", min: 0, max: 1.5, step: 0.0625, unit: "rem", def: 0.625 },
      { name: "nk-row-height", label: "Row height", kind: "range", min: 2, max: 3.5, step: 0.125, unit: "rem", def: 2.375, hint: "Menu rows, list items" },
      { name: "nk-row-radius", label: "Row corners", kind: "range", min: 0, max: 1, step: 0.0625, unit: "rem", def: 0.5 },
    ],
  },
  {
    group: "On the game",
    controls: [
      { name: "nk-chip-radius", label: "Chip corners", kind: "range", min: 0, max: 1.25, step: 0.0625, unit: "rem", def: 0.375, hint: "HUD chips, slabs, notices on the game" },
      { name: "nk-slab-height", label: "Slab height", kind: "range", min: 1.75, max: 3.25, step: 0.125, unit: "rem", def: 2.25, hint: "Prompts, item notices, timed progress" },
      { name: "nk-key-radius", label: "Key corners", kind: "range", min: 0, max: 0.75, step: 0.0625, unit: "rem", def: 0.375 },
      { name: "nk-meter-height", label: "Meter thickness", kind: "range", min: 0.125, max: 0.625, step: 0.0625, unit: "rem", def: 0.25 },
    ],
  },
];

/** The number in a token value for a range control ("0.75rem" → 0.75, "140ms" → 140, "0.96" → 0.96). */
export function identityNumber(value: string | undefined, fallback = 0): number {
  const n = parseFloat(value ?? "");
  return Number.isFinite(n) ? n : fallback;
}

/** A range control's number as the token's value, with its unit ("0.75" + "rem" → "0.75rem"). */
export function identityValue(control: Extract<IdentityControl, { kind: "range" }>, n: number): string {
  const decimals = String(control.step).split(".")[1]?.length ?? 0;
  const text = decimals ? n.toFixed(decimals).replace(/\.?0+$/, "") : String(Math.round(n));
  return `${text || "0"}${control.unit ?? ""}`;
}

/** The FONT_CHOICES entry whose family leads a token value, or null for a stack the studio doesn't bundle. */
export function fontChoice(value: string | undefined): string | null {
  if (!value) return null;
  const family = value.split(",")[0]!.trim().replace(/^["']|["']$/g, "").toLowerCase();
  return FONT_CHOICES.find((f) => f.label.toLowerCase() === family)?.value ?? null;
}

/**
 * The pasted theme with the tweaks on top, compiled for the game (dark set, colours lowered,
 * nuikit tokens derived, contrast checked). A tweak is an explicit token, so it wins and is no
 * longer derived.
 */
export function studioTheme(css: string, tweaks: ThemeVars = {}): CompiledTheme {
  const { css: clean, empty } = dropEmptyValues(css);
  const compiled = compileTheme(clean, { mode: "dark" });
  const base = empty.length
    ? { ...compiled, warnings: [`${empty.map((n) => `--${n}`).join(", ")} ${empty.length > 1 ? "have" : "has"} no value; the stock value is used.`, ...compiled.warnings] }
    : compiled;
  if (!Object.keys(tweaks).length) return base;
  // derived identity tokens (surface, shadows, clip paths, the motion ladder…) come from the tweaked
  // values again, as applyTheme's patch does; everything else the paste set stays explicit
  const vars: ThemeVars = {};
  for (const [k, v] of Object.entries(base.vars)) if (!DERIVED.has(k) || k in tweaks) vars[k] = v;
  if ("brand" in tweaks && !("brand-foreground" in tweaks)) delete vars["brand-foreground"];
  const tweaked = compileTheme({ ...base, vars: { ...vars, ...tweaks } }, { mode: base.mode });
  // keep what the paste said about itself (missing dark set, unreadable values); contrast is re-checked
  const pasteNotes = base.warnings.filter((w) => !/ is [\d.]+:1 \(needs /.test(w));
  return { ...tweaked, warnings: [...pasteNotes, ...tweaked.warnings.filter((w) => !pasteNotes.includes(w))] };
}

/**
 * `--primary: ;` or a paste cut off after `--primary:` would compile to an empty token (nothing
 * drawn). Drop those declarations so the stock value fills in, and name them.
 */
function dropEmptyValues(css: string): { css: string; empty: string[] } {
  const empty: string[] = []
  const out = css.replace(/--([\w-]+)\s*:\s*(?=;|\}|$)/g, (_, name: string) => {
    empty.push(name)
    return ""
  })
  return { css: out, empty: [...new Set(empty)] }
}

/**
 * theme.css for nuikit/theme.css (or any TweakCN slot): every compiled token in a `.dark` block, the
 * set nuikit reads in game, with the font @imports first. Derived tokens (surface, shadows, clip
 * paths, the motion ladder) are left out, as toDtcg leaves them out: compiling the file derives them
 * again, so it gives the same tokens, and a hand edit to `--nk-cut` or `--nk-duration` still takes.
 * Two exceptions, found by compiling the file and comparing: a derived token the theme set itself
 * (Default's `--nk-ease-expand`) is written out, and a default that is a `var()` reference (the tile
 * treatment's `--nk-type-*-family`) is left out, since writing it would resolve it to a literal.
 */
export function exportThemeCss(theme: CompiledTheme): string {
  const keep = new Set(Object.keys(theme.vars).filter((k) => !DERIVED.has(k)));
  const render = () =>
    [
      "/* nuikit theme (tokens v1), made in the theme studio: https://nuikit.vercel.app/theme",
      "   Drop it in nuikit/theme.css and run `nuikit theme reload`. */",
      ...theme.imports.map((u) => `@import url("${u}");`),
      `.dark {\n${[...keep].map((k) => `  --${k}: ${theme.vars[k]};`).join("\n")}\n}`,
      "",
    ].join("\n");
  for (let pass = 0; pass < 3; pass++) {
    const { vars: again, warnings } = compileTheme(render(), { mode: "dark" });
    // a var() default can also point at a derived token the file leaves out ("… isn't defined")
    const unresolved = (k: string) => warnings.some((w) => w.startsWith(`--${k} is var(`) && !theme.warnings.includes(w));
    const off = Object.keys(theme.vars).filter((k) => again[k] !== theme.vars[k] || (keep.has(k) && unresolved(k)));
    if (!off.length) break;
    for (const k of off) {
      if (!keep.has(k)) keep.add(k);
      else if (theme.vars[k]!.includes("var(")) keep.delete(k);
    }
  }
  return render();
}

/** "rgb(229, 229, 229)" → "#e5e5e5" for <input type=color>; alpha is dropped (shown separately). */
export function toHex(value: string | undefined): string {
  const c = value ? toRgba(value) : null;
  if (!c) return "#000000";
  return `#${c
    .slice(0, 3)
    .map((n) => Math.round(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** A tweak from a colour input that keeps the token's alpha ("rgba(0, 0, 0, 0.45)" stays 45%). */
export function withAlpha(hex: string, previous: string | undefined): string {
  const a = previous ? toRgba(previous)?.[3] : undefined;
  if (a === undefined || a >= 1) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export type Treatment = (typeof TREATMENTS)[number];

/** The five treatments (docs/design/levers.md): a named set of lever values under whatever the theme sets itself. */
export const TREATMENT_INFO: Record<Treatment, string> = {
  soft: "Nothing set: plain palette, soft panels. The blank page.",
  glass: "Deep shadows, a lit edge, blur behind panels, smooth motion.",
  plate: "Chamfered plates, uppercase labels, scanlines, stepped motion.",
  slab: "Heavy hairlines, hard shadows, slanted italics, snapping motion.",
  tile: "Slanted keycaps on hard plates: the Default language.",
};
export { TREATMENTS };

const choice = (...v: string[]) => v.map((value) => ({ value, label: value[0]!.toUpperCase() + value.slice(1) }));
const ROLES = [
  ["scan", "Keys, buttons, tabs"],
  ["title", "Titles"],
  ["label", "Labels"],
  ["num", "Numbers"],
] as const;

/**
 * The lever groups of docs/design/levers.md the studio exposes beyond the identity tier: geometry, type
 * voices, fills, selection, motion. `def` is the kit's default (what the slider shows when the theme sets
 * nothing); ranges are the compiler's.
 */
export const LEVERS: { group: string; controls: IdentityControl[] }[] = [
  {
    group: "Geometry",
    controls: [
      { name: "nk-skew", label: "Skew: chips, badges", kind: "range", min: -20, max: 20, step: 1, unit: "deg", def: 0, hint: "Text stays upright" },
      { name: "nk-tile-skew", label: "Skew: keycaps", kind: "range", min: -20, max: 20, step: 1, unit: "deg", def: 0, hint: "The face only, the box stays upright" },
      { name: "nk-tile-wall", label: "Keycap wall", kind: "range", min: 0, max: 0.5, step: 0.0625, unit: "rem", def: 0.1875, hint: "How far the face sits above its plate; 0 = flat" },
      { name: "nk-tile-wall-shade", label: "Wall shade", kind: "range", min: 0, max: 1, step: 0.05, def: 0.45 },
      { name: "nk-r-key", label: "Radius: keys", kind: "range", min: 0, max: 0.75, step: 0.0625, unit: "rem", def: 0.25 },
      { name: "nk-r-chip", label: "Radius: chips", kind: "range", min: 0, max: 1.25, step: 0.0625, unit: "rem", def: 0.25 },
      { name: "nk-r-control", label: "Radius: buttons, fields, rows", kind: "range", min: 0, max: 1, step: 0.0625, unit: "rem", def: 0.375 },
      { name: "nk-r-surface", label: "Radius: panels", kind: "range", min: 0, max: 1.5, step: 0.0625, unit: "rem", def: 0.625 },
    ],
  },
  ...ROLES.map(([r, what]) => ({
    group: `Type voice: ${r}`,
    controls: [
      { name: `nk-type-${r}-style`, label: `${what}: style`, kind: "choice", options: choice("normal", "italic") },
      { name: `nk-type-${r}-case`, label: "Case", kind: "choice", options: choice("none", "uppercase") },
      { name: `nk-type-${r}-weight`, label: "Weight", kind: "range", min: 100, max: 900, step: 100, def: 600 },
      { name: `nk-type-${r}-tracking`, label: "Tracking", kind: "range", min: -0.05, max: 0.2, step: 0.01, unit: "em", def: 0 },
    ] as IdentityControl[],
  })),
  {
    group: "Fills",
    controls: [
      { name: "nk-fill-style", label: "Fill language", kind: "choice", options: choice("solid", "soft"), hint: "Meters, progress, the selected row" },
      { name: "nk-tile-tint", label: "Soft tint", kind: "range", min: 0, max: 1, step: 0.02, def: 0.16, hint: "Opacity of a soft selection" },
      { name: "nk-hold-style", label: "Hold", kind: "choice", options: choice("bar", "ring", "fill") },
      { name: "nk-level-style", label: "Level", kind: "choice", options: choice("bar", "ring", "liquid", "slab", "pips") },
    ],
  },
  {
    group: "Selection and focus",
    controls: [
      { name: "nk-focus-style", label: "Focus", kind: "choice", options: choice("ring", "halo", "tint", "fill", "invert", "bar") },
      { name: "nk-focus-shift", label: "Focus shift", kind: "range", min: 0, max: 0.5, step: 0.0625, unit: "rem", def: 0 },
      { name: "nk-row-lift", label: "Row lift", kind: "range", min: 0, max: 1, step: 0.0625, unit: "rem", def: 0.5, hint: "How far a selected row steps out" },
    ],
  },
  {
    group: "Motion levers",
    controls: [
      { name: "nk-exit-factor", label: "Exit speed", kind: "range", min: 0.3, max: 1, step: 0.05, def: 0.7, hint: "Exits are this × the enter" },
      { name: "nk-confirm-scale", label: "Confirm pop", kind: "range", min: 1, max: 1.2, step: 0.01, def: 1.04 },
      { name: "nk-rise", label: "Entrance rise", kind: "range", min: 0, max: 1, step: 0.0625, unit: "rem", def: 0.5 },
    ],
  },
];

/** A start theme with a treatment chosen over it: the treatment fills what the theme leaves out. */
export function withTreatment(css: string, treatment: Treatment | null): string {
  return treatment ? `${css}\n.dark { --nk-treatment: ${treatment}; }` : css;
}

export type ThemeChange = { name: string; from: string | undefined; to: string };

/**
 * What the studio changed against the theme it started from: every token that compiles to a different value,
 * derived ones left out (compiling the file derives them again). A treatment's own preset values are implied
 * by `--nk-treatment`, so they are not repeated.
 */
export function diffTheme(theme: CompiledTheme, base: CompiledTheme): ThemeChange[] {
  const t = theme.vars["nk-treatment"] as Treatment | undefined;
  const changedTreatment = t !== base.vars["nk-treatment"];
  const out: ThemeChange[] = [];
  for (const [k, v] of Object.entries(theme.vars)) {
    if (DERIVED.has(k)) continue;
    if (base.vars[k] === v) continue;
    if (k !== "nk-treatment" && changedTreatment && t && TREATMENT_PRESETS[t][k] === v) continue;
    out.push({ name: k, from: base.vars[k], to: v });
  }
  return out;
}

/** theme.css of only the changed values: values only, in `@layer nk.theme`, as `nuikit check` wants. */
export function exportChangesCss(changes: ThemeChange[], from: string): string {
  const body = changes.length ? changes.map((c) => `    --${c.name}: ${c.to};`).join("\n") : "    /* nothing changed yet */";
  return [
    `/* nuikit theme: only what changed from ${from}. Values only (docs/design/levers.md).`,
    "   Made in the theme studio: https://nuikit.vercel.app/theme. Put it after the base theme; run `nuikit theme reload`. */",
    "@layer nk.theme {",
    "  .dark {",
    body,
    "  }",
    "}",
    "",
  ].join("\n");
}
