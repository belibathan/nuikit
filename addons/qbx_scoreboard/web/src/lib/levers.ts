import { getTheme, onTheme } from "nuikit-core";
import { useSyncExternalStore } from "react";

/*
 * Levers: this override's settings. A server sets them as tokens on :root in nuikit/theme.css, which
 * every override already loads (the design rule: identity → tokens → this override → player prefs).
 * Unset, each one is today's look.
 *
 *   --<prefix>-density   a number: this override's --nk-density instead of the identity's
 *   --<prefix>-motion    0 turns this override's motion off; another number scales it
 *
 * plus the placement levers its features read with useLever() (listed in the README).
 */

/** A lever's value from the applied theme, or `fallback` when the server hasn't set it. */
export function lever(name: string, fallback: string): string {
  const v = getTheme()?.vars[name];
  if (v == null) return fallback;
  return String(v).trim().replace(/^["']|["']$/g, "") || fallback;
}

const subscribe = (cb: () => void) => onTheme(() => cb());

/** lever() that re-renders when the server's theme changes (`nuikit theme reload`). */
export function useLever(name: string, fallback: string): string {
  return useSyncExternalStore(subscribe, () => lever(name, fallback), () => fallback);
}

/** The density and motion levers, applied to this page after every theme paint. */
export function installLevers(prefix: string): () => void {
  const apply = () => {
    const el = document.documentElement;
    const density = Number(lever(`${prefix}-density`, ""));
    if (density > 0) el.style.setProperty("--nk-density", String(density));
    const raw = lever(`${prefix}-motion`, "");
    const motion = Number(raw);
    if (raw !== "" && Number.isFinite(motion) && motion >= 0) {
      el.style.setProperty("--nk-motion", String(motion));
      if (motion === 0) el.setAttribute("data-nk-motion", "off");
    }
  };
  apply();
  return onTheme(apply);
}
