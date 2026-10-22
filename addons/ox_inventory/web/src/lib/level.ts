// The level contract (docs/design/foundation.md, tokens 1.4): a meter's value is `--level` (0–1) on
// the element, and "low" means at or under the theme's --nk-alert-threshold (default 0.2, today's
// 20 % durability). Read once and again when the theme changes, never per slot.
import { onTheme } from "nuikit-core";

let threshold: number | null = null;
onTheme(() => (threshold = null));

/** The theme's alert threshold (0–1); 0.2 when the theme doesn't set one. */
export function alertThreshold(): number {
  if (threshold === null) {
    const v = typeof document === "undefined" ? NaN : parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nk-alert-threshold"));
    threshold = Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.2;
  }
  return threshold;
}
