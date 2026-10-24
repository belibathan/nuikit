/** Dialog shell: the one dialog chrome: a header, a padded body, an action-bar footer, on the plate. */
import { length, ref, type ComponentDef } from "../lang";

export const dialogShell: ComponentDef = {
  description: "A modal question or form over the current surface: stock Dialog or AlertDialog on the plate recipe, a header, a padded body and an action-bar footer",
  anatomy: ["header", "title", "description", "body", "footer", "actions"],
  levers: {
    width: length("32rem", "Width (md)", { floor: true }),
    "width-sm": length("24rem", "Width (sm)", { floor: true }),
    "width-lg": length("40rem", "Width (lg)", { floor: true }),
    top: length("18vh", "Where a top dialog anchors", { floor: true }),
  },
  parts: {
    header: {
      gap: length(ref("space.1"), "Between the title and the description"),
      "pad-x": length(ref("gap.surface"), "Inline padding"),
      "pad-y": length(ref("space.4"), "Block padding"),
    },
    body: { pad: length(ref("gap.surface"), "The body's padding") },
    footer: {
      gap: length(ref("gap.cluster"), "Between the hints and the buttons"),
      "pad-x": length(ref("gap.surface"), "Inline padding"),
      "pad-y": length(ref("space.3"), "Block padding"),
      bleed: length(ref("space.2"), "How far the hints reach back into the padding (the first item's own inset lines up with the title)"),
    },
  },
};
