// The compact vehicle cluster (design v2 §4, reference screens): the speed big in the middle of a
// small rpm arc with dimmed leading zeros (`0`40) and the unit under it, the gear as a chip under the
// arc, fuel draining along the dial's right-hand curve (arc; digital and bar keep a fuel line), and the telltales as a narrow column
// beside it, lit only when on. The identity's gauge style picks the drawing: `arc` (a thin arc that
// fills with the rpm over faint ticks, red past the redline), `digital` (segmented ticks only, no
// line) and `bar` (a rectangular plate: speed and unit, the gear chip beside them, a segmented rpm
// bar under).
//
// Live values (speed, rpm, heading) are painted straight into the DOM by the Cluster's follow hooks
// (cluster.tsx): a tick toggles only when the lit count changes, a digit only when it changes, the
// arc's dash only when the rpm moved.
import { FuelIcon } from "lucide-react";
import { useId, useRef, type CSSProperties, type ReactNode } from "react";
import { Stagger, useStaggerItem } from "nuikit-core/react";
import { TextRoll } from "@/components/ui/text-roll";
import type { HudSettings, HudVehicle } from "../nui";
import { Signal, type Painter, type Tell } from "./cluster";
import type { GaugeStyle, HudLook } from "./look";
import { calm, rollDigit } from "./reel";
import { KeyTile } from "./key-tile";
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
/** the digital style: a few full segments (thick arc pieces with small even gaps), so the arc reads smooth */
const SEG_COUNT = 11;
const SEG_R = 64;
const SEG_GAP = 3; // degrees between segments
/** fuel: the same segments, thinner, along the outer curve on the right */
const FUEL_SEGS = 5;
const FUEL_SEG_R = 74.5;
const FUEL_FROM = 124; // empty end (lower right), degrees clockwise from the top
const FUEL_TO = 56; // full end

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
/** Fuel on the right-hand curve, just outside the rpm arc: drawn from empty (lower right) up to full. */
const FUEL_R = ARC_R + 8;
const FUEL_EMPTY = 128;
const FUEL_FULL = 44;
const FUEL_ARC = (() => {
  const [x0, y0] = polar(FUEL_EMPTY, FUEL_R);
  const [x1, y1] = polar(FUEL_FULL, FUEL_R);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${FUEL_R} ${FUEL_R} 0 0 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
})();
const FUEL_ICON_AT = polar(FUEL_EMPTY + 14, FUEL_R);

/** Gears in order, for the roll direction: R, N, 1 to 8. */
const GEAR_ORDER = (g: string) => (g === "R" ? -1 : g === "N" ? 0 : Number(g) || 0);

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
          className="hud-reel"
        >
          <span>{digits[i]}</span>
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
  return <Gear gear={v.gear} />;
}

/** The gear chip; the gear rolls up when shifting up and down when shifting down. */
function Gear({ gear }: { gear: HudVehicle["gear"] }) {
  const prev = useRef(gear);
  const dir = useRef<"up" | "down">("up");
  if (gear !== prev.current) {
    dir.current = GEAR_ORDER(String(gear)) >= GEAR_ORDER(String(prev.current)) ? "up" : "down";
    prev.current = gear;
  }
  if (gear === undefined) return null;
  return (
    <span data-slot="hud-gear" data-gear={String(gear)} className="hud-c-gear-tile" aria-label="Gear">
      <KeyTile icon={<TextRoll className="hud-key-glyph" value={String(gear)} direction={dir.current} align="center" />} />
    </span>
  );
}

/** Fuel as segments on the outer right-hand curve (digital): lit from the bottom up, the alert colour when low. */
function FuelSegments({ fuel }: { fuel: number }) {
  const low = fuel <= 15;
  const lit = Math.ceil((fuel / 100) * FUEL_SEGS);
  const step = (FUEL_FROM - FUEL_TO) / FUEL_SEGS;
  return (
    <g data-slot="hud-fuel" data-state={low ? "alert" : undefined} className="hud-c-fuelsegs" role="meter" aria-label="Fuel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fuel}>
      {Array.from({ length: FUEL_SEGS }, (_, i) => {
        const a1 = FUEL_FROM - step * i - SEG_GAP / 2;
        const a0 = FUEL_FROM - step * (i + 1) + SEG_GAP / 2;
        return <path key={i} d={arc(a0, a1, FUEL_SEG_R)} data-on={i < lit || undefined} />;
      })}
    </g>
  );
}
const FUEL_SEG_ICON_AT = polar(FUEL_FROM + 12, FUEL_SEG_R);

