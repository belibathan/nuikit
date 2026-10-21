import { fetchNui, follow, useNuiState } from "nuikit-core/react";
import { useEffect, useRef, type CSSProperties } from "react";
import type { MinimapFrame, MinimapState } from "./nui";
import { cn } from "@/lib/utils";

const CARDINALS = [
  { label: "N", offset: 0 },
  { label: "E", offset: 90 },
  { label: "S", offset: 180 },
  { label: "W", offset: 270 },
];

/**
 * Where a cardinal sits on the frame's band, for a direction `deg` clockwise from the top: on the
 * circle's middle line, or slid along the square's edge (projected out to the square).
 */
export function onBand(deg: number, shape: MinimapFrame["shape"], half: number, band: number): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const r = half - band / 2;
  const k = shape === "circle" ? r : r / Math.max(Math.abs(dx), Math.abs(dy));
  return { x: half + dx * k, y: half + dy * k };
}

/**
 * The frame around GTA's radar. minimap.lua places the radar and sends this rectangle, so the frame
 * lands exactly on it at any resolution. The band is the panel surface (it also hides the radar's
 * square corners); the cardinals ride the band, turning with the camera; north is the brand colour.
 */
export function MinimapFrameView({ frame, state, compass = true }: { frame: MinimapFrame; state: MinimapState; compass?: boolean }) {
  const h = window.innerHeight;
  const size = frame.w * window.innerWidth;
  const band = Math.max(2, frame.band * h);
  const half = size / 2;
  const round = frame.shape === "circle";
  const marks = useRef<(HTMLSpanElement | null)[]>([]);
  // where the compass is, kept across a resize or a shape change
  const heading = useRef<number | null>(null);
  heading.current ??= state.heading;
  const style: CSSProperties = {
    left: `${frame.x * 100}%`,
    top: `${frame.y * 100}%`,
    width: size,
    height: size,
    borderWidth: band,
  };

  // the circle carries all four, turning; the square only north (it slides along the edge)
  const shown = !compass ? [] : round ? CARDINALS : CARDINALS.slice(0, 1);

  // Every browser frame while it turns, straight onto the marks' transforms: no React render, no
  // layout. minimap.lua streams the bearing (NUI.stream: 0.1°, ≤30 a second); follow glides between.
  useEffect(
    () =>
      follow(
        "hud:minimap:heading",
        (deg) => {
          heading.current = deg;
          shown.forEach((c, i) => {
            const el = marks.current[i];
            if (!el) return;
            const at = onBand((c.offset - deg + 360) % 360, frame.shape, half, band);
            // from the frame's outer corner (the band is a border, so offset it back)
            el.style.transform = `translate3d(${(at.x - band).toFixed(2)}px, ${(at.y - band).toFixed(2)}px, 0) translate(-50%, -50%)`;
          });
        },
        { kind: "angle", start: heading.current ?? 0, epsilon: 0.01 },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frame.shape, half, band, compass],
  );

  return (
    <div data-slot="minimap-frame" data-shape={frame.shape} className={cn("hud-minimap", round ? "hud-minimap-circle" : "hud-minimap-square")} style={style} aria-hidden>
      <span className="hud-minimap-inner" />
      {shown.map((c, i) => (
        <span
          key={c.label}
          ref={(el) => {
            marks.current[i] = el;
          }}
          data-north={c.label === "N" || undefined}
          className="hud-cardinal"
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

/** The frame's rectangle and whether the radar shows; asks Lua for everything once when the page loads. */
export function useMinimap() {
  const frame = useNuiState("hud:minimap:frame", null as unknown as MinimapFrame) as MinimapFrame | null;
  const state = useNuiState("hud:minimap", null as unknown as MinimapState) as MinimapState | null;
  useEffect(() => {
    void fetchNui("hud:ready", {}).catch(() => {});
  }, []);
  return { frame, state };
}
