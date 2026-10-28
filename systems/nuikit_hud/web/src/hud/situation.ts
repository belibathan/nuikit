// Situations: which zones show while the player is at rest, in a moment, driving or
// interacting (Config.situations). Lua sends the situation it can see (hud:situation: rest, driving,
// interaction); a moment is told apart from rest here, on the page: anything the HUD shows changed
// within the theme's --nk-behavior-rest (0, the default: never at rest). With retract off (the default)
// every zone shows, as always.
import { createContext, useContext, useEffect, useState } from "react";
import type { ZoneName } from "./parts";

export type Situation = "rest" | "moment" | "driving" | "interaction";
export interface HudSituations {
  retract?: boolean;
  rest?: ZoneName[];
  moment?: ZoneName[];
  driving?: ZoneName[];
  interaction?: ZoneName[];
}

/** The theme's --nk-behavior-rest as ms ("8s", "8000ms"); 0, its default, or unset: never. Read at
 *  most once a second (a theme reload is caught then): reading styles per change forced a recalc. */
let delayRead = { at: -Infinity, value: "" };
function delayToken() {
  const now = performance.now();
  if (now - delayRead.at > 1000) delayRead = { at: now, value: getComputedStyle(document.documentElement).getPropertyValue("--nk-behavior-rest") };
  return delayRead.value;
}
export function restDelay(value = delayToken()): number {
  const v = value.trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) return Infinity;
  return v.endsWith("ms") ? n : v.endsWith("s") ? n * 1000 : n;
}

/** The situation now: Lua's, with rest split into a moment for --nk-behavior-rest after `key` changes. */
export function useSituation(lua: Situation, key: string): Situation {
  const [moment, setMoment] = useState(true); // the HUD comes in as a moment, then settles
  useEffect(() => {
    setMoment(true);
    const ms = restDelay();
    if (ms === Infinity) return;
    const t = setTimeout(() => setMoment(false), ms);
    return () => clearTimeout(t);
  }, [key]);
  if (lua === "driving" || lua === "interaction") return lua;
  return moment ? "moment" : "rest";
}

/** The zones that show, or null for all of them (retract off). */
export function shownZones(cfg: HudSituations | undefined, now: Situation): Set<ZoneName> | null {
  if (!cfg?.retract) return null;
  return new Set(cfg[now] ?? []);
}

const Shown = createContext<Set<ZoneName> | null>(null);
export const ShownZones = Shown.Provider;

/** Whether a zone shows in this situation. The map always does: GTA's radar can't retract. */
export function useZoneShown(zone: ZoneName): boolean {
  const shown = useContext(Shown);
  return !shown || zone === "map" || shown.has(zone);
}
