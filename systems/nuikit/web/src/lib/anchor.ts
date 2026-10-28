import type { IntentAnchor } from "nuikit-core/intents";
import type { ZoneId } from "nuikit-core/react";

export type Anchor = "top-left" | "top-center" | "top-right" | "center-left" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right" | "center";

/** The schema's anchor words (and other libraries' aliases) to one of nine places. */
export function anchor(value: IntentAnchor | string | undefined | null, fallback: Anchor = "top-right"): Anchor {
  const v = (value ?? "").toLowerCase();
  const alias: Record<string, Anchor> = {
    top: "top-center",
    bottom: "bottom-center",
    left: "center-left",
    right: "center-right",
    "left-center": "center-left",
    "right-center": "center-right",
    middle: "center",
  };
  if (alias[v]) return alias[v]!;
  const all: Anchor[] = ["top-left", "top-center", "top-right", "center-left", "center-right", "bottom-left", "bottom-center", "bottom-right", "center"];
  return all.includes(v as Anchor) ? (v as Anchor) : fallback;
}

/** The layout zone of each anchor (docs/design.md): renderers place themselves in these. */
export const ANCHOR_ZONE: Record<Anchor, ZoneId> = {
  "top-left": "tl",
  "top-center": "tc",
  "top-right": "tr",
  "center-left": "ml",
  "center-right": "mr",
  "bottom-left": "bl",
  "bottom-center": "bc",
  "bottom-right": "br",
  center: "mc",
};
