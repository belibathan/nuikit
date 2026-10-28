/** Empty state: what a list, a search or a screen shows when there is nothing, or something went wrong. */
import { alpha, color, css, length, pal, ref, type ComponentDef } from "../lang";

export const emptyState: ComponentDef = {
  description: "What a list, a search or a screen shows when there is nothing (or something went wrong): an icon, a title, one sentence, an action",
  inherits: ["control"],
  anatomy: ["header", "icon", "title", "description", "actions"],
  levers: {
    gap: length(ref("space.3"), "Between the header and the actions (panel size)"),
    pad: length(ref("space.6"), "The panel size's padding"),
    "gap-screen": length(ref("space.4"), "Between the header and the actions (screen size)"),
    "pad-screen": length(css`calc(${ref("space.unit")} * 12)`, "The screen size's padding, and the panel's from a medium viewport up"),
  },
  parts: {
    header: { gap: length(ref("space.2"), "Between the icon, the title and the description") },
    icon: {
      box: length("2.5rem", "The icon's box (panel size, no glyph)", { floor: true }),
      "box-screen": length("3rem", "The icon's box (screen size, no glyph)", { floor: true }),
      glyph: length(ref("icon.lg"), "The glyph inside the box"),
      gap: length(ref("space.1"), "Under the icon"),
      ink: color(pal("muted-foreground"), "The icon's ink"),
      "ink-error": color(pal("destructive"), "The icon's ink on an error"),
      "tint-error": color(alpha("destructive", 0.15), "The icon box's fill on an error"),
    },
    title: { "size-screen": length(ref("text.section"), "The title's size at screen size (the panel size takes the panel title)") },
    description: {
      size: length(ref("text.label"), "The description's size"),
      leading: length(ref("leading.normal"), "The description's line height"),
    },
    actions: { gap: length(ref("space.2"), "Between actions") },
  },
};
