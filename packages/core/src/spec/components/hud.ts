/** On the game: chips, meters, gauges, slabs, the speedometer, the dial, holds and levels. */
import { alpha, color, css, length, number, pal, ref, shadow, string, type ComponentDef } from "../lang";

export const chip: ComponentDef = {
  description: "Always-on HUD chips and tiles on the game (nk-chip, nk-hud)",
  anatomy: ["icon", "count"],
  levers: {
    height: length(ref("height.chip"), "Height", { was: ["nk-chip-height"] }),
    padding: length(css`calc(${ref("space.unit")} * 2.5)`, "Inline padding", { was: ["nk-chip-padding"] }),
    radius: length(ref("radius.chip"), "Radius", { was: ["nk-chip-radius"] }),
    "hud-radius": length(css`max(0.25rem, calc(${pal("radius")} - 0.125rem))`, "A square HUD tile's radius (hotbar, target eye)", { was: ["nk-hud-radius"] }),
    bg: color(css`rgba(${pal("hud", "rgb")}, max(${pal("hud", "a")}, ${ref("alpha.hud")}))`, "The plate on the game", { was: ["nk-chip-bg"] }),
    fg: color(pal("hud-foreground"), "Text and icons", { was: ["nk-chip-fg", "nk-chip-foreground"] }),
    "font-size": length("0.875rem", "Text size", { floor: true, was: ["nk-chip-font-size"] }),
    weight: string(ref("type.weight-strong"), "Text weight", { was: ["nk-chip-weight"] }),
    "active-bg": color(pal("brand"), "An active chip's fill (rises from the bottom)", { was: ["nk-chip-active-bg"] }),
    "active-fg": color(pal("brand-foreground"), "An active chip's ink", { was: ["nk-chip-active-fg"] }),
    glow: shadow(css`0 0 calc(${ref("line.glow")} * 0.75) rgba(${pal("brand", "rgb")}, ${ref("surface.glow")})`, "An active chip's glow", { was: ["nk-chip-glow"] }),
    clip: string(ref("line.clip-sm"), "The chip's clip-path", { was: ["nk-chip-clip"] }),
    "text-shadow": shadow(ref("depth.text"), "Text drawn on the game", { was: ["nk-hud-text-shadow"] }),
  },
  state: {
    tone: { type: "color", description: "A chip's tone", was: ["nk-chip-tone"] },
    "tone-rgb": { type: "string", description: "A chip's tone channels", was: ["nk-chip-tone-rgb"] },
  },
};

export const meter: ComponentDef = {
  description: "Bars (Progress, nk-track); segmented when segments is 1",
  anatomy: ["label-row", "label", "value", "track", "fill", "segment", "icon", "cancel-key", "cancel-label"],
  levers: {
    radius: length("0.125rem", "The bar's radius", { floor: true, was: ["nk-meter-radius"] }),
    glow: shadow(css`0 0 calc(${ref("line.glow")} * 0.625) rgba(${pal("brand", "rgb")}, ${ref("surface.glow")})`, "The fill's glow", { was: ["nk-meter-glow"] }),
    segments: number(0, "1 = segmented, 0 = a continuous fill", { range: [0, 1], floor: true, was: ["nk-meter-segments"] }),
  },
  parts: {
    track: {
      color: color(alpha("scrim", 0.35), "The track behind the bar", { was: ["nk-meter-track"] }),
    },
    segment: {
      size: length("0.5rem", "One segment's length", { floor: true, was: ["nk-meter-segment"] }),
      gap: length("0.125rem", "The gap between segments", { floor: true, was: ["nk-meter-segment-gap"] }),
      color: color(css`rgba(${pal("popover", "rgb")}, calc(0.85 * ${ref("meter.segments")}))`, "The gap's colour (the panel showing through)", { was: ["nk-meter-gap"] }),
    },
  },
};

