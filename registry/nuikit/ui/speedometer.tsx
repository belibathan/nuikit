import * as React from "react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

/**
 * Speedometer — vehicle HUD. The arc is SVG (shadcn has no gauge); the gear is a
 * shadcn Badge and fuel a shadcn Progress. Its look is the gauge tokens (docs/tokens.md): the
 * fill (--nk-gauge-fill, the brand) for RPM, the redline (--nk-gauge-redline) past it, tick
 * marks (--nk-gauge-tick, off when the identity sets --nk-gauge-ticks: 0), the track
 * thickness (--nk-gauge-width), the numeral face (--nk-gauge-font) and the glow.
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

/** Major ticks around the sweep (0, 1/8 … 1 of the rpm range). */
const TICKS = 9

/**
 * The gauge track thickness in the SVG's own units: --nk-gauge-width (a rem or px length at
 * 1080p) read once from the element. The SVG is laid out in rem and scales as a whole, so a rem
 * length is ×16 user units. Falls back to STROKE.
 */
function gaugeStroke(value: string | null | undefined) {
  const m = /^\s*(-?[\d.]+)(rem|px)\s*$/.exec(value ?? "")
  if (!m) return STROKE
  const n = Number(m[1]) * (m[2] === "rem" ? 16 : 1)
  return Number.isFinite(n) && n > 0 ? Math.min(12, n) : STROKE
}

function useGaugeStroke(ref: React.RefObject<HTMLElement | null>) {
  const [stroke, setStroke] = React.useState(STROKE)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof getComputedStyle !== "function") return
    setStroke(gaugeStroke(getComputedStyle(el).getPropertyValue("--nk-gauge-width")))
  }, [ref])
  return stroke
}

/** The rpm arc's stroke-dasharray for an rpm (0–1) on a speedometer of `size`. */
function speedometerDash(rpm: number, size = 192) {
  const circumference = 2 * Math.PI * (size / 2 - STROKE)
  const value = Math.max(0, Math.min(1, Number.isFinite(rpm) ? rpm : 0))
  return `${(circumference * SWEEP * value) / 360} ${circumference}`
}

/** Literal class names, so Tailwind finds them. */
const SURFACE = {
  game: {
    root: "nk-on-game",
    track: "stroke-(--nk-gauge-track-color)",
    gear: "border-transparent bg-(--nk-chip-bg) text-(--nk-chip-fg)",
    fuelTrack: "nk-track",
    fuelFill: "[&_[data-slot=progress-indicator]]:bg-foreground",
  },
  theme: {
    root: "text-foreground",
    track: "stroke-foreground/15",
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
  const root = React.useRef<HTMLDivElement>(null)
  const stroke = useGaugeStroke(root)
  // The radius stays at the default stroke's, so speedometerDash() (the HUD's live writes) holds.
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
      ref={root}
      className={cn("relative", s.root, className)}
      style={{ width: rem, height: rem, ...style }}
      {...props}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full overflow-visible">
        <g data-slot="speedometer-ticks" aria-hidden>
          {Array.from({ length: TICKS }, (_, i) => {
            const at = i / (TICKS - 1)
            const a = ((start + SWEEP * at) * Math.PI) / 180
            const r1 = r - stroke / 2 - 3
            const r2 = r1 - (i % 2 === 0 ? 7 : 4)
            return (
              <line
                key={i}
                x1={c + Math.cos(a) * r1}
                y1={c + Math.sin(a) * r1}
                x2={c + Math.cos(a) * r2}
                y2={c + Math.sin(a) * r2}
                strokeWidth={i % 2 === 0 ? 2 : 1.5}
                strokeLinecap="round"
                className={
                  at > SPEEDOMETER_REDLINE
                    ? "stroke-(--nk-gauge-redline) [stroke-opacity:var(--nk-gauge-ticks,1)]"
                    : i % 2 === 0
                      ? "stroke-(--nk-gauge-tick-major)"
                      : "stroke-(--nk-gauge-tick)"
                }
              />
            )
          })}
        </g>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
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
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn(
            "transition-[stroke-dasharray] duration-100 [filter:drop-shadow(0_0_0.25rem_var(--nk-gauge-glow))]",
            redline ? "stroke-(--nk-gauge-redline)" : "stroke-(--nk-gauge-fill)"
          )}
          strokeDasharray={`${arc * value} ${circumference}`}
          transform={`rotate(${start} ${c} ${c})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          data-slot="speedometer-speed"
          className="leading-none tabular-nums [font-family:var(--nk-gauge-font)] [font-weight:var(--nk-weight-display,700)] [letter-spacing:var(--nk-tracking-display,-0.02em)]"
          // a quarter of the dial: 48px on the default 192px gauge
          style={{ fontSize: `${size / 64}rem` }}
        >
          {Math.round(speed)}
        </span>
        <span data-slot="speedometer-unit" className="nk-caption mt-1">
          {unit}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2">
        <Badge
          variant={redline ? "destructive" : "outline"}
          className={cn(
            "min-w-6 justify-center rounded-(--nk-chip-radius) px-1.5 tabular-nums [font-family:var(--nk-gauge-font)] [clip-path:var(--nk-chip-clip)]",
            !redline && s.gear
          )}
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
            className={cn("h-(--nk-meter-height) w-12", s.fuelTrack, low ? "[&_[data-slot=progress-indicator]]:bg-destructive" : s.fuelFill)}
          />
        )}
      </div>
    </div>
  )
}

export { Speedometer, speedometerDash, gaugeStroke, SPEEDOMETER_REDLINE, SPEEDOMETER_LOW_FUEL }
