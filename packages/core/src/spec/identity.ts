/**
 * Identity: what a server chooses. The only tier with literal defaults, and those defaults are the flat baseline
 * (docs/design.md): compileTheme("") already draws upright controls with no wall, solid fills, hard drops, two
 * voices and one sliding selection. A theme is a handful of values on top.
 */
import { angle, color, css, ease, font, keyword, length, lit, number, pal, ref, shadow, time, times, type Group, type LeverDef, type Value } from "./lang";
import { ROLE_DEFAULTS, ROLES } from "./roles";

const MS: [number, number] = [0, 60000];

/**
 * The palette: the v1 contract, shadcn's own names (a TweakCN paste is a theme) plus the game families. The compiler
 * fills what a theme leaves out (stock neutral, then the rules below), lowers every colour to rgb() and writes the
 * -rgb / -a channels next to each. Never declared by kit.css.
 */
export const palette: Group = {
  tier: "identity",
  prefix: "",
  description: "Colours: shadcn's set and the game's (status, HUD, scrim, world, vitals, roles)",
  levers: {
    background: color(lit("oklch(0.145 0 0)"), "Full-screen surfaces (pause, loading, death scrim)", { rule: "stock shadcn neutral", core: true }),
    foreground: color(lit("oklch(0.985 0 0)"), "Text on full-screen surfaces", { rule: "stock shadcn neutral", core: true }),
    card: color(lit("oklch(0.205 0 0)"), "Raised blocks on a full-screen surface", { rule: "stock shadcn neutral" }),
    "card-foreground": color(lit("oklch(0.985 0 0)"), "Text on cards", { rule: "stock shadcn neutral" }),
    popover: color(lit("oklch(0.205 0 0)"), "Every floating panel", { rule: "stock shadcn neutral", core: true }),
    "popover-foreground": color(lit("oklch(0.985 0 0)"), "Text in panels", { rule: "stock shadcn neutral", core: true }),
    primary: color(lit("oklch(0.922 0 0)"), "The one main action per surface, the primary face, selection", { rule: "stock shadcn neutral", core: true }),
    "primary-foreground": color(lit("oklch(0.205 0 0)"), "Text on primary", { rule: "stock shadcn neutral", core: true }),
    secondary: color(lit("oklch(0.269 0 0)"), "Secondary buttons", { rule: "stock shadcn neutral" }),
    "secondary-foreground": color(lit("oklch(0.985 0 0)"), "Text on secondary", { rule: "stock shadcn neutral" }),
    muted: color(lit("oklch(0.269 0 0)"), "Tracks, slots and wells inside a panel", { rule: "stock shadcn neutral", core: true }),
    "muted-foreground": color(lit("oklch(0.708 0 0)"), "Secondary text", { rule: "stock shadcn neutral", core: true }),
    accent: color(lit("oklch(0.269 0 0)"), "Hover tint", { rule: "stock shadcn neutral" }),
    "accent-foreground": color(lit("oklch(0.985 0 0)"), "Text on accent", { rule: "stock shadcn neutral" }),
    destructive: color(lit("oklch(0.704 0.191 22.216)"), "Danger, damage, low values, death", { rule: "stock shadcn neutral", core: true }),
    "destructive-foreground": color(lit("oklch(0.985 0 0)"), "Text on destructive", { rule: "foreground or background, whichever contrasts more" }),
    border: color(lit("oklch(1 0 0 / 10%)"), "Hairlines", { rule: "stock shadcn neutral", core: true }),
    input: color(lit("oklch(1 0 0 / 15%)"), "Field borders", { rule: "stock shadcn neutral" }),
    ring: color(lit("oklch(0.556 0 0)"), "A text field's caret rim", { rule: "stock shadcn neutral" }),
    "chart-1": color(lit("oklch(0.87 0 0)"), "Categorical colour 1", { rule: "stock shadcn neutral" }),
    "chart-2": color(lit("oklch(0.556 0 0)"), "Categorical colour 2", { rule: "stock shadcn neutral" }),
    "chart-3": color(lit("oklch(0.439 0 0)"), "Categorical colour 3", { rule: "stock shadcn neutral" }),
    "chart-4": color(lit("oklch(0.371 0 0)"), "Categorical colour 4", { rule: "stock shadcn neutral" }),
    "chart-5": color(lit("oklch(0.269 0 0)"), "Categorical colour 5", { rule: "stock shadcn neutral" }),
    radius: length(lit("0.75rem"), "The radius scale's base: every radius step derives from it", { rule: "0.75rem", core: true }),
    brand: color(lit("var(--primary)"), "The server's signature: active marks, needles, the accent's stops", { rule: "primary if chromatic (OKLCH C ≥ 0.06), else chart-1", core: true }),
    "brand-foreground": color(lit("var(--primary-foreground)"), "Text on brand", { rule: "foreground or background, whichever contrasts more" }),
    success: color(lit("oklch(0.7 0.17 150)"), "Positive status", { rule: "green at the lightness / chroma of destructive" }),
    "success-foreground": color(lit("var(--background)"), "Text on success", { rule: "whichever contrasts more" }),
    warning: color(lit("oklch(0.78 0.17 75)"), "Caution status", { rule: "amber at the lightness / chroma of destructive" }),
    "warning-foreground": color(lit("var(--background)"), "Text on warning", { rule: "whichever contrasts more" }),
    info: color(lit("var(--primary)"), "Neutral status", { rule: "primary" }),
    "info-foreground": color(lit("var(--primary-foreground)"), "Text on info", { rule: "primary-foreground" }),
    hud: color(lit("rgba(0, 0, 0, 0.45)"), "Surfaces drawn straight on the game: HUD chips, hotbar", { rule: "rgba(0, 0, 0, 0.45)", core: true }),
    "hud-foreground": color(lit("rgb(255, 255, 255)"), "Text and icons on hud", { rule: "white" }),
    scrim: color(lit("rgb(0, 0, 0)"), "Darkens the game; shadows and walls; always used with opacity", { rule: "black" }),
    surface: color(lit("var(--popover)"), "The panel colour, tinted toward brand by surface.tint", { rule: "mix(popover, brand, surface.tint)", derived: true }),
    "world-foreground": color(lit("rgb(255, 255, 255)"), "Text drawn straight on the game, light in every theme", { rule: "white" }),
    "world-foreground-muted": color(lit("rgba(255, 255, 255, 0.8)"), "Secondary text on the game", { rule: "world-foreground at 80%" }),
    "world-success": color(lit("var(--success)"), "A gain drawn on the game", { rule: "success, OKLCH L ≥ 0.7" }),
    "world-destructive": color(lit("var(--destructive)"), "A loss drawn on the game", { rule: "destructive, OKLCH L ≥ 0.7" }),
    "vital-health": color(lit("oklch(0.68 0.21 25)"), "Health", { rule: "chart-1 if red, else another red chart, else destructive if red, else oklch(0.68 0.21 25)" }),
    "vital-armor": color(lit("oklch(0.68 0.16 250)"), "Armor", { rule: "a blue chart colour, else oklch(0.68 0.16 250)" }),
    "vital-hunger": color(lit("oklch(0.78 0.16 70)"), "Hunger", { rule: "an amber chart colour, else oklch(0.78 0.16 70)" }),
    "vital-thirst": color(lit("oklch(0.76 0.13 215)"), "Thirst", { rule: "a cyan chart colour, else oklch(0.76 0.13 215)" }),
    "world-shadow": shadow(lit("0 1px 2px rgba(0, 0, 0, 0.65), 0 0 0.5rem rgba(0, 0, 0, 0.35)"), "Text-shadow that keeps world-foreground legible over any frame", { rule: "a tight dark edge plus a soft halo" }),
    "pause-surface": color(lit("rgb(246, 247, 249)"), "The slash pause panel's light surface (style.pause: slash)", { rule: "rgb(246, 247, 249)", was: ["nk-pause-surface"] }),
    "pause-ink": color(lit("rgb(14, 16, 20)"), "Text on the slash pause panel", { rule: "rgb(14, 16, 20)", was: ["nk-pause-ink"] }),
    "vital-stress": color(lit("oklch(0.68 0.2 320)"), "Stress", { rule: "a magenta chart colour, else oklch(0.68 0.2 320)" }),
    ...Object.fromEntries(
      ROLES.flatMap((r) => {
        const d = ROLE_DEFAULTS[r]!;
        const rule = typeof d === "string" ? d : `oklch(${d.join(" ")})`;
        return [
          [`role-${r}`, color(lit(typeof d === "string" ? `var(--${d})` : `oklch(${d.join(" ")})`), `Role ${r}: the --hue-* ramp under data-hue="${r}"`, { rule })],
          [`role-${r}-deep`, color(lit(`var(--role-${r})`), `${r}, darker: the ramp's deep step`, { rule: `role-${r}, OKLCH L − 0.12`, derived: true })],
          [`role-${r}-light`, color(lit(`var(--role-${r})`), `${r}, lighter: the ramp's gradient start`, { rule: `role-${r}, OKLCH L + 0.1`, derived: true })],
        ];
      }),
    ),
  },
};

