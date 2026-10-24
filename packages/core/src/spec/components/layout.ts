/** Layout (docs/design/layout.md): Screen → zones → containers. The screen is the only container a NUI page has. */
import { css, length, number, ref, type ComponentDef } from "../lang";

export const screen: ComponentDef = {
  description: "The root of a page: a 16:9 content box centred on any screen, a safe area inside it",
  anatomy: ["area", "safe"],
  levers: {
    ratio: number(1.7778, "The content box's width / height (wider screens keep it, centred)", { range: [1, 4], floor: true, was: ["nk-screen-ratio"] }),
    max: length(css`calc(100vh * ${ref("screen.ratio")})`, "The content box's width", { was: ["nk-screen-max"] }),
    edge: length("1.5rem", "A zone's distance from the safe area (1rem at 4:3, 1.25rem at 16:10)", { floor: true, was: ["nk-edge"] }),
    "scale-min": number(0.75, "The rem floor as a fraction of the 1080p rem (720p and 4:3 stay readable)", { range: [0.5, 1], floor: true, was: ["nk-scale-min"] }),
  },
  parts: {
    area: {
      l: length(css`max(0px, calc((100vw - ${ref("screen.max")}) / 2))`, "The box's left inset from the screen", { was: ["nk-area-l"] }),
      r: length(css`max(0px, calc((100vw - ${ref("screen.max")}) / 2))`, "The box's right inset", { was: ["nk-area-r"] }),
      t: length("0px", "The box's top inset", { floor: true, was: ["nk-area-t"] }),
      b: length("0px", "The box's bottom inset", { floor: true, was: ["nk-area-b"] }),
    },
    safe: {
      x: length("0rem", "A safe area inside the box, inline (TV overscan, a bezel)", { floor: true, was: ["nk-safe-x"] }),
      y: length("0rem", "A safe area inside the box, block", { floor: true, was: ["nk-safe-y"] }),
    },
  },
};

export const zone: ComponentDef = {
  description: "Nine places and four edges; a zone stacks what it holds towards the screen centre",
  inherits: ["screen"],
  anatomy: ["item"],
  levers: { gap: length(ref("space.3"), "Between what a zone stacks", { was: ["nk-zone-gap"] }) },
  state: {
    inset: { type: "length", description: "A zone's inset (unset: screen.edge)", was: ["nk-zone-inset"] },
    z: { type: "number", description: "A zone's stacking order", was: ["nk-zone-z"] },
  },
};

export const region: ComponentDef = {
  description: "A readable column inside a zone",
  anatomy: ["body"],
  levers: {
    max: length("28rem", "Its maximum width", { floor: true, was: ["nk-region-max"] }),
    pad: length(ref("gap.surface"), "Its padding", { was: ["nk-region-pad"] }),
  },
};

export const grid: ComponentDef = {
  description: "A grid of cells (inventories, shops)",
  anatomy: ["cell"],
  levers: {
    cell: length("5.5rem", "A cell's size", { floor: true, was: ["nk-grid-cell"] }),
    gap: length(ref("space.2"), "Between cells", { was: ["nk-grid-gap"] }),
  },
  state: { cols: { type: "number", description: "The column count (inline)", was: ["nk-grid-cols"] } },
};
