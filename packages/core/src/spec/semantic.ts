/**
 * Semantic: the roles every component shares. Each default is a reference into the identity tier (or another
 * semantic lever); literals only where a value is a floor by design.
 */
import { alpha, color, css, ease, font, keyword, length, lit, number, pal, paint, ref, shadow, string, time, times, type Group } from "./lang";

/** The motion ladder: derived by compileTheme from motion.duration, motion.feel and motion.exit-factor (literals: no calc() on <time> in Chromium 103 animation shorthands). */
export const timeGroup: Group = {
  tier: "semantic",
  description: "The duration ladder, derived from motion.duration",
  levers: {
    snap: time("90ms", "A press, a rim switching state (0.5d)", { derived: true, floor: true, rule: "0.5 × motion.duration", was: ["nk-time-snap", "nk-time-press"] }),
    fast: time("120ms", "Hover, a face rising, a deny beat (0.667d)", { derived: true, floor: true, rule: "0.667 × motion.duration", was: ["nk-time-fast", "nk-time-hover"] }),
    base: time("180ms", "Panel enter, the selection tile, tab switch (d)", { derived: true, floor: true, rule: "motion.duration", was: ["nk-time-base", "nk-time"] }),
    slow: time("280ms", "Sheets, dialogs, a tile landing, toasts, a confirm pop (1.556d)", { derived: true, floor: true, rule: "1.556 × motion.duration", was: ["nk-time-slow", "nk-time-move", "nk-time-modal", "nk-time-confirm", "nk-time-retract", "nk-time-screen"] }),
    fill: time("420ms", "A level filling or draining; HUD show-on-change (2.333d)", { derived: true, floor: true, rule: "2.333 × motion.duration", was: ["nk-time-fill", "nk-time-ambient"] }),
    exit: time("126ms", "Every exit (d × exit-factor)", { derived: true, floor: true, rule: "motion.duration × motion.exit-factor", was: ["nk-time-exit"] }),
    pulse: time("1000ms", "One alert pulse", { derived: true, floor: true, rule: "1000ms (prefs clamp it)", was: ["nk-time-pulse"] }),
  },
};

export const easeGroup: Group = {
  tier: "semantic",
  description: "The named curves",
  levers: {
    enter: ease(ref("motion.ease"), "Anything arriving: enter, hover", { was: ["nk-ease-out"] }),
    exit: ease("cubic-bezier(0.4, 0, 1, 1)", "Exits and things tucking away (speeds up as it leaves)", { floor: true, was: ["nk-ease-in", "nk-ease-retract"] }),
    move: ease(ref("motion.ease"), "On-screen moves: the selection tile, FLIP, a tab underline", { was: ["nk-ease-standard", "nk-ease-in-out"] }),
    expand: ease("cubic-bezier(0.16, 1, 0.3, 1)", "Things opening and growing; full-screen enter", { floor: true, was: ["nk-ease-expand", "nk-ease-emphasized"] }),
    spring: ease("cubic-bezier(0.34, 1.56, 0.64, 1)", "An overshoot without a spring (confirm pops, press release)", { floor: true, was: ["nk-ease-spring"] }),
    breathe: ease("cubic-bezier(0.45, 0, 0.55, 1)", "Loops: alert pulses", { floor: true, was: ["nk-ease-breathe"] }),
  },
};

export const springGroup: Group = {
  tier: "semantic",
  description: "Springs (duration, bounce) for nuikit-core/motion, derived from motion.duration, feel and bounce",
  levers: Object.fromEntries(
    (
      [
        ["snap", "selection, tab underline, needle catch-up"],
        ["move", "toasts in, FLIP reflow, drawers, digit roll"],
        ["soft", "full-screen content, large frame changes"],
        ["pop", "rewards only"],
      ] as const
    ).map(([n, what]) => [n, string("0ms 0", `Spring: ${what}`, { derived: true, floor: true, was: [`nk-spring-${n}`] })]),
  ),
};

export const staggerGroup: Group = {
  tier: "semantic",
  description: "Choreography on a list's first open",
  levers: {
    $: time("40ms", "Delay per item", { derived: true, floor: true, range: [0, 200], rule: "40ms (prefs clamp it)", was: ["nk-stagger"] }),
    max: time("100ms", "Total cap: items past the cap enter together", { derived: true, floor: true, rule: "100ms", was: ["nk-stagger-max"] }),
  },
};