/** Faces: shadcn's own --font-* names. */
export const fonts: Group = {
  tier: "identity",
  prefix: "font",
  description: "The four faces every voice picks from",
  levers: {
    sans: font(lit('Geist, Inter, "Segoe UI", system-ui, sans-serif'), "Sentences (the body voice)", { core: true }),
    display: font(lit('Geist, Inter, "Segoe UI", system-ui, sans-serif'), "Anything scanned: keys, titles, labels, captions (the body face unless a theme says otherwise)", { core: true }),
    numeric: font(lit('Geist, Inter, "Segoe UI", system-ui, sans-serif'), "Every number (always tabular)"),
    mono: font(lit('"Geist Mono", ui-monospace, monospace'), "Codes and IDs a player might type", { core: true }),
  },
};

/** Size and spacing multipliers. */
export const scale: Group = {
  tier: "identity",
  description: "How big and how roomy",
  levers: {
    $: number(1, "UI size multiplier (players scale further, 0.85–1.25)", { range: [0.5, 2], was: ["nk-scale"] }),
  },
};
export const density: Group = {
  tier: "identity",
  description: "Multiplies the spacing scale and the row, chip and slab heights",
  levers: {
    $: number(1, "Spacing multiplier: 0.75 compact … 1.3 roomy", { range: [0.75, 1.3], was: ["nk-density"], core: true }),
  },
};

