/**
 * Glyph: the control face. One object everywhere a thing is pressable or selected: Kbd, a notice icon, a telltale, the
 * primary button, the list's selection. A face (skewed, rimmed, top-lit) over a wall (the face's colour in shade,
 * dropped straight down), optionally on an offset plate.
 */
import { alpha, angle, color, css, font, length, number, pal, paint, ref, shadow, string, time, type ComponentDef } from "../lang";

export const control: ComponentDef = {
  description: "The Glyph: Kbd, notice icons, telltales, the primary button and the selection",
  // render order: the plate behind, the wall, the face, then what sits on it
  anatomy: ["plate", "wall", "face", "fill", "legend", "tag", "group", "primary"],
  parts: {
    plate: {
      color: color(pal("border"), "The solid plate behind the face", { was: ["nk-control-plate"] }),
      dim: color(ref("control.plate.color"), "The plate on the HUD", { was: ["nk-control-plate-dim"] }),
      x: length("0px", "How far the plate sits right of the face (0 = none)", { floor: true, was: ["nk-control-plate-x"] }),
      y: length("0px", "How far the plate sits below the face (0 = none)", { floor: true, was: ["nk-control-plate-y"] }),
      press: length("1px", "How far a held glyph presses toward its plate", { floor: true, was: ["nk-control-press"] }),
    },
    wall: {
      height: length("0rem", "How far the face sits above its wall (0 = flat; the primary button, the selection)", { floor: true, was: ["nk-control-wall", "nk-button-wall"] }),
      shade: number(0.45, "How dark the wall is (the scrim over the face colour)", { range: [0, 1], floor: true, was: ["nk-control-wall-shade"] }),
    },
    face: {
      color: color(pal("muted"), "The face", { was: ["nk-control-face", "nk-key-bg"] }),
      ink: color(pal("popover-foreground"), "The legend's colour on the face", { was: ["nk-control-ink", "nk-key-fg"] }),
      light: color(alpha("popover-foreground", 0), "The face's top hairline (transparent = flat)", { was: ["nk-control-light"] }),
      shade: color(alpha("scrim", 0), "The face's bottom inner shade", { was: ["nk-control-shade"] }),
      rim: color(alpha("foreground", 0.32), "The face's rim", { was: ["nk-control-rim", "nk-key-border"] }),
      "rim-focus": color(alpha("foreground", 0.4), "The rim while lit", { was: ["nk-control-rim-focus"] }),
      radius: length(ref("radius.key"), "The face's radius", { was: ["nk-key-radius"] }),
      skew: angle(ref("shape.skew"), "The face's slant (the box stays upright)", { was: ["nk-control-skew"] }),
      shadow: shadow(css`inset 0 -1px 0 0 ${ref("control.face.shade")}, inset 0 1px 0 0 ${ref("control.face.light")}`, "The face's inner light and shade", { was: ["nk-key-shadow"] }),
      clip: string(ref("line.clip-sm"), "The face's clip-path (the chamfer)", { was: ["nk-key-clip"] }),
      confirm: color(pal("foreground"), "The face when confirmed", { was: ["nk-control-confirm-face"] }),
      "confirm-ink": color(pal("background"), "The legend when confirmed", { was: ["nk-control-confirm-ink"] }),
      active: paint(ref("accent.paint"), "The face of an active glyph (the mic while talking, N on the compass, a checked box)", { was: ["nk-control-active"] }),
      hold: color(alpha("foreground", 0.35), "The hold fill over the face", { was: ["nk-control-hold"] }),
    },
    legend: {
      font: font(ref("type.scan.family"), "The legend's face", { was: ["nk-key-font"] }),
      weight: number(ref("type.scan.weight"), "The legend's weight", { range: [100, 900], was: ["nk-key-weight"] }),
      pad: length(css`calc(${ref("type.scan.pad")} / 2)`, "The italic overhang split to both sides", { was: ["nk-control-legend-pad"] }),
      shift: length("0em", "A nudge for a leaning face", { floor: true, was: ["nk-control-legend-shift"] }),
      gap: length(ref("space.1"), "Between a glyph's characters", { was: ["nk-control-gap"] }),
      inset: length(ref("space.1"), "The legend's inline padding", { was: ["nk-control-pad"] }),
    },
    tag: {
      delay: time("80ms", "The tag opens this long after the glyph lands", { floor: true, was: ["nk-control-tag-delay"] }),
    },
    primary: {
      color: color(pal("primary"), "The primary face under style.fill solid (the primary button, the lit row, the active tab)", { was: ["nk-control-key"] }),
      ink: color(pal("primary-foreground"), "Text on the primary face", { was: ["nk-control-primary-ink"] }),
      rim: color("transparent", "The primary face's rim (transparent = none)", { floor: true, was: ["nk-control-primary-rim"] }),
      radius: length(ref("radius.control"), "The primary face's radius", { was: ["nk-control-radius"] }),
      tint: number(0.16, "The face's opacity under style.fill soft", { range: [0, 1], floor: true, was: ["nk-control-tint"] }),
      inset: length("0.375rem", "How far the selection sits in from its item's sides (room for the skew)", { floor: true, was: ["nk-control-inset"] }),
      lift: length("1px", "How far the face rises on hover and focus", { floor: true, was: ["nk-control-lift"] }),
      press: number(0.67, "How far a pressed primary sinks, as a fraction of its wall", { range: [0, 1.5], floor: true, was: ["nk-control-press-ratio"] }),
      overhang: length("0.25rem", "How far a row's selection reaches past its text", { floor: true, was: ["nk-control-overhang"] }),
    },
  },
  state: {
    "now-face": { type: "color", description: "The face colour this state shows", was: ["nk-control-face-now"] },
    "now-ink": { type: "color", description: "The ink this state shows", was: ["nk-control-ink-now"] },
    "now-rim": { type: "color", description: "The rim this state shows", was: ["nk-control-rim-now"] },
    "now-plate": { type: "color", description: "The plate this state shows", was: ["nk-control-plate-now"] },
    x: { type: "length", description: "The face's press offset, x", was: ["nk-control-x"] },
    y: { type: "length", description: "The face's press offset, y", was: ["nk-control-y"] },
    "sel-face": { type: "color", description: "The selection face this tone shows", was: ["nk-sel-face"] },
    "sel-wall": { type: "color", description: "The selection wall this tone shows", was: ["nk-sel-wall"] },
    "sel-shade": { type: "number", description: "The selection wall's shade this tone shows", was: ["nk-sel-shade"] },
    "sel-ink": { type: "color", description: "The selection ink this tone shows", was: ["nk-sel-ink"] },
    "sel-rim": { type: "color", description: "The selection rim this tone shows", was: ["nk-sel-rim"] },
    "sel-shape": { type: "keyword", description: "The selection's shape: its own, or inherit (the host's)", was: ["nk-sel-shape"] },
    "host-radius": { type: "length", description: "The radius of what the selection sits on (shape inherit)", was: ["nk-host-radius"] },
    "host-clip": { type: "string", description: "The clip-path of what the selection sits on", was: ["nk-host-clip"] },
    tone: { type: "color", description: "A glyph's tone (data-tone, data-hue)", was: ["nk-control-tone"] },
  },
};
