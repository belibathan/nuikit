import { fetchNui, useNuiState } from "nuikit-core/react";
import { useEffect, type CSSProperties } from "react";
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
function onBand(deg: number, shape: MinimapFrame["shape"], half: number, band: number): { x: number; y: number } {
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
 * square corners), the compass turns with the camera, and north is the theme's primary.
 */
export function MinimapFrameView({ frame, state }: { frame: MinimapFrame; state: MinimapState }) {
  const h = window.innerHeight;
  const size = frame.w * window.innerWidth;
  const band = Math.max(2, frame.band * h);
  const half = size / 2;
  const round = frame.shape === "circle";
  const style: CSSProperties = {
    left: `${frame.x * 100}%`,
    top: `${frame.y * 100}%`,
    width: size,
    height: size,
    borderWidth: band,
  };

  return (
    <div
      data-slot="minimap-frame"
      data-shape={frame.shape}
      className={cn("hud-minimap absolute border-solid", round ? "rounded-full" : "hud-minimap-square")}
      style={style}
      aria-hidden
    >
      {CARDINALS.map((c) => {
        const at = onBand((c.offset - state.heading + 360) % 360, frame.shape, half, band);
        const north = c.label === "N";
        // the square only shows north; on the circle all four ride the ring
        if (!round && !north) return null;
        return (
          <span
            key={c.label}
            className={cn(
              "absolute flex items-center justify-center rounded-full text-[0.625rem] leading-none font-semibold",
              north ? "size-4 bg-primary text-primary-foreground" : "size-3.5 text-muted-foreground",
            )}
            // positioned from the frame's outer corner (the band is a border, so offset it back)
            style={{ left: at.x - band, top: at.y - band, transform: "translate(-50%, -50%)" }}
          >
            {c.label}
          </span>
        );
      })}
    </div>
  );
}

/** Street and area, bare on the game above the map (kit rule 8). */
function Location({ frame, state }: { frame: MinimapFrame; state: MinimapState }) {
  const below = frame.y < 0.5; // a map at the top gets its text underneath
  const style: CSSProperties = below
    ? { left: `${frame.x * 100}%`, top: `calc(${(frame.y + frame.h) * 100}% + 0.5rem)` }
    : { left: `${frame.x * 100}%`, bottom: `calc(${(1 - frame.y) * 100}% + 0.5rem)` };
  if (frame.x > 0.5) {
    delete style.left;
    style.right = `${(1 - frame.x - frame.w) * 100}%`;
  }
  return (
    <div className={cn("nk-shadow absolute flex max-w-80 flex-col text-hud-foreground", frame.x > 0.5 && "items-end text-right")} style={style}>
      <span className="truncate text-sm leading-5 font-semibold">{state.street}</span>
      <span className="truncate text-xs leading-4 font-medium text-hud-foreground/80">
        {state.crossing ? `Near ${state.crossing}, ${state.zone}` : state.zone}
      </span>
    </div>
  );
}

/** The minimap layer: the frame and the location text, shown only while the radar is. */
export function Minimap({ frame, state, location = true }: { frame: MinimapFrame; state: MinimapState; location?: boolean }) {
  if (!state.visible) return null;
  return (
    <>
      <MinimapFrameView frame={frame} state={state} />
      {location && state.street && <Location frame={frame} state={state} />}
    </>
  );
}

/** The frame's rectangle, asked for once when the page loads (Lua also sends it on every change). */
export function useMinimapFrame() {
  const frame = useNuiState("hud:minimap:frame", null as unknown as MinimapFrame) as MinimapFrame | null;
  useEffect(() => {
    void fetchNui("hud:minimap:ready", {}).catch(() => {});
  }, []);
  return frame;
}