/** The spacing scale: one step × density. */
export const space: Group = {
  tier: "identity",
  description: "The spacing scale: one step × density",
  levers: {
    unit: length(css`calc(0.25rem * ${ref("density")})`, "The spacing step", { was: ["nk-space-unit", "nk-space"] }),
    ...Object.fromEntries(
      [1, 2, 3, 4, 6, 8].map((n) => [String(n), length(n === 1 ? ref("space.unit") : times("space.unit", n), `${n} × the step`, { was: [`nk-space-${n}`] })]),
    ),
  },
};

/** The radius scale: four steps, no pill. From the palette's --radius, so a shape change re-derives them. */
export const radius: Group = {
  tier: "identity",
  description: "Four radius steps from --radius",
  levers: {
    key: length(css`max(0.25rem, calc(${pal("radius")} - 0.5rem))`, "Keys and small glyphs", { was: ["nk-r-key"] }),
    chip: length(css`max(0.25rem, calc(${pal("radius")} - 0.375rem))`, "Chips and badges", { was: ["nk-r-chip"] }),
    control: length(css`calc(${pal("radius")} - 0.25rem)`, "Buttons, fields, rows, the primary face", { was: ["nk-r-control"] }),
    surface: length(ref("material.menu.radius"), "Panels, sheets, dialogs", { was: ["nk-r-surface"] }),
  },
};

/** Heights. */
export const height: Group = {
  tier: "identity",
  description: "The height steps",
  levers: {
    key: length("1.5rem", "A key / small glyph", { was: ["nk-h-key"] }),
    chip: length(css`calc(1.75rem * ${ref("density")})`, "A chip / medium glyph", { was: ["nk-h-chip"] }),
    control: length("2.25rem", "Buttons and bar items / large glyph", { was: ["nk-h-control"] }),
    row: length(css`calc(3rem * ${ref("density")})`, "A list row", { was: ["nk-h-row"] }),
    field: length("2.75rem", "Text inputs, selects and dialog buttons", { was: ["nk-h-field"] }),
  },
};