/** Gesture distances: how far things travel. */
export const gesture: Group = {
  tier: "semantic",
  description: "How far things travel and scale",
  levers: {
    lift: length("0.5rem", "A row's content and a slot sliding in on focus", { floor: true, was: ["nk-lift", "nk-row-lift"] }),
    rise: length("0.5rem", "How far things rise as they enter", { floor: true, was: ["nk-rise"] }),
    land: number(0.6, "The scale a tile lands from", { range: [0, 1], floor: true, was: ["nk-land-scale"] }),
    deny: length("0.3125rem", "The deny shake's distance", { floor: true, was: ["nk-deny-x"] }),
    press: number(0.97, "The scale of a pressed row or button", { range: [0.8, 1], floor: true, was: ["nk-press-scale"] }),
    confirm: number(1.08, "The short pop of a confirm", { range: [1, 1.2], floor: true, was: ["nk-confirm-scale"] }),
  },
};

/** Plate: the one surface recipe (panels, sheets, dialogs, notices). Flat, a hairline, a hard drop. */
export const plateGroup: Group = {
  tier: "semantic",
  description: "The one surface: flat, a hairline, a hard drop",
  levers: {
    color: color(pal("surface"), "The plate colour (drawn at its material's opacity through its channels)", { was: ["nk-plate"] }),
    hair: color(pal("border"), "The plate's hairline", { was: ["nk-plate-hair"] }),
    drop: shadow(css`0 0.125rem 0 ${alpha("scrim", 0.6)}`, "The plate's drop: hard, no blur", { was: ["nk-plate-drop"] }),
    bg: color(css`rgba(${ref("plate.color", "rgb", pal("surface", "rgb"))}, ${ref("alpha.menu")})`, "The plate as drawn: its colour at the menu material's alpha", { was: ["nk-plate-bg"] }),
    radius: length(ref("radius.surface"), "The plate's radius", { was: ["nk-plate-radius"] }),
  },
};

/** Fill: status as a level, left to right. --level (0–1) is set inline. */
export const fillGroup: Group = {
  tier: "semantic",
  description: "Status as a level filling left to right",
  levers: {
    color: color(pal("foreground"), "The bar", { was: ["nk-fill-color"] }),
    track: color(alpha("foreground", 0.12), "The track behind it", { was: ["nk-fill-track"] }),
    tint: color(alpha("foreground", 0.12), "The soft tint: an outline button's hover, a row sweep", { was: ["nk-fill-tint"] }),
    edge: color(alpha("foreground", 0.4), "The bar's leading 1px edge", { was: ["nk-fill-edge"] }),
    alert: color(pal("destructive"), "The bar at or under behavior.alert", { was: ["nk-fill-alert"] }),
    height: length("0.25rem", "A level bar's thickness: fills, meters, gauge tracks", { floor: true, was: ["nk-fill-height", "nk-gauge-track", "nk-meter-height"] }),
  },
};

/** Accent: the signature paint, a colour or a gradient, and its stops for SVG strokes. */
export const accentGroup: Group = {
  tier: "semantic",
  description: "The signature paint and its stops",
  levers: {
    paint: paint(pal("brand"), "An active tile's face, the speedometer's level, the compass N (a colour or a gradient)", { was: ["nk-accent-gradient"] }),
    from: color(pal("brand"), "First stop (SVG strokes)", { was: ["nk-accent-from"] }),
    via: color(ref("accent.from"), "Middle stop", { was: ["nk-accent-via"] }),
    to: color(ref("accent.from"), "Last stop", { was: ["nk-accent-to"] }),
  },
};

/** Gaps and paddings named by role. */
export const gapGroup: Group = {
  tier: "semantic",
  description: "Gaps and paddings named by role",
  levers: {
    cluster: length(ref("space.2"), "Icon + text, key + label", { was: ["nk-gap-cluster"] }),
    items: length(ref("space.1"), "Items in a bar", { was: ["nk-gap-items"] }),
    "pad-x": length(ref("space.3"), "Inline padding of anything labelled", { was: ["nk-pad-x"] }),
    surface: length(ref("space.6"), "Padding of a surface (dialog body, sheet column)", { was: ["nk-pad-surface"] }),
  },
};