export const gauge: ComponentDef = {
  description: "Speedometer, RPM, fuel (style.gauge: arc | bar | digital)",
  anatomy: ["track", "fill", "needle", "tick", "redline", "value"],
  levers: {
    width: length(ref("fill.height"), "The arc's thickness", { was: ["nk-gauge-width"] }),
    ticks: number(0, "Tick marks: 1 on, 0 off", { range: [0, 1], floor: true, was: ["nk-gauge-ticks"] }),
    font: string(ref("type.num.family"), "The readout's face", { was: ["nk-gauge-font"] }),
  },
  parts: {
    track: { color: color(alpha("hud-foreground", 0.16), "The unlit arc", { was: ["nk-gauge-track-color"] }) },
    fill: { color: color(pal("brand"), "The lit arc", { was: ["nk-gauge-fill"] }) },
    needle: { color: color(pal("brand"), "The needle", { was: ["nk-gauge-needle"] }) },
    redline: { color: color(pal("destructive"), "The redline", { was: ["nk-gauge-redline"] }) },
    tick: {
      color: color(css`rgba(${pal("hud-foreground", "rgb")}, calc(0.55 * ${ref("gauge.ticks")}))`, "A minor tick", { was: ["nk-gauge-tick"] }),
      major: color(css`rgba(${pal("hud-foreground", "rgb")}, calc(0.9 * ${ref("gauge.ticks")}))`, "A major tick", { was: ["nk-gauge-tick-major"] }),
    },
  },
};

export const ring: ComponentDef = {
  description: "Progress rings: a Dial in segments, like the speedometer",
  inherits: ["dial"],
  anatomy: ["center", "label", "cancel", "cancel-label"],
  levers: {
    segments: number(24, "Segments in the ring", { range: [6, 60], floor: true, was: ["nk-ring-segments"] }),
    gap: number(4, "Degrees between segments", { range: [0, 12], floor: true, was: ["nk-ring-gap"] }),
  },
};

export const dial: ComponentDef = {
  description: "The dial under gauges and rings: a disc, ticks, a segmented track",
  anatomy: ["disc", "ticks", "track", "segments", "segment", "value", "needle", "center"],
  parts: {
    disc: {
      opacity: number(ref("alpha.hud"), "The disc's opacity under the arc", { range: [0, 1], was: ["nk-dial-disc-opacity"] }),
    },
  },
};

export const speedometer: ComponentDef = {
  description: "The speedometer: a segmented arc and rolling digits",
  inherits: ["dial", "gauge"],
  anatomy: ["readout", "speed", "digit", "unit", "foot"],
  levers: { segments: number(30, "Segments in the arc", { range: [6, 80], floor: true, was: ["nk-speedo-segments"] }) },
  parts: {
    digit: {
      dim: number(0.26, "A leading zero's opacity", { range: [0, 1], floor: true, was: ["nk-speedo-dim"] }),
      tracking: length("0.01em", "The digits' letter-spacing", { floor: true, was: ["nk-speedo-tracking"] }),
    },
  },
};

export const level: ComponentDef = {
  description: "How a level is drawn under style.level and style.hold (pips, the hold ring)",
  anatomy: ["pip", "hold"],
  parts: {
    pip: {
      size: length("10%", "One pip's width (10% = ten pips)", { floor: true, was: ["nk-pip-size"] }),
      gap: length("2px", "Between pips", { floor: true, was: ["nk-pip-gap"] }),
    },
    hold: { pad: length("2px", "The hold ring's thickness around a key", { floor: true, was: ["nk-hold-ring-pad"] }) },
  },
  state: {
    "fill-now": { type: "color", description: "The fill colour this state shows", was: ["nk-fill-now"] },
    "fill-ink": { type: "color", description: "The ink copy over a solid fill", was: ["nk-fill-ink"] },
    "fill-opacity": { type: "number", description: "The liquid's opacity under style.fill", was: ["nk-fill-opacity"] },
  },
};