/** Icons. */
export const icon: Group = {
  tier: "identity",
  description: "Icon sizes and stroke",
  levers: {
    sm: length("0.75rem", "Small icon", { was: ["nk-icon-sm"] }),
    md: length("1rem", "Icon next to text (the default)", { was: ["nk-icon-md"] }),
    lg: length("1.25rem", "Large icon", { was: ["nk-icon-lg"] }),
    stroke: number(1.5, "Stroke width of every icon (Hugeicons draw at 1.5)", { range: [0.5, 4], was: ["nk-icon-stroke"] }),
  },
};

/** The type scale: one base × type.ratio (no pow() in Chromium 103). */
export const text: Group = {
  tier: "identity",
  description: "Type sizes from one base × type.ratio",
  levers: {
    base: length("1rem", "Body size; every step derives from it", { was: ["nk-text-base"] }),
    key: length("0.8125rem", "The scan voice (keys, buttons, tabs)", { was: ["nk-text-key"] }),
    body: length(ref("text.base"), "Sentences", { was: ["nk-text-body"] }),
    label: length(css`max(0.8125rem, calc(${ref("text.base")} / ${ref("type.ratio")}))`, "Labels and captions", { was: ["nk-text-label", "nk-caption-size", "nk-label-size"] }),
    title: length(css`calc(${ref("text.base")} * (1 + (${ref("type.ratio")} - 1) / 2))`, "Panel titles (≈ base × √ratio)", { was: ["nk-text-title", "nk-panel-title-size", "nk-heading-size"] }),
    section: length(css`calc(${ref("text.base")} * ${ref("type.ratio")} * ${ref("type.ratio")})`, "Section and sheet titles", { was: ["nk-text-section"] }),
    display: length(css`calc(${ref("text.base")} * ${ref("type.ratio")} * ${ref("type.ratio")} * ${ref("type.ratio")} * ${ref("type.ratio")} * 1.1)`, "Full-screen titles", { was: ["nk-text-display", "nk-display-size"] }),
    figure: length(ref("text.display"), "A number that is the point (the figure style); a component re-points it for its size", {}),
    hud: length(css`max(1.125rem, calc(${ref("text.base")} * ${ref("type.ratio")}))`, "HUD values read in motion", { was: ["nk-hud-value-size"] }),
    row: length("1.125rem", "A row or notice title (the label voice)", { was: ["nk-row-title-size"] }),
    desc: length("0.875rem", "A row or notice description (the body voice)", { was: ["nk-row-desc-size"] }),
  },
};

/** Line heights. */
export const leading: Group = {
  tier: "identity",
  description: "Line heights",
  levers: {
    tight: length("1rem", "Small text: captions, labels, descriptions", { was: ["nk-leading-tight"] }),
    normal: length("1.25rem", "Body-size text: rows, notices, slabs", { was: ["nk-leading-normal"] }),
    title: number(1.3, "Titles and sections (a ratio of the size)", { range: [1, 2] }),
    display: number(1.15, "Full-screen titles and HUD values (a ratio of the size)", { range: [1, 2] }),
    figure: number(1, "A number that is the point: a clock, a balance, the speed (a ratio of the size)", { range: [0.8, 2] }),
  },
};

/** Geometry every shape shares. */
export const shape: Group = {
  tier: "identity",
  description: "Slant, chamfer and hairline weight",
  levers: {
    skew: angle("0deg", "The slant of faces (keys, the primary button, the selection; boxes and text stay upright): 0 = upright, at most ±20deg", { range: [-20, 20], was: [], core: true }),
    slab: angle("0deg", "Chips, badges and tags drawn as skewed slabs too (0deg = upright); at most ±20deg", { range: [-20, 20], attr: "skew", was: ["nk-skew"] }),
    cut: length("0px", "Chamfered corners (top left, bottom right) as clip-path; 0 = off", { was: ["nk-cut"], core: true }),
    stroke: length("1px", "Hairline weight of plates, rims and fields", { was: ["nk-border-width"], core: true }),
  },
};

