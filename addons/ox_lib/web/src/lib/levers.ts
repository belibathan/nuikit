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

/** A custom property's computed value on <html> (kit defaults and the server theme), "" when unset. */
export function tokenRaw(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().replace(/^["']|["']$/g, "");
}

/**
 * A duration token in ms (`--nk-behavior-notify-info: 4000`, `4s` or `4000ms`) from the page's computed
 * style, so the kit's defaults and the server theme both count; `fallback` when it isn't set.
 */
export function tokenMs(name: string, fallback: number): number {
  const raw = tokenRaw(name);
  const m = /^(-?[\d.]+)\s*(ms|s)?$/.exec(raw);
  if (!m) return fallback;
  const n = Number(m[1]) * (m[2] === "s" ? 1000 : 1);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