export const slab: ComponentDef = {
  description: "Transient feedback on the game: item, prompt, progress, band (nk-slab*)",
  inherits: ["chip", "tile", "meter"],
  anatomy: ["tile", "delta", "key", "stack", "line", "band", "band-title"],
  levers: {
    height: length(css`calc(2.5rem * ${ref("density")})`, "Height", { was: ["nk-slab-height"] }),
    padding: string(css`0 calc(${ref("space.unit")} * 3)`, "Padding", { was: ["nk-slab-padding"] }),
    gap: length(css`calc(${ref("space.unit")} * 2.5)`, "Between its parts", { was: ["nk-slab-gap"] }),
    radius: length(ref("chip.radius"), "Radius", { was: ["nk-slab-radius"] }),
    clip: string(ref("chip.clip"), "clip-path", { was: ["nk-slab-clip"] }),
    bg: color(ref("chip.bg"), "The plate", { was: ["nk-slab-bg"] }),
    fg: color(ref("chip.fg"), "Text", { was: ["nk-slab-fg"] }),
    border: color(alpha("hud-foreground", 0.08), "The rim", { was: ["nk-slab-border"] }),
    "font-size": length(ref("text.base"), "Text size", { was: ["nk-slab-font-size"] }),
    weight: string(ref("type.weight-strong"), "Text weight", { was: ["nk-slab-weight"] }),
    "text-shadow": shadow("none", "Text shadow on the plate", { floor: true, was: ["nk-slab-text-shadow"] }),
    tone: string(pal("brand", "rgb"), "The accent's channels (a screen sets it per state on any ancestor)", { was: ["nk-slab-tone-rgb"] }),
  },
  parts: {
    tile: {
      size: length(css`calc(${ref("slab.height")} - ${ref("space.unit")} * 2)`, "The icon tile's size", { was: ["nk-slab-tile-size"] }),
      bg: color(alpha("hud-foreground", 0.1), "The icon tile", { was: ["nk-slab-tile-bg"] }),
      fg: color(ref("slab.fg"), "The icon", { was: ["nk-slab-tile-fg"] }),
      radius: length(css`max(0.125rem, calc(${ref("slab.radius")} - ${ref("space.unit")}))`, "The icon tile's radius", { was: ["nk-slab-tile-radius"] }),
    },
    delta: {
      font: string(ref("type.num.family"), "A delta's face", { was: ["nk-slab-delta-font"] }),
      up: color(pal("world-success"), "A gain", { was: ["nk-slab-delta-up"] }),
      down: color(pal("world-destructive"), "A loss", { was: ["nk-slab-delta-down"] }),
    },
    key: {
      size: length("1.5rem", "A key chip's size", { floor: true, was: ["nk-slab-key-size"] }),
      "font-size": length("0.8125rem", "A key chip's text", { floor: true, was: ["nk-slab-key-font-size"] }),
    },
    line: {
      height: length("0.1875rem", "The progress line's thickness", { floor: true, was: ["nk-slab-line-height"] }),
      radius: length(ref("meter.radius"), "Its radius", { was: ["nk-slab-line-radius"] }),
      track: color(alpha("hud-foreground", 0.18), "Its track", { was: ["nk-slab-line-track"] }),
    },
    stack: {
      width: length("20rem", "The progress stack's width", { floor: true, was: ["nk-slab-stack-width"] }),
      gap: length(css`calc(${ref("space.unit")} * 2)`, "Between its rows", { was: ["nk-slab-stack-gap"] }),
    },
    band: {
      padding: string(css`calc(${ref("space.unit")} * 3) calc(${ref("space.unit")} * 6)`, "The band's padding", { was: ["nk-slab-band-padding"] }),
      gap: length(ref("space.unit"), "Between its lines", { was: ["nk-slab-band-gap"] }),
      bg: color(alpha("scrim", 0.62), "The game, darkened", { was: ["nk-slab-band-bg"] }),
      tint: number(0.3, "The tone's alpha over the band", { range: [0, 1], floor: true, was: ["nk-slab-band-tint"] }),
      edge: number(0.6, "The tone's alpha on its edges", { range: [0, 1], floor: true, was: ["nk-slab-band-edge"] }),
      fg: color(pal("hud-foreground"), "Text", { was: ["nk-slab-band-fg"] }),
    },
    "band-title": { size: length(ref("text.section"), "The band's line", { was: ["nk-slab-band-title-size"] }) },
  },
  state: {
    fill: { type: "color", description: "A skewed part's fill", was: ["nk-slab-fill"] },
    stroke: { type: "shadow", description: "A skewed part's stroke", was: ["nk-slab-stroke"] },
    progress: { type: "number", description: "The line's progress (0–1, inline)", was: ["nk-slab-progress"] },
    "line-fill": { type: "color", description: "The line's fill (unset: the tone)", was: ["nk-slab-line-fill"] },
  },
};
