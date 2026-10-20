// Where the player is: the location strip (heading, street, cross street, zone, postal, waypoint) and
// the heading strip across the top. The heading is the camera's compass bearing, a live value
// (`hud:minimap:heading`, followed straight into the DOM).
import { useFollow } from "nuikit-core/react";
import { FlagIcon, MapPinIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import type { HudLocation } from "../nui";
import { cardinal, setText } from "./util";

/** A waypoint distance (metres, already rounded by Lua) in the HUD's units. */
export function formatDistance(meters: number, units: "mph" | "kmh") {
  if (units === "kmh") return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
  const miles = meters / 1609.344;
  if (meters < 321.869) return `${Math.round((meters * 3.28084) / 50) * 50} ft`;
  return `${miles.toFixed(1)} mi`;
}

/** The location strip, bottom left: above the map when it shows, else above the vitals. */
export function LocationStrip({ location, units, heading, start }: { location: HudLocation; units: "mph" | "kmh"; heading: boolean; start: number }) {
  const point = useRef<HTMLSpanElement>(null);
  const degrees = useRef<HTMLSpanElement>(null);
  useFollow(
    "hud:minimap:heading",
    (deg) => {
      setText(point.current, cardinal(deg));
      setText(degrees.current, `${Math.round(deg) % 360}°`);
    },
    { kind: "angle", start, epsilon: 0.4 },
  );
  if (!location.visible || !location.street) return null;
  const second = [location.crossing, location.zone].filter(Boolean) as string[];
  const extra: ReactNode[] = [];
  if (location.postal) {
    extra.push(
      <span key="postal" data-slot="hud-postal" className="hud-tag">
        <MapPinIcon />
        <span className="hud-num">{location.postal}</span>
      </span>,
    );
  }
  if (location.waypoint !== undefined) {
    extra.push(
      <span key="waypoint" data-slot="hud-waypoint" className="hud-tag">
        <FlagIcon />
        <span className="hud-num">{formatDistance(location.waypoint, units)}</span>
      </span>,
    );
  }
  return (
    <div data-slot="hud-location" className="hud-location">
      {heading && (
        <span data-slot="hud-bearing" className="hud-bearing hud-chip" aria-label="Heading">
          <span ref={point} className="hud-bearing-point">
            {cardinal(start)}
          </span>
          <span ref={degrees} className="hud-num hud-bearing-deg">
            {`${Math.round(start) % 360}°`}
          </span>
        </span>
      )}
      <div className="hud-location-text">
        <span className="hud-street">{location.street}</span>
        {second.length > 0 && (
          <span className="hud-area">{second.join(", ")}</span>
        )}
        {extra.length > 0 && <span className="hud-tags">{extra}</span>}
      </div>
    </div>
  );
}

// ───────────────────────────────── heading strip

const PX_PER_DEG = 2.4; // at 1080p: 26rem shows ±87°
const TAPE_REM = 26; // the window's width (hud.css .hud-compass-window)
const SPAN = 720; // -180…540, so any heading has 180° either side
const LABELS: Record<number, string> = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };

/** The heading strip, top centre. */
export function CompassTape({ start }: { start: number }) {
  const tape = useRef<SVGSVGElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  useFollow(
    "hud:minimap:heading",
    (deg) => {
      const x = (-(deg + 180) * PX_PER_DEG) / 16 + TAPE_REM / 2; // rem
      if (tape.current) tape.current.style.transform = `translate3d(${x.toFixed(4)}rem, 0, 0)`;
      setText(readout.current, String(Math.round(deg) % 360).padStart(3, "0"));
    },
    { kind: "angle", start, epsilon: 0.05 },
  );
  const marks: ReactNode[] = [];
  for (let d = -180; d <= 540; d += 5) {
    const x = (d + 180) * PX_PER_DEG;
    const h = ((d % 360) + 360) % 360;
    const label = LABELS[h];
    const kind = label ? (h % 90 === 0 ? "cardinal" : "inter") : h % 15 === 0 ? "mid" : "minor";
    marks.push(<line key={`t${d}`} x1={x} x2={x} y1={0} y2={kind === "minor" ? 5 : kind === "mid" ? 8 : 10} data-kind={kind} className="hud-tape-tick" />);
    if (label) {
      marks.push(
        <text key={`l${d}`} x={x} y={25} textAnchor="middle" data-kind={kind} data-north={h === 0 || undefined} className="hud-tape-label">
          {label}
        </text>,
      );
    } else if (h % 15 === 0) {
      marks.push(
        <text key={`n${d}`} x={x} y={24} textAnchor="middle" className="hud-tape-num">
          {h}
        </text>,
      );
    }
  }
  return (
    <div data-slot="hud-compass" className="hud-compass" aria-label="Heading">
      <div className="hud-compass-window">
        <svg ref={tape} className="hud-tape" viewBox={`0 0 ${SPAN * PX_PER_DEG} 32`} style={{ width: `${(SPAN * PX_PER_DEG) / 16}rem` }} aria-hidden>
          {marks}
        </svg>
      </div>
      <span className="hud-compass-caret" aria-hidden />
      <span ref={readout} className="hud-num hud-compass-readout">
        {String(Math.round(start) % 360).padStart(3, "0")}
      </span>
    </div>
  );
}
