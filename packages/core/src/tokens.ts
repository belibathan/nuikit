/**
 * nuikit tokens v1 (docs/tokens.md): the theme contract every nuikit UI reads, and the compiler
 * that turns any shadcn / TweakCN paste (or a DTCG file, or a plain object) into it.
 *
 *   const { vars, warnings } = compileTheme(readFileSync("theme.css", "utf8"));
 *
 * Pure: no DOM, runs in the browser, in Node and in the FXServer JS runtime.
 */
import { composite, contrastRatio, formatRgba, mix, oklchToRgb, rgbToOklch, toRgba, type RGBA } from "./color";

export type ThemeVars = Record<string, string>;
export type ThemeMode = "dark" | "light";

/** The token contract version. Bumped only for breaking renames/removals; additions keep v1. */
export const TOKENS_VERSION = 1 as const;
/**
 * The contract revision: 1.1 added the identity tokens (IDENTITY_TOKENS), 1.2 the motion tokens (MOTION_TOKENS),
 * 1.4 the foundation (FOUNDATION_TOKENS), 1.5 the Default theme levers (KIT_TOKENS: scales, type roles, tile, plate, fill;
 * docs/design/default.md), 1.6 the baseline every component shares (BASELINE_TOKENS: row rhythm and voices, the field,
 * the keycap button, the segmented ring; docs/design/baseline.md), 1.7 the selection convention (SELECTION_TOKENS: the
 * selection is the keycap Tile, one per list, rows a list gap apart; baseline.md "Selection"). Additive, so still v1.
 */
export const TOKENS_REVISION = "1.7" as const;

export type TokenType = "color" | "dimension" | "fontFamily" | "number" | "keyword" | "duration" | "cubicBezier" | "shadow" | "image";

export interface TokenSpec {
  name: string;
  type: TokenType;
  /**
   * shadcn: what every shadcn/TweakCN theme has. nuikit: game semantics, derived when absent.
   * identity (1.1): type, shape, surface, density, motion, brand and HUD style, derived when absent.
   * derived (1.1): computed from identity tokens so CSS needn't branch (a theme may still set them).
   * Motion tokens (1.2) are identity (nk-motion-feel, nk-spring-bounce) and derived (the ladder, easings, springs).
   */
  group: "shadcn" | "nuikit" | "identity" | "derived";
  description: string;
  /** How the value is derived when the theme doesn't set it. */
  fallback: string;
  /** Keyword tokens: the values accepted. */
  values?: readonly string[];
  /** Numbers: accepted range. */
  range?: readonly [number, number];
  /** The revision that added it. */
  since?: "1.1" | "1.2" | "1.3" | "1.4" | "1.5" | "1.6" | "1.7";
  /**
   * Tokens 1.5 (KIT_TOKENS): the default is a kit.css formula over the identity (so a subtree's density or
   * radius re-derives it), not a compiled literal. The compiler validates a value a theme or treatment sets and
   * passes it through; it never emits the default.
   */
  css?: boolean;
}

