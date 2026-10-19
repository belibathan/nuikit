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

type MeterTone = "primary" | "foreground" | "destructive" | "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5"

/** Literal class names, so Tailwind finds them. */
const TONES: Record<MeterTone, { text: string; fill: string; track: string }> = {
  primary: { text: "text-primary", fill: "bg-primary", track: "bg-primary/20" },
  foreground: { text: "text-foreground", fill: "bg-foreground", track: "bg-foreground/15" },
  destructive: { text: "text-destructive", fill: "bg-destructive", track: "bg-destructive/20" },
  "chart-1": { text: "text-chart-1", fill: "bg-chart-1", track: "bg-chart-1/20" },
  "chart-2": { text: "text-chart-2", fill: "bg-chart-2", track: "bg-chart-2/20" },
  "chart-3": { text: "text-chart-3", fill: "bg-chart-3", track: "bg-chart-3/20" },
  "chart-4": { text: "text-chart-4", fill: "bg-chart-4", track: "bg-chart-4/20" },
  "chart-5": { text: "text-chart-5", fill: "bg-chart-5", track: "bg-chart-5/20" },
}

const FILL: Record<MeterTone, string> = {
  primary: "[&_[data-slot=progress-indicator]]:bg-primary",
  foreground: "[&_[data-slot=progress-indicator]]:bg-foreground",
  destructive: "[&_[data-slot=progress-indicator]]:bg-destructive",
  "chart-1": "[&_[data-slot=progress-indicator]]:bg-chart-1",
  "chart-2": "[&_[data-slot=progress-indicator]]:bg-chart-2",
  "chart-3": "[&_[data-slot=progress-indicator]]:bg-chart-3",
  "chart-4": "[&_[data-slot=progress-indicator]]:bg-chart-4",
  "chart-5": "[&_[data-slot=progress-indicator]]:bg-chart-5",
}

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

function Meter({
  className,
  size,
  value,
  max = 100,
  low,
  high,
  tone = "primary",
  track = "theme",
  label,
  icon,
  valueText,
  segments,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof meterVariants> & {
    value: number
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
  }) {
  const { percent, level } = meterLevel(value, { max, low, high })
  const critical = level !== "normal"
  const t = TONES[critical ? "destructive" : tone]
  const trackClass = track === "game" ? "bg-black/35" : t.track
  const stacked = label !== undefined || valueText !== undefined

  const bar =
    segments && segments > 1 ? (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={typeof label === "string" ? label : props["aria-label"]}
        className="flex min-w-0 flex-1 gap-0.5"
      >
        {segmentFills(percent, segments).map((fill, i) => (
          <div key={i} data-slot="meter-segment" className={cn("relative h-(--meter-h) flex-1 overflow-hidden rounded-full", trackClass)}>
            <div className={cn("h-full transition-[width]", t.fill)} style={{ width: `${fill}%` }} />
          </div>
        ))}
      </div>
    ) : (
      <Progress
        value={percent}
        aria-label={typeof label === "string" ? label : props["aria-label"]}
        className={cn("h-(--meter-h) min-w-0 flex-1", trackClass, FILL[critical ? "destructive" : tone])}
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
      className={cn(meterVariants({ size }), stacked ? "flex flex-col gap-1.5" : "flex items-center gap-2", className)}
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

export { Meter, meterVariants, meterLevel, segmentFills, type MeterTone, type MeterLevel }
