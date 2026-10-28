/** Selection tabs: shadcn Tabs with one selection tile sliding to the active trigger. */
import { length, ref, type ComponentDef } from "../lang";

export const selectionTabs: ComponentDef = {
  description: "Tabs and segmented choices as one list with one sliding keycap (the tabs-list, tabs-trigger and tabs-content slots are shadcn's)",
  inherits: ["selection", "list", "control"],
  anatomy: ["list", "trigger"],
  parts: {
    list: {
      gap: length(ref("list.gap"), "Between triggers: the selection never touches its neighbour"),
      rest: length("3px", "Room under the triggers besides the selection's wall", { floor: true }),
    },
    trigger: {
      height: length(ref("height.chip"), "A trigger's minimum height"),
      "pad-x": length(ref("gap.pad-x"), "A trigger's inline padding"),
    },
  },
};
