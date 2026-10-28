/** Rows: the list row (nk-row), menu rows, the selection, captions. */
import { alpha, color, css, length, number, pal, ref, shadow, string, time, type ComponentDef } from "../lang";

export const row: ComponentDef = {
  description: "The list row (nk-row): generous padding, an icon tile column, two voices; lit on the keycap Glyph",
  inherits: ["control"],
  anatomy: ["icon", "title", "description", "trail", "bar"],
  levers: {
    height: length(ref("height.row"), "A single-line row's minimum height", { was: ["nk-row-height"] }),
    radius: length(ref("radius.control"), "The row's radius", { was: ["nk-row-radius"] }),
    clip: string(ref("line.clip-sm"), "The row's clip-path", { was: ["nk-row-clip"] }),
    "pad-y": length(ref("space.2"), "Block padding", { was: ["nk-row-pad-y"] }),
    "pad-x": length(ref("space.3"), "Inline padding", { was: ["nk-row-pad-x"] }),
    padding: string(css`${ref("row.pad-y")} ${ref("row.pad-x")}`, "Both paddings", { was: ["nk-row-padding"] }),
    gap: length(ref("space.4"), "Between the icon tile, the text and the trail", { was: ["nk-row-gap"] }),
    "font-size": length(ref("text.base"), "The row's text size", { was: ["nk-row-font-size"] }),
    accent: color(pal("brand"), "The colour that marks the active row or slot (an outline, a hold ring)", { was: ["nk-row-indicator-color"] }),
  },
  parts: {
    icon: { box: length("2rem", "The icon tile beside the title (the icon inside is icon.md)", { floor: true, was: ["nk-row-icon-box"] }) },
    bar: {
      width: length("0.1875rem", "The focus bar's width (style.focus: bar)", { floor: true, was: ["nk-row-bar-width", "nk-row-bar-thickness"] }),
    },
  },
};

export const list: ComponentDef = {
  description: "A list of selectable items (nk-list, MenuRowList): items a gap apart so a lit tile never touches its neighbour",
  inherits: ["control"],
  anatomy: ["item"],
  levers: {
    gap: length(css`calc(${ref("control.wall.height")} + ${ref("space.1")})`, "Between items: the wall plus breathing room", { was: ["nk-list-gap"] }),
    "pad-x": length(css`calc(${ref("control.primary.inset")} + ${ref("control.primary.overhang")})`, "Inline padding: room for the tile's inset and skew", { was: ["nk-list-pad-x"] }),
  },
};

export const menuRow: ComponentDef = {
  description: "A menu row: icon or image, title and description, progress, meta, a stepper or value, actions",
  inherits: ["row", "control"],
  anatomy: ["image", "icon", "body", "title", "description", "progress", "meta", "stepper", "value", "actions", "chevron", "details", "list"],
  levers: { gap: length(ref("space.1"), "Between a trail's controls", { was: ["nk-menu-row-gap"] }) },
  parts: {
    image: { size: length("2rem", "An image's box", { floor: true, was: ["nk-menu-row-image"] }) },
    progress: { height: length("0.25rem", "The progress bar's height", { floor: true, was: ["nk-menu-row-bar-h"] }) },
    details: { width: length("16rem", "The details flyout's width", { floor: true }) },
    value: { width: length("3rem", "The value column's minimum width", { floor: true, was: ["nk-menu-row-value-w"] }) },
  },
};

export const selection: ComponentDef = {
  description: "The one sliding selection tile per list (nk-indicator, Selection)",
  inherits: ["control"],
  anatomy: ["glyph"],
  levers: {
    time: time(ref("time.base"), "How long the tile glides", { was: ["nk-indicator-time"] }),
    ease: string(ref("ease.move"), "The glide's curve", { was: ["nk-indicator-ease"] }),
  },
};

export const field: ComponentDef = {
  description: "Text fields and the smooth caret (SmoothInput)",
  anatomy: ["control", "mirror", "marker", "caret"],
  parts: {
    marker: {
      height: length("1.15em", "The marker the caret reads its box from: a line's height", { floor: true }),
      drop: length("-0.2em", "How far the marker sits below the baseline", { floor: true }),
    },
    caret: {
      color: color(pal("primary"), "The drawn caret"),
      radius: length(ref("radius.key"), "The drawn caret's corners"),
      blink: time("1100ms", "One breath of the caret at rest", { floor: true }),
      "blink-delay": time("500ms", "How long the caret stays solid after typing or moving", { floor: true }),
      "blink-dim": number(0.15, "The caret's opacity at the bottom of its breath", { range: [0, 1], floor: true }),
      width: length("0.125rem", "The drawn caret's width", { floor: true, was: ["nk-caret-width"] }),
      time: time(ref("time.base"), "The caret's glide", { was: ["nk-caret-time"] }),
      ease: string(ref("ease.move"), "The caret's curve", { was: ["nk-caret-ease"] }),
    },
    mirror: {
      rise: length("0.45em", "How far a typed character rises in", { floor: true, was: ["nk-type-in-distance"] }),
      in: time(ref("time.slow"), "A typed character's entrance", { was: ["nk-type-in-time"] }),
      out: time(ref("time.exit"), "A deleted character's exit", { was: ["nk-type-out-time"] }),
    },
  },
};

export const stepper: ComponentDef = {
  description: "A value between two keycaps; held, it repeats",
  inherits: ["control"],
  anatomy: ["glyph", "value"],
  levers: {
    delay: time("350ms", "The first repeat of a held keycap", { floor: true, was: ["nk-stepper-delay"] }),
    rate: time("70ms", "Then one repeat every", { floor: true, was: ["nk-stepper-rate"] }),
  },
};

export const text: ComponentDef = {
  description: "Rich text with inline keycaps",
  inherits: ["control"],
  anatomy: ["key"],
  parts: { key: { scale: number(1, "The inline keycap's size, × height.key", { range: [0.5, 2], floor: true, was: ["nk-inline-key-scale"] }) } },
};

void alpha;
