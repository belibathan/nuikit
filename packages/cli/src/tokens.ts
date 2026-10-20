/**
 * Theme tokens v1 (docs/tokens.md). `scripts/gen-tokens.mjs` reads the DTCG file in
 * packages/core/tokens/ at build time into tokens.generated.ts; when that file doesn't exist yet,
 * the list below (the tokens v1 names) is used.
 */
import { GENERATED } from "./tokens.generated";

export type TokenGroup = "base" | "status" | "hud" | "vital" | "chart" | "sidebar" | "shape" | "font" | "kit";
export type TokenType = "color" | "dimension" | "fontFamily" | "number";

export interface Token {
  /** CSS custom property name without the leading `--`. */
  name: string;
  group: TokenGroup;
  type: TokenType;
  description: string;
}

const c = (name: string, group: TokenGroup, description: string): Token => ({ name, group, type: "color", description });

export const DEFAULT_TOKENS: Token[] = [
  c("background", "base", "Full-screen surfaces (pause, loading, death scrim)"),
  c("foreground", "base", "Text on full-screen surfaces"),
  c("card", "base", "Raised blocks on a full-screen surface"),
  c("card-foreground", "base", "Text on card"),
  c("popover", "base", "Every floating panel (nk-panel)"),
  c("popover-foreground", "base", "Text on popover"),
  c("primary", "base", "The one main action per surface, progress fills, selection"),
  c("primary-foreground", "base", "Text on primary"),
  c("secondary", "base", "Secondary actions"),
  c("secondary-foreground", "base", "Text on secondary"),
  c("muted", "base", "Tracks, slots and wells inside a panel"),
  c("muted-foreground", "base", "Secondary text"),
  c("accent", "base", "Hover and keyboard highlight"),
  c("accent-foreground", "base", "Text on accent"),
  c("destructive", "base", "Danger, damage, low values, death"),
  c("destructive-foreground", "base", "Text on destructive (optional in shadcn v4)"),
  c("border", "base", "Hairlines"),
  c("input", "base", "Field borders"),
  c("ring", "base", "Focus rings"),
  c("success", "status", "Positive status (paid, saved, online)"),
  c("success-foreground", "status", "Text on success"),
  c("warning", "status", "Caution status (low fuel, expiring)"),
  c("warning-foreground", "status", "Text on warning"),
  c("info", "status", "Neutral information"),
  c("info-foreground", "status", "Text on info"),
  c("hud", "hud", "Surface of chips and tiles drawn on the game world"),
  c("hud-foreground", "hud", "Text and marks drawn on the game world"),
  c("vital-health", "vital", "Health (defaults to a chart colour)"),
  c("vital-armor", "vital", "Armor"),
  c("vital-hunger", "vital", "Hunger"),
  c("vital-thirst", "vital", "Thirst"),
  c("vital-stress", "vital", "Stress"),
  c("chart-1", "chart", "Categorical colour 1"),
  c("chart-2", "chart", "Categorical colour 2"),
  c("chart-3", "chart", "Categorical colour 3"),
  c("chart-4", "chart", "Categorical colour 4"),
  c("chart-5", "chart", "Categorical colour 5"),
  c("sidebar", "sidebar", "Sidebar surface"),
  c("sidebar-foreground", "sidebar", "Text on sidebar"),
  c("sidebar-primary", "sidebar", "Sidebar primary"),
  c("sidebar-primary-foreground", "sidebar", "Text on sidebar primary"),
  c("sidebar-accent", "sidebar", "Sidebar hover"),
  c("sidebar-accent-foreground", "sidebar", "Text on sidebar accent"),
  c("sidebar-border", "sidebar", "Sidebar hairlines"),
  c("sidebar-ring", "sidebar", "Sidebar focus"),
  { name: "radius", group: "shape", type: "dimension", description: "Panel corners = radius + 4px, controls = radius - 2px" },
  { name: "font-sans", group: "font", type: "fontFamily", description: "Text" },
  { name: "font-mono", group: "font", type: "fontFamily", description: "Codes and IDs only" },
  { name: "nk-scale", group: "kit", type: "number", description: "UI size multiplier (player preference, default 1)" },
  { name: "nk-motion", group: "kit", type: "number", description: "1 = motion on, 0 = reduced motion" },
  // tokens 1.1, derived by compileTheme (left out of the DTCG file, which lists inputs only)
  c("brand", "base", "The server's signature colour"),
  c("brand-foreground", "base", "Text on brand"),
  c("surface", "base", "Floating panel surface: popover tinted by brand"),
  { name: "nk-elevation-shadow", group: "kit", type: "dimension", description: "The panel shadow --nk-elevation names" },
  { name: "nk-hud-shadow", group: "kit", type: "dimension", description: "The text shadow --nk-hud-text-shadow names" },
  { name: "world-shadow", group: "kit", type: "dimension", description: "The text shadow that keeps text on the game legible" },
];

/** The DTCG file wins per name (type, description); tokens it doesn't list keep their embedded entry. */
function merged(): Token[] {
  if (!GENERATED || !GENERATED.length) return DEFAULT_TOKENS;
  const byName = new Map(DEFAULT_TOKENS.map((t) => [t.name, t]));
  for (const g of GENERATED as Token[]) byName.set(g.name, { ...byName.get(g.name), ...g, description: g.description || byName.get(g.name)?.description || "" });
  return [...byName.values()];
}

export const TOKENS: Token[] = merged();
export const TOKEN_SOURCE: "packages/core/tokens" | "embedded" = GENERATED && GENERATED.length ? "packages/core/tokens" : "embedded";

export const TOKEN_NAMES = new Set(TOKENS.map((t) => t.name));
/** Colour tokens: the ones a Tailwind utility like bg-<name> can resolve to. */
export const COLOR_TOKEN_NAMES = TOKENS.filter((t) => t.type === "color").map((t) => t.name);

/**
 * May a theme block (`:root`, `.dark`, `@theme`) give `--name` a literal colour? Tokens, their
 * Chromium 103 channels (`--primary-rgb`, `--primary-a`) and TweakCN's shadow variables.
 */
export function isTokenDefinition(name: string): boolean {
  if (TOKEN_NAMES.has(name)) return true;
  // pages that can't own :root token names (a theme for another resource's page) prefix them: --nk-primary
  if (name.startsWith("nk-") && !TOKEN_NAMES.has(name) && isTokenDefinition(name.slice(3))) return true;
  if (TOKEN_NAMES.has(name.replace(/-(rgb|a)$/, ""))) return true;
  return /^shadow(-|$)/.test(name);
}
