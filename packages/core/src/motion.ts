/**
 * nuikit-core/motion: springs, retargeting, FLIP and timed runs on the Web Animations API, for Chromium 103
 * (no CSS linear() springs until 113). Dependency-free, about 1.5 kB gzipped. docs/tokens.md#motion.
 *
 *   spring(el, "y", 0, { from: 8, preset: "move" })   // a toast settles, on the compositor
 *   spring(el, "y", 40)                                 // retargets from where it is now, keeping its velocity
 *   flip(rows, () => list.prepend(row))                 // siblings glide to their new places
 *   const a = timed(fill, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], 5000)  // pause(), currentTime
 *
 * Springs read the theme's compiled --nk-spring-* tokens (a duration and a bounce), are solved analytically
 * and sampled at 60 Hz into linear keyframes, so the browser runs them like any transform/opacity animation:
 * no requestAnimationFrame loop, no React state, nothing left behind when they finish (the end value is
 * written inline and the animation cancelled). The value and velocity of a running spring come from its
 * elapsed time, never from getComputedStyle.
 *
 * Motion levels (html[data-nk-motion], painted by applyTheme): "off" jumps to the end; "reduced" (the
 * player's pref, or the OS setting) jumps every movement and keeps opacity fades at most 100 ms; timed runs
 * always play, because progress is information, not decoration.
 */

export type SpringName = "snap" | "move" | "soft" | "pop";
/** A spring as a perceptual duration (ms) and bounce (0 = critically damped), with its physics (mass 1). */
export interface Spring {
  duration: number;
  bounce: number;
  stiffness: number;
  damping: number;
}
/** What a spring animates: one transform function (px, unitless or deg) or opacity. */
export type Channel = "x" | "y" | "scale" | "rotate" | "opacity";
export type MotionLevel = "on" | "reduced" | "off";
export interface SpringOptions {
  /** Start here instead of the current value (the running spring's, or the last one set). */
  from?: number;
  /** A preset name (the theme's --nk-spring-<name>), a token value ("240ms 0.1") or a Spring. Default "move". */
  preset?: SpringName | string | Spring;
  /** Starting velocity in units per second (default: the running spring's, else 0). */
  velocity?: number;
}

const FPS = 60;
const FALLBACK: Record<SpringName, string> = { snap: "160ms 0", move: "240ms 0.1", soft: "360ms 0", pop: "260ms 0.3" };
const FORMAT: Record<Channel, (v: number) => string> = {
  x: (v) => `translateX(${v}px)`,
  y: (v) => `translateY(${v}px)`,
  scale: (v) => `scale(${v})`,
  rotate: (v) => `rotate(${v}deg)`,
  opacity: (v) => String(v),
};
const prop = (c: Channel) => (c === "opacity" ? "opacity" : "transform");
const hasDom = () => typeof document !== "undefined";

/** "240ms 0.1" → a Spring (k = (2π/T)², c = 4π(1 − bounce)/T). null if it isn't one. */
export function parseSpring(value: string): Spring | null {
  const m = /^\s*([\d.]+)(m?s)\s+([\d.]+)\s*$/.exec(value);
  if (!m) return null;
  const T = parseFloat(m[1]!) * (m[2] === "s" ? 1000 : 1);
  if (!(T > 0)) return null;
  const bounce = Math.min(0.9, parseFloat(m[3]!));
  const w = (2 * Math.PI * 1000) / T;
  return { duration: T, bounce, stiffness: w * w, damping: 2 * w * (1 - bounce) };
}

// Token reads: the inline value applyTheme painted on <html>, else the stylesheet's (read once).
const computed: Record<string, string> = {};
/** A theme token's value (`--nk-spring-move`), from <html>. */
export function token(name: string): string {
  if (!hasDom()) return "";
  const html = document.documentElement;
  return html.style.getPropertyValue(name).trim() || (computed[name] ??= getComputedStyle(html).getPropertyValue(name).trim());
}
/** A time token in ms ("140ms" → 140), or `fallback`. */
export function tokenMs(name: string, fallback = 0): number {
  const m = /^([\d.]+)(m?s)$/.exec(token(name));
  return m ? parseFloat(m[1]!) * (m[2] === "s" ? 1000 : 1) : fallback;
}
/** A preset (the theme's --nk-spring-<name>), a token value or a Spring, as a Spring. */
export function springOf(preset: SpringName | string | Spring = "move"): Spring {
  if (typeof preset === "object") return preset;
  const name = preset as SpringName;
  return parseSpring(FALLBACK[name] ? token(`--nk-spring-${name}`) : preset) ?? parseSpring(FALLBACK[name] ?? FALLBACK.move)!;
}

