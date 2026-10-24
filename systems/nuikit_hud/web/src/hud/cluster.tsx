// The vehicle cluster: cars, bikes and boats get a gauge (arc, bar or digital, from the identity's
// --nk-style-gauge), aircraft get flight instruments (aircraft.tsx). Speed, rpm and heading are live
// values: they glide at the game's frame rate and are written straight to the DOM (useFollow), never
// through a React render. React renders only when `hud:vehicle` changes (gear, fuel, damage, lights…).
import { followed, useFollow } from "nuikit-core/react";
import { ArrowBigLeftIcon, ArrowBigRightIcon, FuelIcon, TriangleAlertIcon } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { HudSettings, HudVehicle } from "../nui";
import { BodyIcon, CruiseIcon, EngineIcon, HandbrakeIcon, HighBeamIcon, LowBeamIcon, SeatbeltIcon } from "./icons";
import type { GaugeStyle, HudLook } from "./look";
import { Aircraft } from "./aircraft";
import { CompactGauge, TelltaleColumn } from "./compact";
import { Keycap } from "./keycap";
import { cardinal, setText, UNIT_LABEL } from "./util";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

/** What paints the live values of one gauge variant. */
export interface Painter {
  speed(v: number): void;
  rpm(v: number): void;
  heading?(v: number): void;
}

/** The shift lights' thresholds for a redline: five steps up to it. */
export function shiftSteps(redline: number) {
  return [0.24, 0.18, 0.12, 0.06, 0].map((d) => redline - d);
}

/** How many of the five shift lights are lit at an rpm. */
export function shiftLit(rpm: number, redline: number) {
  return shiftSteps(redline).filter((t) => rpm >= t).length;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

// ───────────────────────────────── shared pieces

/** Turn-signal arrows: blink while on (a live thing, so it may animate; off with motion off). */
export function Signal({ side, on }: { side: "left" | "right"; on: boolean }) {
  return (
    <span data-slot="hud-signal" data-side={side} data-on={on || undefined} className="hud-signal" aria-label={on ? `Indicator ${side}` : undefined}>
      {side === "left" ? <ArrowBigLeftIcon /> : <ArrowBigRightIcon />}
    </span>
  );
}

function ShiftLights({ refEl }: { refEl: (el: HTMLDivElement | null) => void }) {
  return (
    <div ref={refEl} data-slot="hud-shift" className="hud-shift" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} data-step={i} />
      ))}
    </div>
  );
}

function paintShift(el: HTMLElement | null, rpm: number, redline: number, state: { lit: number }) {
  if (!el) return;
  const lit = shiftLit(rpm, redline);
  if (lit === state.lit) return;
  state.lit = lit;
  const kids = el.children;
  for (let i = 0; i < kids.length; i++) (kids[i] as HTMLElement).toggleAttribute("data-on", i < lit);
  el.toggleAttribute("data-flash", lit >= 5);
}

function Fuel({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div data-slot="hud-fuel" data-state={v <= 15 ? "alert" : undefined} className="hud-fuel" role="meter" aria-label="Fuel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <FuelIcon />
      <span className="hud-fuel-track">
        <span className="hud-fuel-fill" style={{ transform: `scaleX(${v / 100})` }} />
      </span>
      <span className="hud-num">{v}</span>
    </div>
  );
}

export interface Tell {
  key: string;
  icon: ReactNode;
  on: boolean;
  tone: "success" | "info" | "warning" | "destructive";
  label: string;
  /** a value beside the icon while it's lit (the cruise speed) */
  text?: string;
}

