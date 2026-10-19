import * as React from "react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

/**
 * Speedometer — vehicle HUD. The arc is SVG (shadcn has no gauge); the gear is a
 * shadcn Badge and fuel a shadcn Progress. Colors are theme tokens only:
 * primary for RPM, destructive past the redline or on an almost empty tank.
 *
 * `size` is the diameter in px at 1080p; it is laid out in rem so it follows the
 * resolution scale like the rest of the UI.
 *
 * Feed it from Lua at ~10Hz: NUI.send('hud:vehicle', { speed = 87, rpm = 0.62, gear = 3, fuel = 41 })
 */
const SWEEP = 240
const STROKE = 3

function Speedometer({
  className,
  speed,
  rpm,
  gear = "N",
  fuel,
  unit = "mph",
  size = 192,
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
  /** Diameter in px at 1080p. */
  size?: number
}) {
  const r = size / 2 - STROKE
  const c = size / 2
  const value = Math.max(0, Math.min(1, rpm))
  const redline = value > 0.88
  const circumference = 2 * Math.PI * r
  const arc = (circumference * SWEEP) / 360
  const start = 90 + (360 - SWEEP) / 2
  const rem = `${size / 16}rem`
  const low = fuel !== undefined && fuel < 15

  return (
    <div
      data-slot="speedometer"
      data-redline={redline || undefined}
      className={cn("relative text-foreground", className)}
      style={{ width: rem, height: rem, ...style }}
      {...props}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full overflow-visible">
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="stroke-foreground/15"
          strokeDasharray={`${arc} ${circumference}`}
          transform={`rotate(${start} ${c} ${c})`}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className={cn("transition-[stroke-dasharray] duration-100", redline ? "stroke-destructive" : "stroke-primary")}
          strokeDasharray={`${arc * value} ${circumference}`}
          transform={`rotate(${start} ${c} ${c})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl leading-none font-semibold tracking-tight tabular-nums">{Math.round(speed)}</span>
        <span className="mt-1 text-xs font-medium text-muted-foreground">{unit}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2">
        <Badge
          variant={redline ? "destructive" : "outline"}
          className="min-w-6 justify-center rounded-full px-1.5 tabular-nums"
          aria-label="Gear"
        >
          {gear === 0 ? "R" : gear}
        </Badge>
        {fuel !== undefined && (
          <Progress
            value={fuel}
            aria-label="Fuel"
            className={cn(
              "h-1 w-12 bg-foreground/15 [&_[data-slot=progress-indicator]]:bg-foreground",
              low && "[&_[data-slot=progress-indicator]]:bg-destructive"
            )}
          />
        )}
      </div>
    </div>
  )
}

export { Speedometer }
