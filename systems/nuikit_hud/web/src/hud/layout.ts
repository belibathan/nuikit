// Where the HUD's edges are: GTA's HUD area for this screen and safe zone (client/layout.lua sends
// it as `hud:layout`), as CSS variables every anchor in hud.css reads. Before Lua answers (the
// browser, an older client) the 0.5.0 rule stands in: the middle 16:9 of the window.
import { useNuiState } from "nuikit-core/react";
import { useEffect, useState, type CSSProperties } from "react";
import type { HudLayout, MinimapFrame } from "../nui";

/** The 0.5.0 rule for a window: the middle 16:9, no safe-zone inset. */
export function stageLayout(width: number, height: number): HudLayout {
  const side = Math.max(0, (width - (height * 16) / 9) / 2) / width;
  return { l: side, r: side, t: 0, b: 0, aspect: width / height, source: "stage" };
}

const pct = (v: number) => `${(Math.max(0, Math.min(0.5, v)) * 100).toFixed(4)}%`;
const px = (v: number) => `${v.toFixed(2)}px`;

/** The CSS variables for a layout and (optionally) the minimap's rectangle. */
export function layoutVars(layout: HudLayout, map: MinimapFrame | null, width: number, height: number): CSSProperties {
  const vars: Record<string, string> = {
    "--hud-l": pct(layout.l),
    "--hud-r": pct(layout.r),
    "--hud-t": pct(layout.t),
    "--hud-b": pct(layout.b),
  };
  if (map) {
    vars["--hud-map-x"] = px(map.x * width);
    vars["--hud-map-w"] = px(map.w * width);
    vars["--hud-map-h"] = px(map.h * height);
    // the map's top edge and its bottom edge, measured from the screen's bottom
    vars["--hud-map-top"] = px((1 - map.y) * height);
    vars["--hud-map-bottom"] = px((1 - map.y - map.h) * height);
    // its right edge, from the screen's left
    vars["--hud-map-end"] = px((map.x + map.w) * width);
    // its left edge from the screen's right, and its top edge from the screen's top (the other corners)
    vars["--hud-map-start-r"] = px((1 - map.x) * width);
    vars["--hud-map-y"] = px(map.y * height);
  }
  return vars as CSSProperties;
}

/** The window's size, updated on resize. */
export function useViewport() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return size;
}

export function useHudLayout(): HudLayout | null {
  return useNuiState("hud:layout", null as unknown as HudLayout) as HudLayout | null;
}
