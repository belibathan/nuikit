// The compact vehicle cluster (design v2 §4, reference screens): the speed big in the middle of a
// small rpm arc with dimmed leading zeros (`0`40) and the unit under it, the gear as a chip under the
// arc, a fuel line (icon, thin line, percentage) under the gauge, and the telltales as a narrow column
// beside it, lit only when on. The identity's gauge style picks the drawing: `arc` (a thin arc that
// fills with the rpm over faint ticks, red past the redline), `digital` (segmented ticks only, no
// line) and `bar` (a rectangular plate: speed and unit, the gear chip beside them, a segmented rpm
// bar under).
//
// Live values (speed, rpm, heading) are painted straight into the DOM by the Cluster's follow hooks
// (cluster.tsx): a tick toggles only when the lit count changes, a digit only when it changes, the
// arc's dash only when the rpm moved.
import { FuelIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import type { HudSettings, HudVehicle } from "../nui";
import { Signal, type Painter, type Tell } from "./cluster";
import type { GaugeStyle, HudLook } from "./look";
import { cardinal, setText, UNIT_LABEL } from "./util";

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/** The speed as three digits (up to 999) and how many of them are leading zeros (dimmed). */
export function speedDigits(speed: number): { digits: string; lead: number } {
  const n = Math.min(999, Math.max(0, Math.round(Number.isFinite(speed) ? speed : 0)));
  const digits = String(n).padStart(3, "0");
  let lead = 0;
  while (lead < digits.length - 1 && digits[lead] === "0") lead++;
  return { digits, lead };
}

/** How many of `count` rpm ticks are lit. */
export const litTicks = (rpm: number, count: number) => Math.round(clamp01(rpm) * count);

// geometry, in the SVG's units (1 = 1px at 1080p; the SVG is sized in rem so it scales)
const VB = 156;
const C = 78; // centre
const START = -128; // degrees clockwise from the top
const SWEEP = 256;
const TICK_IN = 58;
const TICK_OUT = 64;
const ARC_R = 70;
const COUNT = 32;
/** the segmented ticks of the digital style: fewer, longer */
const SEG_COUNT = 24;
const SEG_IN = 56;
const SEG_OUT = 66;

function polar(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}

function arc(a0: number, a1: number, r: number) {
  const [x0, y0] = polar(a0, r);
  const [x1, y1] = polar(a1, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
const ARC = arc(START, START + SWEEP, ARC_R);

export interface CompactProps {
  v: HudVehicle;
  look: HudLook;
  settings: NonNullable<HudSettings["vehicle"]>;
  paint: { current: Painter | null };
  center: "gear" | "heading";
  /** the identity's gauge style (or the config's) */
  style: GaugeStyle;
}

/** Speed digits with the leading zeros dimmed, painted per digit. */
function Speed({ refs, start }: { refs: { current: (HTMLSpanElement | null)[] }; start: number }) {
  const { digits, lead } = speedDigits(start);
  return (
    <span data-slot="hud-speed" className="hud-num hud-c-speed" aria-label="Speed">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          data-dim={i < lead || undefined}
        >
          {digits[i]}
        </span>
      ))}
    </span>
  );
}

/** The gear chip, or the heading for a boat. */
function Center({ v, center, heading }: { v: HudVehicle; center: "gear" | "heading"; heading: { current: HTMLSpanElement | null } }) {
  if (center === "heading") {
    return (
      <span ref={heading} data-slot="hud-heading" className="hud-num hud-c-heading">
        {`${Math.round(v.heading ?? 0) % 360}° ${cardinal(v.heading ?? 0)}`}
      </span>
    );
  }
  if (v.gear === undefined) return null;
  return (
    <span data-slot="hud-gear" data-gear={String(v.gear)} className="hud-num hud-c-gear" aria-label="Gear">
      {v.gear}
    </span>
  );
}

/** Fuel as a line: the pump, a thin track and the percentage. */
function FuelLine({ fuel }: { fuel: number }) {
  const low = fuel <= 15;
  return (
    <span data-slot="hud-fuel" data-low={low || undefined} className="hud-c-fuel" role="meter" aria-label="Fuel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fuel}>
      <FuelIcon />
      <span className="hud-c-fuel-track" aria-hidden>
        <span className="hud-c-fuel-fill" style={{ transform: `scaleX(${fuel / 100})` }} />
      </span>
      <span className="hud-num hud-c-fuel-value">{fuel}%</span>
    </span>
  );
}

