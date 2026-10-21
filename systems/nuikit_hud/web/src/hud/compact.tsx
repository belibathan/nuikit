// The compact vehicle cluster (design v2 §4): a small arc of segmented ticks for the rpm with the
// gear in its centre, the speed big under it with dimmed leading zeros (`0`40), a separate fuel arc
// outside it, and the telltales as a narrow column beside it, lit only when on.
//
// Live values (speed, rpm, heading) are painted straight into the DOM by the Cluster's follow hooks
// (cluster.tsx): a tick toggles only when the lit count changes, a digit only when it changes.
import { FuelIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";
import type { HudSettings, HudVehicle } from "../nui";
import { Signal, type Painter, type Tell } from "./cluster";
import type { HudLook } from "./look";
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
const VB_W = 156;
const VB_H = 148;
const C = 74; // centre
const START = -128; // degrees clockwise from the top
const SWEEP = 256;
const TICK_IN = 54;
const TICK_OUT = 63;
const COUNT = 32;
const FUEL_R = 72;
const FUEL_FROM = 148; // the empty end, lower right
const FUEL_TO = 52; // the full end, upper right

function polar(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}

/** The fuel arc, drawn from empty (bottom) to full (top), so a dash of `f` of its length is the level. */
const FUEL_PATH = (() => {
  const [x0, y0] = polar(FUEL_FROM, FUEL_R);
  const [x1, y1] = polar(FUEL_TO, FUEL_R);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${FUEL_R} ${FUEL_R} 0 0 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
})();

export interface CompactProps {
  v: HudVehicle;
  look: HudLook;
  settings: NonNullable<HudSettings["vehicle"]>;
  paint: { current: Painter | null };
  center: "gear" | "heading";
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

export function CompactGauge({ v, look, settings, paint, center }: CompactProps) {
  const root = useRef<HTMLDivElement>(null);
  const ticks = useRef<SVGGElement>(null);
  const digits = useRef<(HTMLSpanElement | null)[]>([]);
  const heading = useRef<HTMLSpanElement>(null);
  const state = useRef({ lit: -1, red: false, speed: "", lead: -1 });
  const redline = v.redline;
  const showRpm = settings.rpm !== false;
  const fuel = settings.fuel !== false && v.fuel !== undefined ? Math.max(0, Math.min(100, Math.round(v.fuel))) : undefined;
  const signals = settings.indicators !== false && v.indicators !== undefined;

  paint.current = {
    speed(s) {
      const { digits: d, lead } = speedDigits(s);
      if (d === state.current.speed) return;
      state.current.speed = d;
      const els = digits.current;
      for (let i = 0; i < 3; i++) setText(els[i], d[i]!);
      if (lead !== state.current.lead) {
        state.current.lead = lead;
        for (let i = 0; i < 3; i++) els[i]?.toggleAttribute("data-dim", i < lead);
      }
    },
    rpm(r) {
      const x = clamp01(r);
      const lit = litTicks(x, COUNT);
      if (lit !== state.current.lit && ticks.current) {
        state.current.lit = lit;
        const kids = ticks.current.children;
        for (let i = 0; i < kids.length; i++) (kids[i] as Element).toggleAttribute("data-on", i < lit);
      }
      const red = x >= redline;
      if (red !== state.current.red) {
        state.current.red = red;
        root.current?.toggleAttribute("data-redline", red);
      }
    },
    heading(h) {
      setText(heading.current, `${Math.round(h) % 360}° ${cardinal(h)}`);
    },
  };

  const marks: ReactNode[] = [];
  if (showRpm) {
    for (let i = 0; i < COUNT; i++) {
      const at = (i + 0.5) / COUNT;
      const deg = START + SWEEP * at;
      // every fourth tick is a little longer: a quiet scale without numbers
      const major = look.ticks && i % 4 === 3;
      const [x0, y0] = polar(deg, major ? TICK_IN - 3 : TICK_IN);
      const [x1, y1] = polar(deg, TICK_OUT);
      marks.push(<line key={i} x1={x0.toFixed(2)} y1={y0.toFixed(2)} x2={x1.toFixed(2)} y2={y1.toFixed(2)} data-red={at >= redline || undefined} />);
    }
  }

  return (
    <div ref={root} data-slot="hud-gauge" data-style="compact" data-off={!v.engineOn || undefined} className="hud-gauge hud-c-gauge">
      <span className="hud-plate hud-c-plate" aria-hidden />
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="hud-c-svg" aria-hidden>
        <g ref={ticks} className="hud-c-ticks">
          {marks}
        </g>
        {fuel !== undefined && (
          <g data-slot="hud-fuel" data-low={fuel <= 15 || undefined} className="hud-c-fuel">
            <path d={FUEL_PATH} className="hud-c-fuel-track" />
            <path d={FUEL_PATH} pathLength={100} strokeDasharray={`${fuel} 100`} className="hud-c-fuel-fill" />
          </g>
        )}
      </svg>
      {fuel !== undefined && (
        <span className="hud-c-fuel-icon" data-low={fuel <= 15 || undefined} role="meter" aria-label="Fuel" aria-valuemin={0} aria-valuemax={100} aria-valuenow={fuel}>
          <FuelIcon />
        </span>
      )}
      <div className="hud-c-center">
        {center === "heading" ? (
          <span ref={heading} data-slot="hud-heading" className="hud-num hud-c-heading">
            {`${Math.round(v.heading ?? 0) % 360}° ${cardinal(v.heading ?? 0)}`}
          </span>
        ) : (
          v.gear !== undefined && (
            <span data-slot="hud-gear" data-gear={String(v.gear)} className="hud-num hud-c-gear" aria-label="Gear">
              {v.gear}
            </span>
          )
        )}
      </div>
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
