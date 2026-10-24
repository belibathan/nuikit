/** Composed widgets with their own sizes. Every size is a floor: the component's box, moved by one lever. */
import { length, type ComponentDef } from "../lang";

export const itemSlot: ComponentDef = {
  description: "An inventory slot",
  inherits: ["tile"],
  anatomy: ["top", "corner", "right", "label", "durability"],
  levers: {
    width: length("5rem", "Width (md)", { floor: true, was: ["nk-item-slot-w"] }),
    "width-sm": length("3.5rem", "Width (sm)", { floor: true, was: ["nk-item-slot-w-sm"] }),
    "width-lg": length("6rem", "Width (lg)", { floor: true, was: ["nk-item-slot-w-lg"] }),
    gap: length("0.25rem", "Between its lines", { floor: true, was: ["nk-item-slot-gap"] }),
  },
  parts: {
    top: { height: length("0.75rem", "The meta line's height", { floor: true, was: ["nk-item-slot-meta-h"] }) },
    corner: { lock: length("0.875rem", "The lock icon", { floor: true, was: ["nk-item-slot-lock"] }) },
  },
};

export const keyPrompt: ComponentDef = {
  description: "A key and its verb (E Open), with a hold",
  inherits: ["tile", "row"],
  anatomy: ["keys", "key", "icon", "text", "label", "description", "hold", "stack"],
  levers: {
    gap: length("0.25rem", "Between its parts", { floor: true, was: ["nk-key-prompt-gap"] }),
    "max-width": length("20rem", "Maximum width", { floor: true }),
    "min-height": length("2.5rem", "Minimum height (md)", { floor: true, was: ["nk-key-prompt-min-h"] }),
    "min-height-sm": length("2rem", "Minimum height (sm)", { floor: true, was: ["nk-key-prompt-min-h-sm"] }),
    "pad-left": length("0.5rem", "Leading padding", { floor: true, was: ["nk-key-prompt-pad-l"] }),
    "pad-right": length("0.75rem", "Trailing padding", { floor: true, was: ["nk-key-prompt-pad-r"] }),
    "pad-y": length("0.25rem", "Block padding", { floor: true, was: ["nk-key-prompt-pad-y"] }),
  },
  parts: { key: { height: length("1.5rem", "A key cap's height", { floor: true, was: ["nk-key-prompt-cap-h"] }) } },
};

export const skillCheck: ComponentDef = {
  description: "A skill check: a rotor, a zone, a key",
  inherits: ["tile"],
  anatomy: ["ticks", "zone", "rotor", "needle", "key"],
  levers: {
    size: length("10rem", "Size (md)", { floor: true, was: ["nk-skill-check-size"] }),
    "size-sm": length("7rem", "Size (sm)", { floor: true, was: ["nk-skill-check-size-sm"] }),
    "size-lg": length("13rem", "Size (lg)", { floor: true, was: ["nk-skill-check-size-lg"] }),
  },
  parts: {
    key: {
      height: length("2rem", "The key's height", { floor: true, was: ["nk-skill-check-key-h"] }),
      pad: length("0.5rem", "The key's padding", { floor: true, was: ["nk-skill-check-key-pad"] }),
    },
  },
};

export const countdown: ComponentDef = {
  description: "A countdown: a clock, a label, a line",
  anatomy: ["clock", "label", "line"],
  parts: {
    line: {
      width: length("10rem", "The line (md)", { floor: true, was: ["nk-countdown-bar-w"] }),
      "width-sm": length("6rem", "The line (sm)", { floor: true, was: ["nk-countdown-bar-w-sm"] }),
      "width-hero": length("20rem", "The line (hero)", { floor: true, was: ["nk-countdown-bar-w-hero"] }),
    },
  },
};

export const stat: ComponentDef = {
  description: "A label over a value, with meta and a delta",
  anatomy: ["label", "value", "meta", "delta"],
  levers: { gap: length("0.25rem", "Between its parts", { floor: true, was: ["nk-stat-gap"] }) },
  parts: { label: { icon: length("0.875rem", "The label's icon", { floor: true, was: ["nk-stat-icon"] }) } },
};

export const nuiImage: ComponentDef = {
  description: "An item or vehicle image with a fallback glyph",
  anatomy: ["icon"],
  parts: { icon: { max: length("1.5rem", "The fallback glyph's maximum size", { floor: true, was: ["nk-nui-image-icon-max"] }) } },
};
