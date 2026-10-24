// The theme studio's model: a pasted theme (TweakCN / shadcn CSS variables) plus token tweaks,
// compiled exactly as the nuikit resource compiles nuikit/theme.css, and exported back as a
// theme.css that compiles to the same tokens. Shared by /theme and the /blocks theme switcher.
import { IDENTITY_TOKENS, compileTheme, toRgba, type CompiledTheme, type ThemeVars } from "nuikit-core";

const DERIVED = new Set(IDENTITY_TOKENS.filter((t) => t.group === "derived").map((t) => t.name));

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
 * again, so it gives the same tokens, and a hand edit to `--nk-shape-cut` or `--nk-motion-duration` still takes.
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

export type ThemeChange = { name: string; from: string | undefined; to: string };

/**
 * What the studio changed against the theme it started from: every token that compiles to a different value,
 * derived ones left out (compiling the file derives them again). A treatment's own preset values are implied
 * by `--nk-treatment`, so they are not repeated.
 */
export function diffTheme(theme: CompiledTheme, base: CompiledTheme): ThemeChange[] {
  const out: ThemeChange[] = [];
  for (const [k, v] of Object.entries(theme.vars)) {
    if (DERIVED.has(k)) continue;
    if (base.vars[k] === v) continue;
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