/** The default sans stack (Graphite): Inter, bundled with every nuikit UI (docs/tokens.md#fonts). */
export const DEFAULT_FONT_SANS = "Inter, ui-sans-serif, system-ui, sans-serif";
export const DEFAULT_FONT_DISPLAY = `"Inter Tight", ${DEFAULT_FONT_SANS}`;
export const DEFAULT_FONT_MONO = `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;

const c = (name: string, description: string, fallback = "stock shadcn neutral"): TokenSpec => ({ name, type: "color", group: "shadcn", description, fallback });
const n = (name: string, type: TokenType, description: string, fallback: string): TokenSpec => ({ name, type, group: "nuikit", description, fallback });

/** Every token in the contract, in documentation order. */
export const TOKENS: readonly TokenSpec[] = [
  c("background", "Full-screen surfaces (pause, loading, death scrim)"),
  c("foreground", "Text on full-screen surfaces"),
  c("card", "Raised blocks on a full-screen surface"),
  c("card-foreground", "Text on cards"),
  c("popover", "Every floating panel (nk-panel)"),
  c("popover-foreground", "Text in panels"),
  c("primary", "The one main action per surface, progress fills, selection"),
  c("primary-foreground", "Text on primary"),
  c("secondary", "Secondary buttons"),
  c("secondary-foreground", "Text on secondary"),
  c("muted", "Tracks, slots and wells inside a panel"),
  c("muted-foreground", "Secondary text"),
  c("accent", "Hover and keyboard highlight"),
  c("accent-foreground", "Text on accent"),
  c("destructive", "Danger, damage, low values, death"),
  c("destructive-foreground", "Text on destructive", "foreground or background, whichever contrasts more with destructive"),
  c("border", "Hairlines"),
  c("input", "Field borders"),
  c("ring", "Focus rings"),
  c("chart-1", "Categorical colour 1"),
  c("chart-2", "Categorical colour 2"),
  c("chart-3", "Categorical colour 3"),
  c("chart-4", "Categorical colour 4"),
  c("chart-5", "Categorical colour 5"),
  { name: "radius", type: "dimension", group: "shadcn", description: "Corner radius (panels radius + 4px, controls radius − 2px)", fallback: "0.625rem" },
  { name: "font-sans", type: "fontFamily", group: "shadcn", description: "Text", fallback: DEFAULT_FONT_SANS },
  { name: "font-mono", type: "fontFamily", group: "shadcn", description: "Codes and IDs a player might type", fallback: DEFAULT_FONT_MONO },
  n("success", "color", "Positive status: done, paid, online", "oklch(L, C, 150): green at the lightness/chroma of destructive"),
  n("success-foreground", "color", "Text on success", "foreground or background, whichever contrasts more"),
  n("warning", "color", "Caution status: low fuel, about to expire", "oklch(L + 0.08, C, 75): amber at the lightness/chroma of destructive"),
  n("warning-foreground", "color", "Text on warning", "foreground or background, whichever contrasts more"),
  n("info", "color", "Neutral status: tips, notices", "primary"),
  n("info-foreground", "color", "Text on info", "primary-foreground"),
  n("hud", "color", "Surfaces drawn straight on the game: HUD chips, hotbar, target eye", "rgba(0, 0, 0, 0.45)"),
  n("hud-foreground", "color", "Text and icons on hud", "rgb(255, 255, 255)"),
  n("scrim", "color", "Darkens the game behind full-screen screens, bar tracks and shadows on the game; always used with opacity", "rgb(0, 0, 0)"),
  n("vital-health", "color", "Health bar", "chart-1 if red, else another red chart-*, else destructive if red, else oklch(0.68 0.21 25)"),
  n("vital-armor", "color", "Armor bar", "chart-2 if blue, else another blue chart-*, else oklch(0.68 0.16 250)"),
  n("vital-hunger", "color", "Hunger bar", "chart-3 if orange/amber, else another one, else oklch(0.78 0.16 70)"),
  n("vital-thirst", "color", "Thirst bar", "chart-4 if cyan/blue, else another one, else oklch(0.76 0.13 215)"),
  n("vital-stress", "color", "Stress bar", "chart-5 if purple/magenta, else another one, else oklch(0.68 0.2 320)"),
  n("nk-scale", "number", "UI size multiplier (unitless). Players can scale further (0.85–1.25).", "1"),
  n("nk-motion", "number", "1 = animations on, 0 = off. Painted as 0 when the theme or the player's reduced-motion pref turns motion down.", "1"),
];

/** The v1 names (unchanged since 1.0). Every compiled theme carries them. */
export const TOKEN_NAMES: readonly string[] = TOKENS.map((t) => t.name);

const id = (name: string, type: TokenType, description: string, fallback: string, extra: Partial<TokenSpec> = {}): TokenSpec => ({ name, type, group: "identity", description, fallback, since: "1.1", ...extra });
const dv = (name: string, type: TokenType, description: string, fallback: string): TokenSpec => ({ name, type, group: "derived", description, fallback, since: "1.1" });

/** Motion feels (tokens 1.2): how an identity moves. Painted as html[data-nk-feel]. */
export const MOTION_FEELS = ["crisp", "snap", "smooth", "stepped"] as const;
export type MotionFeel = (typeof MOTION_FEELS)[number];
/** The four spring presets (docs/tokens.md#motion), run by nuikit-core/motion as sampled WAAPI keyframes. */
export const SPRING_PRESETS = ["snap", "move", "soft", "pop"] as const;
export type SpringPresetName = (typeof SPRING_PRESETS)[number];

const mt = (name: string, type: TokenType, description: string, fallback: string): TokenSpec => ({ name, type, group: "derived", description, fallback, since: "1.2" });

/**
 * Motion tokens (tokens 1.2, docs/archive/design-research/motion.md §2.2). Two identity inputs; everything else is
 * derived from --nk-duration (d), --nk-ease, the feel and the bounce. The compiler writes literal values (no
 * calc() on <time> inside animation shorthands in Chromium 103), and the player's prefs clamp them
 * (withPrefs): off = 0ms; reduced = at most 100ms and no movement (--nk-motion-move: 0).
 */
export const MOTION_TOKENS: readonly TokenSpec[] = [
  { name: "nk-motion-feel", type: "keyword", group: "identity", description: "How the identity moves: crisp (Graphite), snap (Signal: no glide on selection, flash instead of press scale), smooth (Velvet: longer springs, a hint of bounce), stepped (Vector: values tick in steps)", fallback: "crisp", values: MOTION_FEELS, since: "1.2" },
  { name: "nk-spring-bounce", type: "number", group: "identity", description: "Bounce folded into the snap, move and soft springs (0 = critically damped; 0.3 is the most the kit allows)", fallback: "0", range: [0, 0.3], since: "1.2" },
  mt("nk-motion-move", "number", "1 = things may move (translate, scale, rotate, FLIP, stagger); 0 under reduced motion or off, where only fades of at most 100ms are kept", "1"),
  mt("nk-time-instant", "duration", "State that must be immediate: keyboard and controller selection, held key-repeat", "0ms"),
  { ...mt("nk-time-snap", "duration", "The ladder (1.5): snap, 0.5 × d. A press, a rim switching state", "70ms"), since: "1.5" },
  { ...mt("nk-time-fast", "duration", "The ladder (1.5): fast, 0.667 × d. Hover, a deny beat", "93ms"), since: "1.5" },
  { ...mt("nk-time-slow", "duration", "The ladder (1.5): slow, 1.556 × d. A sheet or dialog opening, a confirm pop", "218ms"), since: "1.5" },
  mt("nk-time-press", "duration", "Press, toggle, key-chip flash: 0.5 × d, 50–100ms", "70ms"),
  mt("nk-time-hover", "duration", "Pointer hover colour and row background: 0.75 × d", "105ms"),
  mt("nk-time-base", "duration", "Panel and menu enter, the selection indicator, tab switch: d (kit.css --nk-time)", "140ms"),
  mt("nk-time-exit", "duration", "Every exit (panel, toast, menu, modal): 0.7 × d", "98ms"),
  mt("nk-time-move", "duration", "Toasts entering, FLIP moves, meters gaining: 1.5 × d, at most 300ms", "210ms"),
  mt("nk-time-modal", "duration", "Dialog enter (on an inner wrapper): 1.25 × d", "175ms"),
  mt("nk-time-screen", "duration", "Full-screen enter (pause, death, loading): 2.5 × d, at most 400ms", "350ms"),
  mt("nk-time-ambient", "duration", "HUD show-on-change fades and the damage trail; not scaled by the identity", "400ms"),
  mt("nk-stagger", "duration", "Delay per item on a list's first open: 0.15 × d (snap and smooth 0.125 × d), at most 20ms (smooth 30ms)", "20ms"),
  mt("nk-stagger-max", "duration", "Total stagger cap: items past the fifth enter together", "100ms"),
  mt("nk-ease-out", "cubicBezier", "Enter, hover, anything arriving: the identity's --nk-ease", "nk-ease"),
  mt("nk-ease-in", "cubicBezier", "Exits (speeds up as it leaves)", "cubic-bezier(0.4, 0, 1, 1)"),
  mt("nk-ease-in-out", "cubicBezier", "On-screen moves (indicator, FLIP, tab underline) when not a spring", "cubic-bezier(0.2, 0, 0, 1)"),
  mt("nk-ease-emphasized", "cubicBezier", "Full-screen enter, big moments", "cubic-bezier(0.05, 0.7, 0.1, 1)"),
  mt("nk-ease-linear", "keyword", "Progress, countdowns, streamed values, needles", "linear"),
  mt("nk-spring-snap", "keyword", "Spring (duration, bounce): selection indicator, tab underline, needle catch-up", "160ms 0"),
  mt("nk-spring-move", "keyword", "Spring (duration, bounce): toasts in, FLIP reflow, drawers, digit roll", "240ms 0.1"),
  mt("nk-spring-soft", "keyword", "Spring (duration, bounce): full-screen content, large frame changes", "360ms 0"),
  mt("nk-spring-pop", "keyword", "Spring (duration, bounce): rewards only (item added, level-up, a ×3 badge)", "260ms 0.3"),
];

/** Spring period per preset (snap, move, soft, pop) as a multiple of d, per feel (motion.md §2.4). */
const SPRING_RATIO: Record<MotionFeel, readonly [number, number, number, number]> = {
  crisp: [1.15, 1.7, 2.55, 1.85],
  snap: [1.1, 1.65, 2.5, 1.8],
  smooth: [1.08, 1.42, 1.75, 1.5],
  stepped: [1, 1.43, 2.15, 1.7],
};
/** Each preset's ceiling (ms). */
const SPRING_MAX = [400, 400, 450, 400] as const;
/** The slowest base duration the kit allows; the compiler warns above it (motion.md §2.4). */
export const MAX_DURATION_MS = 260;

/** The derived motion tokens for a base duration (ms), feel and bounce, as literals. Graphite is (140, crisp, 0). */
export function motionTokens(d: number, feel: MotionFeel = "crisp", bounce = 0, opts: { exitFactor?: number; ladder?: boolean } = {}): ThemeVars {
  const ms = (x: number) => `${Math.round(x)}ms`;
  const exit = opts.exitFactor !== undefined && Number.isFinite(opts.exitFactor) ? opts.exitFactor : 0.7;
  const b = Math.max(0, Math.min(0.3, bounce));
  const r = SPRING_RATIO[feel] ?? SPRING_RATIO.crisp;
  const bounces = [b, Math.max(0.1, b), b, Math.max(0.3, b)];
  const out: ThemeVars = {
    "nk-motion-move": "1",
    "nk-time-instant": "0ms",
    "nk-time-press": ms(Math.max(50, Math.min(100, d * 0.5))),
    "nk-time-hover": ms(d * 0.75),
    "nk-time-base": ms(d),
    "nk-time-exit": ms(d * exit),
    "nk-time-move": ms(Math.min(300, d * 1.5)),
    "nk-time-modal": ms(d * 1.25),
    "nk-time-screen": ms(Math.min(400, d * 2.5)),
    "nk-time-ambient": "400ms",
    "nk-stagger": ms(feel === "smooth" ? Math.min(30, d * 0.125) : Math.min(20, d * (feel === "snap" ? 0.125 : 0.15))),
    "nk-stagger-max": "100ms",
    // tokens 1.4: the extra rungs (foundation.md §9)
    "nk-time-confirm": ms(Math.max(60, d * 0.65)),
    "nk-time-retract": ms(Math.min(300, d * 1.55)),
    "nk-time-fill": ms(d * 3),
    "nk-time-pulse": "1000ms",
    // tokens 1.5: the ladder (default.md §2): snap .5, fast .667, base 1, slow 1.556, fill 2.333 × d
    "nk-time-snap": ms(d * 0.5),
    "nk-time-fast": ms(d * 0.667),
    "nk-time-slow": ms(d * 1.556),
  };
  // ladder (the tile treatment): the 1.2 rungs read the ladder, so one scale moves everything. Other
  // treatments keep the 1.2 formulas for one revision, so Graphite's look is unchanged.
  if (opts.ladder) {
    out["nk-time-fill"] = ms(d * 2.333);
    out["nk-time-press"] = out["nk-time-snap"]!;
    out["nk-time-hover"] = out["nk-time-fast"]!;
    for (const k of ["nk-time-move", "nk-time-modal", "nk-time-confirm", "nk-time-retract", "nk-time-screen"]) out[k] = out["nk-time-slow"]!;
    out["nk-time-ambient"] = out["nk-time-fill"]!;
  }
  SPRING_PRESETS.forEach((name, i) => {
    const t = Math.min(SPRING_MAX[i]!, Math.round((d * r[i]!) / 10) * 10);
    out[`nk-spring-${name}`] = `${t}ms ${Math.round(bounces[i]! * 1000) / 1000}`;
  });
  return out;
}

/** The time tokens the player's prefs clamp (the whole ladder except instant and the stagger cap). */
export const MOTION_TIME_TOKENS: readonly string[] = ["nk-time-press", "nk-time-hover", "nk-time-base", "nk-time-exit", "nk-time-move", "nk-time-modal", "nk-time-screen", "nk-time-ambient", "nk-stagger", "nk-time-confirm", "nk-time-retract", "nk-time-fill", "nk-time-pulse", "nk-time-snap", "nk-time-fast", "nk-time-slow"];
/** Under reduced motion fades are kept, but no longer than this (WCAG 2.3.3 counts opacity and colour changes as non-motion). A theme's --nk-time-reduced (1.5) replaces it. */
export const REDUCED_FADE_MS = 100;

// ─────────────────────────────────────────── tokens 1.4 (docs/design/foundation.md)

/** Treatments (1.4): how the palette is drawn. Each fills defaults under the theme's own values. */
export const TREATMENTS = ["soft", "glass", "plate", "slab", "tile"] as const;
export type Treatment = (typeof TREATMENTS)[number];

/**
 * What each treatment sets when the theme leaves a token out. `soft` is empty: it is today's defaults
 * (Graphite), so a plain TweakCN paste compiles exactly as before.
 */
export const TREATMENT_PRESETS: Record<Treatment, ThemeVars> = {
  soft: {},
  glass: {
    "nk-surface-edge": "0.12",
    "nk-surface-gradient": "0.06",
    "nk-elevation": "deep",
    "nk-focus-style": "halo",
    "nk-motion-feel": "smooth",
    "nk-material-hud-blur": "1.25rem",
    "nk-material-menu-blur": "2rem",
    "nk-material-overlay-blur": "0.5rem",
  },
  plate: {
    "nk-cut": "0.5rem",
    "nk-surface-edge": "0.1",
    "nk-label-case": "uppercase",
    "nk-tracking-label": "0.1em",
    "nk-row-indicator": "outline",
    "nk-focus-style": "bar",
    "nk-motion-feel": "stepped",
    "nk-material-menu-texture": "scanlines",
    "nk-material-hud-radius": "0px",
    "nk-material-menu-radius": "0px",
  },
  slab: {
    "nk-border-width": "2px",
    "nk-elevation": "hard",
    "nk-surface-opacity": "1",
    "nk-surface-tint": "0",
    "nk-surface-edge": "0",
    "nk-display-style": "italic",
    "nk-skew": "-8deg",
    "nk-weight-display": "900",
    "nk-motion-feel": "snap",
    "nk-row-indicator": "fill",
    "nk-focus-style": "fill",
    "nk-focus-shift": "0.25rem",
    "nk-hold-style": "fill",
    "nk-level-style": "slab",
    "nk-slash": "cut",
  },
  /**
   * tile (1.5, docs/design/default.md): Default's values, so Default is `tile` plus a palette. One slanted keycap language
   * on hard plates, fill-based status, italic caps for anything scanned, the 1.5 motion ladder.
   */
  tile: {
    "nk-density": "1",
    "nk-duration": "180ms",
    "nk-elevation": "hard",
    "nk-display-style": "italic",
    "nk-label-case": "uppercase",
    "nk-row-indicator": "sweep",
    "nk-hold-style": "fill",
    "nk-confirm-scale": "1.08",
    "nk-stagger": "40ms",
    "nk-surface-edge": "0",
    "nk-surface-gradient": "0",
    // scales
    "nk-r-key": "0.25rem",
    "nk-r-chip": "0.375rem",
    "nk-r-control": "0.5rem",
    "nk-r-surface": "0.75rem",
    "nk-h-key": "1.5rem",
    "nk-h-chip": "1.75rem",
    "nk-h-control": "2.25rem",
    "nk-h-row": "3rem",
    "nk-text-key": "0.8125rem",
    // baseline (1.6): the condensed face reads a step larger as a row title
    "nk-row-title-size": "1.125rem",
    // type roles: Barlow italic caps (font-display) for anything scanned, the sans for sentences
    ...Object.fromEntries(
      (["scan", "title", "label", "num"] as const).flatMap((r) => [
        [`nk-type-${r}-family`, "var(--font-display)"],
        [`nk-type-${r}-style`, "italic"],
        [`nk-type-${r}-weight`, r === "scan" || r === "title" ? "800" : "700"],
        [`nk-type-${r}-tracking`, r === "label" ? "0.03em" : r === "num" ? "0.01em" : "0.02em"],
        [`nk-type-${r}-case`, r === "num" ? "none" : "uppercase"],
        [`nk-type-${r}-pad`, "0.15em"],
      ]),
    ),
    // tile
    "nk-tile-face": "rgb(22, 22, 22)",
    "nk-tile-ink": "rgb(255, 255, 255)",
    "nk-tile-light": "rgba(255, 255, 255, 0.16)",
    "nk-tile-shade": "rgba(0, 0, 0, 0)",
    "nk-tile-rim": "rgba(255, 255, 255, 0.32)",
    "nk-tile-rim-focus": "rgba(255, 255, 255, 0.4)",
    "nk-tile-plate": "rgb(115, 115, 115)",
    "nk-tile-plate-dim": "rgb(38, 38, 38)",
    "nk-tile-plate-x": "2px",
    "nk-tile-plate-y": "2px",
    "nk-tile-press": "1px",
    "nk-tile-skew": "-12deg",
    "nk-tile-active": "var(--nk-accent-gradient)",
    // plate (surface recipe)
    "nk-plate": "rgb(10, 10, 10)",
    "nk-plate-hair": "rgba(255, 255, 255, 0.12)",
    "nk-plate-drop": "0 0.125rem 0 rgba(0, 0, 0, 0.6)",
    // fill
    "nk-fill-color": "var(--foreground)",
    "nk-fill-track": "rgba(255, 255, 255, 0.12)",
    "nk-fill-tint": "rgba(255, 255, 255, 0.12)",
    "nk-fill-edge": "rgba(255, 255, 255, 0.4)",
    // motion distances
    "nk-lift": "0.5rem",
    "nk-rise": "0.5rem",
    "nk-land-scale": "0.6",
    "nk-deny-x": "0.3125rem",
  },
};

/** Role sets (1.4): a frame sets `data-hue="<role>"`, its children read the --hue-* ramp. */
export const ROLE_SETS = {
  vitals: ["health", "armor", "hunger", "thirst", "stress", "stamina", "oxygen"],
  status: ["info", "success", "warning", "danger"],
  faction: ["police", "ems", "mech", "gang", "civ", "staff"],
  rarity: ["common", "uncommon", "rare", "epic", "legendary"],
  brand: ["brand"],
  neutral: ["neutral"],
} as const;
export const ROLES: readonly string[] = Object.values(ROLE_SETS).flat();

/**
 * Where each role's colour comes from when the theme doesn't set --role-<name>: another token (vitals keep
 * today's vital colours; stamina and oxygen alias their status), or a fixed OKLCH (factions, rarity).
 */
const ROLE_DEFAULTS: Record<string, string | readonly [number, number, number]> = {
  health: "vital-health",
  armor: "vital-armor",
  hunger: "vital-hunger",
  thirst: "vital-thirst",
  stress: "vital-stress",
  stamina: "success",
  oxygen: "info",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "destructive",
  police: [0.62, 0.17, 255],
  ems: [0.64, 0.2, 25],
  mech: [0.74, 0.15, 60],
  gang: [0.6, 0.2, 305],
  civ: "muted-foreground",
  staff: "brand",
  common: "muted-foreground",
  uncommon: [0.72, 0.17, 145],
  rare: [0.66, 0.16, 250],
  epic: [0.62, 0.22, 305],
  legendary: [0.78, 0.16, 75],
  brand: "brand",
  neutral: "muted-foreground",
};

const f14 = (name: string, type: TokenType, description: string, fallback: string, extra: Partial<TokenSpec> = {}): TokenSpec => ({ name, type, group: "identity", description, fallback, since: "1.4", ...extra });
const d14 = (name: string, type: TokenType, description: string, fallback: string): TokenSpec => ({ name, type, group: "derived", description, fallback, since: "1.4" });
const MATERIAL_CONTEXTS = { hud: "HUD parts drawn over the game", menu: "menus, sheets and dialogs", overlay: "full-screen overlays (pause, death, loading)" } as const;
const MS: [number, number] = [0, 60000];

/** Tokens 1.4: treatment, states, roles, materials, legibility, behaviour, motion steps, layers, offsets, attention. */
export const FOUNDATION_TOKENS: readonly TokenSpec[] = [
  f14("nk-treatment", "keyword", "How the palette is drawn: soft (Graphite), glass, plate or slab. Fills material, stroke, type, focus and motion defaults; any value the theme sets wins", "soft", { values: TREATMENTS }),
  f14("nk-focus-style", "keyword", "Every component's focus (controller and keyboard highlight)", "ring", { values: ["ring", "halo", "tint", "fill", "invert", "bar"] }),
  f14("nk-hold-style", "keyword", "How a press-and-hold shows its progress", "bar", { values: ["bar", "ring", "fill"] }),
  f14("nk-confirm-scale", "number", "The short pop of a confirm", "1.04", { range: [1, 1.2] }),
  f14("nk-level-style", "keyword", "How a level (--level, 0–1) is drawn by meters, vitals, holds, timers and cooldowns", "bar", { values: ["bar", "ring", "liquid", "slab", "pips"] }),
  ...ROLES.map((r) => f14(`role-${r}`, "color", `Role colour ${r}: the --hue-* ramp under data-hue="${r}"`, typeof ROLE_DEFAULTS[r] === "string" ? String(ROLE_DEFAULTS[r]) : `oklch(${(ROLE_DEFAULTS[r] as readonly number[]).join(" ")})`)),
  ...ROLES.flatMap((r) => [
    d14(`role-${r}-deep`, "color", `${r}, darker: the ramp's deep step and gradient end`, `role-${r}, OKLCH lightness − 0.12`),
    d14(`role-${r}-light`, "color", `${r}, lighter: the ramp's gradient start`, `role-${r}, OKLCH lightness + 0.1`),
  ]),
  f14("nk-hue-line", "number", "Alpha of a role's line (borders, tracks)", "0.5", { range: [0, 1] }),
  f14("nk-hue-tint", "number", "Alpha of a role's tint (fills behind text)", "0.14", { range: [0, 1] }),
  f14("nk-hue-glow", "number", "Alpha of a role's glow (under the glow budget)", "0.45", { range: [0, 1] }),
  f14("nk-hue-alert", "number", "Alpha of a role's alert wash (below the alert threshold)", "0.24", { range: [0, 1] }),
  ...Object.entries(MATERIAL_CONTEXTS).flatMap(([ctx, what]) => [
    f14(`nk-material-${ctx}-opacity`, "number", `Surface opacity of ${what}`, ctx === "hud" ? "nk-hud-opacity" : "nk-surface-opacity", { range: [0, 1] }),
    f14(`nk-material-${ctx}-blur`, "dimension", `Backdrop blur behind ${what}`, "0px"),
    f14(`nk-material-${ctx}-radius`, "dimension", `Corner radius of ${what}`, "radius"),
    f14(`nk-material-${ctx}-edge`, "number", `Inner top highlight of ${what} (alpha)`, "nk-surface-edge", { range: [0, 0.3] }),
    f14(`nk-material-${ctx}-texture`, "keyword", `Texture over ${what}`, "none", { values: ["none", "scanlines"] }),
  ]),
  f14("nk-backdrop", "keyword", "Backdrop filters (blur behind materials, the death screen's desaturation): off by default, because FiveM's NUI draws backdrop-filter as a black box over the game; on applies each surface's --nk-backdrop-filter (browser previews, clients that draw it right)", "off", { values: ["on", "off"] }),
  f14("nk-slash", "keyword", "A decorative diagonal cut on menus, at most once per full-screen moment", "none", { values: ["none", "cut"] }),
  f14("nk-legibility", "keyword", "night: as designed. day: surfaces and hairlines lifted for a bright sky (not a light theme). auto: day while the game clock says so (html[data-nk-daytime], set by the HUD)", "auto", { values: ["auto", "night", "day"] }),
  f14("nk-legibility-lift", "number", "How far day closes the gap to opaque (0 none, 1 fully opaque)", "0.5", { range: [0, 1] }),
  f14("nk-alert-threshold", "number", "A level at or under this is an alert (vitals, durability)", "0.2", { range: [0, 1] }),
  f14("nk-fuel-threshold", "number", "Fuel alert level", "0.15", { range: [0, 1] }),
  ...["info", "success", "warning", "danger"].map((s) => f14(`nk-notify-ms-${s}`, "duration", `How long a ${s} notice stays`, "5000ms", { range: MS })),
  f14("nk-hold-ms", "duration", "Press-and-hold time", "800ms", { range: MS }),
  f14("nk-cooldown-ms", "duration", "Default cooldown after an action", "0ms", { range: MS }),
  f14("nk-rest-delay", "duration", "How long an idle HUD part waits before it retracts (0 = never)", "0ms", { range: MS }),
  f14("nk-motion-profile", "keyword", "full: as designed. reduced: no movement, short fades. instant: nothing animates", "full", { values: ["full", "reduced", "instant"] }),
  d14("nk-ease-standard", "cubicBezier", "On-screen moves", "nk-ease-in-out"),
  d14("nk-ease-expand", "cubicBezier", "Things opening and growing", "nk-ease-emphasized"),
  d14("nk-ease-retract", "cubicBezier", "Things closing and tucking away", "nk-ease-in"),
  d14("nk-ease-spring", "cubicBezier", "An overshoot without a spring (confirm pops)", "cubic-bezier(0.34, 1.56, 0.64, 1)"),
  d14("nk-ease-breathe", "cubicBezier", "Loops (alerts, pulses)", "cubic-bezier(0.37, 0, 0.63, 1)"),
  d14("nk-time-confirm", "duration", "A confirm pop: 0.65 × d, at least 60ms", "91ms"),
  d14("nk-time-retract", "duration", "A HUD part tucking away: 1.55 × d, at most 300ms", "217ms"),
  d14("nk-time-fill", "duration", "A level filling or draining: 3 × d", "420ms"),
  d14("nk-time-pulse", "duration", "One alert pulse", "1000ms"),
  ...(["world", "hud", "scrim", "surface", "dim", "dialog", "system"] as const).map((l, i) => f14(`nk-z-${l}`, "number", `Stacking layer: ${l}. A modal is the current surface + dim + dialog`, String((i + 1) * 10), { range: [0, 100000] })),
  f14("nk-focus-shift", "dimension", "The focused row's nudge toward its content", "0rem"),
  f14("nk-glow-budget", "number", "How many elements may glow at once (the top surface's focused one first); 0 = no limit", "1", { range: [0, 8] }),
];

