// Reels for live numbers painted outside React (speed ~30/s, heading every frame): each character is a
// little vertical window; a change rolls the old glyph out and the new one in. Vertical only: the window
// clips y and never x (italic glyphs overhang), see hud.css .hud-reel.
//
// calm(): what a live number shows, so it reads instead of flickering: the value is smoothed, the
// shown number changes at most `hz` times a second, and only when it moved by a whole step past the
// shown one (hysteresis, so ±1 jitter at a steady speed never rolls).
import { motionLevel } from "nuikit-core/motion";

const ROLL_MS = 170;
const reels = new WeakMap<HTMLElement, { ch: string; at: number; busy: Animation[] }>();

/**
 * Roll one reel to `ch` (dir 1: up, the new glyph from below). Nothing queues: a new value finishes the
 * roll in flight and starts from there, in at most the time since the last change; a reel that changes
 * faster than it can roll snaps.
 */
export function rollDigit(el: HTMLElement | null, ch: string, dir: 1 | -1) {
  if (!el) return;
  const now = performance.now();
  let st = reels.get(el);
  if (!st) {
    st = { ch: el.textContent ?? "", at: 0, busy: [] };
    reels.set(el, st);
  }
  if (st.ch === ch) return;
  const gap = now - st.at;
  st.at = now;
  st.ch = ch;
  for (const a of st.busy) a.finish();
  st.busy = [];
  while (el.childNodes.length > 1) el.removeChild(el.firstChild!);
  let glyph = el.firstElementChild as HTMLElement | null;
  if (!glyph) {
    el.textContent = "";
    glyph = document.createElement("span");
    el.appendChild(glyph);
  }
  const ms = Math.min(ROLL_MS, gap - 10);
  if (motionLevel() !== "on" || ms < 60 || typeof glyph.animate !== "function") {
    glyph.textContent = ch;
    return;
  }
  const next = document.createElement("span");
  next.textContent = ch;
  el.appendChild(next);
  const opts: KeyframeAnimationOptions = { duration: ms, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" };
  const out = glyph.animate([{ transform: "translateY(0)" }, { transform: `translateY(${-dir * 100}%)` }], { ...opts, fill: "forwards" });
  const into = next.animate([{ transform: `translateY(${dir * 100}%)` }, { transform: "translateY(0)" }], opts);
  const old = glyph;
  out.onfinish = () => old.remove();
  st.busy = [out, into];
}

/** Roll a short text, one reel per character, kept from the right (units stay units). */
export function rollText(container: HTMLElement | null, text: string, dir: 1 | -1) {
  if (!container) return;
  const chars = [...text];
  while (container.children.length < chars.length) {
    const reel = document.createElement("span");
    reel.className = "hud-reel";
    reel.appendChild(document.createElement("span"));
    container.insertBefore(reel, container.firstChild);
  }
  while (container.children.length > chars.length) container.removeChild(container.firstChild!);
  const reelsEls = Array.from(container.children) as HTMLElement[];
  for (let i = 0; i < chars.length; i++) {
    const el = reelsEls[i]!;
    if (!reels.has(el) && !el.textContent) {
      // a fresh reel: its first glyph is just written
      (el.firstElementChild as HTMLElement).textContent = chars[i]!;
      reels.set(el, { ch: chars[i]!, at: performance.now(), busy: [] });
    } else rollDigit(el, chars[i]!, dir);
  }
}

export interface CalmOptions {
  /** changes shown per second, at most */
  hz: number;
  /** smoothing time constant (ms); 0 = none */
  tau?: number;
  /** a new shown value needs to differ from the shown one by at least this much */
  step?: number;
  /** for angles: wrap the difference into ±180 */
  angle?: boolean;
}

/**
 * Gate a live value: smoothed (critically, by `tau`), shown at most `hz` times a second, and only when
 * the rounded value moved at least `step` from what is shown. A trailing call shows the last value.
 * Returns the feed function and a reset (for a new vehicle).
 */
export function calm(opts: CalmOptions, show: (value: number, dir: 1 | -1) => void) {
  const { hz, tau = 0, step = 1, angle = false } = opts;
  const every = 1000 / Math.max(1, hz);
  let smooth: number | null = null;
  let shown: number | null = null;
  let lastAt = 0;
  let lastIn = 0;
  let lastRaw = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const diff = (a: number, b: number) => (angle ? ((a - b + 540) % 360) - 180 : a - b);
  const settle = (now: number) => {
    if (smooth === null || tau <= 0) return;
    const k = 1 - Math.exp(-Math.min(400, now - lastIn) / tau);
    smooth = smooth + diff(lastRaw, smooth) * k;
    lastIn = now;
  };
  const flush = () => {
    timer = null;
    if (smooth === null) return;
    settle(performance.now());
    // still catching up with the last value: look again in a moment
    if (tau > 0 && Math.abs(diff(lastRaw, smooth)) > 0.3) timer = setTimeout(flush, every);
    const v = Math.round(angle ? ((smooth % 360) + 360) % 360 : smooth);
    // hysteresis: the smoothed value must have moved most of a step past what is shown
    if (shown !== null && (v === shown || Math.abs(diff(smooth, shown)) < step * 0.9)) return;
    const dir: 1 | -1 = shown === null || diff(v, shown) >= 0 ? 1 : -1;
    shown = v;
    lastAt = performance.now();
    show(v, dir);
  };
  const feed = (raw: number) => {
    if (!Number.isFinite(raw)) return;
    const now = performance.now();
    if (smooth === null || tau <= 0 || motionLevel() === "off") {
      smooth = raw;
      lastIn = now;
    } else settle(now);
    lastRaw = raw;
    if (tau <= 0 || motionLevel() === "off") smooth = raw;
    // stopped or at rest: show the truth at once
    if (shown === null) return flush();
    const wait = every - (now - lastAt);
    if (wait <= 0) flush();
    else if (!timer) timer = setTimeout(flush, wait);
  };
  const reset = () => {
    smooth = null;
    shown = null;
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return { feed, reset };
}
