// Aircraft: airspeed, a heading rose and altitude, all live (they glide at the game's frame rate,
// written straight to the DOM). Telltales for the landing gear, lights and engine, plus fuel.
import { useFollow } from "nuikit-core/react";
import { FuelIcon } from "@/components/ui/icons";
import { useRef, useState } from "react";
import type { HudVehicle } from "../nui";
import { cardinal, setText, UNIT_LABEL } from "./util";
import { EngineIcon, GearDownIcon, HighBeamIcon, LowBeamIcon } from "./icons";

const ROSE = Array.from({ length: 36 }, (_, i) => i * 10);
const ROSE_LABEL: Record<number, string> = { 0: "N", 90: "E", 180: "S", 270: "W", 30: "3", 60: "6", 120: "12", 150: "15", 210: "21", 240: "24", 300: "30", 330: "33" };

const thousands = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function Aircraft({ vehicle, anchored = true }: { vehicle: HudVehicle; anchored?: boolean }) {
  const [start] = useState(() => ({ speed: vehicle.speed, heading: vehicle.heading ?? 0, altitude: vehicle.altitude ?? 0 }));
  const speed = useRef<HTMLSpanElement>(null);
  const alt = useRef<HTMLSpanElement>(null);
  const rose = useRef<SVGGElement>(null);
  const hdg = useRef<HTMLSpanElement>(null);

  useFollow("hud:vehicle:speed", (x) => setText(speed.current, String(Math.round(x))), { start: start.speed, epsilon: 0.05 });
  useFollow("hud:vehicle:altitude", (x) => setText(alt.current, thousands.format(Math.round(x))), { start: start.altitude, epsilon: 0.05 });
  useFollow(
    "hud:vehicle:heading",
    (x) => {
      rose.current?.setAttribute("transform", `rotate(${(-x).toFixed(2)} 48 48)`);
      setText(hdg.current, `${String(Math.round(x) % 360).padStart(3, "0")}° ${cardinal(x)}`);
    },
    { kind: "angle", start: start.heading, epsilon: 0.05 },
  );

  const gear = vehicle.landingGear;
  const lights = vehicle.lights;
  return (
    <div data-slot="hud-cluster" data-kind={vehicle.kind} className={anchored ? "hud-cluster hud-anchor-br" : "hud-cluster"}>
      <div data-slot="hud-gauge" data-style="air" data-off={!vehicle.engineOn || undefined} className="hud-gauge hud-air">
        <span className="hud-plate hud-plate-rect" aria-hidden />
        <div className="hud-air-col">
          <span className="hud-label">Airspeed</span>
          <span ref={speed} data-slot="hud-speed" className="hud-num hud-air-value">
            {Math.round(start.speed)}
          </span>
          <span className="hud-unit">{UNIT_LABEL[vehicle.units]}</span>
        </div>
        <div className="hud-air-rose">
          <svg viewBox="0 0 96 96" aria-hidden>
            <circle cx="48" cy="48" r="44" className="hud-rose-ring" />
            <g ref={rose} transform={`rotate(${-start.heading} 48 48)`}>
              {ROSE.map((d) => {
                const major = d % 30 === 0;
                const a = (d * Math.PI) / 180;
                const r0 = 44;
                const r1 = major ? 37 : 40.5;
                return (
                  <line
                    key={d}
                    x1={48 + r0 * Math.sin(a)}
                    y1={48 - r0 * Math.cos(a)}
                    x2={48 + r1 * Math.sin(a)}
                    y2={48 - r1 * Math.cos(a)}
                    className="hud-tick"
                    data-major={major || undefined}
                  />
                );
              })}
              {Object.entries(ROSE_LABEL).map(([d, label]) => {
                const a = (Number(d) * Math.PI) / 180;
                const r = 29;
                return (
                  <text
                    key={d}
                    x={48 + r * Math.sin(a)}
                    y={48 - r * Math.cos(a)}
                    dy="0.35em"
                    textAnchor="middle"
                    transform={`rotate(${d} ${48 + r * Math.sin(a)} ${48 - r * Math.cos(a)})`}
                    className="hud-rose-label"
                    data-north={d === "0" || undefined}
                  >
                    {label}
                  </text>
                );
              })}
            </g>
            <path d="M48 1 L52.5 9 L43.5 9 Z" className="hud-rose-lubber" />
            <path d="M48 38 v20 M40 48 h16" className="hud-rose-plane" />
          </svg>
          <span ref={hdg} data-slot="hud-heading" className="hud-num hud-air-heading">
            {`${String(Math.round(start.heading) % 360).padStart(3, "0")}° ${cardinal(start.heading)}`}
          </span>
        </div>
        <div className="hud-air-col hud-air-col-end">
          <span className="hud-label">Altitude</span>
          <span ref={alt} data-slot="hud-altitude" className="hud-num hud-air-value">
            {thousands.format(Math.round(start.altitude))}
          </span>
          <span className="hud-unit">{vehicle.altUnits ?? "ft"}</span>
        </div>
        <div className="hud-air-foot">
          {gear && (
            <span className="hud-air-flag" data-tone={gear === "down" ? "success" : gear === "moving" ? "warning" : "muted"}>
              <GearDownIcon />
              {gear === "down" ? "Gear down" : gear === "moving" ? "Gear moving" : "Gear up"}
            </span>
          )}
          {lights && lights !== "off" && (
            <span className="hud-air-flag" data-tone={lights === "high" ? "info" : "success"}>
              {lights === "high" ? <HighBeamIcon /> : <LowBeamIcon />}
              Lights
            </span>
          )}
          {vehicle.engine < 40 && (
            <span className="hud-air-flag" data-tone={vehicle.engine < 20 ? "destructive" : "warning"}>
              <EngineIcon />
              Engine {vehicle.engine}%
            </span>
          )}
          {vehicle.fuel !== undefined && (
            <span className="hud-air-flag" data-tone={vehicle.fuel <= 15 ? "warning" : "muted"}>
              <FuelIcon />
              <span className="hud-num">{Math.round(vehicle.fuel)}%</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
