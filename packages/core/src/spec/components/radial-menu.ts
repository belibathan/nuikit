/** Radial menu: the action wheel: wedges, one turning lit wedge, items on a ring, a centre button. */
import { length, number, ref, type ComponentDef } from "../lang";

export const radialMenu: ComponentDef = {
  description: "The action wheel: SVG wedges, one lit wedge turned to the pointed item, items on a ring, a centre that goes back or closes",
  inherits: ["panel", "tile"],
  anatomy: ["wedge", "indicator", "item", "label", "dot", "center", "title"],
  levers: {
    size: length("20rem", "The wheel's diameter (the size prop overrides it)", { floor: true }),
    "disabled-opacity": number(0.5, "A disabled wedge or item", { range: [0, 1], floor: true }),
  },
  parts: {
    wedge: { stroke: number(0.3, "A wedge's rim, in the wheel's 100-unit drawing (the wedge path insets by the same amount)", { range: [0, 2], floor: true }) },
    indicator: { stroke: number(ref("radial-menu.wedge.stroke"), "The lit wedge's rim, in drawing units", { range: [0, 2] }) },
    item: {
      width: length("22%", "An item's width, a share of the wheel", { floor: true }),
      gap: length(ref("space.1"), "Between an item's icon and label"),
      icon: length(ref("icon.lg"), "An item's icon"),
    },
    label: {
      size: length(ref("text.label"), "An item's label and the centre's second line"),
      leading: length(ref("leading.tight"), "An item's label and the centre's second line: their line height"),
      weight: number(ref("type.label.weight"), "An item's label weight", { range: [100, 900] }),
    },
    dot: {
      size: length("0.25rem", "The mark on an item that opens a submenu", { floor: true }),
      opacity: number(0.6, "The submenu mark's opacity", { range: [0, 1], floor: true }),
    },
    center: {
      width: length("34%", "The centre button's width, a share of the wheel", { floor: true }),
      pad: length(ref("space.2"), "The centre button's padding"),
      icon: length(ref("icon.md"), "The back or close icon"),
    },
    title: {
      size: length(ref("text.label"), "The centre's first line"),
      leading: length(ref("leading.normal"), "The centre's first line height"),
      weight: number(ref("type.weight-strong"), "The centre's first line weight", { range: [100, 900] }),
    },
  },
};