let reduceQuery: MediaQueryList | null | undefined;
/** The motion level: html[data-nk-motion] (theme and player prefs), then the OS reduced-motion setting. */
export function motionLevel(): MotionLevel {
  if (!hasDom()) return "on";
  const a = document.documentElement.getAttribute("data-nk-motion");
  if (a === "off") return "off";
  if (reduceQuery === undefined) reduceQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  return a === "reduced" || reduceQuery?.matches ? "reduced" : "on";
}

/** Displacement and velocity at t seconds of a spring released `x0` from its target with velocity `v0`. */
export function solveSpring(s: Spring, x0: number, v0: number, t: number): [number, number] {
  const w = Math.sqrt(s.stiffness);
  const z = Math.min(1, s.damping / (2 * w));
  const e = Math.exp(-z * w * t);
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z);
    const b = (v0 + z * w * x0) / wd;
    const c = Math.cos(wd * t);
    const sn = Math.sin(wd * t);
    return [e * (x0 * c + b * sn), e * (-z * w * (x0 * c + b * sn) + wd * (b * c - x0 * sn))];
  }
  const b = v0 + w * x0;
  return [e * (x0 + b * t), e * (b - w * (x0 + b * t))];
}

/** The values a spring passes through at 60 Hz until it settles (within 0.5% of the distance): WAAPI keyframes. */
export function springValues(s: Spring, from: number, to: number, velocity = 0): number[] {
  const x0 = from - to;
  const eps = Math.max(Math.abs(x0) * 0.005, 1e-3);
  const out = [from];
  for (let i = 1; i <= FPS * 3; i++) {
    const [x, v] = solveSpring(s, x0, velocity, i / FPS);
    if (Math.abs(x) < eps && Math.abs(v) < eps * 10) break;
    out.push(to + x);
  }
  out.push(to);
  return out;
}

interface Run {
  anim: Animation;
  s: Spring;
  x0: number;
  v0: number;
  to: number;
  done: (ok: boolean) => void;
}
const state = new WeakMap<Element, Map<string, { run?: Run; value: number }>>();
const slot = (el: Element, key: string, init: number) => {
  let m = state.get(el);
  if (!m) state.set(el, (m = new Map()));
  let s = m.get(key);
  if (!s) m.set(key, (s = { value: init }));
  return s;
};
/** Seconds into a run, as drawn (the animation's own clock; 0 while it waits for its first frame). */
const elapsed = (r: Run) => (Number(r.anim.currentTime) || 0) / 1000;

function stop(r: Run | undefined, ok: boolean) {
  if (!r) return;
  r.anim.cancel();
  r.done(ok);
}

/**
 * Animate one channel of an element to `to` with a spring, on the compositor. A spring already running on
 * that channel is retargeted: the new one starts from its current value and velocity. Resolves true when it
 * settles, false when it's interrupted. With motion off (or reduced, except opacity) it jumps.
 */
export function spring(el: HTMLElement, channel: Channel, to: number, opts: SpringOptions = {}): Promise<boolean> {
  const s0 = slot(el, channel, channel === "opacity" || channel === "scale" ? 1 : 0);
  const r = s0.run;
  let from = opts.from ?? s0.value;
  let velocity = opts.velocity ?? 0;
  if (r && opts.from === undefined) {
    const [x, v] = solveSpring(r.s, r.x0, r.v0, elapsed(r));
    from = r.to + x;
    velocity = opts.velocity ?? v;
  }
  stop(r, false);
  s0.run = undefined;
  s0.value = to;
  const p = prop(channel);
  const fmt = FORMAT[channel];
  const commit = () => el.style.setProperty(p, fmt(to));
  const level = motionLevel();
  const fade = level === "reduced" && channel === "opacity";
  if (!el.animate || level === "off" || (level === "reduced" && !fade) || from === to) {
    commit();
    return Promise.resolve(true);
  }
  const s = springOf(opts.preset);
  const values = fade ? [from, to] : springValues(s, from, to, velocity);
  const anim = el.animate(
    values.map((v) => ({ [p]: fmt(v) })),
    { duration: fade ? Math.min(100, tokenMs("--nk-time-base", 100)) : ((values.length - 1) * 1000) / FPS, easing: "linear", fill: "forwards" },
  );
  return new Promise<boolean>((done) => {
    const run: Run = { anim, s, x0: from - to, v0: velocity, to, done };
    s0.run = run;
    anim.onfinish = () => {
      if (s0.run !== run) return;
      s0.run = undefined;
      commit();
      anim.cancel();
      done(true);
    };
  });
}

/** Retarget a channel to `to` (spring() keeps the running spring's value and velocity). */
export const retarget = spring;

