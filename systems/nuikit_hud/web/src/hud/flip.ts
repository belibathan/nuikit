// FLIP for the HUD's rows: when a chip leaves or joins a row, its neighbours jump to their new place and
// slide back from the old one with a transform. Layout is read twice per change (before, after), never
// per frame: the row's width itself never animates (Foundation 2 / CEF rule: transform and opacity only).
import { motionLevel } from "nuikit-core/motion";

export const FOLD_MS = 300;
export const FOLD_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
/** How a folded chip looks: slid toward its left neighbour, a little smaller (hud.css .hud-vchip). */
export const FOLDED = "translateX(-45%) scale(0.82)";

/** Run `mutate` (a chip leaving or joining `row`), then slide every other chip from where it was. */
export function flipRow(row: Element | null, mutate: () => void) {
  if (!row || motionLevel(row) === "off") return mutate();
  const kids = Array.from(row.children) as HTMLElement[];
  const before = kids.map((k) => (k.dataset.gone !== undefined ? null : k.getBoundingClientRect().left));
  mutate();
  const after = kids.map((k) => (k.dataset.gone !== undefined ? null : k.getBoundingClientRect().left));
  kids.forEach((k, i) => {
    const a = before[i];
    const b = after[i];
    if (a == null || b == null || Math.abs(a - b) < 0.5) return;
    k.animate([{ transform: `translateX(${(a - b).toFixed(1)}px)` }, { transform: "translateX(0)" }], { duration: FOLD_MS, easing: FOLD_EASE, composite: "add" });
  });
}

/** A Stagger delay set inline on the element (ms), so a chip's next phase waits for its turn. */
export function inlineDelay(el: HTMLElement) {
  const d = el.style.transitionDelay;
  return d ? parseFloat(d) * (d.endsWith("ms") ? 1 : 1000) : 0;
}
