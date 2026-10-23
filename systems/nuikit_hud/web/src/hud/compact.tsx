// The compact vehicle cluster (design v2 §4, reference screens): the kit's Speedometer (components/ui/speedometer,
// the in-game gauge: thick rpm segments with even gaps or a thin arc over ticks, the speed with its leading zeros
// dimmed, the gear keycap in the opening, fuel on the outer right-hand curve, the signals inside the ring) with
// the telltales as a narrow column beside it, lit only when on. The identity's gauge style picks the drawing:
// `digital` and `arc` are the Speedometer's styles; `bar` is a rectangular plate (speed and unit, the gear chip
// beside them, a segmented rpm bar under), drawn here.
//
// Live values (speed, rpm, heading) are painted straight into the DOM by the Cluster's follow hooks
// (cluster.tsx): the Speedometer's painter rolls a digit only when it changes and switches a segment only when
// the lit count changes; the speed is gated by calm() (smoothed, at most `speedRate` changes a second).
import { FuelIcon } from "lucide-react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Stagger, useStaggerItem } from "nuikit-core/react";
import { TextRoll } from "@/components/ui/text-roll";
import { Speedometer, speedometerDigits, speedometerPainter, rollDigit } from "@/components/ui/speedometer";
import type { HudSettings, HudVehicle } from "../nui";
import { Signal, type Painter, type Tell } from "./cluster";
import type { GaugeStyle, HudLook } from "./look";
import { calm } from "./reel";
import { Keycap } from "./keycap";
import { cardinal, setText, UNIT_LABEL } from "./util";

const clamp01 = (v: number) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

/** The speed as three digits (up to 999) and how many of them are leading zeros (dimmed): the kit's. */
export const speedDigits = speedometerDigits;

/** How many of `count` rpm ticks are lit (the bar's segments). */
export const litTicks = (rpm: number, count: number) => Math.round(clamp01(rpm) * count);

export interface CompactProps {
  v: HudVehicle;
  look: HudLook;
  settings: NonNullable<HudSettings["vehicle"]>;
  paint: { current: Painter | null };
  center: "gear" | "heading";
  /** the identity's gauge style (or the config's) */
  style: GaugeStyle;
}

/** The heading for a boat, painted live. */
function Heading({ v, heading }: { v: HudVehicle; heading: { current: HTMLSpanElement | null } }) {
  return (
    <span ref={heading} data-slot="hud-heading" className="hud-num hud-c-heading">
      {`${Math.round(v.heading ?? 0) % 360}° ${cardinal(v.heading ?? 0)}`}
    </span>
  );
}

/** What the number shows is calm: smoothed (~120 ms), at most `hz` changes a second, and a ±1 jitter at a
 *  steady speed never rolls (vehicle.speedRate). */
function useCalmSpeed(show: (v: number) => void, hz = 10) {
  const gate = useRef<ReturnType<typeof calm> | null>(null);
  if (!gate.current) gate.current = calm({ hz, tau: 120, step: 1 }, (v) => show(v));
  return (s: number) => gate.current!.feed(s);
}

export function CompactGauge(props: CompactProps) {
  return props.style === "bar" ? <CompactBar {...props} /> : <CompactDial {...props} />;
}

/** `digital` and `arc`: the kit's Speedometer, live. */
function CompactDial({ v, settings, paint, center, style }: CompactProps) {
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLSpanElement>(null);
  const painter = useRef<ReturnType<typeof speedometerPainter> | null>(null);
  const redline = v.redline;
  const fuel = settings.fuel !== false && v.fuel !== undefined ? v.fuel : undefined;
  const signals = settings.indicators !== false && v.indicators !== undefined;
  // the painter finds the digit reels and the segments once per mount (or once the style changes them)
  useLayoutEffect(() => {
    painter.current = root.current ? speedometerPainter(root.current, { redline }) : null;
  }, [style, redline, settings.rpm]);
  const speed = useCalmSpeed((s) => painter.current?.speed(s), settings.speedRate);
  paint.current = {
    speed,
    rpm: (r) => painter.current?.rpm(r),
    heading: (h) => setText(heading.current, `${Math.round(h) % 360}° ${cardinal(h)}`),
  };
  return (
    <div data-slot="hud-gauge" data-style={style === "arc" ? "arc" : "digital"} data-off={!v.engineOn || undefined} className="hud-gauge hud-c-gauge">
      <Speedometer
        ref={root}
        live
        speed={v.speed}
        rpm={0} // live: the painter (follow hooks) owns the rpm and the redline; props are not read
        gear={v.gear}
        fuel={fuel}
        unit={UNIT_LABEL[v.units]}
        style={style === "arc" ? "arc" : "digital"}
        indicators={signals ? v.indicators : undefined}
        engine={v.engineOn !== false}
        center={center === "heading" ? <Heading v={v} heading={heading} /> : undefined}
        className={settings.rpm === false ? "hud-c-norpm" : undefined}
      />
    </div>
  );
}

/** Speed digits with the leading zeros dimmed, painted per digit (the bar). */
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

/** Fuel as a line: the pump, a thin track and the percentage (the bar). */
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

/** Gears in order, for the roll direction: R, N, 1 to 8. */
const GEAR_ORDER = (g: string) => (g === "R" ? -1 : g === "N" ? 0 : Number(g) || 0);

/** The gear chip (the bar); the gear rolls up when shifting up and down when shifting down. */
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
      <Keycap glyph={<TextRoll value={String(gear)} direction={dir.current} align="center" />} />
    </span>
  );
}

/** A painter that keeps the speed digits, the redline flag and the shared state (the bar). */
function useSpeedPainter(
  root: { current: HTMLDivElement | null },
  digits: { current: (HTMLSpanElement | null)[] },
  heading: { current: HTMLSpanElement | null },
  hz = 10,
) {
  const state = useRef({ lit: -1, red: false, speed: "", lead: -1 });
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
  const speed = useCalmSpeed(paintSpeed, hz);
  return { state, speed, redline, head };
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
        <div className="hud-c-center">{center === "heading" ? <Heading v={v} heading={heading} /> : <Gear gear={v.gear} />}</div>
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
      <Keycap size="sm" icon={t.icon} open={!!t.text} label={t.text && <span className="nk-num">{t.text}</span>} />
    </span>
  );
}
