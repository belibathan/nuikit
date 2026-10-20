import * as React from "react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

/**
 * Speedometer — vehicle HUD. The arc is SVG (shadcn has no gauge); the gear is a
 * shadcn Badge and fuel a shadcn Progress. Colors are theme tokens only:
 * primary for RPM, destructive past the redline or on an almost empty tank.
 *
 * It sits on the game by default (`surface="game"`): the HUD tokens (`--hud-foreground` text with
 * nk-shadow, a scrim track like meter's game track, the gear on the HUD surface), so it reads
 * over a bright sky with any theme. `surface="theme"` draws it with the theme's foreground, for a
 * panel.
 *
 * `size` is the diameter in px at 1080p; it is laid out in rem so it follows the
 * resolution scale like the rest of the UI.
 *
 * Feed it from Lua at ~10Hz: NUI.send('hud:vehicle', { speed = 87, rpm = 0.62, gear = 3, fuel = 41 })
 *
 * Live (the game's frame rate, no React render): stream speed and rpm from Lua (NUI.stream) and
 * follow them with useFollow, writing [data-slot=speedometer-rpm] (style.strokeDasharray =
 * speedometerDash(rpm, size), transition none) and [data-slot=speedometer-speed]; pass `redline`
 * yourself. See systems/nuikit_hud.
 */
const SWEEP = 240
const STROKE = 3
/** Past this rpm (0–1) the arc and the gear turn destructive. */
const SPEEDOMETER_REDLINE = 0.88
/** Below this fuel (0–100) the fuel line turns destructive. */
const SPEEDOMETER_LOW_FUEL = 15

/** The rpm arc's stroke-dasharray for an rpm (0–1) on a speedometer of `size`. */
function speedometerDash(rpm: number, size = 192) {
  const circumference = 2 * Math.PI * (size / 2 - STROKE)
  const value = Math.max(0, Math.min(1, Number.isFinite(rpm) ? rpm : 0))
  return `${(circumference * SWEEP * value) / 360} ${circumference}`
}

/** Literal class names, so Tailwind finds them. */
const SURFACE = {
  game: {
    root: "nk-shadow text-hud-foreground",
    track: "stroke-scrim [stroke-opacity:0.35]",
    unit: "opacity-75",
    gear: "border-transparent bg-hud text-hud-foreground",
    fuelTrack: "bg-scrim/35",
    fuelFill: "[&_[data-slot=progress-indicator]]:bg-hud-foreground",
  },
  theme: {
    root: "text-foreground",
    track: "stroke-foreground/15",
    unit: "text-muted-foreground",
    gear: "",
    fuelTrack: "bg-foreground/15",
    fuelFill: "[&_[data-slot=progress-indicator]]:bg-foreground",
  },
} as const

function Speedometer({
  className,
  speed,
  rpm,
  gear = "N",
  fuel,
  unit = "mph",
  size = 192,
  surface = "game",
  redline: redlineProp,
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
  /** game: on the world (HUD tokens). theme: on a panel. */
  surface?: "game" | "theme"
  /** Past the redline; by default rpm > 0.88. For a live gauge whose rpm you write yourself. */
  redline?: boolean
}) {
  const r = size / 2 - STROKE
  const c = size / 2
  const value = Math.max(0, Math.min(1, Number.isFinite(rpm) ? rpm : 0))
  const redline = redlineProp ?? value > SPEEDOMETER_REDLINE
  const circumference = 2 * Math.PI * r
  const arc = (circumference * SWEEP) / 360
  const start = 90 + (360 - SWEEP) / 2
  const rem = `${size / 16}rem`
  const low = fuel !== undefined && fuel < SPEEDOMETER_LOW_FUEL
  const s = SURFACE[surface] ?? SURFACE.game

  return (
    <div
      data-slot="speedometer"
      // Not data-surface: nuikit-core's surfaces own that attribute (position: fixed, full screen).
      data-variant={surface}
      data-redline={redline || undefined}
      className={cn("relative", s.root, className)}
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
          className={s.track}
          strokeDasharray={`${arc} ${circumference}`}
          transform={`rotate(${start} ${c} ${c})`}
        />
        <circle
          data-slot="speedometer-rpm"
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
        <span data-slot="speedometer-speed" className="text-5xl leading-none font-semibold tracking-tight tabular-nums">
          {Math.round(speed)}
        </span>
        <span data-slot="speedometer-unit" className={cn("mt-1 text-xs font-medium", s.unit)}>
          {unit}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2">
        <Badge
          variant={redline ? "destructive" : "outline"}
          className={cn("min-w-6 justify-center rounded-full px-1.5 tabular-nums", !redline && s.gear)}
          aria-label="Gear"
        >
          {gear === 0 ? "R" : gear}
        </Badge>
        {fuel !== undefined && (
          <Progress
            value={fuel}
            // shadcn's Progress never hands `value` to Radix's root.
            aria-valuenow={Math.round(Math.max(0, Math.min(100, fuel)))}
            aria-label="Fuel"
            data-low={low || undefined}
            className={cn("h-1 w-12", s.fuelTrack, low ? "[&_[data-slot=progress-indicator]]:bg-destructive" : s.fuelFill)}
          />
        )}
      </div>
    </div>
  )
}

export { Speedometer, speedometerDash, SPEEDOMETER_REDLINE, SPEEDOMETER_LOW_FUEL }