/**
 * Identity tokens (tokens 1.1, docs/archive/design-v2.md): what makes a UI recognisable besides colour. A server
 * sets a handful in theme.css; everything left out is derived, so a plain TweakCN paste is Graphite.
 */
export const IDENTITY_TOKENS: readonly TokenSpec[] = [
  id("brand", "color", "The server's signature colour: active indicators, gauge needles, focus, logos (not the action: that's primary)", "primary if chromatic (OKLCH C ≥ 0.06), else chart-1"),
  id("brand-foreground", "color", "Text on brand", "foreground or background, whichever contrasts more"),
  id("world-foreground", "color", "Text and icons drawn straight on the game, no panel (death text, unplated HUD values, nk-on-game). Light in every theme, light or dark", "rgb(255, 255, 255)"),
  id("world-foreground-muted", "color", "Secondary text on the game", "world-foreground at 80% (3:1 on a mid-grey frame)"),
  id("world-shadow", "shadow", "Text-shadow that keeps world-foreground legible over any frame", "0 1px 2px rgba(0, 0, 0, 0.65), 0 0 0.5rem rgba(0, 0, 0, 0.35)"),
  id("world-success", "color", "A gain drawn on the game or the HUD plate (slab deltas: +2, $250). Reads on the dark plate in every theme, light or dark", "success, OKLCH lightness at least 0.7", { since: "1.3" }),
  id("world-destructive", "color", "A loss drawn on the game or the HUD plate (slab deltas: −1)", "destructive, OKLCH lightness at least 0.7", { since: "1.3" }),
  id("font-display", "fontFamily", "Headings and big moments (titles, timers, the balance)", "font-sans; Inter Tight when font-sans is the default Inter"),
  id("font-numeric", "fontFamily", "Every number on a gauge, money or timer (always tabular)", "font-sans"),
  id("nk-type-ratio", "number", "Step between type sizes: 1.125 calm … 1.333 dramatic", "1.2", { range: [1, 1.6] }),
  id("nk-weight-body", "number", "Body text weight", "400", { range: [100, 900] }),
  id("nk-weight-strong", "number", "Titles, key numbers, active rows", "600", { range: [100, 900] }),
  id("nk-weight-display", "number", "Display type (full-screen titles, big numbers)", "700", { range: [100, 900] }),
  id("nk-tracking-display", "dimension", "Letter-spacing of display type", "-0.02em"),
  id("nk-label-case", "keyword", "Captions (the short names of values) in uppercase or as written", "uppercase", { values: ["none", "uppercase"] }),
  id("nk-tracking-label", "dimension", "Letter-spacing of captions (uppercase wants 0.06–0.12em)", "0.06em"),
  id("nk-border-width", "dimension", "Hairline weight of panels, rows and fields", "1px"),
  id("nk-cut", "dimension", "Chamfered corners (top left, bottom right), drawn with clip-path; 0 = off", "0px"),
  id("nk-display-style", "keyword", "Display, heading, title and numeric text upright or italic (a real italic face where the font has one)", "normal", { values: ["normal", "italic"], since: "1.3" }),
  id("nk-pause-style", "keyword", "The pause menu: a full-height sheet, or a light slash panel with a diagonal edge into the scene", "sheet", { values: ["sheet", "slash"], since: "1.3" }),
  id("nk-pause-surface", "color", "The slash pause panel's light surface", "rgb(246, 247, 249)", { since: "1.3" }),
  id("nk-pause-ink", "color", "Text on the slash pause panel", "rgb(14, 16, 20)", { since: "1.3" }),
  id("nk-skew", "dimension", "Badges, chips, key caps, tags and the primary / selected bar drawn skewed (their text stays upright); 0deg = off, at most ±20deg", "0deg", { since: "1.3" }),
  id("nk-surface-opacity", "number", "Panel opacity over the game (floor 0.92 for text panels)", "0.96", { range: [0, 1] }),
  id("nk-surface-tint", "number", "How much brand tints neutral surfaces (0–0.12)", "0.02", { range: [0, 0.12] }),
  id("nk-surface-gradient", "number", "Top-to-bottom light falloff on panels (0 = flat)", "0", { range: [0, 0.2] }),
  id("nk-surface-edge", "number", "Inner top highlight, the machined edge (alpha)", "0.06", { range: [0, 0.3] }),
  id("nk-elevation", "keyword", "Shadow recipe of floating panels: none, soft, deep, or hard (a solid offset drop, no blur; tokens 1.3)", "soft", { values: ["none", "soft", "deep", "hard"] }),
  id("nk-glow", "number", "Brand glow on active parts and HUD fills (alpha, 0 = off)", "0", { range: [0, 1] }),
  id("nk-density", "number", "Multiplies the kit's spacing scale: 0.875 compact (Graphite) … 1.15 roomy", "0.875", { range: [0.75, 1.3] }),
  id("nk-ease", "cubicBezier", "The one easing curve", "cubic-bezier(0.2, 0.8, 0.2, 1)"),
  id("nk-duration", "duration", "Base duration (panel enter, transitions); × nk-motion", "140ms"),
  id("nk-hud-opacity", "number", "Minimum backplate opacity of HUD chips and tiles", "0.55", { range: [0, 1] }),
  id("nk-hud-text-shadow", "keyword", "Shadow under text drawn on the game", "soft", { values: ["none", "soft", "strong"] }),
  id("nk-gauge-style", "keyword", "How gauges are drawn", "arc", { values: ["arc", "bar", "digital"] }),
  id("nk-gauge-track", "dimension", "Gauge and meter track thickness", "0.25rem"),
  id("nk-gauge-ticks", "number", "Tick marks on gauges: 1 on, 0 off", "1", { range: [0, 1] }),
  id("nk-row-indicator", "keyword", "How the active row is marked: bar, fill, outline, or sweep (1.5: no bar, the row's --nk-fill-tint sweep alone)", "bar", { values: ["bar", "fill", "outline", "sweep"] }),
  dv("surface", "color", "Floating panel surface: popover tinted by brand (× nk-surface-tint); drawn at nk-surface-opacity", "mix(popover, brand, nk-surface-tint)"),
  dv("nk-elevation-shadow", "shadow", "The box-shadow nk-elevation names, in scrim colour", "from nk-elevation"),
  dv("nk-hud-shadow", "shadow", "The text-shadow nk-hud-text-shadow names, in scrim colour", "from nk-hud-text-shadow"),
  dv("nk-row-bar", "number", "1 when nk-row-indicator is bar", "from nk-row-indicator"),
  dv("nk-row-fill", "number", "1 when nk-row-indicator is fill", "from nk-row-indicator"),
  dv("nk-row-outline", "number", "1 when nk-row-indicator is outline", "from nk-row-indicator"),
  dv("nk-clip", "keyword", "clip-path of panels: the nk-cut chamfer, or none when nk-cut is 0 (a clip-path would also clip the shadow)", "from nk-cut"),
  dv("nk-clip-sm", "keyword", "clip-path of chips, tiles and buttons: half the panel chamfer", "from nk-cut"),
  ...MOTION_TOKENS,
  ...FOUNDATION_TOKENS,
  // tokens 1.5: the motion inputs the compiler needs (the rest of 1.5 is KIT_TOKENS, kit.css defaults)
  { ...id("nk-exit-factor", "number", "Every exit is this × its enter (--nk-time-exit = base × factor)", "0.7", { range: [0.3, 1] }), since: "1.5" },
  { ...id("nk-time-reduced", "duration", "The one reduced-motion duration: under reduced motion every fade is at most this", "100ms", { range: [0, 400] }), since: "1.5" },
];

// ─────────────────────────────────────────── tokens 1.5 (docs/design/default.md §2): the Default theme levers

const k15 = (name: string, type: TokenType, description: string, fallback: string, extra: Partial<TokenSpec> = {}): TokenSpec => ({ name, type, group: "identity", description, fallback, since: "1.5", css: true, ...extra });

/** Spacing, radius, height and icon scales. Defaults are today's Graphite proportions (kit.css). */
export const SCALE_TOKENS: readonly TokenSpec[] = [
  k15("nk-space-unit", "dimension", "The spacing step: 0.25rem × --nk-density (aliases --nk-space)", "calc(0.25rem * nk-density)"),
  ...[1, 2, 3, 4, 6, 8].map((n) => k15(`nk-space-${n}`, "dimension", `${n} × the spacing step`, `${n} × nk-space-unit`)),
  k15("nk-gap-cluster", "dimension", "Icon + text, key + label", "nk-space-2"),
  k15("nk-gap-items", "dimension", "Items in a bar", "nk-space-1"),
  k15("nk-pad-x", "dimension", "Inline padding of anything labelled", "nk-space-3"),
  k15("nk-pad-surface", "dimension", "Padding of a surface (dialog body, sheet column)", "nk-space-6"),
  k15("nk-r-key", "dimension", "Radius of keys and tiles (aliased by --nk-key-radius)", "max(0.25rem, radius − 4px)"),
  k15("nk-r-chip", "dimension", "Radius of chips and badges (aliased by --nk-chip-radius)", "max(0.25rem, radius − 4px)"),
  k15("nk-r-control", "dimension", "Radius of buttons, fields and rows (aliased by --nk-row-radius)", "radius − 2px"),
  k15("nk-r-surface", "dimension", "Radius of panels, sheets and dialogs", "nk-material-menu-radius"),
  k15("nk-h-key", "dimension", "Height of a key / small tile", "1.25rem"),
  k15("nk-h-chip", "dimension", "Height of a chip / medium tile (aliased by --nk-chip-height)", "calc(2rem * nk-density)"),
  k15("nk-h-control", "dimension", "Height of buttons, fields and bar items / large tile", "2.25rem"),
  k15("nk-h-row", "dimension", "Height of a list row (aliased by --nk-row-height)", "calc(2.75rem * nk-density)"),
  k15("nk-icon-sm", "dimension", "Small icon", "0.75rem"),
  k15("nk-icon-md", "dimension", "Icon next to text (the default)", "1rem"),
  k15("nk-icon-lg", "dimension", "Large icon", "1.25rem"),
  k15("nk-icon-stroke", "number", "Icon stroke width", "2", { range: [0.5, 4] }),
];

