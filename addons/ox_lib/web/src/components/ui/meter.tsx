import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

/**
 * Meter — a slim bar for any level: health, fuel, weight, players online, engine. A shadcn
 * Progress coloured by one theme token, on a theme track (in a panel) or a dark game track (on the
 * world, where a tinted track vanishes over a bright sky). Thresholds turn it destructive.
 *
 *   <Meter icon={<HeartPulseIcon />} aria-label="Health" value={health} tone="destructive" track="game" low={20} />
 *   <Meter label="Weight" value={22.4} max={30} valueText="22.4 / 30 kg" high={90} />
 *   <Meter label="Armor" value={armor} segments={4} />
 *
 * With a `label` or `valueText` it stacks a label row over the bar; with only an icon it is one line.
 *
 * Status tones (`success`, `warning`, `info`, `destructive`) come from the theme. A library's own
 * colour goes through `meterColor()`: names it knows (ox's Mantine `green`, `red.6`, …) become a
 * tone, so they follow the theme; anything else is passed through as `color`.
 *
 *   <Meter {...meterColor(option.colorScheme)} value={option.progress} />
 *
 * With `duration` the bar fills on its own over that many ms and `onComplete` fires from a timer
 * (never an animation event, so it still fires with motion off). Restart it with a new `key`.
 */