/** Fuel on the dial's right-hand curve: drains down along it, warning below the threshold. */
function FuelArc({ fuel }: { fuel: number }) {
  const low = fuel <= 15;
  return (
    <g data-slot="hud-fuel" data-state={low ? "alert" : undefined} className="hud-c-fuelarc" role="meter" aria-label="Fuel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fuel}>
      <path d={FUEL_ARC} className="hud-c-fuelarc-track" />
      <path d={FUEL_ARC} pathLength={100} strokeDasharray={`${fuel} 100`} className="hud-c-fuelarc-fill" />
    </g>
  );
}

/** Fuel as a line: the pump, a thin track and the percentage. */
function FuelLine({ fuel }: { fuel: number }) {
  const low = fuel <= 15;
  return (
    <span data-slot="hud-fuel" data-state={low ? "alert" : undefined} className="hud-c-fuel" role="meter" aria-label="Fuel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fuel}>
      <FuelIcon />
      <span className="hud-c-fuel-track" aria-hidden>
        <span className="hud-c-fuel-fill" style={{ transform: `scaleX(${fuel / 100})` }} />
      </span>
      <span className="hud-num hud-c-fuel-value">{fuel}%</span>
    </span>
  );
}

/** A painter that keeps the speed digits, the redline flag and the shared state. */
function useSpeedPainter(
  root: { current: HTMLDivElement | null },
  digits: { current: (HTMLSpanElement | null)[] },
  heading: { current: HTMLSpanElement | null },
  hz = 10,
) {
  const state = useRef({ lit: -1, red: false, speed: "", lead: -1, dash: "" });
  const paintSpeed = (s: number) => {
    const { digits: d, lead } = speedDigits(s);
    if (d === state.current.speed) return;
    const els = digits.current;
    const dir: 1 | -1 = Number(d) >= Number(state.current.speed || 0) ? 1 : -1;
    for (let i = 0; i < 3; i++) rollDigit(els[i] ?? null, d[i]!, dir);
    state.current.speed = d;
    if (lead !== state.current.lead) {
      state.current.lead = lead;
      for (let i = 0; i < 3; i++) els[i]?.toggleAttribute("data-dim", i < lead);
    }
  };
  const redline = (on: boolean) => {
    if (on !== state.current.red) {
      state.current.red = on;
      if (on) root.current?.setAttribute("data-state", "alert");
        else root.current?.removeAttribute("data-state");
    }
  };
  const head = (h: number) => setText(heading.current, `${Math.round(h) % 360}° ${cardinal(h)}`);
  // what the number shows is calm: smoothed (~120 ms), at most `hz` changes a second, and a ±1 jitter at a
  // steady speed never rolls (vehicle.speedRate)
  const gate = useRef<ReturnType<typeof calm> | null>(null);
  if (!gate.current) gate.current = calm({ hz, tau: 120, step: 1 }, (v) => paintSpeed(v));
  const speed = (s: number) => gate.current!.feed(s);
  return { state, speed, redline, head };
}

export function CompactGauge(props: CompactProps) {
  return props.style === "bar" ? <CompactBar {...props} /> : <CompactArc {...props} />;
}