/** The five type roles. A kit class (.nk-scan, .nk-title, .nk-label, .nk-num, .nk-body) applies one. */
export const TYPE_ROLES = ["scan", "title", "label", "num", "body"] as const;
const ROLE_WHAT: Record<(typeof TYPE_ROLES)[number], string> = { scan: "keys, buttons, tabs", title: "titles", label: "labels", num: "numbers", body: "sentences" };
export const TYPE_ROLE_TOKENS: readonly TokenSpec[] = [
  k15("nk-text-key", "dimension", "Size of the scan role (keys, buttons, tabs)", "0.8125rem"),
  k15("nk-text-body", "dimension", "Size of the body role", "nk-text-base"),
  ...TYPE_ROLES.flatMap((r) => [
    k15(`nk-type-${r}-family`, "fontFamily", `Font of the ${r} role (${ROLE_WHAT[r]})`, r === "body" ? "font-sans" : r === "scan" ? "nk-key-font" : r === "num" ? "font-numeric" : r === "title" ? "nk-heading-font" : "font-sans"),
    k15(`nk-type-${r}-style`, "keyword", `normal or italic, for the ${r} role`, r === "title" || r === "num" || r === "scan" ? "nk-display-style" : "normal", { values: ["normal", "italic"] }),
    k15(`nk-type-${r}-weight`, "number", `Weight of the ${r} role`, r === "scan" ? "nk-weight-strong" : r === "title" ? "nk-heading-weight" : r === "body" ? "nk-weight-body" : r === "label" ? "500" : "inherit", { range: [100, 900] }),
    k15(`nk-type-${r}-tracking`, "dimension", `Letter-spacing of the ${r} role`, r === "title" ? "nk-heading-tracking" : r === "num" ? "-0.02em" : "0em"),
    k15(`nk-type-${r}-case`, "keyword", `Case of the ${r} role`, r === "title" ? "nk-heading-case" : "none", { values: ["none", "uppercase"] }),
    k15(`nk-type-${r}-pad`, "dimension", `Trailing pad of the ${r} role (the italic overhang)`, "0em"),
  ]),
];

/** Tile / Keycap: one slanted key language (keys, notice icons, tab marks, checked boxes, telltales). */
export const TILE_TOKENS: readonly TokenSpec[] = [
  k15("nk-tile-face", "color", "The tile's face (aliased by --nk-key-bg)", "muted"),
  k15("nk-tile-ink", "color", "The legend on the face (aliased by --nk-key-fg)", "popover-foreground"),
  k15("nk-tile-light", "color", "The face's top hairline", "popover-foreground at 1.5 × nk-surface-edge"),
  k15("nk-tile-shade", "color", "The face's bottom inner shade", "scrim at 0.35"),
  k15("nk-tile-rim", "color", "The face's 1px rim (aliased by --nk-key-border)", "border"),
  k15("nk-tile-rim-focus", "color", "The rim while focused", "ring"),
  k15("nk-tile-plate", "color", "The solid plate behind the face", "border"),
  k15("nk-tile-plate-dim", "color", "The plate on the HUD", "nk-tile-plate"),
  k15("nk-tile-plate-x", "dimension", "How far the plate sits right of the face (0 = no plate)", "0px; 0.1875rem under --nk-skew"),
  k15("nk-tile-plate-y", "dimension", "How far the plate sits below the face", "0px; 0.1875rem under --nk-skew"),
  k15("nk-tile-press", "dimension", "How far a held tile presses toward its plate", "1px"),
  k15("nk-tile-skew", "dimension", "The face's slant (the box stays upright); at most ±20deg", "nk-skew"),
  k15("nk-tile-confirm-face", "color", "The face when confirmed or active", "foreground"),
  k15("nk-tile-confirm-ink", "color", "The legend when confirmed or active", "background"),
  k15("nk-tile-hold", "color", "The hold fill over the face", "foreground at 0.35"),
  k15("nk-tile-active", "image", "The face of an active tile (data-active: the mic while talking, N on the compass, a checked box); a colour or a gradient", "nk-tile-confirm-face; tile: nk-accent-gradient"),
  k15("nk-tile-tag-delay", "duration", "The tag opens this long after the tile lands", "80ms"),
];

/** Plate: the one surface recipe (sheets, dialogs, notices), hard drop, no blur. */
export const PLATE_TOKENS: readonly TokenSpec[] = [
  k15("nk-plate", "color", "The plate colour (its channels, --nk-plate-rgb, are drawn at the context's material opacity)", "surface"),
  k15("nk-plate-hair", "color", "The plate's hairline", "nk-panel-border"),
  k15("nk-plate-drop", "shadow", "The plate's drop: hard, no blur", "nk-panel-shadow"),
  k15("nk-plate-radius", "dimension", "The plate's radius", "nk-r-surface"),
];

/** Fill: status as a level filling left to right. --level (0–1) is set inline. */
export const FILL_TOKENS: readonly TokenSpec[] = [
  k15("nk-fill-color", "color", "The bar", "brand"),
  k15("nk-fill-track", "color", "The track behind the bar", "nk-meter-track"),
  k15("nk-fill-tint", "color", "The row sweep (a fill at level 1)", "accent"),
  k15("nk-fill-edge", "color", "The bar's leading 1px edge", "transparent"),
  k15("nk-fill-alert", "color", "The bar at or under the alert threshold", "destructive"),
];

/** Accent (1.5): the signature paint. A colour or a gradient for HTML layers, and its stops for SVG strokes
 *  (an SVG stroke can't take a CSS gradient). A flat brand by default, so a theme without one looks the same. */
export const ACCENT_TOKENS: readonly TokenSpec[] = [
  k15("nk-accent-gradient", "image", "The accent paint: an active tile's face, the speedometer's level, the compass N, the heading's accent", "brand"),
  k15("nk-accent-from", "color", "The accent's first stop (SVG strokes: the speedometer arc, the lubber mark)", "brand"),
  k15("nk-accent-via", "color", "The accent's middle stop", "nk-accent-from"),
  k15("nk-accent-to", "color", "The accent's last stop", "nk-accent-from"),
];

/** Motion distances (1.5): the ladder itself is in MOTION_TOKENS. */
export const MOTION_15_TOKENS: readonly TokenSpec[] = [
  k15("nk-lift", "dimension", "Row slide and slot lift on focus", "0rem"),
  k15("nk-rise", "dimension", "How far things rise as they enter", "0.5rem"),
  k15("nk-land-scale", "number", "The scale a tile lands from", "1", { range: [0, 1] }),
  k15("nk-deny-x", "dimension", "The deny shake's distance (two beats of fast)", "0.3125rem"),
];

/** Tokens components already read (vital-chip.tsx), moved into the contract (1.5). Unset = the component's default. */
export const HYGIENE_TOKENS: readonly TokenSpec[] = [
  k15("nk-chip-shape", "keyword", "Vital chip shape", "auto", { values: ["auto", "square", "rounded", "circle", "diamond", "hex", "chamfer"] }),
  k15("nk-label-attach", "keyword", "Where a chip's label sits", "inline", { values: ["inline", "tag", "flag", "none"] }),
  k15("nk-vital-icon", "keyword", "Vital icons: each vital's own, or one uniform glyph", "vital", { values: ["vital", "uniform"] }),
  k15("nk-vital-display", "keyword", "What a vital chip shows", "auto", { values: ["auto", "pill", "value", "icon", "expand"] }),
  k15("nk-vital-neighbours", "keyword", "What a growing chip does to its neighbours", "push", { values: ["push", "collapse", "overlay"] }),
];

/** Every 1.5 lever: kit.css holds the defaults; the compiler validates what a theme or treatment sets. */
export const KIT_TOKENS: readonly TokenSpec[] = [...SCALE_TOKENS, ...TYPE_ROLE_TOKENS, ...TILE_TOKENS, ...PLATE_TOKENS, ...FILL_TOKENS, ...ACCENT_TOKENS, ...MOTION_15_TOKENS, ...HYGIENE_TOKENS];

const k16 = (name: string, type: TokenType, description: string, fallback: string, extra: Partial<TokenSpec> = {}): TokenSpec => ({ name, type, group: "identity", description, fallback, since: "1.6", css: true, ...extra });

/**
 * The baseline (1.6, docs/design/baseline.md): what every component shares in every theme, read off the
 * speedometer and the minimap. Generous rows with an icon tile column and two voices, one selection language
 * (a marker, a fading tint and a lift), a single focus rim, keycap primaries and segmented rings. kit.css holds
 * each default (the same in every theme); a theme tunes a value, never a rule.
 */
export const BASELINE_TOKENS: readonly TokenSpec[] = [
  k16("nk-fill-style", "keyword", "How fills read: solid (flat, full, vivid: progress, meters, vital liquid, the selected row) or soft (translucent, a fading tint)", "solid", { values: ["solid", "soft"] }),
  k16("nk-row-pad-y", "dimension", "A list row's block padding", "nk-space-2"),
  k16("nk-row-pad-x", "dimension", "A list row's inline padding", "nk-space-3"),
  k16("nk-row-gap", "dimension", "Between a row's icon tile, its text and its trail", "nk-space-4"),
  k16("nk-row-lift", "dimension", "How far the selected row's content slides in", "nk-space-2"),
  k16("nk-row-title-size", "dimension", "A row title (the label voice)", "nk-text-base; tile: 1.125rem"),
  k16("nk-row-desc-size", "dimension", "A row description (the body voice)", "0.875rem"),
  k16("nk-row-icon-box", "dimension", "The icon tile beside a row title (the icon inside is --nk-icon-md)", "2rem"),
  k16("nk-row-marker-width", "dimension", "Retired in 1.7 (the selection is a Tile, SELECTION_TOKENS); read by nothing", "0.25rem"),
  k16("nk-row-tint-reach", "number", "Retired in 1.7 (the soft selection is a tinted Tile face, --nk-tile-tint); read by nothing", "0.7", { range: [0, 1] }),
  k16("nk-h-field", "dimension", "Height of text inputs, selects and dialog buttons", "2.75rem"),
  k16("nk-focus-rim", "color", "A text field's caret focus (and a checkbox's or switch's lit rim): a single 1px rim. Nothing else draws focus (1.7)", "ring"),
  k16("nk-button-wall", "dimension", "The primary keycap's wall (1.7: reads --nk-tile-wall)", "nk-tile-wall"),
  k16("nk-ring-segments", "number", "Segments in a progress ring (the speedometer's language)", "24", { range: [6, 60] }),
  k16("nk-ring-gap", "number", "Degrees between a progress ring's segments", "4", { range: [0, 12] }),
];

const k17 = (name: string, type: TokenType, description: string, fallback: string, extra: Partial<TokenSpec> = {}): TokenSpec => ({ name, type, group: "identity", description, fallback, since: "1.7", css: true, ...extra });

/**
 * Selection (1.7, docs/design/baseline.md "Selection"): no focus rings anywhere (focus renders the hover state), the
 * selection IS the primary keycap's Tile (one lever set, so Resume and a lit row are one object in two states), one
 * sliding tile per list, rows a list gap apart so a lit tile never touches its neighbour.
 */
export const SELECTION_TOKENS: readonly TokenSpec[] = [
  k17("nk-tile-wall", "dimension", "The keycap's wall: how far the face sits above its plate (the primary button and the selection tile)", "0.1875rem"),
  k17("nk-tile-wall-shade", "number", "How dark the wall is under its face (0–1, the scrim over the face colour)", "0.45", { range: [0, 1] }),
  k17("nk-tile-radius", "dimension", "The keycap's radius (the primary button and the selection tile)", "nk-r-control"),
  k17("nk-tile-key", "color", "The keycap face under --nk-fill-style: solid (the primary button, the lit row, the active tab)", "primary"),
  k17("nk-tile-key-ink", "color", "Text on the keycap face", "primary-foreground"),
  k17("nk-tile-key-rim", "color", "The keycap face's rim, --nk-border-width wide (the primary button and the selection tile); transparent = none", "transparent"),
  k17("nk-tile-tint", "number", "The face's opacity under --nk-fill-style: soft (a tinted tile, the foreground ink)", "0.16", { range: [0, 1] }),
  k17("nk-tile-inset", "dimension", "How far a selection tile sits in from its item's sides (room for the skew; never over a neighbour)", "0.375rem"),
  k17("nk-tile-lift", "dimension", "How far a keycap's face rises on hover and focus (0 = flat)", "1px"),
  k17("nk-tile-press-ratio", "number", "How far a pressed keycap sinks, as a fraction of its wall (1 = flush with the plate)", "0.67", { range: [0, 1.5] }),
  k17("nk-list-gap", "dimension", "Between the items of a list: the wall plus breathing room, so a lit tile never touches the next row", "calc(nk-tile-wall + nk-space-1)"),
];