/** A painter that keeps the speed digits, the redline flag and the shared state. */
function useSpeedPainter(root: { current: HTMLDivElement | null }, digits: { current: (HTMLSpanElement | null)[] }, heading: { current: HTMLSpanElement | null }) {
  const state = useRef({ lit: -1, red: false, speed: "", lead: -1, dash: "" });
  const speed = (s: number) => {
    const { digits: d, lead } = speedDigits(s);
    if (d === state.current.speed) return;
    state.current.speed = d;
    const els = digits.current;
    for (let i = 0; i < 3; i++) setText(els[i], d[i]!);
    if (lead !== state.current.lead) {
      state.current.lead = lead;
      for (let i = 0; i < 3; i++) els[i]?.toggleAttribute("data-dim", i < lead);
    }
  };
  const redline = (on: boolean) => {
    if (on !== state.current.red) {
      state.current.red = on;
      root.current?.toggleAttribute("data-redline", on);
    }
  };
  const head = (h: number) => setText(heading.current, `${Math.round(h) % 360}° ${cardinal(h)}`);
  return { state, speed, redline, head };
}

export function CompactGauge(props: CompactProps) {
  return props.style === "bar" ? <CompactBar {...props} /> : <CompactArc {...props} />;
}

/** `arc` and `digital`: the speed inside a small arc, the gear chip under it, the fuel line at the foot. */
function CompactArc({ v, look, settings, paint, center, style }: CompactProps) {
  const root = useRef<HTMLDivElement>(null);
  const ticks = useRef<SVGGElement>(null);
  const fill = useRef<SVGPathElement>(null);
  const digits = useRef<(HTMLSpanElement | null)[]>([]);
  const heading = useRef<HTMLSpanElement>(null);
  const p = useSpeedPainter(root, digits, heading);
  const redline = v.redline;
  const showRpm = settings.rpm !== false;
  const digital = style === "digital";
  const count = digital ? SEG_COUNT : COUNT;
  const fuel = settings.fuel !== false && v.fuel !== undefined ? Math.max(0, Math.min(100, Math.round(v.fuel))) : undefined;
  const signals = settings.indicators !== false && v.indicators !== undefined;

  paint.current = {
    speed: p.speed,
    rpm(r) {
      const x = clamp01(r);
      const lit = litTicks(x, count);
      if (lit !== p.state.current.lit && ticks.current) {
        p.state.current.lit = lit;
        const kids = ticks.current.children;
        for (let i = 0; i < kids.length; i++) (kids[i] as Element).toggleAttribute("data-on", i < lit);
      }
      if (fill.current) {
        const dash = `${(x * 100).toFixed(1)} 100`;
        if (dash !== p.state.current.dash) {
          p.state.current.dash = dash;
          fill.current.setAttribute("stroke-dasharray", dash);
        }
      }
      p.redline(x >= redline);
    },
    heading: p.head,
  };

  const marks: ReactNode[] = [];
  if (showRpm) {
    for (let i = 0; i < count; i++) {
      const at = (i + 0.5) / count;
      const deg = START + SWEEP * at;
      // every fourth tick is a little longer: a quiet scale without numbers
      const major = !digital && look.ticks && i % 4 === 3;
      const [x0, y0] = polar(deg, digital ? SEG_IN : major ? TICK_IN - 3 : TICK_IN);
      const [x1, y1] = polar(deg, digital ? SEG_OUT : TICK_OUT);
      marks.push(<line key={i} x1={x0.toFixed(2)} y1={y0.toFixed(2)} x2={x1.toFixed(2)} y2={y1.toFixed(2)} data-red={at >= redline || undefined} />);
    }
  }

  return (
    <div ref={root} data-slot="hud-gauge" data-style={digital ? "digital" : "arc"} data-off={!v.engineOn || undefined} className="hud-gauge hud-c-gauge">
      <span className="hud-plate hud-c-plate" aria-hidden />
      <div className="hud-c-dial">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="hud-c-svg" aria-hidden>
          {showRpm && !digital && (
            <>
              <path d={ARC} className="hud-c-arc-track" />
              <path d={arc(START + SWEEP * redline, START + SWEEP, ARC_R)} className="hud-c-arc-red" />
              <path ref={fill} d={ARC} pathLength={100} strokeDasharray="0 100" className="hud-c-arc-fill" />
            </>
          )}
          <g ref={ticks} className="hud-c-ticks">
            {marks}
          </g>
        </svg>
        {signals && (
          <>
            <span className="hud-c-signal" data-side="left">
              <Signal side="left" on={(v.indicators! & 1) === 1} />
            </span>
            <span className="hud-c-signal" data-side="right">
              <Signal side="right" on={(v.indicators! & 2) === 2} />
            </span>
          </>
        )}
        <div className="hud-c-readout">
          <Speed refs={digits} start={v.speed} />
          <span className="hud-unit hud-c-unit">{UNIT_LABEL[v.units]}</span>
        </div>
        <div className="hud-c-center">
          <Center v={v} center={center} heading={heading} />
        </div>
      </div>
      {fuel !== undefined && <FuelLine fuel={fuel} />}
    </div>
  );
}