/** The dashboard's telltales: unlit ones stay faintly in place, so the row never jumps. */
export function telltales(v: HudVehicle, s: NonNullable<HudSettings["vehicle"]>): Tell[] {
  const out: Tell[] = [];
  if (s.lights !== false && v.lights !== undefined) {
    out.push(
      v.lights === "high"
        ? { key: "lights", icon: <HighBeamIcon />, on: true, tone: "info", label: "High beam" }
        : { key: "lights", icon: <LowBeamIcon />, on: v.lights === "low", tone: "success", label: "Lights" },
    );
  }
  const belt = s.seatbelt === true || (s.seatbelt !== false && v.seatbelt !== undefined);
  if (belt && v.kind === "car") {
    const unbuckled = v.seatbelt !== true;
    out.push({ key: "seatbelt", icon: <SeatbeltIcon />, on: unbuckled, tone: "destructive", label: unbuckled ? "Seatbelt off" : "Seatbelt on" });
  }
  const cruise = s.cruise === true || (s.cruise !== false && v.cruise !== undefined);
  if (cruise) out.push({ key: "cruise", icon: <CruiseIcon />, on: v.cruise === true, tone: "success", label: "Cruise", text: v.cruise && v.cruiseSpeed !== undefined ? String(v.cruiseSpeed) : undefined });
  if (s.handbrake !== false && v.handbrake !== undefined) out.push({ key: "handbrake", icon: <HandbrakeIcon />, on: v.handbrake, tone: "destructive", label: "Handbrake" });
  if (s.damage !== false) {
    out.push({ key: "engine", icon: <EngineIcon />, on: v.engine < 40, tone: v.engine < 20 ? "destructive" : "warning", label: `Engine ${v.engine}%` });
    if (v.kind === "car" || v.kind === "bike") out.push({ key: "body", icon: <BodyIcon />, on: v.body < 40, tone: v.body < 20 ? "destructive" : "warning", label: `Body ${v.body}%` });
  }
  return out;
}

export function Telltales({ items }: { items: Tell[] }) {
  if (!items.length) return null;
  return (
    <div data-slot="hud-telltales" className="hud-telltales">
      {items.map((t) => (
        <span key={t.key} data-slot="hud-telltale" data-key={t.key} data-on={t.on || undefined} data-tone={t.tone} className="hud-telltale" aria-label={t.on ? t.label : undefined} aria-hidden={!t.on}>
          {t.icon}
          {t.on && t.text && <span className="hud-num hud-telltale-text">{t.text}</span>}
        </span>
      ))}
    </div>
  );
}

/** Warnings with words and values: only what needs attention now. */
function Warnings({ v, s }: { v: HudVehicle; s: NonNullable<HudSettings["vehicle"]> }) {
  const list: { key: string; text: string; tone: "warning" | "destructive" }[] = [];
  if (v.kind === "car" && v.seatbelt === false && v.moving && s.seatbelt !== false) list.push({ key: "belt", text: "Fasten seatbelt", tone: "destructive" });
  if (s.fuel !== false && v.fuel !== undefined && v.fuel <= 15) list.push({ key: "fuel", text: `Low fuel ${Math.round(v.fuel)}%`, tone: v.fuel <= 5 ? "destructive" : "warning" });
  if (s.damage !== false && v.engine < 30) list.push({ key: "engine", text: `Engine ${v.engine}%`, tone: v.engine < 15 ? "destructive" : "warning" });
  if (!list.length) return null;
  return (
    <div data-slot="hud-warnings" className="hud-warnings">
      {list.map((w) => (
        <Chip key={w.key} tone={w.tone === "warning" ? "warning" : "danger"} fill="solid" icon={<TriangleAlertIcon />} className="hud-warning">
          {w.text}
        </Chip>
      ))}
    </div>
  );
}

// ───────────────────────────────── arc

