import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Speedometer — arc gauge for the vehicle HUD. Speed, gear, RPM arc, fuel.
 * Feed it from Lua at ~10Hz: NUI.send('hud:vehicle', { speed = 87, rpm = 0.62, gear = 3, fuel = 41 })
 */
export interface SpeedometerProps extends React.HTMLAttributes<HTMLDivElement> {
  speed: number;
  /** 0–1 */
  rpm: number;
  gear?: number | "R" | "N";
  /** 0–100 */
  fuel?: number;
  unit?: "MPH" | "KMH";
  size?: number;
}

const SWEEP = 260; // degrees of arc

export function Speedometer({ speed, rpm, gear = "N", fuel, unit = "MPH", size = 200, className, ...props }: SpeedometerProps) {
  const r = size / 2 - 10;
  const c = size / 2;
  const clamped = Math.max(0, Math.min(1, rpm));
  const redline = clamped > 0.88;
  const len = (2 * Math.PI * r * SWEEP) / 360;
  const start = 90 + (360 - SWEEP) / 2; // degrees, measured clockwise from +x

  const ticks = Array.from({ length: 9 }, (_, i) => {
    const a = ((start + (SWEEP * i) / 8) * Math.PI) / 180;
    return { x1: c + Math.cos(a) * (r - 12), y1: c + Math.sin(a) * (r - 12), x2: c + Math.cos(a) * (r - 6), y2: c + Math.sin(a) * (r - 6), red: i >= 7 };
  });

  return (
    <div className={cn("relative select-none text-foreground", className)} style={{ width: size, height: size }} {...props}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          className="stroke-muted"
          strokeDasharray={`${len} ${2 * Math.PI * r}`}
          transform={`rotate(${start} ${c} ${c})`}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          className={cn("transition-[stroke-dasharray] duration-100", redline ? "stroke-destructive" : "stroke-primary")}
          strokeDasharray={`${len * clamped} ${2 * Math.PI * r}`}
          transform={`rotate(${start} ${c} ${c})`}
        />
        {ticks.map((t, i) => (
          <line key={i} {...t} strokeWidth={2} strokeLinecap="round" className={t.red ? "stroke-destructive/70" : "stroke-muted-foreground/50"} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-bold leading-none tracking-tighter tabular-nums">{Math.round(speed)}</span>
        <span className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">{unit}</span>
      </div>
      <div
        className={cn(
          "absolute left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-md border bg-card/80 font-mono text-sm font-bold",
          redline && "border-destructive/60 text-destructive",
        )}
        style={{ bottom: size * 0.1 }}
      >
        {gear === 0 ? "R" : gear}
      </div>
      {fuel !== undefined && (
        <div className="absolute inset-x-0 flex items-center justify-center gap-1.5" style={{ bottom: -6 }}>
          <span className="text-[10px] font-semibold text-muted-foreground">F</span>
          <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", fuel < 15 ? "bg-destructive" : "bg-chart-3")} style={{ width: `${fuel}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
