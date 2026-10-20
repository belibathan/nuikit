// The theme studio's model: a pasted theme (TweakCN / shadcn CSS variables) plus token tweaks,
// compiled exactly as the nuikit resource compiles nuikit/theme.css, and exported back as a
// theme.css that compiles to the same tokens. Shared by /theme and the /blocks theme switcher.
import { compileTheme, toRgba, type CompiledTheme, type ThemeVars } from "nuikit-core";

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
  const tweaked = compileTheme({ ...base, vars: { ...base.vars, ...tweaks } }, { mode: base.mode });
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
 * set nuikit reads in game, with the font @imports first. Compiling it again gives the same tokens.
 */
export function exportThemeCss(theme: CompiledTheme): string {
  const lines = Object.entries(theme.vars).map(([k, v]) => `  --${k}: ${v};`)
  return [
    "/* nuikit theme (tokens v1), made in the theme studio: https://nuikit.vercel.app/theme",
    "   Drop it in nuikit/theme.css and run `nuikit theme reload`. */",
    ...theme.imports.map((u) => `@import url("${u}");`),
    `.dark {\n${lines.join("\n")}\n}`,
    "",
  ].join("\n");
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
