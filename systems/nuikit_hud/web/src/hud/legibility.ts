// Foundation 2 legibility (tokens 1.4): the theme's --nk-legibility is 'night', 'day' or 'auto', and
// kit.css lifts every material toward opaque by day. With 'auto', "day" means the game's daytime: the
// HUD's Lua sends it from the game clock (hud:legibility) and this marks html[data-nk-daytime] for the
// kit to read. Config.legibility.mode forces the clock's answer.
import { useNuiEvent } from "nuikit-core/react";

export function isDaytime(mode: "day" | "night", force?: "day" | "night"): boolean {
  return (force ?? mode) === "day";
}

export function useLegibility() {
  useNuiEvent("hud:legibility", ({ mode, force }) => {
    const html = document.documentElement;
    if (isDaytime(mode, force)) html.dataset.nkDaytime = "";
    else delete html.dataset.nkDaytime;
  });
}