const BAR_SEGMENTS = 20;

/** `bar`: a rectangular plate with the speed, the gear chip beside it and a segmented rpm bar under. */
function CompactBar({ v, settings, paint, center }: CompactProps) {
  const root = useRef<HTMLDivElement>(null);
  const segs = useRef<HTMLSpanElement>(null);
  const digits = useRef<(HTMLSpanElement | null)[]>([]);
  const heading = useRef<HTMLSpanElement>(null);
  const p = useSpeedPainter(root, digits, heading);
  const redline = v.redline;
  const showRpm = settings.rpm !== false;
  const fuel = settings.fuel !== false && v.fuel !== undefined ? Math.max(0, Math.min(100, Math.round(v.fuel))) : undefined;
  const signals = settings.indicators !== false && v.indicators !== undefined;

  paint.current = {
    speed: p.speed,
    rpm(r) {
      const x = clamp01(r);
      const lit = litTicks(x, BAR_SEGMENTS);
      if (lit !== p.state.current.lit && segs.current) {
        p.state.current.lit = lit;
        const kids = segs.current.children;
        for (let i = 0; i < kids.length; i++) (kids[i] as Element).toggleAttribute("data-on", i < lit);
      }
      p.redline(x >= redline);
    },
    heading: p.head,
  };

  return (
    <div ref={root} data-slot="hud-gauge" data-style="bar" data-off={!v.engineOn || undefined} className="hud-gauge hud-c-gauge hud-c-bar">
      <span className="hud-plate hud-c-plate-rect" aria-hidden />
      <div className="hud-c-bar-main">
        {signals && (
          <span className="hud-c-signal" data-side="left">
            <Signal side="left" on={(v.indicators! & 1) === 1} />
          </span>
        )}
        <div className="hud-c-readout">
          <Speed refs={digits} start={v.speed} />
          <span className="hud-unit hud-c-unit">{UNIT_LABEL[v.units]}</span>
        </div>
        <div className="hud-c-center">
          <Center v={v} center={center} heading={heading} />
        </div>
        {signals && (
          <span className="hud-c-signal" data-side="right">
            <Signal side="right" on={(v.indicators! & 2) === 2} />
          </span>
        )}
      </div>
      {showRpm && (
        <span ref={segs} className="hud-c-bar-rpm" aria-hidden>
          {Array.from({ length: BAR_SEGMENTS }, (_, i) => (
            <span key={i} data-red={(i + 1) / BAR_SEGMENTS > redline || undefined} />
          ))}
        </span>
      )}
      {fuel !== undefined && <FuelLine fuel={fuel} />}
    </div>
  );
}

/** The telltales as a narrow column: only the lit ones, stacked from the bottom. */
export function TelltaleColumn({ items }: { items: Tell[] }) {
  const lit = items.filter((t) => t.on);
  return (
    <div data-slot="hud-telltales" className="hud-c-tells">
      {lit.map((t) => (
        <span key={t.key} data-slot="hud-telltale" data-key={t.key} data-on data-tone={t.tone} className="hud-c-tell" aria-label={t.label}>
          {t.icon}
          {t.text && <span className="hud-num hud-c-tell-text">{t.text}</span>}
        </span>
      ))}
    </div>
  );
}