const voice = (family: string, weight: Value, tracking: Value, kase: boolean, slant: boolean, pad: boolean, what: string, was: string): Record<string, LeverDef> => ({
  family: font(ref(family), `Face of the ${what}`, { was: [`nk-type-${was}-family`, ...(was === "title" ? ["nk-heading-font"] : was === "num" ? ["nk-num-font"] : was === "label" ? ["nk-caption-font", "nk-label-font"] : [])] }),
  style: keyword(["normal", "italic"], slant ? ref("type.slant") : lit("normal"), `Slant of the ${what}`, { was: [`nk-type-${was}-style`] }),
  weight: number(weight, `Weight of the ${what}`, { range: [100, 900], was: [`nk-type-${was}-weight`, ...(was === "title" ? ["nk-heading-weight"] : [])] }),
  tracking: length(tracking, `Letter-spacing of the ${what}`, { was: [`nk-type-${was}-tracking`, ...(was === "title" ? ["nk-heading-tracking"] : was === "num" ? ["nk-num-tracking"] : [])] }),
  case: keyword(["none", "uppercase"], kase ? ref("type.case") : lit("none"), `Case of the ${what}`, { was: [`nk-type-${was}-case`] }),
  ...(pad ? { pad: length(ref("type.overhang"), `Trailing pad of the ${what} (the italic overhang)`, { was: [`nk-type-${was}-pad`] }) } : {}),
});

/** Type identity: what the voices are made of. */
export const type: Group = {
  tier: "identity",
  description: "The type scale's ratio, the three weights, tracking, case and slant",
  levers: {
    ratio: number(1.25, "Step between type sizes: 1.125 calm … 1.333 dramatic", { range: [1, 1.6], was: ["nk-type-ratio", "nk-ratio"], core: true }),
    "weight-body": number(400, "Sentences", { range: [100, 900], was: ["nk-weight-body"] }),
    "weight-strong": number(500, "Captions, chips, slabs: text that must hold its own on the game", { range: [100, 900], was: ["nk-weight-strong", "nk-caption-weight", "nk-label-weight"] }),
    "weight-display": number(700, "Full-screen titles and big numbers", { range: [100, 900], was: ["nk-weight-display", "nk-display-weight"] }),
    "tracking-display": length("-0.02em", "Letter-spacing of full-screen titles", { was: ["nk-tracking-display", "nk-display-tracking"] }),
    "tracking-label": length("0.06em", "Letter-spacing of captions", { was: ["nk-tracking-label", "nk-caption-tracking"] }),
    case: keyword(["none", "uppercase"], "none", "Anything scanned (keys, titles, labels, captions) in caps or as written", { attr: "case", was: ["nk-label-case", "nk-heading-case", "nk-display-case", "nk-caption-case", "nk-caption-transform"], core: true }),
    slant: keyword(["normal", "italic"], "normal", "The scanned voices upright or italic (a real italic where the face has one)", { attr: "slant", was: ["nk-display-style"], core: true }),
    overhang: length("0em", "Trailing pad of a slanted voice (the italic's overhang); 0em when upright", { was: [] }),
    "overhang-clip": length(css`calc(${ref("type.overhang")} * 2 + 0.06em)`, "How far a clipped text window (TextRoll, a reel) reaches past its text on each side: twice the overhang, since a heavy slanted cap leans further than its trailing pad, plus a hair for antialiasing", {}),
  },
  // the five voices: two in practice, the display face for anything scanned and the sans for sentences
  parts: {
    scan: voice("font.display", lit("800"), lit("0.02em"), true, true, true, "scan voice (keys, buttons, tabs)", "scan"),
    title: voice("font.display", lit("800"), lit("0.02em"), true, true, true, "title voice (panel and row titles)", "title"),
    label: voice("font.display", lit("700"), lit("0.03em"), true, true, true, "label voice (labels, row titles)", "label"),
    num: voice("font.numeric", lit("700"), lit("0.01em"), false, true, true, "numeric voice", "num"),
    body: voice("font.sans", ref("type.weight-body"), lit("0em"), false, false, false, "body voice (sentences)", "body"),
  },
};

