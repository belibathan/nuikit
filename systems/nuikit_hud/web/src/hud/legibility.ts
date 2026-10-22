// Foundation 2 legibility: the theme's --nk-legibility is 'night', 'day' or 'auto'. With 'auto' the
// HUD's Lua sends 'day' or 'night' from the game clock (hud:legibility), and this sets
// html[data-nk-legibility] for every rule that reads it (hud.css; the kit once tokens 1.4 land).
// Config.legibility.mode forces one. Before the token exists nothing is set: today's look.
import { useNuiEvent } from "nuikit-core/react";

export function pickLegibility(token: string, mode: "day" | "night", force?: "day" | "night"): "day" | "night" | null {
  if (force === "day" || force === "night") return force;
  if (token === "day" || token === "night") return token;
  return token === "auto" ? mode : null;
}

export function useLegibility() {
  useNuiEvent("hud:legibility", ({ mode, force }) => {
    const html = document.documentElement;
    const token = getComputedStyle(html).getPropertyValue("--nk-legibility").trim();
    const want = pickLegibility(token, mode, force);
    if (want) html.dataset.nkLegibility = want;
    else delete html.dataset.nkLegibility;
  });
}
