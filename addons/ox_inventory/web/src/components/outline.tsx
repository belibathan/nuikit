// A level (durability) drawn along a slot tile's own edge, the same way nuikit_hud traces a vital: whatever shape the identity gives chips (a
// rounded square, a pill, a circle, Signal's chamfered corners), the track and the fill follow that
// outline instead of a ring inside the box. The shape is measured from the chip, not assumed:
// its corner radius (--nk-chip-radius, resolved by the browser) and, when chips are clipped
// (--nk-chip-clip), the chamfer of half --nk-cut that the kit's clip draws (top left, bottom right).
import { onTheme } from "nuikit-core";
import { useEffect, useRef, useState } from "react";

export interface ChipShape {
  /** size in CSS px */
  w: number;
  h: number;
  /** corner radius (px), already capped at half the short side */
  r: number;
  /** chamfer (px) at the top-left and bottom-right corners; 0 = none */
  cut: number;
  /** stroke width (px) */
  sw: number;
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();

/**
 * The outline of a chip as one closed path, inset by half the stroke so the stroke sits inside the
 * edge. It starts at the middle of the top edge and runs clockwise, so a dash of `v` of a
 * `pathLength` of 100 fills `v`% from twelve o'clock, like a gauge.
 */
export function outlinePath({ w, h, r, cut, sw }: ChipShape): string {
  const d = sw / 2;
  const x0 = d;
  const y0 = d;
  const x1 = w - d;
  const y1 = h - d;
  const iw = x1 - x0;
  const ih = y1 - y0;
  if (iw <= 0 || ih <= 0) return "";
  const rr = Math.max(0, Math.min(r - d, iw / 2, ih / 2));
  // a 45° chamfer moved in by d meets the inset edges (2 - √2)·d closer to the corner
  const cc = cut > 0 ? Math.max(0, Math.min(cut - d * (2 - Math.SQRT2), iw / 2, ih / 2)) : 0;
  const mid = x0 + iw / 2;
  const arc = (x: number, y: number) => `A ${f(rr)} ${f(rr)} 0 0 1 ${f(x)} ${f(y)}`;
  const parts = [`M ${f(mid)} ${f(y0)}`];
  // top right: rounded
  parts.push(`L ${f(x1 - rr)} ${f(y0)}`);
  if (rr > 0) parts.push(arc(x1, y0 + rr));
  // bottom right: chamfered when cut, else rounded
  if (cc > 0) {
    parts.push(`L ${f(x1)} ${f(y1 - cc)}`, `L ${f(x1 - cc)} ${f(y1)}`);
  } else {
    parts.push(`L ${f(x1)} ${f(y1 - rr)}`);
    if (rr > 0) parts.push(arc(x1 - rr, y1));
  }
  // bottom left: rounded
  parts.push(`L ${f(x0 + rr)} ${f(y1)}`);
  if (rr > 0) parts.push(arc(x0, y1 - rr));
  // top left: chamfered when cut, else rounded
  if (cc > 0) {
    parts.push(`L ${f(x0)} ${f(y0 + cc)}`, `L ${f(x0 + cc)} ${f(y0)}`);
  } else {
    parts.push(`L ${f(x0)} ${f(y0 + rr)}`);
    if (rr > 0) parts.push(arc(x0 + rr, y0));
  }
  parts.push("Z");
  return parts.join(" ");
}

/** Stroke width at 1080p (px); scales with the root font size like everything in rem. */
const STROKE_1080 = 2;

function measure(face: HTMLElement, probe: HTMLElement | null): ChipShape | null {
  const w = face.offsetWidth;
  const h = face.offsetHeight;
  if (!w || !h) return null;
  const cs = getComputedStyle(face);
  const r = Math.min(parseFloat(cs.borderTopRightRadius) || 0, w / 2, h / 2);
  const clipped = cs.clipPath && cs.clipPath !== "none";
  const cut = clipped && probe ? probe.getBoundingClientRect().width : 0;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return { w, h, r, cut, sw: (STROKE_1080 * rem) / 16 };
}

const same = (a: ChipShape | null, b: ChipShape | null) =>
  a === b || (!!a && !!b && a.w === b.w && a.h === b.h && a.r === b.r && a.cut === b.cut && a.sw === b.sw);

/**
 * The track and (with a `value`) the level, traced along the chip it sits in. Put it as the first
 * child of the chip's face (position: relative; the face carries the chip's radius and clip).
 */
export function SlotOutline({ value }: { value?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [shape, setShape] = useState<ChipShape | null>(null);
  useEffect(() => {
    const face = ref.current?.parentElement;
    if (!face) return;
    const update = () => setShape((prev) => {
      const next = measure(face, probe.current);
      return same(prev, next) ? prev : next;
    });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(face);
    const off = onTheme(() => requestAnimationFrame(update));
    // a theme applied another way (devtools, the host) lands on <html>'s style or class
    const mo = new MutationObserver(() => requestAnimationFrame(update));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    return () => {
      ro.disconnect();
      off();
      mo.disconnect();
    };
  }, []);
  const d = shape ? outlinePath(shape) : "";
  const v = value === undefined ? undefined : Math.max(0, Math.min(100, value));
  return (
    <>
      <span ref={probe} className="inv-outline-probe" aria-hidden />
      <svg ref={ref} className="inv-outline" viewBox={shape ? `0 0 ${shape.w} ${shape.h}` : "0 0 1 1"} aria-hidden>
        {d && <path className="inv-outline-track" d={d} strokeWidth={shape!.sw} />}
        {d && v !== undefined && v > 0 && (
          <path className="inv-outline-fill" d={d} strokeWidth={shape!.sw} pathLength={100} strokeDasharray={`${v} 100`} />
        )}
      </svg>
    </>
  );
}