/** Surfaces over the game. */
export const surface: Group = {
  tier: "identity",
  description: "How surfaces sit over the game: opacity, tint, light, depth, glow",
  levers: {
    tint: number(0, "How much brand tints neutral surfaces", { range: [0, 0.12], was: ["nk-surface-tint"], core: true }),
    gradient: number(0, "Top-to-bottom light falloff (0 = flat)", { range: [0, 0.2], was: ["nk-surface-gradient"] }),
    elevation: keyword(["none", "soft", "deep", "hard"], "hard", "Shadow recipe: hard is a solid offset drop, no blur", { attr: "elevation", was: ["nk-elevation"], core: true }),
    glow: number(0, "Brand glow on active parts (alpha, 0 = off)", { range: [0, 1], was: ["nk-glow"] }),
    "glow-budget": number(1, "How many parts may glow at once (0 = no limit)", { range: [0, 8], was: ["nk-glow-budget"] }),
    backdrop: keyword(["on", "off"], "off", "Backdrop blur (FiveM draws it as a black box: off)", { attr: "backdrop", was: ["nk-backdrop"] }),
    legibility: keyword(["auto", "night", "day"], "auto", "day lifts surfaces for a bright sky; auto follows the game clock", { attr: "legibility", was: ["nk-legibility"] }),
    "legibility-lift": number(0.5, "How far day closes the gap to opaque", { range: [0, 1], was: ["nk-legibility-lift"] }),
  },
};

/** Materials: one per context. Defaults follow surface.* (the compiler fills them). */
export const material: Group = {
  tier: "identity",
  description: "Per context (hud: drawn on the game; menu: menus, sheets, dialogs): opacity, blur, radius, edge",
  levers: {},
  parts: Object.fromEntries(
    (["hud", "menu"] as const).map((ctx) => [
      ctx,
      {
        opacity: number(ctx === "hud" ? 0.8 : 0.94, `Opacity of the ${ctx} material${ctx === "menu" ? " (floor 0.92 for text)" : ""}`, { core: true, range: [0, 1], was: [`nk-material-${ctx}-opacity`, ...(ctx === "menu" ? ["nk-surface-opacity"] : ctx === "hud" ? ["nk-hud-opacity"] : [])] }),
        ...(ctx === "menu"
          ? {
              blur: length("0px", "Backdrop blur behind menus (with surface.backdrop on)", { was: ["nk-material-menu-blur"] }),
              radius: length(pal("radius"), "Corner radius of menus, sheets and dialogs", { was: ["nk-material-menu-radius"] }),
              edge: number(0, "The machined top edge of menus (alpha)", { range: [0, 0.3], was: ["nk-material-menu-edge", "nk-surface-edge"] }),
            }
          : {}),
      },
    ]),
  ),
};

/** The HUD over the game. */
export const hud: Group = {
  tier: "identity",
  description: "Text drawn on the game",
  levers: {
    text: keyword(["none", "soft", "strong"], "soft", "Shadow under text drawn on the game (semantic depth.text draws it)", { was: [], core: true }),
  },
};

/** Motion: one duration, one curve, a feel. The ladder (semantic time.*) is derived from them. */
export const motion: Group = {
  tier: "identity",
  description: "The base duration and curve the ladder derives from, the feel, the springs' bounce",
  levers: {
    $: number(1, "1 = animations on, 0 = off (painted 0 under the player's reduced-motion pref)", { range: [0, 1], was: ["nk-motion"] }),
    duration: time("180ms", "Base duration d: the ladder is snap 0.5d, fast 0.667d, base d, slow 1.556d, fill 2.333d", { range: [0, 2000], was: ["nk-duration"], core: true }),
    ease: ease("cubic-bezier(0.2, 0, 0, 1)", "The curve of anything arriving", { was: ["nk-ease"], core: true }),
    feel: keyword(["crisp", "snap", "smooth", "stepped"], "crisp", "How it moves: crisp, snap (flash instead of press scale), smooth (longer springs), stepped", { attr: "feel", was: ["nk-motion-feel"], core: true }),
    bounce: number(0, "Bounce folded into the snap, move and soft springs", { range: [0, 0.3], was: ["nk-spring-bounce"] }),
    "exit-factor": number(0.7, "Every exit is this × its enter", { range: [0.3, 1], was: ["nk-exit-factor"] }),
    reduced: time("100ms", "Under reduced motion every fade is at most this", { range: [0, 400], was: ["nk-time-reduced"] }),
    profile: keyword(["full", "reduced", "instant"], "full", "full: as designed; reduced: no movement, short fades; instant: nothing animates", { attr: "profile", was: ["nk-motion-profile"] }),
  },
};

