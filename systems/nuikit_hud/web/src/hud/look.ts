// The identity's HUD tokens that change structure, not just colour: read in JS from the computed
// style (with defaults, so the HUD works before an identity sets them) and re-read when the theme
// changes. Everything else (colours, fonts, opacity, glow) is read straight in hud.css with var()
// fallbacks. Token names: docs/tokens.md.
import { onTheme } from "nuikit-core";
import { useEffect, useState } from "react";

export type GaugeStyle = "arc" | "bar" | "digital";

export interface HudLook {
  /** --nk-style-gauge */
  gauge: GaugeStyle;
  /** --nk-gauge-ticks: tick marks on gauges */
  ticks: boolean;
  /** --nk-fill-height: track thickness in px at 1080p (the gauges' SVG units) */
  track: number;
  /** --nk-chip-text-shadow as a keyword (none / soft / strong); a raw shadow value is used as is by hud.css */
  shadow: "none" | "soft" | "strong";
}

const DEFAULT: HudLook = { gauge: "arc", ticks: true, track: 6, shadow: "soft" };

/** A CSS length ("0.375rem", "6px") in px at 1080p (1rem = 16px). */
export function lengthAt1080(value: string, fallback: number): number {
  const m = /^\s*(-?[\d.]+)\s*(rem|px|em)?\s*$/.exec(value);
  if (!m) return fallback;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return fallback;
  return m[2] === "px" ? n : n * 16;
}

/** The look from a computed style (pure). */
export function readLook(get: (name: string) => string): HudLook {
  const style = get("--nk-style-gauge").trim().replace(/["']/g, "");
  const ticks = get("--nk-gauge-ticks").trim();
  const track = get("--nk-fill-height").trim();
  const shadow = get("--nk-chip-text-shadow").trim();
  return {
    gauge: style === "bar" || style === "digital" || style === "arc" ? style : DEFAULT.gauge,
    ticks: ticks === "" ? DEFAULT.ticks : !(ticks === "0" || ticks === "off" || ticks === "none" || ticks === "false"),
    track: Math.max(2, Math.min(16, track ? lengthAt1080(track, DEFAULT.track) : DEFAULT.track)),
    shadow: shadow === "none" || shadow === "strong" ? shadow : "soft",
  };
}

function current(): HudLook {
  if (typeof document === "undefined") return DEFAULT;
  const cs = getComputedStyle(document.documentElement);
  return readLook((n) => cs.getPropertyValue(n));
}

const same = (a: HudLook, b: HudLook) => a.gauge === b.gauge && a.ticks === b.ticks && a.track === b.track && a.shadow === b.shadow;

/** The identity's HUD look, live: a theme reload re-reads it. */
export function useHudLook(): HudLook {
  const [look, setLook] = useState(current);
  useEffect(() => {
    const update = () =>
      setLook((prev) => {
        const next = current();
        return same(prev, next) ? prev : next;
      });
    update();
    const off = onTheme(update);
    // a theme applied another way (devtools, the host) lands on <html>'s style or class
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-nk-contrast"] });
    return () => {
      off();
      mo.disconnect();
    };
  }, []);
  return look;
}
