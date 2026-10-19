import { useRef, type MouseEvent as ReactMouseEvent } from "react";

export interface Pos {
  x: number;
  y: number;
}

/**
 * Drag a box anchored by its right edge and its top (`fromTop`) or bottom edge.
 * `x` is px from the right; `y` is px from the top or bottom. Clamped to the viewport.
 * `onEnd` runs once, after a drag that moved.
 */
export function useAnchoredDrag(opts: {
  enabled: boolean;
  fromTop: boolean;
  get: () => Pos;
  set: (p: Pos) => void;
  onEnd: (p: Pos) => void;
}) {
  const o = useRef(opts);
  o.current = opts;

  return (e: ReactMouseEvent<HTMLElement>) => {
    if (!o.current.enabled || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, [role=slider], [role=switch], a")) return; // controls keep working
    const box = e.currentTarget.getBoundingClientRect();
    const start = o.current.get();
    const sx = e.clientX;
    const sy = e.clientY;
    let last = start;
    let moved = false;
    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      moved = true;
      const maxX = Math.max(0, window.innerWidth - box.width);
      const maxY = Math.max(0, window.innerHeight - box.height);
      last = {
        x: Math.round(Math.min(Math.max(start.x - dx, 0), maxX)),
        y: Math.round(Math.min(Math.max(o.current.fromTop ? start.y + dy : start.y - dy, 0), maxY)),
      };
      o.current.set(last);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (moved) o.current.onEnd(last);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    e.preventDefault();
  };
}