const C = 120;
const R = 101;
const START = -120;
const SWEEP = 240;
const angleOf = (rpm: number) => START + SWEEP * clamp01(rpm);
function polar(angle: number, r: number): [number, number] {
  const a = (angle * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}
function arcPath(a0: number, a1: number, r: number) {
  const [x0, y0] = polar(a0, r);
  const [x1, y1] = polar(a1, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

function ArcGauge({ v, look, paint, settings, center }: GaugeProps) {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<SVGPathElement>(null);
  const glow = useRef<SVGPathElement>(null);
  const needle = useRef<SVGGElement>(null);
  const speed = useRef<HTMLSpanElement>(null);
  const shift = useRef<HTMLDivElement | null>(null);
  const heading = useRef<HTMLSpanElement>(null);
  const state = useRef({ lit: -1, red: false });
  const T = look.track;
  const redline = v.redline;
  const showRpm = settings.rpm !== false;

  paint.current = {
    speed(s) {
      setText(speed.current, String(Math.round(s)));
    },
    rpm(r) {
      const x = clamp01(r);
      const dash = `${(x * 1000).toFixed(1)} 1000`;
      fill.current?.setAttribute("stroke-dasharray", dash);
      glow.current?.setAttribute("stroke-dasharray", dash);
      needle.current?.setAttribute("transform", `rotate(${angleOf(x).toFixed(2)} ${C} ${C})`);
      const red = x >= redline;
      if (red !== state.current.red) {
        state.current.red = red;
        if (red) root.current?.setAttribute("data-state", "alert");
        else root.current?.removeAttribute("data-state");
      }
      if (settings.shiftLight !== false) paintShift(shift.current, x, redline, state.current);
    },
    heading(h) {
      setText(heading.current, `${Math.round(h) % 360}° ${cardinal(h)}`);
    },
  };

  const majors = 8;
  const ticks: ReactNode[] = [];
  if (look.ticks && showRpm) {
    for (let i = 0; i <= majors * 4; i++) {
      const rpm = i / (majors * 4);
      const a = angleOf(rpm);
      const major = i % 4 === 0;
      const half = i % 2 === 0;
      const r0 = R - T / 2 - 3;
      const r1 = r0 - (major ? 10 : half ? 6 : 3.5);
      const [x0, y0] = polar(a, r0);
      const [x1, y1] = polar(a, r1);
      ticks.push(
        <line key={`t${i}`} x1={x0} y1={y0} x2={x1} y2={y1} data-major={major || undefined} data-red={rpm >= redline - 1e-6 || undefined} className="hud-tick" />,
      );
      if (major) {
        const [lx, ly] = polar(a, R - T / 2 - 22);
        ticks.push(
          <text key={`l${i}`} x={lx} y={ly} dy="0.35em" textAnchor="middle" data-red={rpm >= redline - 1e-6 || undefined} className="hud-tick-label">
            {i / 4}
          </text>,
        );
      }
    }
  }

  return (
    <div ref={root} data-slot="hud-gauge" data-style="arc" data-off={!v.engineOn || undefined} className="hud-gauge hud-arc">
      <span className="hud-plate" aria-hidden />
      <svg viewBox="0 0 240 240" className="hud-arc-svg" aria-hidden>
        {showRpm && (
          <>
            <path d={arcPath(START, START + SWEEP, R)} className="hud-arc-track" strokeWidth={T} />
            <path d={arcPath(angleOf(redline), START + SWEEP, R + T / 2 + 4)} className="hud-arc-redzone" />
            {ticks}
            <path ref={glow} d={arcPath(START, START + SWEEP, R)} pathLength={1000} className="hud-arc-glow" strokeWidth={T * 3} strokeDasharray="0 1000" />
            <path ref={fill} d={arcPath(START, START + SWEEP, R)} pathLength={1000} className="hud-arc-fill" strokeWidth={T} strokeDasharray="0 1000" />
            <g ref={needle} transform={`rotate(${START} ${C} ${C})`} className="hud-arc-needle">
              <line x1={C} y1={C - R - T / 2 - 5} x2={C} y2={C - R + T / 2 + 13} />
            </g>
          </>
        )}
      </svg>
      <div className="hud-arc-center">
        {settings.shiftLight !== false && showRpm && <ShiftLights refEl={(el) => (shift.current = el)} />}
        <span ref={speed} data-slot="hud-speed" className="hud-num hud-speed">
          {Math.round(v.speed)}
        </span>
        <span className="hud-unit">{UNIT_LABEL[v.units]}</span>
        {center === "heading" ? (
          <span ref={heading} data-slot="hud-heading" className="hud-gear hud-gear-wide hud-num">
            {`${Math.round(v.heading ?? 0) % 360}° ${cardinal(v.heading ?? 0)}`}
          </span>
        ) : (
          v.gear !== undefined && (
            <span data-slot="hud-gear" data-gear={String(v.gear)} className="hud-c-gear-tile" aria-label="Gear">
              <Keycap glyph={String(v.gear)} />
            </span>
          )
        )}
      </div>
      <div className="hud-arc-foot">
        {settings.indicators !== false && v.indicators !== undefined && <Signal side="left" on={(v.indicators & 1) === 1} />}
        {settings.fuel !== false && v.fuel !== undefined ? <Fuel value={v.fuel} /> : <span />}
        {settings.indicators !== false && v.indicators !== undefined && <Signal side="right" on={(v.indicators & 2) === 2} />}
      </div>
    </div>
  );
}

// ───────────────────────────────── bar

function BarGauge({ v, look, paint, settings, center }: GaugeProps) {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const speed = useRef<HTMLSpanElement>(null);
  const heading = useRef<HTMLSpanElement>(null);
  const shift = useRef<HTMLDivElement | null>(null);
  const state = useRef({ lit: -1, red: false });
  const redline = v.redline;
  const showRpm = settings.rpm !== false;
  paint.current = {
    speed(s) {
      setText(speed.current, String(Math.round(s)));
    },
    rpm(r) {
      const x = clamp01(r);
      if (fill.current) fill.current.style.transform = `scaleX(${x.toFixed(4)})`;
      const red = x >= redline;
      if (red !== state.current.red) {
        state.current.red = red;
        if (red) root.current?.setAttribute("data-state", "alert");
        else root.current?.removeAttribute("data-state");
      }
      if (settings.shiftLight !== false) paintShift(shift.current, x, redline, state.current);
    },
    heading(h) {
      setText(heading.current, `${Math.round(h) % 360}° ${cardinal(h)}`);
    },
  };
  return (
    <div ref={root} data-slot="hud-gauge" data-style="bar" data-off={!v.engineOn || undefined} className="hud-gauge hud-bar">
      <span className="hud-plate hud-plate-rect" aria-hidden />
      <div className="hud-bar-top">
        {settings.indicators !== false && v.indicators !== undefined && <Signal side="left" on={(v.indicators & 1) === 1} />}
        {settings.shiftLight !== false && showRpm && <ShiftLights refEl={(el) => (shift.current = el)} />}
        {settings.indicators !== false && v.indicators !== undefined && <Signal side="right" on={(v.indicators & 2) === 2} />}
      </div>
      <div className="hud-bar-main">
        <span ref={speed} data-slot="hud-speed" className="hud-num hud-speed">
          {Math.round(v.speed)}
        </span>
        <span className="hud-unit">{UNIT_LABEL[v.units]}</span>
        {center === "heading" ? (
          <span ref={heading} className="hud-gear hud-gear-wide hud-num">{`${Math.round(v.heading ?? 0) % 360}° ${cardinal(v.heading ?? 0)}`}</span>
        ) : (
          v.gear !== undefined && (
            <span data-slot="hud-gear" data-gear={String(v.gear)} className="hud-c-gear-tile" aria-label="Gear">
              <Keycap glyph={String(v.gear)} />
            </span>
          )
        )}
      </div>
      {showRpm && (
        <div className="hud-bar-rpm" style={{ height: `${look.track / 16}rem` }}>
          <span className="hud-bar-redzone" style={{ left: `${redline * 100}%` }} />
          <span ref={fill} className="hud-bar-fill" />
          {look.ticks &&
            Array.from({ length: 9 }, (_, i) => <span key={i} className="hud-bar-tick" data-red={i / 8 >= redline - 1e-6 || undefined} style={{ left: `${(i / 8) * 100}%` }} />)}
        </div>
      )}
      {settings.fuel !== false && v.fuel !== undefined && <Fuel value={v.fuel} />}
    </div>
  );
}

// ───────────────────────────────── digital

const SEGMENTS = 24;

function DigitalGauge({ v, paint, settings, center }: GaugeProps) {
  const root = useRef<HTMLDivElement>(null);
  const segs = useRef<HTMLDivElement>(null);
  const speed = useRef<HTMLSpanElement>(null);
  const heading = useRef<HTMLSpanElement>(null);
  const state = useRef({ lit: -1, red: false });
  const redline = v.redline;
  const showRpm = settings.rpm !== false;
  paint.current = {
    speed(s) {
      setText(speed.current, String(Math.round(s)));
    },
    rpm(r) {
      const x = clamp01(r);
      const lit = Math.round(x * SEGMENTS);
      if (lit !== state.current.lit && segs.current) {
        const kids = segs.current.children;
        for (let i = 0; i < kids.length; i++) (kids[i] as HTMLElement).toggleAttribute("data-on", i < lit);
        state.current.lit = lit;
      }
      const red = x >= redline;
      if (red !== state.current.red) {
        state.current.red = red;
        if (red) root.current?.setAttribute("data-state", "alert");
        else root.current?.removeAttribute("data-state");
      }
    },
    heading(h) {
      setText(heading.current, `${Math.round(h) % 360}° ${cardinal(h)}`);
    },
  };
  return (
    <div ref={root} data-slot="hud-gauge" data-style="digital" data-off={!v.engineOn || undefined} className="hud-gauge hud-digital">
      <span className="hud-plate hud-plate-rect" aria-hidden />
      {showRpm && (
        <div ref={segs} className="hud-segments" aria-hidden>
          {Array.from({ length: SEGMENTS }, (_, i) => {
            const at = (i + 1) / SEGMENTS;
            const zone = at > redline ? "red" : at > redline - 0.2 ? "warn" : "ok";
            return <span key={i} data-zone={zone} />;
          })}
        </div>
      )}
      <div className="hud-digital-main">
        {settings.indicators !== false && v.indicators !== undefined && <Signal side="left" on={(v.indicators & 1) === 1} />}
        <div className="hud-digital-speed">
          <span ref={speed} data-slot="hud-speed" className="hud-num hud-speed">
            {Math.round(v.speed)}
          </span>
          <span className="hud-unit">{UNIT_LABEL[v.units]}</span>
        </div>
        {center === "heading" ? (
          <span ref={heading} className="hud-gear hud-gear-wide hud-num">{`${Math.round(v.heading ?? 0) % 360}° ${cardinal(v.heading ?? 0)}`}</span>
        ) : (
          v.gear !== undefined && (
            <span data-slot="hud-gear" data-gear={String(v.gear)} className="hud-c-gear-tile" aria-label="Gear">
              <Keycap glyph={String(v.gear)} />
            </span>
          )
        )}
        {settings.indicators !== false && v.indicators !== undefined && <Signal side="right" on={(v.indicators & 2) === 2} />}
      </div>
      {settings.fuel !== false && v.fuel !== undefined && <Fuel value={v.fuel} />}
    </div>
  );
}

// ───────────────────────────────── the cluster

interface GaugeProps {
  v: HudVehicle;
  look: HudLook;
  settings: NonNullable<HudSettings["vehicle"]>;
  paint: { current: Painter | null };
  /** what sits under the speed: the gear (cars) or the heading (boats) */
  center: "gear" | "heading";
}

const GAUGES: Record<GaugeStyle, (p: GaugeProps) => ReactNode> = { arc: ArcGauge, bar: BarGauge, digital: DigitalGauge };

/**
 * Bottom right while in a vehicle. `compact` (the default layout) draws the small gauge (arc, bar or
 * digital from the identity) with a telltale column on its left; `classic` the large gauges.
 */
export function Cluster({ vehicle, settings, look, compact = false, anchored = true }: { vehicle: HudVehicle; settings: HudSettings; look: HudLook; compact?: boolean; anchored?: boolean }) {
  const s = settings.vehicle ?? {};
  const style: GaugeStyle = s.gauge && s.gauge !== "theme" ? s.gauge : look.gauge;
  const paint = useRef<Painter | null>(null);
  const air = vehicle.kind === "plane" || vehicle.kind === "heli";
  const boat = vehicle.kind === "boat";
  // Where the live values started: the gauges render these once and the live channels move them
  // from there, so a later hud:vehicle (gear, fuel…) never writes an old speed back over a live one.
  const [start] = useState(() => ({ speed: vehicle.speed, rpm: vehicle.rpm ?? 0, heading: vehicle.heading ?? 0 }));
  const shown = { ...vehicle, ...start };

  useFollow("hud:vehicle:speed", (x) => paint.current?.speed(x), { start: start.speed, epsilon: 0.05 });
  useFollow("hud:vehicle:rpm", (x) => paint.current?.rpm(x), { start: start.rpm });
  useFollow("hud:vehicle:heading", (x) => paint.current?.heading?.(x), { kind: "angle", start: start.heading, epsilon: 0.2 });
  // a gauge that (re)mounts (another style from a theme reload) starts at the live values
  useLayoutEffect(() => {
    const p = paint.current;
    if (!p) return;
    p.speed(followed("hud:vehicle:speed") ?? start.speed);
    p.rpm(followed("hud:vehicle:rpm") ?? start.rpm);
    p.heading?.(followed("hud:vehicle:heading") ?? start.heading);
  }, [style, start, compact]);

  if (air) return <Aircraft vehicle={vehicle} anchored={anchored} />;
  if (compact) {
    return (
      <div data-slot="hud-cluster" data-kind={vehicle.kind} data-layout="compact" className={cn("hud-c-cluster", anchored && "hud-anchor-br")}>
        <TelltaleColumn items={telltales(vehicle, s)} />
        <CompactGauge v={shown} look={look} paint={paint} settings={s} center={boat ? "heading" : "gear"} style={style} />
      </div>
    );
  }
  const Gauge = GAUGES[style];
  return (
    <div data-slot="hud-cluster" data-kind={vehicle.kind} className={cn("hud-cluster", anchored && "hud-anchor-br")}>
      <Gauge v={shown} look={look} paint={paint} settings={s} center={boat ? "heading" : "gear"} />
      <Telltales items={telltales(vehicle, s)} />
      <Warnings v={vehicle} s={s} />
    </div>
  );
}
