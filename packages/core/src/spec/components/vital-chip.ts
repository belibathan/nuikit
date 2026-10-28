/** VitalChip: one vital as a Glyph with a level inside and a tag that slides out from behind it. */
import { length, number, type ComponentDef } from "../lang";

export const vitalChip: ComponentDef = {
  description: "One vital: a Glyph, its level, its icon, and the tag that slides out from behind it",
  inherits: ["control"],
  anatomy: ["row", "shape", "plate", "wall", "face", "track", "level", "liquid", "line", "activefill", "lit", "icon", "icon-ink", "glyph", "label", "name", "pop"],
  levers: {
    size: length("2.125rem", "The chip's box", { floor: true, was: ["vital-size"] }),
    "size-sm": length("1.625rem", "A small chip's box (telltales, compass marks)", { floor: true, was: ["nk-vital-sm"] }),
  },
  parts: {
    glyph: { ratio: number(0.94, "The face as a fraction of the box", { range: [0.5, 1], floor: true, was: ["nk-vital-face-ratio"] }) },
    icon: { ratio: number(0.52, "The icon as a fraction of the face", { range: [0.2, 1], floor: true, was: ["nk-vital-icon-ratio"] }) },
    label: {
      size: length("0.9375rem", "The tag's text size", { floor: true, was: ["nk-vital-label-size"] }),
      gap: length("1rem", "Between the face and the tag's text", { floor: true, was: ["nk-vital-tag-gap"] }),
    },
    pop: {
      overlap: length("0.375rem", "How far an open pop tucks behind the chip", { floor: true }),
      pad: length("0.75rem", "An open pop's leading padding", { floor: true }),
      "max-width": length("12rem", "An open pop's width", { floor: true }),
    },
    line: { width: length("0.125rem", "The level line's thickness", { floor: true, was: ["nk-vital-line"] }) },
    plate: {
      drop: length("0.25rem", "How far the wall drops straight below the face", { floor: true, was: ["nk-vital-plate-drop"] }),
      x: length("0rem", "The wall's sideways step", { floor: true, was: ["nk-vital-plate-x"] }),
    },
  },
  state: {
    face: { type: "length", description: "The face's measured size", was: ["nk-vital-face"] },
    tag: { type: "length", description: "The tag's measured width", was: ["nk-vital-tag"] },
    "tag-pad": { type: "length", description: "The tag's padding", was: ["nk-vital-tag-pad"] },
    room: { type: "length", description: "The room an open tag takes in its row", was: ["nk-vital-room"] },
    d: { type: "number", description: "The side the tag opens to (1 right, -1 left)", was: ["nk-vital-d"] },
  },
};
