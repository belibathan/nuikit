import { useEffect, useRef } from "react";

/**
 * Collect deltas (mouse drags) and hand their sum to `flush` at most once per animation frame, so
 * a fast drag is one NUI callback per frame, not one per mousemove.
 */
export function useFrameBatch(flush: (dx: number, dy: number) => void) {
  const acc = useRef({ dx: 0, dy: 0, raf: 0 });
  const fn = useRef(flush);
  fn.current = flush;
  useEffect(() => () => cancelAnimationFrame(acc.current.raf), []);
  return (dx: number, dy: number) => {
    const a = acc.current;
    a.dx += dx;
    a.dy += dy;
    if (a.raf) return;
    a.raf = requestAnimationFrame(() => {
      a.raf = 0;
      const { dx: x, dy: y } = a;
      a.dx = a.dy = 0;
      if (x || y) fn.current(x, y);
    });
  };
}