/** The chamfer (top left and bottom right) as a clip-path of a cut size. */
export const chamferClip = (cut: string) =>
  `polygon(${cut} 0, 100% 0, 100% calc(100% - ${cut}), calc(100% - ${cut}) 100%, 0 100%, 0 ${cut})`;

/** Every token: v1 then the 1.1 identity tokens. */
export const ALL_TOKENS: readonly TokenSpec[] = [...TOKENS, ...IDENTITY_TOKENS, ...KIT_TOKENS, ...BASELINE_TOKENS, ...SELECTION_TOKENS];
export const ALL_TOKEN_NAMES: readonly string[] = ALL_TOKENS.map((t) => t.name);
const SPEC = new Map(ALL_TOKENS.map((t) => [t.name, t]));

/** Stock shadcn neutral (vendor/shadcn/colors/neutral.json): what missing shadcn tokens fall back to. */
export const NEUTRAL: Record<ThemeMode, ThemeVars> = {
  light: {
    background: "oklch(1 0 0)",
    foreground: "oklch(0.145 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.145 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0.145 0 0)",
    primary: "oklch(0.205 0 0)",
    "primary-foreground": "oklch(0.985 0 0)",
    secondary: "oklch(0.97 0 0)",
    "secondary-foreground": "oklch(0.205 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.556 0 0)",
    accent: "oklch(0.97 0 0)",
    "accent-foreground": "oklch(0.205 0 0)",
    destructive: "oklch(0.577 0.245 27.325)",
    border: "oklch(0.922 0 0)",
    input: "oklch(0.922 0 0)",
    ring: "oklch(0.708 0 0)",
    "chart-1": "oklch(0.87 0 0)",
    "chart-2": "oklch(0.556 0 0)",
    "chart-3": "oklch(0.439 0 0)",
    "chart-4": "oklch(0.371 0 0)",
    "chart-5": "oklch(0.269 0 0)",
    radius: "0.625rem",
  },
  dark: {
    background: "oklch(0.145 0 0)",
    foreground: "oklch(0.985 0 0)",
    card: "oklch(0.205 0 0)",
    "card-foreground": "oklch(0.985 0 0)",
    popover: "oklch(0.205 0 0)",
    "popover-foreground": "oklch(0.985 0 0)",
    primary: "oklch(0.922 0 0)",
    "primary-foreground": "oklch(0.205 0 0)",
    secondary: "oklch(0.269 0 0)",
    "secondary-foreground": "oklch(0.985 0 0)",
    muted: "oklch(0.269 0 0)",
    "muted-foreground": "oklch(0.708 0 0)",
    accent: "oklch(0.269 0 0)",
    "accent-foreground": "oklch(0.985 0 0)",
    destructive: "oklch(0.704 0.191 22.216)",
    border: "oklch(1 0 0 / 10%)",
    input: "oklch(1 0 0 / 15%)",
    ring: "oklch(0.556 0 0)",
    "chart-1": "oklch(0.87 0 0)",
    "chart-2": "oklch(0.556 0 0)",
    "chart-3": "oklch(0.439 0 0)",
    "chart-4": "oklch(0.371 0 0)",
    "chart-5": "oklch(0.269 0 0)",
  },
};

/** Vitals: preferred chart slot, accepted OKLCH hue ranges (degrees), fixed fallback (L, C, H). */
export const VITALS = [
  { name: "vital-health", chart: 1, hues: [[345, 360], [0, 35]], fallback: [0.68, 0.21, 25], theme: "destructive" },
  { name: "vital-armor", chart: 2, hues: [[200, 285]], fallback: [0.68, 0.16, 250] },
  { name: "vital-hunger", chart: 3, hues: [[40, 110]], fallback: [0.78, 0.16, 70] },
  { name: "vital-thirst", chart: 4, hues: [[180, 260]], fallback: [0.76, 0.13, 215] },
  { name: "vital-stress", chart: 5, hues: [[285, 345]], fallback: [0.68, 0.2, 320] },
] as const;

/** Contrast checks: foreground token, background token, minimum WCAG ratio, what it affects. */
export const CONTRAST_PAIRS: readonly [string, string, number, string][] = [
  ["foreground", "background", 4.5, "text on full-screen surfaces (pause, loading, death) will be hard to read"],
  ["popover-foreground", "popover", 4.5, "text in panels will be hard to read"],
  ["card-foreground", "card", 4.5, "text on cards will be hard to read"],
  ["primary-foreground", "primary", 4.5, "text on buttons will be hard to read"],
  ["muted-foreground", "popover", 3, "secondary text in panels will be hard to read"],
  ["hud-foreground", "hud", 3, "HUD text will be hard to read over a bright sky"],
  ["destructive", "popover", 3, "errors and low values in panels won't stand out"],
  ["success-foreground", "success", 3, "text on success badges will be hard to read"],
  ["warning-foreground", "warning", 3, "text on warning badges will be hard to read"],
];

// ─────────────────────────────────────────── public types

export interface CompileOptions {
  /** Which set to use. Default "dark": nuikit UIs are drawn over the game. */
  mode?: ThemeMode;
  /**
   * Only lower the tokens given, without filling or deriving the rest (a patch, e.g.
   * applyTheme({ primary: "#22c55e" }) on top of an existing theme). Default false.
   */
  partial?: boolean;
  /** Player preference: push text and borders to maximum contrast. */
  highContrast?: boolean;
}

export interface ContrastResult {
  fg: string;
  bg: string;
  ratio: number;
  min: number;
  ok: boolean;
}

export interface CompiledTheme {
  /** Token contract version (1). */
  version: typeof TOKENS_VERSION;
  /** Contract revision ("1.1": identity tokens). Absent from themes compiled by nuikit-core ≤ 0.6. */
  revision?: string;
  /** The set that was used ("light" when a paste has no dark colours). */
  mode: ThemeMode;
  /** Token → value any Chromium reads (colours as rgb()/rgba()). Names have no leading `--`. */
  vars: ThemeVars;
  /** Font stylesheet URLs from @import lines. */
  imports: string[];
  /** Human-readable problems: low contrast, missing dark set, values FiveM can't read. */
  warnings: string[];
  /** Every contrast check that ran. */
  contrast: ContrastResult[];
  /** Short hash of vars + imports, for change detection. */
  hash: string;
}

export type ThemeInput = string | ThemeVars | CompiledTheme | DtcgDocument;
export type DtcgDocument = { [key: string]: unknown };

// ─────────────────────────────────────────── parsing

interface Parsed {
  light: ThemeVars;
  dark: ThemeVars;
  /** Literal values from @theme blocks (lowest priority). */
  theme: ThemeVars;
  imports: string[];
}

