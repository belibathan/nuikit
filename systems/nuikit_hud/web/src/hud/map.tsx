// The compact map cluster (design v2 §4): GTA's radar clipped to a circle (client/minimap.lua places
// it and sends the rectangle), a thin ring around it with the compass integrated: cardinal marks and
// ticks that turn on the ring with the camera, a lubber mark at the top with the heading in degrees
// above it, and the waypoint distance as a tag on the ring whose arrow points at the waypoint. Under it
// the location: zone, then street with the cross street smaller.
//
// The heading is a live value (`hud:minimap:heading`, ≤30 messages a second, followed at the browser's
// frame rate) written straight into the DOM: a transform per mark and one text node, no React render.
import { follow } from "nuikit-core/react";
import { FlagIcon, MapPinIcon, NavigationIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { HudLocation, MinimapFrame } from "../nui";
import { formatDistance } from "./location";
import { setText } from "./util";
import { TextRoll } from "@/components/ui/text-roll";

const CARDINALS = [
  { label: "N", at: 0 },
  { label: "E", at: 90 },
  { label: "S", at: 180 },
  { label: "W", at: 270 },
];
/** Ticks between the cardinals, every 30°. */
const TICKS = [30, 60, 120, 150, 210, 240, 300, 330];

/** A point on a circle of radius r around (c, c), `deg` clockwise from the top. */
export function onRing(deg: number, c: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { x: c + Math.sin(a) * r, y: c - Math.cos(a) * r };
}

/**
 * Where the waypoint tag sits on the ring: on the side facing the screen's middle, a little below
 * the equator (a right-hand map puts it at 8 o'clock, a left-hand map at 4), clear of the heading.
 */
export function tagAngle(frame: MinimapFrame) {
  return frame.x + frame.w / 2 > 0.5 ? 240 : 120;
}

export interface MapRingProps {
  frame: MinimapFrame;
  /** the heading when this mounts; then it follows hud:minimap:heading */
  start: number;
  /** compass marks and heading (Config.minimap.compass) */
  compass?: boolean;
  location?: HudLocation | null;
  units: "mph" | "kmh";
}

/** The ring, the compass on it, the heading above it and the waypoint tag. */
export function MapRing({ frame, start, compass = true, location, units }: MapRingProps) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const size = frame.w * W;
  const band = Math.max(1.5, frame.band * H);
  const c = size / 2;
  const r = c - band / 2;
  const rem = H / 67.5; // the kit's 1rem at this height (16px at 1080p)
  const marks = useRef<(HTMLSpanElement | null)[]>([]);
  const ticks = useRef<SVGGElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const arrow = useRef<HTMLSpanElement>(null);
  const bearing = useRef<number | undefined>(location?.bearing);
  bearing.current = location?.bearing;
  const heading = useRef(start);

  const tagAt = tagAngle(frame);
  const tag = onRing(tagAt, c, r);
  const right = tagAt > 180;
  const waypoint = location?.visible && location.waypoint !== undefined;

  useEffect(
    () =>
      follow(
        "hud:minimap:heading",
        (deg) => {
          heading.current = deg;
          if (compass) {
            CARDINALS.forEach((m, i) => {
              const el = marks.current[i];
              if (!el) return;
              const p = onRing(m.at - deg, c, r);
              el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) translate(-50%, -50%)`;
            });
            ticks.current?.setAttribute("transform", `rotate(${(-deg).toFixed(2)} ${c} ${c})`);
            setText(readout.current, `${Math.round(deg) % 360}°`);
          }
          if (arrow.current && bearing.current !== undefined) {
            arrow.current.style.transform = `rotate(${(bearing.current - deg).toFixed(1)}deg)`;
          }
        },
        { kind: "angle", start: heading.current, epsilon: 0.05 },
      ),
    [c, r, compass],
  );
  // a new bearing (5° steps from Lua) turns the arrow at once, not on the next heading change
  useEffect(() => {
    if (arrow.current && location?.bearing !== undefined) {
      arrow.current.style.transform = `rotate(${(location.bearing - heading.current).toFixed(1)}deg)`;
    }
  }, [location?.bearing]);

  const tickInner = r + band / 2 + 0.1875 * rem;
  const tickOuter = tickInner + 0.3125 * rem;
  return (
    <div
      data-slot="hud-map"
      data-shape={frame.shape}
      className="hud-map"
      style={{ left: `${frame.x * 100}%`, top: `${frame.y * 100}%`, width: size, height: size }}
    >
      <svg className="hud-map-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle className="hud-map-halo" cx={c} cy={c} r={r} strokeWidth={band + 3} />
        <circle className="hud-map-ring" cx={c} cy={c} r={r} strokeWidth={band} />
        {compass && (
          <>
            <g ref={ticks} transform={`rotate(${-start} ${c} ${c})`}>
              {TICKS.map((d) => {
                const a = onRing(d, c, tickInner);
                const b = onRing(d, c, tickOuter);
                return <line key={d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="hud-map-tick" />;
              })}
            </g>
            {/* the lubber mark: where the heading above is read */}
            <line x1={c} x2={c} y1={c - r - band / 2 - 0.125 * rem} y2={c - r - band / 2 - 0.5 * rem} className="hud-map-lubber" />
          </>
        )}
      </svg>
      {compass && (
        <>
          <span ref={readout} data-slot="hud-heading" className="hud-num hud-map-heading" style={{ left: c, bottom: size + 0.5 * rem }}>
            {`${Math.round(start) % 360}°`}
          </span>
          {CARDINALS.map((m, i) => {
            const p = onRing(m.at - start, c, r);
            return (
              <span
                key={m.label}
                ref={(el) => {
                  marks.current[i] = el;
                }}
                data-north={m.label === "N" || undefined}
                className="hud-map-cardinal"
                style={{ transform: `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) translate(-50%, -50%)` }}
                aria-hidden
              >
                {m.label}
              </span>
            );
          })}
        </>
      )}
      {waypoint && (
        <span
          data-slot="hud-waypoint"
          data-side={right ? "left" : "right"}
          className="hud-map-tag"
          style={{ left: tag.x, top: tag.y }}
          aria-label="Waypoint"
        >
          <span ref={arrow} className="hud-map-arrow" style={{ transform: `rotate(${((location!.bearing ?? 0) - start).toFixed(1)}deg)` }}>
            <NavigationIcon />
          </span>
          <span className="hud-num">{formatDistance(location!.waypoint!, units)}</span>
        </span>
      )}
    </div>
  );
}

/** Zone, then street with the cross street smaller; the postal as a small tag on the zone's line. */
export function MapLocation({ location, units, waypoint }: { location: HudLocation; units: "mph" | "kmh"; waypoint: boolean }) {
  if (!location.visible || !location.street) return null;
  const tags: ReactNode[] = [];
  if (location.postal) {
    tags.push(
      <span key="postal" data-slot="hud-postal" className="hud-loc-postal hud-num">
        <MapPinIcon />
        {location.postal}
      </span>,
    );
  }
  return (
    <div data-slot="hud-location" className="hud-loc">
      {(location.zone || tags.length > 0) && (
        <span className="hud-loc-zone">
          {location.zone && <TextRoll className="hud-loc-clip" value={location.zone} />}
          {tags}
        </span>
      )}
      <span className="hud-loc-street">
        <TextRoll className="hud-loc-clip" value={location.street} />
      </span>
      {/* always there, so the money under it never moves when a crossing comes and goes */}
      <span className="hud-loc-cross" aria-hidden={!location.crossing}>
        <TextRoll className="hud-loc-clip" value={location.crossing ?? "\u00a0"} direction="down" />
      </span>
      {/* without the ring (radar off), the waypoint distance reads here (no arrow: no heading is streamed) */}
      {waypoint && location.waypoint !== undefined && (
        <span data-slot="hud-waypoint" className="hud-loc-waypoint hud-num">
          <FlagIcon />
          {formatDistance(location.waypoint, units)}
        </span>
      )}
    </div>
  );
}
