/**
 * Live values (docs/protocol.md §5.7): follow a number Lua streams (`NUI.stream`) at the page's frame
 * rate, without React.
 *
 * Lua sends the value on its own channel about 30 times a second while it changes. Each message
 * starts a straight glide from what is shown to the new value, lasting as long as the gap since the
 * previous message, so a steady change is one even motion (one message behind, ~33 ms) and it never
 * overshoots when the value stops. `paint` runs on animation frames, only while the value moves, and
 * only when it moved by more than `epsilon`: a still value repaints nothing and costs no frames.
 *
 * In FiveM requestAnimationFrame runs at the game's frame rate (140–300 a second), which is what
 * makes the glide smooth. It is not a throttle: never send a message or a callback per frame.
 */
import { onNui, type EventName } from "./index";

export type FollowKind = "linear" | "angle";

export interface FollowOptions {
  /** `angle`: degrees, glides the short way round (350° → 10° turns 20°) and paints 0–360. */
  kind?: FollowKind;
  /**
   * Where to start before any message. The latest value this page has received on the action wins
   * (a component that remounts starts where the value is, not where it was when it first showed).
   */
  start?: number;
  /** Repaint only when the shown value moved by more than this (default 0.001). */
  epsilon?: number;
  /** The longest glide in ms (default 60): after a pause, the next message lands this quickly. */
  maxSpan?: number;
}

/** Shortest signed turn from a to b, in degrees. */
export const turn = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

const MIN_SPAN = 16;

// The latest value per followed action, kept while nothing is following it.
const latest = new Map<string, number>();
const tracked = new Set<string>();

function track(action: string) {
  if (tracked.has(action)) return;
  tracked.add(action);
  onNui(action, (v) => {
    const n = Number(v);
    if (Number.isFinite(n)) latest.set(action, n);
  });
}

/** The latest value received on a followed action, or undefined. */
export function followed(action: string): number | undefined {
  return latest.get(action);
}

/**
 * Follow a streamed number: `paint(value)` on animation frames while it glides. Returns a stop
 * function. Works in a hosted module too (the host delivers the messages).
 *
 *   const stop = follow("hud:minimap:heading", (deg) => { el.style.transform = `rotate(${-deg}deg)` }, { kind: "angle" });
 */
export function follow<K extends EventName>(action: K, paint: (value: number) => void, options: FollowOptions = {}): () => void {
  track(action);
  const angle = options.kind === "angle";
  const epsilon = options.epsilon ?? 0.001;
  const maxSpan = Math.max(MIN_SPAN, options.maxSpan ?? 60);
  const norm = (v: number) => (angle ? ((v % 360) + 360) % 360 : v);
  const delta = (a: number, b: number) => (angle ? turn(a, b) : b - a);

  const first = latest.get(action) ?? options.start;
  let shown = first === undefined ? undefined : norm(first);
  let from = shown ?? 0;
  let to = from;
  let began = 0;
  let span = maxSpan;
  let lastMessage = -Infinity;
  let raf = 0;
  let stopped = false;

  const tick = (now: number) => {
    raf = 0;
    if (stopped || shown === undefined) return;
    const t = Math.min(1, Math.max(0, (now - began) / span));
    const next = t >= 1 ? to : norm(from + delta(from, to) * t);
    const moved = Math.abs(delta(shown, next));
    if (moved > epsilon || (t >= 1 && moved > 0)) {
      shown = next;
      paint(next);
    }
    if (t < 1) raf = requestAnimationFrame(tick);
  };

  const off = onNui(action, (raw) => {
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    const now = performance.now();
    span = Math.min(maxSpan, Math.max(MIN_SPAN, now - lastMessage));
    lastMessage = now;
    if (shown === undefined) {
      // nothing on screen yet: show it, don't glide from nowhere
      shown = from = to = norm(v);
      paint(shown);
      return;
    }
    from = shown;
    to = norm(v);
    began = now;
    if (!raf) raf = requestAnimationFrame(tick);
  });

  if (shown !== undefined) paint(shown);
  return () => {
    stopped = true;
    off();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
}

/** For tests: forget the latest values (index.ts __reset). */
export function __resetFollow(): void {
  latest.clear();
  tracked.clear();
}