/** `@import url("…")` / `@import "…"` statements; quoted URLs may contain `;` (Google Fonts weights). */
const IMPORT_RE = /@import\s+(?:url\(\s*(["'])(.*?)\1\s*\)|url\(\s*([^)\s]+)\s*\)|(["'])(.*?)\4)[^;]*;/g;

/** The http(s) URLs of a theme's @import lines. */
export function importUrls(css: string): string[] {
  const urls: string[] = [];
  for (const m of css.matchAll(IMPORT_RE)) {
    const url = (m[2] ?? m[3] ?? m[5] ?? "").trim();
    if (/^https?:\/\//.test(url)) urls.push(url);
  }
  return urls;
}

/** Parse a pasted shadcn / TweakCN theme: :root, .dark, @theme inline, @media (prefers-color-scheme), @import. */
export function parseThemeCss(css: string): Parsed {
  const out: Parsed = { light: {}, dark: {}, theme: {}, imports: [] };
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  out.imports = importUrls(src);
  const body = src.replace(IMPORT_RE, "");

  const stack: string[] = [];
  let seg = "";
  const target = (): ThemeVars | null => {
    if (stack.length === 0) return out.light; // bare declarations
    if (stack.some((s) => /^@theme\b/.test(s))) return out.theme;
    if (stack.some((s) => /\.dark\b|\[data-theme=["']?dark|\[data-mode=["']?dark|prefers-color-scheme:\s*dark/.test(s))) return out.dark;
    const last = stack[stack.length - 1]!;
    if (/(^|[\s,])(:root|:host|html)\b/.test(last)) return out.light;
    return null;
  };
  const decl = (text: string) => {
    const m = /^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(text);
    if (!m) return;
    const into = target();
    if (!into) return;
    const value = m[2]!.replace(/\s*!important$/, "").trim();
    // @theme inline mostly maps Tailwind names onto the vars (--color-primary: var(--primary)):
    // only its literal values count, and --color-x is token x.
    if (into === out.theme) {
      if (/var\(/.test(value)) return;
      into[m[1]!.replace(/^color-/, "")] = value;
      return;
    }
    into[m[1]!] = value;
  };
  let paren = 0;
  for (const ch of body) {
    if (ch === "(") paren++;
    else if (ch === ")") paren = Math.max(0, paren - 1);
    if (paren > 0) {
      seg += ch;
      continue;
    }
    if (ch === "{") {
      stack.push(seg.trim());
      seg = "";
    } else if (ch === "}") {
      decl(seg);
      seg = "";
      stack.pop();
    } else if (ch === ";") {
      decl(seg);
      seg = "";
    } else seg += ch;
  }
  decl(seg);
  return out;
}

/** Compat: the { light, dark } variable maps of a pasted theme. */
export function parseTheme(css: string): { light: ThemeVars; dark: ThemeVars } {
  const p = parseThemeCss(css);
  return { light: p.light, dark: p.dark };
}

/** Is this object a DTCG token document (has $value somewhere in its first levels)? */
function isDtcg(o: Record<string, unknown>): boolean {
  if (Object.keys(o).some((k) => k.startsWith("$"))) return true;
  return Object.values(o).some((v) => v !== null && typeof v === "object" && ("$value" in (v as object) || Object.values(v as object).some((x) => x !== null && typeof x === "object" && "$value" in (x as object))));
}

function isCompiled(o: unknown): o is CompiledTheme {
  return !!o && typeof o === "object" && typeof (o as CompiledTheme).version === "number" && !!(o as CompiledTheme).vars && typeof (o as CompiledTheme).vars === "object";
}

/** Read a DTCG 2025.10 document into token vars. Groups map to names: color.primary → primary, font.sans → font-sans, nk.scale → nk-scale. */
export function parseDtcg(doc: DtcgDocument): ThemeVars {
  const flat = new Map<string, { value: unknown; type?: string }>();
  const walk = (node: Record<string, unknown>, path: string[], type?: string) => {
    const t = typeof node.$type === "string" ? node.$type : type;
    if ("$value" in node) {
      flat.set(path.join("."), { value: node.$value, type: t });
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("$") || !v || typeof v !== "object") continue;
      walk(v as Record<string, unknown>, [...path, k], t);
    }
  };
  walk(doc as Record<string, unknown>, []);

  const resolve = (value: unknown, depth = 0): unknown => {
    if (typeof value === "string") {
      const ref = /^\{([^}]+)\}$/.exec(value);
      if (ref && depth < 10) return resolve(flat.get(ref[1]!)?.value, depth + 1);
    }
    return value;
  };
  const vars: ThemeVars = {};
  for (const [path, { value, type }] of flat) {
    const parts = path.split(".");
    if (parts[0] === "color" || parts[0] === "colors" || parts[0] === "dimension") parts.shift();
    const name = parts.join("-");
    const v = dtcgValue(resolve(value), type);
    if (name && v !== null) vars[name] = v;
  }
  return vars;
}

function dtcgValue(value: unknown, type?: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value) && type === "cubicBezier" && value.length === 4) return `cubic-bezier(${value.join(", ")})`;
  if (Array.isArray(value)) return value.map((f) => (/[\s"']/.test(String(f)) && !/^["']/.test(String(f)) ? `"${f}"` : String(f))).join(", ");
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("colorSpace" in o || "components" in o || "hex" in o || type === "color") {
      const alpha = typeof o.alpha === "number" ? o.alpha : 1;
      const comps = Array.isArray(o.components) ? (o.components as unknown[]) : null;
      const space = String(o.colorSpace ?? "srgb");
      if (comps && comps.every((x) => typeof x === "number" || x === "none")) {
        const num = comps.map((x) => (x === "none" ? 0 : (x as number)));
        if (space === "srgb") return formatRgba([...num.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255)), alpha] as RGBA);
        if (space === "oklch") return formatRgba([...oklchToRgb(num[0]!, num[1]!, num[2]!).map((x) => Math.round(Math.max(0, Math.min(255, x)))), alpha] as RGBA);
        if (space === "hsl") return `hsl(${num[0]} ${num[1]}% ${num[2]}% / ${alpha})`;
      }
      if (typeof o.hex === "string") return o.hex;
      return null;
    }
    if ("value" in o && "unit" in o) return `${o.value}${o.unit}`;
  }
  return null;
}

// ─────────────────────────────────────────── compile

/**
 * Compile any theme into the token contract: parse, pick the dark set, resolve var() references,
 * lower every colour to rgb()/rgba(), fill missing shadcn tokens from stock neutral, derive the
 * nuikit tokens, and check contrast.
 */
export function compileTheme(input: ThemeInput, opts: CompileOptions = {}): CompiledTheme {
  const warnings: string[] = [];
  const requested: ThemeMode = opts.mode ?? "dark";
  let mode: ThemeMode = requested;
  let raw: ThemeVars = {};
  let imports: string[] = [];

  if (typeof input === "string" && /^\s*\{/.test(input)) {
    try {
      input = JSON.parse(input) as DtcgDocument;
    } catch {
      warnings.push("The theme looks like JSON but doesn't parse; it was read as CSS.");
    }
  }

  if (typeof input === "string") {
    const p = parseThemeCss(input);
    imports = p.imports;
    const hasDark = Object.keys(p.dark).length > 0;
    const hasLight = Object.keys(p.light).length > 0;
    if (requested === "dark" && !hasDark && hasLight && !opts.partial) {
      mode = "light";
      warnings.push("The theme has no dark colours (.dark block), so its light colours are used in game. Paste the full TweakCN export, including .dark.");
    }
    raw = mode === "dark" ? { ...p.theme, ...p.light, ...p.dark } : { ...p.theme, ...p.light };
    if (!hasDark && !hasLight && Object.keys(p.theme).length === 0 && !opts.partial) warnings.push("The theme has no variables; the stock theme is used.");
  } else if (isCompiled(input)) {
    raw = { ...input.vars };
    // through Lua an empty array arrives as {}
    imports = (Array.isArray(input.imports) ? input.imports : Object.values(input.imports ?? {})).filter((u): u is string => typeof u === "string");
    mode = input.mode ?? mode;
  } else if (input && typeof input === "object" && isDtcg(input as Record<string, unknown>)) {
    raw = parseDtcg(input as DtcgDocument);
    const ext = (input as { $extensions?: Record<string, { mode?: string; imports?: string[] }> }).$extensions?.["dev.nuikit"];
    if (ext?.mode === "light" || ext?.mode === "dark") mode = ext.mode;
    if (Array.isArray(ext?.imports)) imports = ext.imports.filter((u) => typeof u === "string");
  } else if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input)) if (typeof v === "string" || typeof v === "number") raw[k.replace(/^--/, "")] = String(v);
  }

  // var(--x) references between tokens → their values (FiveM can read var(), but derivations and
  // contrast checks need the colour itself).
  const resolved: ThemeVars = {};
  const base = opts.partial ? raw : { ...NEUTRAL[mode], ...raw };
  // A token that is empty or an unresolvable alias is invalid at computed time, as in CSS: a var()
  // pointing at it takes its fallback, and the token itself is reported below.
  const DANGLING = /^var\(\s*--([\w-]+)\s*\)$/;
  const nothing = (v: string) => v.trim() === "" || DANGLING.test(v.trim());
  const lookup = (name: string, depth: number): string | undefined => {
    const v = base[name];
    if (v === undefined || depth > 8) return undefined;
    const r = resolveRefs(v, depth + 1);
    return nothing(r) ? undefined : r;
  };
  const resolveRefs = (value: string, depth: number): string =>
    value.replace(/var\(\s*--([\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (m, ref: string, fb?: string) => lookup(ref, depth) ?? fb?.trim() ?? m);

  const missing: string[] = [];
  for (const t of TOKENS) if (t.group === "shadcn" && t.type === "color" && raw[t.name] === undefined && NEUTRAL[mode][t.name] !== undefined) missing.push(t.name);
  if (!opts.partial && missing.length && missing.length < 23) {
    warnings.push(`The theme doesn't set ${missing.map((m) => `--${m}`).join(", ")}; stock shadcn values are used.`);
  }

  for (const [name, value] of Object.entries(base)) {
    const v = resolveRefs(String(value), 0);
    // Empty (`--primary: ;`), or an alias that leads nowhere (`var(--nope)`, or to an empty token):
    // the token would paint nothing. Use the stock value, or leave it out of a patch.
    if (nothing(v)) {
      const stock = opts.partial ? undefined : NEUTRAL[mode][name];
      const ref = DANGLING.exec(v.trim())?.[1];
      const why = v.trim() === "" ? "is empty" : `is ${v.trim()}, which ${ref !== undefined && base[ref] !== undefined ? "resolves to nothing" : "isn't defined"}`;
      warnings.push(`--${name} ${why}; ${stock ? "the stock value is used" : "it was left out"}.`);
      if (stock) resolved[name] = lower(stock)!;
      continue;
    }
    const lowered = lower(v);
    if (lowered === null) {
      const stock = opts.partial ? undefined : NEUTRAL[mode][name];
      warnings.push(
        `--${name} uses ${/color-mix/.test(v) ? "color-mix()" : "a colour format"} that FiveM's browser can't read (${v}); ${stock ? "the stock value is used" : "it was left out"}.`,
      );
      if (stock) resolved[name] = lower(stock)!;
      continue;
    }
    resolved[name] = lowered;
  }

  if (!opts.partial) {
    const given = new Set(Object.keys(resolved));
    derive(resolved, mode, warnings);
    deriveIdentity(resolved, warnings, given);
  }
  else if (resolved["nk-scale"] !== undefined || resolved["nk-motion"] !== undefined) derive(resolved, mode, warnings, true);
  if (opts.highContrast) highContrast(resolved);

  const contrast = checkContrast(resolved);
  for (const r of contrast) {
    if (r.ok) continue;
    const reason = CONTRAST_PAIRS.find(([f, b]) => f === r.fg && b === r.bg)?.[3] ?? "it will be hard to read";
    warnings.push(`${r.fg} on ${r.bg} is ${r.ratio.toFixed(1)}:1 (needs ${r.min}:1); ${reason}.`);
  }

  const vars = order(resolved);
  return { version: TOKENS_VERSION, revision: TOKENS_REVISION, mode, vars, imports, warnings, contrast, hash: hash(JSON.stringify([vars, imports])) };
}

/** A value FiveM's Chromium 103 reads: colours → rgb()/rgba(), colours inside compound values (shadows) too. null if it can't be lowered. */
export function lowerValue(value: string): string | null {
  return lower(value);
}

function lower(value: string): string | null {
  const v = value.trim();
  const whole = toRgba(v);
  if (whole) return formatRgba(whole);
  if (/color-mix\(|\b(?:lab|lch|color)\(/.test(v)) return null;
  let failed = false;
  const out = v.replace(/\b(?:oklch|oklab|hsla?|rgba?)\([^()]*\)/g, (m) => {
    const c = toRgba(m);
    if (!c) failed = true;
    return c ? formatRgba(c) : m;
  });
  return failed && /okl(?:ch|ab)\(/.test(out) ? null : out;
}

// ─────────────────────────────────────────── derived tokens

function rgba(vars: ThemeVars, name: string): RGBA | null {
  const v = vars[name];
  return v === undefined ? null : toRgba(v);
}

const fmtOklch = (L: number, C: number, H: number): string => formatRgba([...oklchToRgb(L, C, H).map((x) => Math.round(Math.max(0, Math.min(255, x)))), 1] as RGBA);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const WHITE: RGBA = [255, 255, 255, 1];
const BLACK: RGBA = [0, 0, 0, 1];
/** Legibility of text drawn straight on the game: a tight dark edge plus a soft halo, in black (the game, not the theme). */
export const WORLD_SHADOW = "0 1px 2px rgba(0, 0, 0, 0.65), 0 0 0.5rem rgba(0, 0, 0, 0.35)";
/** Mid-grey: the game's average frame. Text on the game must be lighter than it and clear it by 3:1. */
const MID_GREY: RGBA = [128, 128, 128, 1];

/** Of the theme's foreground and background (one light, one dark), the one that reads best on `bg`. */
function bestText(vars: ThemeVars, bg: RGBA): string {
  const solid = opaque(bg, vars);
  const candidates = [rgba(vars, "foreground"), rgba(vars, "background"), WHITE, BLACK].filter((x): x is RGBA => !!x && x[3] === 1);
  let best = candidates[0]!;
  let bestRatio = 0;
  for (const cand of candidates) {
    const r = contrastRatio(cand, solid);
    // the theme's own colours win unless they're clearly worse than pure white/black
    if (r > bestRatio + 0.5) {
      best = cand;
      bestRatio = r;
    }
  }
  return formatRgba(best);
}

/** What a translucent colour looks like where it's used: over the popover, over the background, over black. */
function opaque(c: RGBA, vars: ThemeVars, over: string[] = ["background"]): RGBA {
  if (c[3] >= 1) return c;
  let under: RGBA = BLACK;
  for (const name of [...over].reverse()) {
    const u = rgba(vars, name);
    if (u) under = composite(u, under);
  }
  return composite(c, under);
}

function inHue(h: number, ranges: readonly (readonly [number, number])[]): boolean {
  return ranges.some(([a, b]) => h >= a && h <= b);
}

/** Usable as a vital bar on the game: colourful, not too dark or washed out, and in the vital's hue range. */
function vitalFit(c: RGBA | null, ranges: readonly (readonly [number, number])[]): boolean {
  if (!c || c[3] < 1) return false;
  const o = rgbToOklch(c);
  return o.c >= 0.06 && o.l >= 0.45 && o.l <= 0.93 && inHue(o.h, ranges);
}

function derive(vars: ThemeVars, mode: ThemeMode, warnings: string[], onlyNumbers = false) {
  // numbers
  const scale = vars["nk-scale"] === undefined ? 1 : parseFloat(vars["nk-scale"]);
  if (Number.isNaN(scale) || scale < 0.5 || scale > 2) {
    warnings.push(`--nk-scale must be a number between 0.5 and 2 (got ${vars["nk-scale"]}); 1 is used.`);
    vars["nk-scale"] = "1";
  } else vars["nk-scale"] = String(scale);
  const motion = vars["nk-motion"];
  if (motion !== undefined && motion !== "0" && motion !== "1") {
    warnings.push(`--nk-motion must be 0 or 1 (got ${motion}); 1 is used.`);
    vars["nk-motion"] = "1";
  } else vars["nk-motion"] = motion ?? "1";
  if (onlyNumbers) return;

  for (const t of TOKENS) if (t.group === "shadcn" && t.type !== "color" && vars[t.name] === undefined) vars[t.name] = t.fallback;

  const destructive = rgba(vars, "destructive") ?? toRgba(NEUTRAL[mode].destructive!)!;
  const d = rgbToOklch(destructive);
  const L = clamp(d.l, mode === "dark" ? 0.62 : 0.5, 0.8);
  const C = clamp(d.c, 0.12, 0.2);

  if (vars["destructive-foreground"] === undefined) vars["destructive-foreground"] = bestText(vars, destructive);
  if (vars.success === undefined) vars.success = fmtOklch(L, C, 150);
  if (vars["success-foreground"] === undefined) vars["success-foreground"] = bestText(vars, toRgba(vars.success)!);
  if (vars.warning === undefined) vars.warning = fmtOklch(clamp(L + 0.08, 0, 0.86), C, 75);
  if (vars["warning-foreground"] === undefined) vars["warning-foreground"] = bestText(vars, toRgba(vars.warning)!);
  if (vars.info === undefined) vars.info = vars.primary!;
  if (vars["info-foreground"] === undefined) vars["info-foreground"] = vars["primary-foreground"]!;
  if (vars.hud === undefined) vars.hud = "rgba(0, 0, 0, 0.45)";
  // on the game (1.1): light in every theme, light or dark, unless the theme says otherwise
  const world = rgba(vars, "world-foreground") ?? WHITE;
  if (vars["world-foreground"] === undefined) vars["world-foreground"] = formatRgba(world);
  if (vars["world-foreground-muted"] === undefined) vars["world-foreground-muted"] = formatRgba([world[0], world[1], world[2], 0.8]);
  if (vars["world-shadow"] === undefined) vars["world-shadow"] = WORLD_SHADOW;
  // gains and losses on the game (1.3): the status hue, lifted so it reads on the dark HUD plate (a light
  // theme's success and destructive are dark, for its light panels)
  for (const [world, status] of [["world-success", "success"], ["world-destructive", "destructive"]] as const) {
    const c = vars[world] === undefined ? rgba(vars, status) : null;
    if (!c) continue;
    const o = rgbToOklch(c);
    vars[world] = fmtOklch(Math.max(o.l, 0.7), o.c, o.h);
  }
  if (vars["hud-foreground"] === undefined) vars["hud-foreground"] = vars["world-foreground"]!;
  if (vars.scrim === undefined) vars.scrim = "rgb(0, 0, 0)";

  const used = new Set<number>();
  for (const v of VITALS) {
    if (vars[v.name] !== undefined) continue;
    const chart = (i: number) => rgba(vars, `chart-${i}`);
    let pick: string | undefined;
    if (vitalFit(chart(v.chart), v.hues) && !used.has(v.chart)) {
      pick = vars[`chart-${v.chart}`];
      used.add(v.chart);
    } else {
      for (let i = 1; i <= 5 && !pick; i++) {
        if (used.has(i) || !vitalFit(chart(i), v.hues)) continue;
        pick = vars[`chart-${i}`];
        used.add(i);
      }
    }
    if (!pick && "theme" in v && vitalFit(rgba(vars, v.theme), v.hues)) pick = vars[v.theme];
    vars[v.name] = pick ?? fmtOklch(v.fallback[0], v.fallback[1], v.fallback[2]);
  }
}

// ─────────────────────────────────────────── identity tokens (1.1)

const NUM = /^-?(?:\d+\.?\d*|\.\d+)$/;
const DIM = /^(-?(?:\d+\.?\d*|\.\d+))(px|rem|em)$/;
const DUR = /^(\d+\.?\d*|\.\d+)(ms|s)$/;
const BEZIER = /^cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/;
const EASE_KEYWORDS: Record<string, string> = {
  linear: "cubic-bezier(0, 0, 1, 1)",
  ease: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  "ease-in": "cubic-bezier(0.42, 0, 1, 1)",
  "ease-out": "cubic-bezier(0, 0, 0.58, 1)",
  "ease-in-out": "cubic-bezier(0.42, 0, 0.58, 1)",
};
const trimNum = (n: number) => String(Math.round(n * 10000) / 10000);

/** Normalise one identity value; null if it isn't valid for its type. */
function identityValue(spec: TokenSpec, raw: string): string | null {
  const v = raw.trim();
  // an angle, not a length (tokens 1.3)
  if (spec.name === "nk-skew" || spec.name === "nk-tile-skew") {
    if (v === "0") return "0deg";
    const m = /^(-?\d*\.?\d+)deg$/.exec(v);
    if (!m) return null;
    const n = parseFloat(m[1]!);
    return Math.abs(n) <= 20 ? `${trimNum(n)}deg` : null;
  }
  switch (spec.type) {
    case "number": {
      if (!NUM.test(v)) return null;
      const n = parseFloat(v);
      if (spec.range && (n < spec.range[0] || n > spec.range[1])) return null;
      return trimNum(n);
    }
    case "dimension": {
      if (v === "0") return "0px";
      const m = DIM.exec(v);
      return m ? `${trimNum(parseFloat(m[1]!))}${m[2]}` : null;
    }
    case "duration": {
      const m = DUR.exec(v);
      if (!m) return null;
      const ms = parseFloat(m[1]!) * (m[2] === "s" ? 1000 : 1);
      const [lo, hi] = spec.range ?? [0, 2000];
      return ms >= lo && ms <= hi ? `${trimNum(ms)}ms` : null;
    }
    case "cubicBezier": {
      const k = EASE_KEYWORDS[v];
      if (k) return k;
      const m = BEZIER.exec(v);
      if (!m) return null;
      const [x1, y1, x2, y2] = m.slice(1).map(Number) as [number, number, number, number];
      if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null;
      return `cubic-bezier(${[x1, y1, x2, y2].map(trimNum).join(", ")})`;
    }
    case "keyword":
      return spec.values?.includes(v) ? v : null;
    default:
      return v || null;
  }
}

const chromatic = (c: RGBA | null) => !!c && c[3] > 0 && rgbToOklch(c).c >= 0.06;

/** The box-shadow behind each nk-elevation, in the theme's scrim colour (s = "r, g, b"). */
export function elevationShadow(level: string, s: string): string {
  if (level === "none") return `0 0 0 0 rgba(${s}, 0)`;
  // hard (Street, Arcade): a solid offset drop under the slab, no blur
  if (level === "hard") return `0 0.25rem 0 0 rgba(${s}, 0.5)`;
  if (level === "deep")
    return `0 0 0 1px rgba(${s}, 0.3), 0 2px 4px rgba(${s}, 0.2), 0 18px 40px -10px rgba(${s}, 0.55), 0 44px 96px -28px rgba(${s}, 0.75)`;
  // soft (Graphite): a hairline and a short, tight drop; no halo
  return `0 0 0 1px rgba(${s}, 0.25), 0 12px 32px -16px rgba(${s}, 0.6)`;
}

/** The text-shadow behind each nk-hud-text-shadow, in the theme's scrim colour. */
export function hudTextShadow(level: string, s: string): string {
  if (level === "none") return "none";
  if (level === "strong") return `0 0 2px rgba(${s}, 0.9), 0 1px 3px rgba(${s}, 0.8)`;
  return `0 1px 2px rgba(${s}, 0.6)`;
}

/** The HUD backplate (hud at no less than nk-hud-opacity) over a white sky: what HUD text is judged against. */
function hudPlateOverWhite(vars: ThemeVars): RGBA | null {
  const hud = rgba(vars, "hud");
  if (!hud) return null;
  const a = Math.max(hud[3], parseFloat(vars["nk-hud-opacity"] ?? "0") || 0);
  return composite([hud[0], hud[1], hud[2], a], WHITE);
}

/** Material tokens whose default is another token's value (1.4), filled by deriveFoundation. */
const REF_DEFAULTS = new Set(Object.keys(MATERIAL_CONTEXTS).flatMap((c) => [`nk-material-${c}-opacity`, `nk-material-${c}-radius`, `nk-material-${c}-edge`]));

/** --nk-treatment: validate it, then fill its preset under whatever the theme set (tokens 1.4). */
function applyTreatment(vars: ThemeVars, warnings: string[]) {
  const raw = vars["nk-treatment"];
  let t: Treatment = "soft";
  if (raw !== undefined) {
    if ((TREATMENTS as readonly string[]).includes(raw.trim())) t = raw.trim() as Treatment;
    else warnings.push(`--nk-treatment must be ${TREATMENTS.join(", ")} (got ${raw}); soft is used.`);
  }
  vars["nk-treatment"] = t;
  for (const [k, v] of Object.entries(TREATMENT_PRESETS[t])) if (vars[k] === undefined) vars[k] = v;
}

/** Roles and materials (tokens 1.4): each role's colour and its deep / light steps; material defaults. */
function deriveFoundation(vars: ThemeVars) {
  for (const role of ROLES) {
    const name = `role-${role}`;
    if (vars[name] === undefined) {
      const d = ROLE_DEFAULTS[role]!;
      vars[name] = typeof d === "string" ? (vars[d] ?? vars.foreground!) : fmtOklch(d[0], d[1], d[2]);
    }
    const c = rgba(vars, name);
    if (!c) continue;
    const { l, c: ch, h } = rgbToOklch(c);
    if (vars[`${name}-deep`] === undefined) vars[`${name}-deep`] = fmtOklch(clamp(l - 0.12, 0.2, 1), ch * 0.9, h);
    if (vars[`${name}-light`] === undefined) vars[`${name}-light`] = fmtOklch(clamp(l + 0.1, 0, 0.95), ch * 0.85, h);
  }
  for (const ctx of Object.keys(MATERIAL_CONTEXTS)) {
    const k = (p: string) => `nk-material-${ctx}-${p}`;
    if (vars[k("opacity")] === undefined) vars[k("opacity")] = vars[ctx === "hud" ? "nk-hud-opacity" : "nk-surface-opacity"]!;
    if (vars[k("radius")] === undefined) vars[k("radius")] = vars.radius ?? "0.625rem";
    if (vars[k("edge")] === undefined) vars[k("edge")] = vars["nk-surface-edge"]!;
  }
}

function deriveIdentity(vars: ThemeVars, warnings: string[], given: ReadonlySet<string> = new Set()) {
  // treatment (1.4): its preset fills what the theme left out, before the defaults do
  applyTreatment(vars, warnings);
  // validate what the theme set; anything invalid falls back to the default, with a warning
  for (const spec of IDENTITY_TOKENS) {
    if (spec.type === "color" || spec.type === "fontFamily" || spec.type === "shadow" || spec.type === "image" || spec.group === "derived") continue;
    const value = vars[spec.name];
    if (value === undefined) {
      // a default that is another token's value (materials): filled once those are known
      if (!REF_DEFAULTS.has(spec.name)) vars[spec.name] = spec.fallback;
      continue;
    }
    const v = identityValue(spec, value);
    if (v === null) {
      const want = spec.values ? spec.values.join(", ") : spec.range ? `a number from ${spec.range[0]} to ${spec.range[1]}` : spec.type === "dimension" ? "a length in px, rem or em" : spec.type === "duration" ? "a duration up to 2000ms" : "cubic-bezier(x1, y1, x2, y2)";
      warnings.push(`--${spec.name} must be ${want} (got ${value}); ${spec.fallback} is used.`);
      if (REF_DEFAULTS.has(spec.name)) delete vars[spec.name];
      else vars[spec.name] = spec.fallback;
    } else vars[spec.name] = v;
  }
  // 1.5 levers: kit.css holds the defaults, so only a value the theme or treatment set is checked (and kept)
  for (const spec of [...KIT_TOKENS, ...BASELINE_TOKENS, ...SELECTION_TOKENS]) {
    const value = vars[spec.name];
    if (value === undefined || spec.type === "color" || spec.type === "fontFamily" || spec.type === "shadow" || spec.type === "image") continue;
    // a formula (calc(), var()) is the theme's call: CSS resolves it
    if (/^(calc|var|max|min|clamp)\(/.test(value.trim())) continue;
    const v = identityValue(spec, value);
    if (v === null) {
      const want = spec.values ? spec.values.join(", ") : spec.range ? `a number from ${spec.range[0]} to ${spec.range[1]}` : spec.type === "dimension" ? "a length in px, rem or em" : spec.type === "duration" ? "a duration up to 2000ms" : "a valid value";
      warnings.push(`--${spec.name} must be ${want} (got ${value}); the kit default is used.`);
      delete vars[spec.name];
    } else vars[spec.name] = v;
  }

  // brand: the primary when it has colour, else the first chart colour
  if (vars.brand === undefined) {
    const primary = rgba(vars, "primary");
    vars.brand = chromatic(primary) || !vars["chart-1"] ? vars.primary! : vars["chart-1"]!;
  }
  const brand = rgba(vars, "brand") ?? rgba(vars, "primary")!;
  if (vars["brand-foreground"] === undefined) vars["brand-foreground"] = bestText(vars, brand);

  // fonts: display and numbers follow the body font unless the theme picks its own
  const sans = vars["font-sans"] ?? DEFAULT_FONT_SANS;
  if (vars["font-display"] === undefined) vars["font-display"] = sans === DEFAULT_FONT_SANS ? DEFAULT_FONT_DISPLAY : sans;
  if (vars["font-numeric"] === undefined) vars["font-numeric"] = sans;

  // surface: the panel colour, tinted toward the brand
  if (vars.surface === undefined) {
    const pop = rgba(vars, "popover");
    if (pop) {
      const t = parseFloat(vars["nk-surface-tint"]!);
      const m = mix(pop, [brand[0], brand[1], brand[2], pop[3]], t);
      vars.surface = formatRgba(m);
    }
  }

  // keywords → values CSS can use without branching
  const scrim = rgba(vars, "scrim") ?? BLACK;
  const s = `${scrim[0]}, ${scrim[1]}, ${scrim[2]}`;
  if (vars["nk-elevation-shadow"] === undefined) vars["nk-elevation-shadow"] = elevationShadow(vars["nk-elevation"]!, s);
  if (vars["nk-hud-shadow"] === undefined) vars["nk-hud-shadow"] = hudTextShadow(vars["nk-hud-text-shadow"]!, s);
  const cut = parseFloat(vars["nk-cut"]!);
  if (vars["nk-clip"] === undefined) vars["nk-clip"] = cut > 0 ? chamferClip("var(--nk-cut)") : "none";
  if (vars["nk-clip-sm"] === undefined) vars["nk-clip-sm"] = cut > 0 ? chamferClip("calc(var(--nk-cut) / 2)") : "none";
  // sweep (1.5) is none of the three: no bar, fill or outline, only the row's own sweep
  const ind = vars["nk-row-indicator"]!;
  for (const k of ["bar", "fill", "outline"]) if (vars[`nk-row-${k}`] === undefined) vars[`nk-row-${k}`] = ind === k ? "1" : "0";

  // motion (1.2): the duration ladder, easings and springs, as literals, from d, the ease, the feel and the bounce
  const d = parseFloat(vars["nk-duration"]!);
  const motion = motionTokens(d, vars["nk-motion-feel"] as MotionFeel, parseFloat(vars["nk-spring-bounce"]!), {
    exitFactor: parseFloat(vars["nk-exit-factor"] ?? "0.7"),
    ladder: vars["nk-treatment"] === "tile",
  });
  motion["nk-ease-out"] = vars["nk-ease"]!;
  motion["nk-ease-in"] = "cubic-bezier(0.4, 0, 1, 1)";
  motion["nk-ease-in-out"] = "cubic-bezier(0.2, 0, 0, 1)";
  motion["nk-ease-emphasized"] = "cubic-bezier(0.05, 0.7, 0.1, 1)";
  motion["nk-ease-linear"] = "linear";
  // 1.4 named eases (foundation.md §9): aliases of the ladder's curves, plus a spring and a breathe
  motion["nk-ease-standard"] = motion["nk-ease-in-out"];
  motion["nk-ease-expand"] = motion["nk-ease-emphasized"];
  motion["nk-ease-retract"] = motion["nk-ease-in"];
  motion["nk-ease-spring"] = "cubic-bezier(0.34, 1.56, 0.64, 1)";
  motion["nk-ease-breathe"] = "cubic-bezier(0.37, 0, 0.63, 1)";
  for (const [k, v] of Object.entries(motion)) if (vars[k] === undefined) vars[k] = v;
  if (d > MAX_DURATION_MS) warnings.push(`--nk-duration is ${d}ms (the kit's ceiling is ${MAX_DURATION_MS}ms); panels and menus will feel slow to a player who opens them hundreds of times.`);

  deriveFoundation(vars);

  // floors (docs/archive/design-research.md §3): warn, never block
  const op = parseFloat(vars["nk-surface-opacity"]!);
  if (op < 0.92) warnings.push(`--nk-surface-opacity is ${op} (floor 0.92); the game will show through text in panels, and a bright sky will wash it out.`);
  const plate = hudPlateOverWhite(vars);
  const hudFg = rgba(vars, "hud-foreground");
  if (plate && hudFg) {
    const ratio = contrastRatio(composite(hudFg, plate), plate);
    if (ratio < 4.5)
      warnings.push(`hud-foreground on the HUD backplate over a white sky is ${ratio.toFixed(1)}:1 (needs 4.5:1); raise --nk-hud-opacity or darken --hud so HUD text reads over snow and midday sky.`);
  }
  // text on the game: it must be lighter than the game's average frame (its shadow is dark) and clear it by 3:1
  for (const name of ["world-foreground", "world-foreground-muted"]) {
    if (!given.has(name)) continue;
    const c = rgba(vars, name);
    if (!c) continue;
    const onGrey = composite(c, MID_GREY);
    const ratio = contrastRatio(onGrey, MID_GREY);
    const lighter = contrastRatio(onGrey, BLACK) > contrastRatio(MID_GREY, BLACK);
    if (!lighter || ratio < 3)
      warnings.push(`--${name} is ${lighter ? `${ratio.toFixed(1)}:1 against a mid-grey frame (needs 3:1)` : "darker than a mid-grey frame"}; text drawn straight on the game (death text, unplated HUD values) will be hard to read. Keep it light, whatever the theme's mode.`);
  }
}

/** Player preference: maximum-contrast text, stronger borders, a darker HUD surface. Pure on lowered vars. */
export function highContrast(vars: ThemeVars): ThemeVars {
  const best = (bg: string) => {
    const b = rgba(vars, bg);
    if (!b) return undefined;
    const solid = opaque(b, vars);
    return contrastRatio(WHITE, solid) >= contrastRatio(BLACK, solid) ? WHITE : BLACK;
  };
  for (const [fg, bg] of [
    ["foreground", "background"],
    ["popover-foreground", "popover"],
    ["card-foreground", "card"],
    ["accent-foreground", "accent"],
    ["secondary-foreground", "secondary"],
    ["primary-foreground", "primary"],
  ] as const) {
    const b = best(bg);
    if (b) vars[fg] = formatRgba(b);
  }
  const text = rgba(vars, "popover-foreground");
  const panel = rgba(vars, "popover");
  const muted = rgba(vars, "muted-foreground");
  if (text && panel && muted) {
    let m = muted;
    for (let t = 0.1; t <= 1 && contrastRatio(opaque(m, vars), opaque(panel, vars)) < 7; t += 0.1) m = mix(muted, text, t);
    vars["muted-foreground"] = formatRgba(m);
    vars.border = formatRgba([text[0], text[1], text[2], 0.35]);
    vars.input = formatRgba([text[0], text[1], text[2], 0.45]);
  }
  vars.hud = "rgba(0, 0, 0, 0.72)";
  vars["hud-foreground"] = "rgb(255, 255, 255)";
  vars["world-foreground"] = "rgb(255, 255, 255)";
  vars["world-foreground-muted"] = "rgba(255, 255, 255, 0.85)";
  // identity (1.1): opaque panels, a solid HUD plate
  if (vars["nk-surface-opacity"] !== undefined) vars["nk-surface-opacity"] = "1";
  if (vars["nk-hud-opacity"] !== undefined) vars["nk-hud-opacity"] = "0.72";
  return vars;
}

/** Run the contract's contrast checks on lowered vars. Translucent colours are composited where they're drawn. */
export function checkContrast(vars: ThemeVars): ContrastResult[] {
  const out: ContrastResult[] = [];
  for (const [fg, bg, min] of CONTRAST_PAIRS) {
    const f = rgba(vars, fg);
    const b = rgba(vars, bg);
    if (!f || !b) continue;
    // the HUD sits on the game: judge it over a bright scene (worst case), everything else over the theme
    const under = bg === "hud" ? composite(b, WHITE) : opaque(b, vars, bg === "background" ? [] : ["background"]);
    const over = composite(f, under);
    const ratio = Math.round(contrastRatio(over, under) * 100) / 100;
    out.push({ fg, bg, ratio, min, ok: ratio >= min });
  }
  return out;
}

function order(vars: ThemeVars): ThemeVars {
  const out: ThemeVars = {};
  for (const name of ALL_TOKEN_NAMES) if (vars[name] !== undefined) out[name] = vars[name]!;
  for (const name of Object.keys(vars).sort()) if (!(name in out)) out[name] = vars[name]!;
  return out;
}

/** FNV-1a, 32 bit, hex. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// ─────────────────────────────────────────── outputs

/** --x-rgb / --x-a channels for every colour var (what vite-plugin-nuikit's bg-x/50 rewrites read). */
export function themeChannels(vars: ThemeVars): ThemeVars {
  const out: ThemeVars = {};
  for (const [name, value] of Object.entries(vars)) {
    const c = toRgba(value);
    if (!c) continue;
    out[`${name}-rgb`] = `${c[0]}, ${c[1]}, ${c[2]}`;
    out[`${name}-a`] = String(c[3]);
  }
  return out;
}

/** The compiled theme as CSS (with channels), e.g. for a download or a page that can't run JS. */
export function themeToCss(theme: CompiledTheme | ThemeVars, selector = ":root"): string {
  const vars = isCompiled(theme) ? theme.vars : theme;
  const imports = isCompiled(theme) ? theme.imports : [];
  const all = { ...vars, ...themeChannels(vars) };
  const lines = Object.entries(all).map(([k, v]) => `  --${k}: ${v};`);
  return `${imports.map((u) => `@import url("${u}");\n`).join("")}${selector} {\n${lines.join("\n")}\n}\n`;
}

/** The compiled theme as a W3C Design Tokens (DTCG 2025.10) document. */
export function toDtcg(theme: CompiledTheme, description = "nuikit theme"): DtcgDocument {
  const color: Record<string, unknown> = { $type: "color" };
  const doc: DtcgDocument = {
    $description: `${description} (nuikit tokens v${TOKENS_REVISION}, ${theme.mode})`,
    $extensions: { "dev.nuikit": { tokens: TOKENS_VERSION, revision: TOKENS_REVISION, mode: theme.mode, ...(theme.imports.length ? { imports: theme.imports } : {}) } },
    color,
  };
  const font: Record<string, unknown> = { $type: "fontFamily" };
  const nk: Record<string, unknown> = {};
  // the treatment's preset fills these again on compile (and its var() values must stay unresolved)
  const preset = TREATMENT_PRESETS[theme.vars["nk-treatment"] as Treatment] ?? {};
  for (const [name, value] of Object.entries(theme.vars)) {
    const spec = SPEC.get(name);
    // derived tokens are outputs: compiling the file derives them again
    if (spec?.group === "derived") continue;
    if (preset[name] === value) continue;
    const desc = spec ? { $description: spec.description } : {};
    const col = toRgba(value);
    if (col && (spec?.type ?? "color") === "color") {
      const hex = `#${col.slice(0, 3).map((x) => x.toString(16).padStart(2, "0")).join("")}`;
      color[name] = {
        $value: { colorSpace: "srgb", components: col.slice(0, 3).map((x) => Math.round((x / 255) * 10000) / 10000), alpha: col[3], hex },
        ...desc,
      };
    } else if (name === "radius") {
      const m = /^([\d.]+)(px|rem)$/.exec(value);
      if (m) doc.radius = { $type: "dimension", $value: { value: parseFloat(m[1]!), unit: m[2] }, ...desc };
    } else if (name.startsWith("font-")) {
      font[name.slice(5)] = { $value: value.split(",").map((f) => f.trim().replace(/^["']|["']$/g, "")), ...desc };
    } else if (name.startsWith("nk-")) {
      nk[name.slice(3)] = dtcgNk(spec, value, desc);
    }
  }
  if (Object.keys(font).length > 1) doc.font = font;
  doc.nk = nk;
  // a derived token the theme set itself (Default's eases) differs from what compiling the file derives: keep it
  const again = compileTheme(doc, { mode: theme.mode }).vars;
  for (const [name, value] of Object.entries(theme.vars)) {
    const spec = SPEC.get(name);
    if (spec?.group === "derived" && name.startsWith("nk-") && again[name] !== value) nk[name.slice(3)] = dtcgNk(spec, value, { $description: spec.description });
  }
  if (Object.keys(nk).length === 0) delete doc.nk;
  return doc;
}

/** One nk-* token as DTCG: number, dimension, duration, cubicBezier, or a keyword (string, no standard type). */
function dtcgNk(spec: TokenSpec | undefined, value: string, desc: Record<string, unknown>): Record<string, unknown> {
  const dim = DIM.exec(value);
  const dur = DUR.exec(value);
  const bez = BEZIER.exec(value);
  if (NUM.test(value) && (spec?.type ?? "number") === "number") return { $type: "number", $value: Number(value), ...desc };
  if (dim) return { $type: "dimension", $value: { value: parseFloat(dim[1]!), unit: dim[2] }, ...desc };
  if (dur) return { $type: "duration", $value: { value: parseFloat(dur[1]!), unit: dur[2] }, ...desc };
  if (bez) return { $type: "cubicBezier", $value: bez.slice(1).map(Number), ...desc };
  return { $value: value, ...desc, $extensions: { "dev.nuikit": { type: spec?.type ?? "keyword" } } };
}

/** JSON Schema (2020-12) for a compiled theme (theme.json, GlobalState.nuikitTheme). */
export function themeJsonSchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const t of ALL_TOKENS) {
    const since = t.since ? { $comment: `tokens ${t.since}` } : {};
    properties[t.name] =
      t.type === "color"
        ? { type: "string", pattern: "^rgba?\\(", description: t.description, ...since }
        : t.type === "number"
          ? { type: "string", pattern: "^-?\\d+(\\.\\d+)?$", description: t.description, ...since }
          : t.type === "keyword" && t.values
            ? { enum: [...(t.values ?? [])], description: t.description, ...since }
            : { type: "string", description: t.description, ...since };
  }
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://nuikit.vercel.app/schema/theme.v1.json",
    title: "nuikit compiled theme (tokens v1, revision 1.1)",
    description: "What compileTheme() returns and the nuikit resource publishes: every token, lowered so FiveM's browser can read it.",
    type: "object",
    required: ["version", "vars"],
    properties: {
      version: { const: TOKENS_VERSION },
      revision: { type: "string", description: "Contract revision; \"1.1\" adds the identity tokens (optional in vars, so themes compiled by older nuikit stay valid)" },
      mode: { enum: ["dark", "light"] },
      hash: { type: "string" },
      imports: { type: "array", items: { type: "string", format: "uri" } },
      warnings: { type: "array", items: { type: "string" } },
      vars: {
        type: "object",
        required: [...TOKEN_NAMES],
        properties,
        additionalProperties: { type: "string" },
      },
    },
  };
}

// ─────────────────────────────────────────── player preferences

export interface NuiPrefs {
  /** UI size multiplier, 0.85–1.25 (on top of the theme's --nk-scale). */
  scale: number;
  reducedMotion: boolean;
  highContrast: boolean;
  /** Spacing multiplier, 0.85–1.2 (on top of the theme's --nk-density). */
  density?: number;
  /** The look the player picked (the Lua side applies it as the theme; pages only read it). */
  identity?: string | null;
  treatment?: string | null;
}

export const DEFAULT_PREFS: NuiPrefs = { scale: 1, reducedMotion: false, highContrast: false, density: 1 };

export function normalizePrefs(p: Partial<NuiPrefs> | null | undefined): NuiPrefs {
  const scale = Number(p?.scale);
  return {
    scale: Number.isFinite(scale) && scale > 0 ? Math.round(clamp(scale, 0.85, 1.25) * 100) / 100 : 1,
    reducedMotion: p?.reducedMotion === true,
    highContrast: p?.highContrast === true,
    density: Number.isFinite(Number(p?.density)) && Number(p?.density) > 0 ? Math.round(clamp(Number(p?.density), 0.85, 1.2) * 100) / 100 : 1,
  };
}

/** The vars to paint for a compiled theme and a player's preferences. */
export function withPrefs(vars: ThemeVars, prefs: Partial<NuiPrefs> = DEFAULT_PREFS): ThemeVars {
  const p = normalizePrefs(prefs);
  const out = { ...vars };
  if (p.highContrast) highContrast(out);
  const scale = (parseFloat(out["nk-scale"] ?? "1") || 1) * p.scale;
  out["nk-scale"] = String(Math.round(scale * 1000) / 1000);
  if (p.density !== undefined && p.density !== 1 && out["nk-density"] !== undefined) {
    out["nk-density"] = String(Math.round((parseFloat(out["nk-density"]) || 0.875) * p.density * 1000) / 1000);
  }
  const level = themeMotionLevel(vars, p);
  out["nk-motion"] = level === "on" ? "1" : "0";
  if (level !== "on") {
    // off: nothing animates. reduced: no movement, fades kept but at most --nk-time-reduced (1.5; REDUCED_FADE_MS by default).
    const cap = parseFloat(out["nk-time-reduced"] ?? "") || REDUCED_FADE_MS;
    if (out["nk-motion-move"] !== undefined || out["nk-time-base"] !== undefined) out["nk-motion-move"] = "0";
    for (const name of MOTION_TIME_TOKENS) {
      const v = out[name];
      if (v === undefined) continue;
      const ms = parseFloat(v) * (/\ds$/.test(v) && !/ms$/.test(v) ? 1000 : 1);
      out[name] = level === "off" || name === "nk-stagger" ? "0ms" : `${Math.min(Number.isFinite(ms) ? ms : 0, cap)}ms`;
    }
  }
  return out;
}

/**
 * The motion level for a theme and a player's prefs: "off" when the theme sets --nk-motion: 0, "reduced" when
 * the player asked for reduced motion, else "on". applyTheme paints it as html[data-nk-motion].
 */
export function themeMotionLevel(vars: ThemeVars, prefs: Partial<NuiPrefs> = DEFAULT_PREFS): "on" | "reduced" | "off" {
  if (vars["nk-motion"] === "0" || vars["nk-motion-profile"] === "instant") return "off";
  return prefs.reducedMotion === true || vars["nk-motion-profile"] === "reduced" ? "reduced" : "on";
}