/** `arc` and `digital`: the speed inside a small arc, the gear chip under it, the fuel line at the foot. */
function CompactArc({ v, look, settings, paint, center, style }: CompactProps) {
  const root = useRef<HTMLDivElement>(null);
  const ticks = useRef<SVGGElement>(null);
  // the level's paint: the accent's stops across the dial, low rpm on the left, the redline end on the right
  const accent = `hud-accent-${useId().replace(/[^w-]/g, "")}`;
  const fill = useRef<SVGPathElement>(null);
  const digits = useRef<(HTMLSpanElement | null)[]>([]);
  const heading = useRef<HTMLSpanElement>(null);
  const p = useSpeedPainter(root, digits, heading, settings.speedRate);
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
      if (digital) {
        const step = SWEEP / count;
        const a0 = START + step * i + SEG_GAP / 2;
        marks.push(<path key={i} d={arc(a0, a0 + step - SEG_GAP, SEG_R)} data-red={at >= redline || undefined} />);
        continue;
      }
      const major = look.ticks && i % 4 === 3;
      const [x0, y0] = polar(deg, major ? TICK_IN - 3 : TICK_IN);
      const [x1, y1] = polar(deg, TICK_OUT);
      marks.push(<line key={i} x1={x0.toFixed(2)} y1={y0.toFixed(2)} x2={x1.toFixed(2)} y2={y1.toFixed(2)} data-red={at >= redline || undefined} />);
    }
  }

  return (
    <div ref={root} data-slot="hud-gauge" data-style={digital ? "digital" : "arc"} data-off={!v.engineOn || undefined} className="hud-gauge hud-c-gauge">
      <span className="hud-plate hud-c-plate" aria-hidden />
      <div className="hud-c-dial">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="hud-c-svg" style={{ "--hud-accent-paint": `url(#${accent})` } as CSSProperties} aria-hidden>
          <defs>
            <linearGradient id={accent} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={VB} y2={0}>
              <stop offset="0" className="hud-accent-from" />
              <stop offset="0.5" className="hud-accent-via" />
              <stop offset="1" className="hud-accent-to" />
            </linearGradient>
          </defs>
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
          {fuel !== undefined && !digital && <FuelArc fuel={fuel} />}
          {fuel !== undefined && digital && <FuelSegments fuel={fuel} />}
        </svg>
        {fuel !== undefined && !digital && (
          <span className="hud-c-fuelarc-icon" data-state={fuel <= 15 ? "alert" : undefined} style={{ left: `${(FUEL_ICON_AT[0] / VB) * 100}%`, top: `${(FUEL_ICON_AT[1] / VB) * 100}%` }} aria-hidden>
            <FuelIcon />
          </span>
        )}
        {fuel !== undefined && digital && (
          <span className="hud-c-fuelarc-icon" data-state={fuel <= 15 ? "alert" : undefined} style={{ left: `${(FUEL_SEG_ICON_AT[0] / VB) * 100}%`, top: `${(FUEL_SEG_ICON_AT[1] / VB) * 100}%` }} aria-hidden>
            <FuelIcon />
          </span>
        )}
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
          <TextRoll className="hud-unit hud-c-unit" value={UNIT_LABEL[v.units]} align="center" />
        </div>
        <div className="hud-c-center">
          <Center v={v} center={center} heading={heading} />
        </div>
      </div>
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
  const p = useSpeedPainter(root, digits, heading, settings.speedRate);
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
          <TextRoll className="hud-unit hud-c-unit" value={UNIT_LABEL[v.units]} align="center" />
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

/** The telltales as a narrow column, stacked from the bottom: the lit ones show, easing in and out. */
export function TelltaleColumn({ items }: { items: Tell[] }) {
  return (
    <Stagger step={35} budget={200}>
      <div data-slot="hud-telltales" className="hud-c-tells">
        {items.map((t) => (
          <Telltale key={t.key} t={t} />
        ))}
      </div>
    </Stagger>
  );
}

function Telltale({ t }: { t: Tell }) {
  const stagger = useStaggerItem<HTMLSpanElement>(!!t.on);
  return (
    <span ref={stagger} data-slot="hud-telltale" data-key={t.key} data-on={t.on || undefined} data-tone={t.tone} className="hud-c-tell" aria-label={t.label} aria-hidden={!t.on}>
      <KeyTile size="sm" icon={t.icon} open={!!t.text}>
        {t.text && <span className="hud-num">{t.text}</span>}
      </KeyTile>
    </span>
  );
}