/** Which drawing a family uses. Each is painted as data-nk-<attr> so kit.css can switch without branching on values. */
export const style: Group = {
  tier: "identity",
  description: "Which drawing each family uses",
  levers: {
    fill: keyword(["solid", "soft"], "solid", "Fills, the selection face and levels: solid (flat, vivid) or soft (a tint)", { attr: "fill", was: ["nk-fill-style"], core: true }),
    level: keyword(["bar", "ring", "liquid", "slab", "pips"], "liquid", "How a level (0–1) is drawn by vitals, meters, holds", { attr: "level", was: ["nk-level-style"], core: true }),
    hold: keyword(["bar", "ring", "fill"], "fill", "How a press-and-hold shows its progress", { attr: "hold", was: ["nk-hold-style"] }),
    gauge: keyword(["arc", "bar", "digital"], "digital", "How gauges are drawn", { attr: "gauge", was: ["nk-gauge-style"], core: true }),
    focus: keyword(["ring", "halo", "tint", "fill", "invert", "bar"], "halo", "Focus on parts that are not rows (rows and buttons light like hover)", { attr: "focus", was: ["nk-focus-style"], core: true }),
    vital: keyword(["auto", "pill", "value", "icon", "expand"], "expand", "What a vital chip shows (expand: the tag opens on a change)", { was: ["nk-vital-display"] }),
    "vital-icon": keyword(["vital", "uniform"], "uniform", "Vital icons: each vital's own colour, or the chip's ink", { was: ["nk-vital-icon"] }),
    "vital-neighbours": keyword(["push", "collapse", "overlay"], "push", "What a growing vital chip does to its neighbours", { was: ["nk-vital-neighbours"] }),
    pause: keyword(["sheet", "slash"], "sheet", "The pause menu: a full-height sheet, or a light slash panel", { attr: "pause", was: ["nk-pause-style"] }),
  },
};

/** Game behaviour a theme tunes (presentation timing and thresholds, never gameplay). */
export const behavior: Group = {
  tier: "identity",
  description: "Thresholds and how long things stay",
  levers: {
    alert: number(0.2, "A level at or under this is an alert (vitals, durability)", { range: [0, 1], was: ["nk-alert-threshold"], core: true }),
    rest: time("3000ms", "How long a changed HUD part stays open before it retracts (0 = never)", { range: MS, was: ["nk-rest-delay"] }),
  },
  parts: {
    notify: {
      info: time("4000ms", "How long an info notice stays", { range: MS, was: ["nk-notify-ms-info"] }),
      success: time("4000ms", "How long a success notice stays", { range: MS, was: ["nk-notify-ms-success"] }),
      warning: time("5000ms", "How long a warning stays", { range: MS, was: ["nk-notify-ms-warning"] }),
      danger: time("7000ms", "How long a danger notice stays", { range: MS, was: ["nk-notify-ms-danger"] }),
    },
  },
};

/** Role colour washes (the --hue-* ramp under data-hue). */
export const hue: Group = {
  tier: "identity",
  description: "Alphas of a role's line, tint, glow and alert wash",
  levers: {
    line: number(0.5, "A role's line (borders, tracks)", { range: [0, 1], was: ["nk-hue-line"] }),
    tint: number(0.1, "A role's tint (fills behind text)", { range: [0, 1], was: ["nk-hue-tint"] }),
    glow: number(0.25, "A role's glow (under the glow budget)", { range: [0, 1], was: ["nk-hue-glow"] }),
    alert: number(0.8, "A role's alert wash", { range: [0, 1], was: ["nk-hue-alert"] }),
  },
};

/** Stacking layers. A modal is the current surface + dim + dialog. */
export const layer: Group = {
  tier: "identity",
  description: "Stacking layers",
  levers: Object.fromEntries(
    ([["dim", 50], ["dialog", 60]] as const).map(([l, z]) => [l, number(z, `Stacking layer: ${l} (a modal is the current surface + dim + dialog)`, { range: [0, 100000], was: [`nk-z-${l}`] })]),
  ),
};

export const IDENTITY = { "": palette, font: fonts, scale, density, space, radius, height, icon, text, leading, shape, type, surface, material, hud, motion, style, behavior, hue, layer } as const;