/** Lines: stroke, clip and focus. */
export const lineGroup: Group = {
  tier: "semantic",
  description: "Hairlines, clips and the caret rim",
  levers: {
    width: length(ref("shape.stroke"), "Every hairline", { was: ["nk-border"] }),
    focus: color(pal("ring"), "A text field's caret rim (and a checkbox's or switch's lit rim): the only focus line", { was: ["nk-focus-rim"] }),
    clip: string("none", "clip-path of panels: the shape.cut chamfer, or none", { derived: true, floor: true, was: ["nk-clip"] }),
    "clip-sm": string("none", "clip-path of chips, tiles and buttons: half the chamfer", { derived: true, floor: true, was: ["nk-clip-sm"] }),
    glow: length("1rem", "Blur radius of a row's glow (a chip's is 0.75 of it, a meter's 0.625)", { floor: true, was: ["nk-glow-radius"] }),
  },
};

/** Derived shadows from identity keywords. */
export const depthGroup: Group = {
  tier: "semantic",
  description: "Shadows the identity's keywords name, in scrim colour",
  levers: {
    elevation: shadow(css`0 0.25rem 0 0 ${alpha("scrim", 0.5)}`, "The box-shadow surface.elevation names (compileTheme writes the recipe)", { derived: true, rule: "from surface.elevation", was: ["nk-elevation-shadow"] }),
    text: shadow(css`0 1px 2px ${alpha("scrim", 0.6)}`, "The text-shadow hud.text names (compileTheme writes the recipe)", { derived: true, rule: "from hud.text", was: ["nk-hud-shadow"] }),
  },
};

/** Legibility: the materials' alphas, lifted toward opaque by day. */
export const alphaGroup: Group = {
  tier: "semantic",
  description: "Each material's effective alpha (day lifts it toward opaque)",
  levers: {
    day: number(0, "1 while day legibility applies (set by kit.css rules)", { range: [0, 1], floor: true, was: ["nk-day"] }),
    hud: number(css`calc(${ref("material.hud.opacity")} + (1 - ${ref("material.hud.opacity")}) * ${ref("surface.legibility-lift")} * ${ref("alpha.day")})`, "The HUD's alpha", { was: ["nk-hud-alpha"] }),
    menu: number(css`calc(${ref("material.menu.opacity")} + (1 - ${ref("material.menu.opacity")}) * ${ref("surface.legibility-lift")} * ${ref("alpha.day")})`, "Menus', sheets' and dialogs' alpha", { was: ["nk-menu-alpha"] }),
  },
};

/** The theme's own colours, resolved where they are declared, so a panel inside nk-on-game can restore them. */
export const restoreGroup: Group = {
  tier: "semantic",
  description: "The theme's colours, kept for panels drawn inside an on-game subtree",
  levers: {
    "muted-foreground": color(pal("muted-foreground"), "muted-foreground, as the theme set it", { was: ["nk-theme-muted-foreground"] }),
    "muted-foreground-rgb": string(pal("muted-foreground", "rgb"), "Its channels", { was: ["nk-theme-muted-foreground-rgb"] }),
    "muted-foreground-a": string(pal("muted-foreground", "a"), "Its alpha", { was: ["nk-theme-muted-foreground-a"] }),
    background: color(pal("background"), "background, as the theme set it", { was: ["nk-theme-background"] }),
    "background-rgb": string(pal("background", "rgb"), "Its channels", { was: ["nk-theme-background-rgb"] }),
    "background-a": string(pal("background", "a"), "Its alpha", { was: ["nk-theme-background-a"] }),
  },
};

export const SEMANTIC = {
  time: timeGroup,
  ease: easeGroup,
  spring: springGroup,
  stagger: staggerGroup,
  gesture,
  plate: plateGroup,
  fill: fillGroup,
  accent: accentGroup,
  gap: gapGroup,
  line: lineGroup,
  depth: depthGroup,
  alpha: alphaGroup,
  restore: restoreGroup,
} as const;

void times;