/** Where a spring channel is now (analytically, from the running spring's clock), or its last target. */
export function valueOf(el: Element, channel: Channel): number | undefined {
  const s = state.get(el)?.get(channel);
  if (!s) return undefined;
  if (!s.run) return s.value;
  return s.run.to + solveSpring(s.run.s, s.run.x0, s.run.v0, elapsed(s.run))[0];
}

/**
 * FLIP from remembered layout positions: every element in `els` that `prev` has seen glides from where it
 * was drawn (its old position plus any FLIP in flight) to where it is now; then `prev` holds the new
 * positions. Reads every position in one pass, then writes. Translate only (scale would distort text).
 */
export function flipFrom(els: ArrayLike<HTMLElement>, prev: WeakMap<Element, [number, number]>, preset: SpringName | string | Spring = "move") {
  const list = Array.from(els);
  const now = list.map((el) => [el.offsetLeft, el.offsetTop] as [number, number]);
  const moving = motionLevel() === "on";
  list.forEach((el, i) => {
    const was = prev.get(el);
    const at = now[i]!;
    prev.set(el, at);
    const s0 = slot(el, "flip", 0);
    const r = s0.run;
    // what's in flight is drawn on top of the last layout position
    const k = r ? solveSpring(r.s, 1, 0, elapsed(r))[0] : 0;
    const dx = was ? was[0] - at[0] + (r ? (r as Run & { dx: number }).dx * k : 0) : 0;
    const dy = was ? was[1] - at[1] + (r ? (r as Run & { dy: number }).dy * k : 0) : 0;
    if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
    stop(r, false);
    s0.run = undefined;
    if (!moving || !el.animate) return;
    const s = springOf(preset);
    const curve = springValues(s, 1, 0);
    const anim = el.animate(
      curve.map((t) => ({ transform: `translate(${dx * t}px, ${dy * t}px)` })),
      { duration: ((curve.length - 1) * 1000) / FPS, easing: "linear" },
    );
    const run = { anim, s, x0: 1, v0: 0, to: 0, done: () => {}, dx, dy } as Run & { dx: number; dy: number };
    s0.run = run;
    anim.onfinish = () => {
      if (s0.run === run) s0.run = undefined;
    };
  });
}

/** FLIP around a DOM change: remember positions, run `mutate`, glide everything that moved. */
export function flip(els: ArrayLike<HTMLElement> | (() => ArrayLike<HTMLElement>), mutate: () => void, preset?: SpringName | string | Spring) {
  const get = () => (typeof els === "function" ? els() : els);
  const prev = new WeakMap<Element, [number, number]>();
  flipFrom(get(), prev, preset);
  mutate();
  flipFrom(get(), prev, preset);
}

export interface TimedOptions {
  /** When the run started, on the performance.now() clock (the document timeline's): joins a clock kept elsewhere. */
  startedAt?: number;
  easing?: string;
  fill?: FillMode;
}

/**
 * One linear run over `duration` ms (progress lines, rings, timer bars, a skill-check hand): a single
 * animation that reaches its last keyframe exactly at `duration`. Control it with pause(), play(),
 * reverse(), playbackRate and currentTime. Plays at every motion level (progress is information).
 * Its completion is not a clock: keep onComplete on a timer, as the kit does.
 */
export function timed(el: Element, keyframes: Keyframe[], duration: number, { startedAt, easing = "linear", fill = "both" }: TimedOptions = {}): Animation | null {
  if (!el.animate) return null;
  const anim = el.animate(keyframes, { duration: Math.max(0, duration), easing, fill });
  if (startedAt !== undefined) anim.startTime = startedAt;
  return anim;
}

/** The delay (ms) for item `i` of a first open: --nk-stagger per item, capped by --nk-stagger-max. */
export function stagger(i: number): number {
  return Math.min(Math.max(0, i) * tokenMs("--nk-stagger", 20), tokenMs("--nk-stagger-max", 100));
}

/**
 * A list's selection indicator (kit.css nk-indicator): one element that moves to the active row with a
 * transform. Key-repeat rule (motion.md §3.3): a move that comes sooner than --nk-time after the last one
 * glides in --nk-time-press (data-repeat="fast"); from the third such move in a row it jumps
 * (data-repeat="jump"), so it never trails a held d-pad by more than a row.
 */
export function indicator(el: HTMLElement) {
  let last = -Infinity;
  let rapid = 0;
  return (y: number, scaleY = 1) => {
    const now = performance.now();
    rapid = now - last < tokenMs("--nk-time-base", 140) ? rapid + 1 : 0;
    last = now;
    el.setAttribute("data-repeat", rapid === 0 ? "" : rapid < 3 ? "fast" : "jump");
    el.style.transform = `translateY(${y}px)${scaleY !== 1 ? ` scaleY(${scaleY})` : ""}`;
  };
}
