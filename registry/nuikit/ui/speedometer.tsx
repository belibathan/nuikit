import * as React from "react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

/**
 * Speedometer — vehicle HUD. The arc is SVG (shadcn has no gauge); the gear is a
 * shadcn Badge and fuel a shadcn Progress. Colors are theme tokens only:
 * primary for RPM, destructive past the redline.
 *
 * Feed it from Lua at ~10Hz: NUI.send('hud:vehicle', { speed = 87, rpm = 0.62, gear = 3, fuel = 41 })
 */
const SWEEP = 260

function Speedometer({
  className,
  speed,
  rpm,
  gear = "N",
  fuel,
  unit = "MPH",
  size = 200,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  speed: number
  /** 0–1 */
  rpm: number
  gear?: number | "R" | "N"
  /** 0–100 */
  fuel?: number
  unit?: string
  size?: number
}) {
  const r = size / 2 - 8
  const c = size / 2
  const value = Math.max(0, Math.min(1, rpm))
  const redline = value > 0.88
  const circumference = 2 * Math.PI * r
  const arc = (circumference * SWEEP) / 360
  const start = 90 + (360 - SWEEP) / 2

  return (
    <div
      data-slot="speedometer"
      data-redline={redline || undefined}
      className={cn("relative flex flex-col items-center text-foreground", className)}
      style={{ width: size, ...style }}
      {...props}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            className="stroke-muted"
            strokeDasharray={`${arc} ${circumference}`}
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
            strokeDasharray={`${arc * value} ${circumference}`}
            transform={`rotate(${start} ${c} ${c})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">{Math.round(speed)}</span>
          <span className="text-xs text-muted-foreground">{unit}</span>
          <Badge variant={redline ? "destructive" : "outline"} className="mt-1 tabular-nums">
            {gear === 0 ? "R" : gear}
          </Badge>
        </div>
      </div>
      {fuel !== undefined && (
        <div className="-mt-4 flex w-24 items-center gap-2 text-xs text-muted-foreground">
          <span>F</span>
          <Progress
            value={fuel}
            aria-label="Fuel"
            className={cn("h-1.5", fuel < 15 && "bg-destructive/20 [&_[data-slot=progress-indicator]]:bg-destructive")}
          />
        </div>
      )}
    </div>
  )
}

export { Speedometer }