const meterVariants = cva("min-w-0", {
  variants: {
    size: {
      sm: "[--meter-h:0.25rem]",
      default: "[--meter-h:0.375rem]",
      lg: "[--meter-h:0.5rem]",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

type MeterTone =
  | "primary"
  | "foreground"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "health"
  | "armor"
  | "hunger"
  | "thirst"
  | "stress"

/** Literal class names, so Tailwind finds them. */
const TONES: Record<MeterTone, { text: string; fill: string; track: string }> = {
  primary: { text: "text-primary", fill: "bg-primary", track: "bg-primary/20" },
  foreground: { text: "text-foreground", fill: "bg-foreground", track: "bg-foreground/15" },
  destructive: { text: "text-destructive", fill: "bg-destructive", track: "bg-destructive/20" },
  // tokens v1 status (docs/tokens.md)
  success: { text: "text-success", fill: "bg-success", track: "bg-success/20" },
  warning: { text: "text-warning", fill: "bg-warning", track: "bg-warning/20" },
  info: { text: "text-info", fill: "bg-info", track: "bg-info/20" },
  "chart-1": { text: "text-chart-1", fill: "bg-chart-1", track: "bg-chart-1/20" },
  "chart-2": { text: "text-chart-2", fill: "bg-chart-2", track: "bg-chart-2/20" },
  "chart-3": { text: "text-chart-3", fill: "bg-chart-3", track: "bg-chart-3/20" },
  "chart-4": { text: "text-chart-4", fill: "bg-chart-4", track: "bg-chart-4/20" },
  "chart-5": { text: "text-chart-5", fill: "bg-chart-5", track: "bg-chart-5/20" },
  // tokens v1 vitals (docs/tokens.md)
  health: { text: "text-vital-health", fill: "bg-vital-health", track: "bg-vital-health/20" },
  armor: { text: "text-vital-armor", fill: "bg-vital-armor", track: "bg-vital-armor/20" },
  hunger: { text: "text-vital-hunger", fill: "bg-vital-hunger", track: "bg-vital-hunger/20" },
  thirst: { text: "text-vital-thirst", fill: "bg-vital-thirst", track: "bg-vital-thirst/20" },
  stress: { text: "text-vital-stress", fill: "bg-vital-stress", track: "bg-vital-stress/20" },
}

const FILL: Record<MeterTone, string> = {
  primary: "[&_[data-slot=progress-indicator]]:bg-primary",
  foreground: "[&_[data-slot=progress-indicator]]:bg-foreground",
  destructive: "[&_[data-slot=progress-indicator]]:bg-destructive",
  success: "[&_[data-slot=progress-indicator]]:bg-success",
  warning: "[&_[data-slot=progress-indicator]]:bg-warning",
  info: "[&_[data-slot=progress-indicator]]:bg-info",
  "chart-1": "[&_[data-slot=progress-indicator]]:bg-chart-1",
  "chart-2": "[&_[data-slot=progress-indicator]]:bg-chart-2",
  "chart-3": "[&_[data-slot=progress-indicator]]:bg-chart-3",
  "chart-4": "[&_[data-slot=progress-indicator]]:bg-chart-4",
  "chart-5": "[&_[data-slot=progress-indicator]]:bg-chart-5",
  health: "[&_[data-slot=progress-indicator]]:bg-vital-health",
  armor: "[&_[data-slot=progress-indicator]]:bg-vital-armor",
  hunger: "[&_[data-slot=progress-indicator]]:bg-vital-hunger",
  thirst: "[&_[data-slot=progress-indicator]]:bg-vital-thirst",
  stress: "[&_[data-slot=progress-indicator]]:bg-vital-stress",
}

/** A library colour (`color`), carried in --meter-fill so no colour is mixed inline. */
const CUSTOM = { text: "text-(color:--meter-fill)", fill: "bg-(--meter-fill)", track: "bg-foreground/15" }
const CUSTOM_FILL = "[&_[data-slot=progress-indicator]]:bg-(--meter-fill)"

type MeterLevel = "normal" | "low" | "high"

/**
 * Where a value sits: its percentage of `max` (clamped 0–100, NaN → 0) and whether it has crossed
 * a threshold. `low` and `high` are percentages; at or below `low` (health, fuel) or at or above
 * `high` (stress, weight) the level is no longer normal.
 */
function meterLevel(value: number, { max = 100, low, high }: { max?: number; low?: number; high?: number } = {}) {
  const raw = max > 0 && Number.isFinite(value) ? (value / max) * 100 : 0
  const percent = Math.max(0, Math.min(100, raw))
  const level: MeterLevel =
    low !== undefined && percent <= low ? "low" : high !== undefined && percent >= high ? "high" : "normal"
  return { percent, level }
}

/** How full each of `count` equal segments is (0–100) for an overall percentage. */
function segmentFills(percent: number, count: number) {
  const n = Math.max(1, Math.floor(count))
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))
  return Array.from({ length: n }, (_, i) => Math.max(0, Math.min(100, (p - (i * 100) / n) * n)))
}

/** Library colour names that mean a theme tone (Mantine's palette, as ox_lib passes it, and plain words). */
const NAMED_TONES: Record<string, MeterTone> = {
  red: "destructive",
  pink: "destructive",
  danger: "destructive",
  error: "destructive",
  destructive: "destructive",
  green: "success",
  teal: "success",
  lime: "success",
  success: "success",
  yellow: "warning",
  orange: "warning",
  warning: "warning",
  blue: "info",
  cyan: "info",
  indigo: "info",
  info: "info",
  violet: "stress",
  grape: "stress",
  gray: "foreground",
  dark: "foreground",
  primary: "primary",
}

/**
 * A library's colour as Meter props: a name it knows ("green", "red.6", "success") becomes a
 * theme `tone`; a CSS colour ("#4dabf7", "rgb(…)") is passed through as `color`; anything else
 * (or nothing) gives no props, so the meter keeps its default.
 */
function meterColor(input?: string | null): { tone?: MeterTone; color?: string } {
  const v = (input ?? "").trim()
  if (!v) return {}
  const name = v.toLowerCase().replace(/\.\d+$/, "")
  if (NAMED_TONES[name]) return { tone: NAMED_TONES[name] }
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) || /^(rgb|rgba|hsl|hsla)\(/i.test(v)) return { color: v }
  return {}
}

const STEP_MS = 100

/** ms elapsed of a `duration` run, ticking every STEP_MS; `onComplete` once from its own timer. */
function useTimedFill(duration: number | undefined, onComplete?: () => void) {
  const [elapsed, setElapsed] = React.useState(0)
  const done = React.useRef(onComplete)
  React.useEffect(() => {
    done.current = onComplete
  })
  React.useEffect(() => {
    if (!duration || duration <= 0) return
    const start = Date.now()
    setElapsed(0)
    const tick = setInterval(() => {
      const e = Math.min(duration, Date.now() - start)
      setElapsed(e)
      if (e >= duration) clearInterval(tick)
    }, STEP_MS)
    const end = setTimeout(() => done.current?.(), duration)
    return () => {
      clearInterval(tick)
      clearTimeout(end)
    }
  }, [duration])
  return elapsed
}

function Meter({
  className,
  size,
  value: valueProp = 0,
  max: maxProp = 100,
  low,
  high,
  tone = "primary",
  color,
  track = "theme",
  label,
  icon,
  valueText,
  segments,
  duration,
  onComplete,
  style,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof meterVariants> & {
    /** The level, 0–max. Ignored when `duration` is set. */
    value?: number
    max?: number
    /** Percentage at or below which the meter turns destructive (health, fuel). */
    low?: number
    /** Percentage at or above which the meter turns destructive (stress, weight). */
    high?: number
    tone?: MeterTone
    /** theme: on a panel. game: a dark track on the game world. */
    track?: "theme" | "game"
    label?: React.ReactNode
    icon?: React.ReactNode
    /** Shown at the end of the label row: "72%", "22.4 / 30 kg". */
    valueText?: React.ReactNode
    /** Split the bar into equal plates (armor, battery). */
    segments?: number
    /**
     * A colour from a library that no tone covers (a CSS colour; see meterColor()). Overrides
     * `tone`; thresholds still win. Theme tracks turn neutral, since its tint can't be mixed inline.
     */
    color?: string
    /** Fill on its own over this many ms (value and max are ignored). */
    duration?: number
    /** With `duration`: called once when the time is up, from a timer. */
    onComplete?: () => void
  }) {
  const elapsed = useTimedFill(duration, onComplete)
  const timed = duration !== undefined && duration > 0
  const value = timed ? elapsed : valueProp
  const max = timed ? duration : maxProp
  const { percent, level } = meterLevel(value, { max, low, high })
  const critical = level !== "normal"
  const custom = !!color && !critical
  const t = custom ? CUSTOM : TONES[critical ? "destructive" : tone] ?? TONES.primary
  const trackClass = track === "game" ? "bg-scrim/35" : t.track
  const fillClass = custom ? CUSTOM_FILL : FILL[critical ? "destructive" : tone] ?? FILL.primary
  // Timed: each 100ms step glides linearly into the next (and simply steps with motion off).
  const timedClass = timed && "[&_[data-slot=progress-indicator]]:duration-100 [&_[data-slot=progress-indicator]]:ease-linear"
  const rootStyle = custom ? ({ ...style, "--meter-fill": color } as React.CSSProperties) : style
  const stacked = label !== undefined || valueText !== undefined
  // flex-1 only beside an icon: in the stacked column it would collapse the bar's height to 0
  const grow = stacked ? "w-full" : "flex-1"

  const bar =
    segments && segments > 1 ? (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={typeof label === "string" ? label : props["aria-label"]}
        className={cn("flex min-w-0 gap-0.5", grow)}
      >
        {segmentFills(percent, segments).map((fill, i) => (
          <div key={i} data-slot="meter-segment" className={cn("relative h-(--meter-h) flex-1 overflow-hidden rounded-full", trackClass)}>
            <div className={cn("h-full transition-[width]", t.fill, timed && "duration-100 ease-linear")} style={{ width: `${fill}%` }} />
          </div>
        ))}
      </div>
    ) : (
      <Progress
        value={percent}
        // shadcn's Progress keeps `value` for its indicator and never hands it to Radix's root,
        // so the root has no aria-valuenow: give it one.
        aria-valuenow={Math.round(percent)}
        aria-label={typeof label === "string" ? label : props["aria-label"]}
        className={cn("h-(--meter-h) min-w-0", grow, trackClass, fillClass, timedClass)}
      />
    )

  const iconEl = icon && (
    <span
      data-slot="meter-icon"
      className={cn("flex shrink-0 [&_svg:not([class*='size-'])]:size-4", t.text, critical && "animate-pulse")}
    >
      {icon}
    </span>
  )

  return (
    <div
      data-slot="meter"
      data-level={level}
      data-complete={(timed && percent >= 100) || undefined}
      className={cn(meterVariants({ size }), stacked ? "flex flex-col gap-1.5" : "flex items-center gap-2", className)}
      style={rootStyle}
      {...props}
    >
      {stacked ? (
        <>
          <div className="flex min-w-0 items-center gap-1.5">
            {iconEl}
            {label !== undefined && <span className="nk-label min-w-0 flex-1 truncate">{label}</span>}
            {valueText !== undefined && (
              <span className={cn("nk-num ml-auto shrink-0 text-xs font-medium", critical && "text-destructive")}>{valueText}</span>
            )}
          </div>
          {bar}
        </>
      ) : (
        <>
          {iconEl}
          {bar}
        </>
      )}
    </div>
  )
}

export { Meter, meterVariants, meterLevel, segmentFills, meterColor, type MeterTone, type MeterLevel }
