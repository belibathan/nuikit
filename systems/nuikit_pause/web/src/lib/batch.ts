import { useEffect, useRef } from "react";

/** At most this often: each NUI callback costs the game frame it lands in (~0.5 ms a frame at 180/s). */
const MIN_MS = 1000 / 60;

/**
 * Collect deltas (mouse drags) and hand their sum to `flush` at most 60 times a second, so a fast
 * drag is a steady stream of NUI callbacks, not one per mousemove. Not requestAnimationFrame: in
 * FiveM it fires at the game's frame rate (measured 135–180 callbacks a second while dragging).
 * Lua lands each step over the next few frames (map3d.lua `land`), so the motion stays smooth.
 */
export function useFrameBatch(flush: (dx: number, dy: number) => void) {
  const acc = useRef({ dx: 0, dy: 0, last: 0, timer: 0 });
  const fn = useRef(flush);
  fn.current = flush;
  useEffect(() => () => window.clearTimeout(acc.current.timer), []);
  const send = () => {
    const a = acc.current;
    a.timer = 0;
    a.last = performance.now();
    const { dx, dy } = a;
    a.dx = a.dy = 0;
    if (dx || dy) fn.current(dx, dy);
  };
  return (dx: number, dy: number) => {
    const a = acc.current;
    a.dx += dx;
    a.dy += dy;
    if (a.timer) return;
    const wait = a.last + MIN_MS - performance.now();
    if (wait <= 0) send();
    else a.timer = window.setTimeout(send, wait);
  };
}
