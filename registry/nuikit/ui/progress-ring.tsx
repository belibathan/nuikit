"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/kbd"

/**
 * ProgressRing — a circle that fills: a timed action ("Lockpicking…"), a level, a download. The
 * round half of the `progress` intent (docs/architecture.md §2); `meter` is the bar.
 *
 *   <ProgressRing value={62} label="Downloading" />
 *   <ProgressRing duration={5000} label="Lockpicking" cancelKey="X" onCancel={stop} onComplete={done} />
 *
 * With `duration` it runs on its own and `onComplete` fires from a timer when the time is up
 * (never from an animation event, so it still fires with motion off). Restart it with a new `key`.
 * The ring moves in 100ms steps with a matching linear transition: smooth, and still correct when
 * transitions are off.
 */

const progressRingVariants = cva("relative shrink-0", {
  variants: {
    size: {
      sm: "size-10 text-xs",
      default: "size-16 text-sm",
      lg: "size-24 text-xl",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

type ProgressRingTone = "primary" | "success" | "warning" | "info" | "destructive"

/** Literal class names, so Tailwind finds them; tokens read as variables (docs/tokens.md). */
const TONE: Record<ProgressRingTone, string> = {
  primary: "stroke-(--primary)",
  success: "stroke-(--success)",
  warning: "stroke-(--warning)",
  info: "stroke-(--info)",
  destructive: "stroke-(--destructive)",
}

const STEP_MS = 100
const RADIUS = 44
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** 0–100 from a value and its max (clamped; NaN → 0). */
function ringPercent(value: number, max = 100) {
  const p = max > 0 && Number.isFinite(value) ? (value / max) * 100 : 0
  return Math.max(0, Math.min(100, p))
}

/** stroke-dashoffset that shows `percent` of a circle of `circumference`. */
function ringOffset(percent: number, circumference = CIRCUMFERENCE) {
  return circumference * (1 - ringPercent(percent) / 100)
}

/**
 * Elapsed ms of a timed run, ticking every STEP_MS from mount (or a new `duration`), and
 * `onComplete` once from its own timer at `duration`.
 */
function useTimedRun(duration: number | undefined, onComplete?: () => void) {
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

type ProgressRingProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof progressRingVariants> & {
    /** A level (0–max). Ignored when `duration` is set. */
    value?: number
    max?: number
    /** Run for this many ms on its own. */
    duration?: number
    onComplete?: () => void
    label?: React.ReactNode
    tone?: ProgressRingTone
    /** game: drawn on the world (dark track, shadowed text). theme: on a panel. */
    track?: "game" | "theme"
    /** What's inside the ring. Default: the percentage; false: nothing. */
    center?: React.ReactNode | false
    /** Shows "[X] Cancel" under the label (the key is read in Lua in game). */
    cancelKey?: string
    cancelLabel?: React.ReactNode
    /** Makes the cancel hint a button for the pointer. */
    onCancel?: () => void
  }

function ProgressRing({
  className,
  size,
  value = 0,
  max = 100,
  duration,
  onComplete,
  label,
  tone = "primary",
  track = "game",
  center,
  cancelKey,
  cancelLabel = "Cancel",
  onCancel,
  ...props
}: ProgressRingProps) {
  const elapsed = useTimedRun(duration, onComplete)
  const timed = duration !== undefined && duration > 0
  const percent = timed ? ringPercent(elapsed, duration) : ringPercent(value, max)
  const game = track === "game"
  const inside = center === undefined ? `${Math.round(percent)}%` : center

  const cancel = (cancelKey || onCancel) && (
    <span className="flex items-center gap-1.5 text-xs leading-4 font-medium">
      {cancelKey && <Kbd className="h-5 min-w-5">{cancelKey}</Kbd>}
      <span className={game ? "opacity-75" : "text-muted-foreground"}>{cancelLabel}</span>
    </span>
  )

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label={typeof label === "string" ? label : props["aria-label"]}
      data-slot="progress-ring"
      data-tone={tone}
      data-complete={percent >= 100 || undefined}
      className={cn("inline-flex flex-col items-center gap-2", game && "text-(color:--hud-foreground)", className)}
      {...props}
    >
      <div className={cn(progressRingVariants({ size }), game && "nk-shadow")}>
        <svg viewBox="0 0 100 100" aria-hidden className="size-full">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            className={game ? "stroke-(--scrim)" : "stroke-(--muted)"}
            strokeOpacity={game ? 0.35 : 1}
          />
          <circle
            data-slot="progress-ring-fill"
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={ringOffset(percent)}
            className={cn(TONE[tone] ?? TONE.primary, "transition-[stroke-dashoffset] ease-linear", timed ? "duration-100" : "duration-200")}
          />
        </svg>
        {inside !== false && inside !== null && (
          <span data-slot="progress-ring-center" className="absolute inset-0 grid place-items-center nk-num font-semibold">
            {inside}
          </span>
        )}
      </div>
      {label && (
        <span data-slot="progress-ring-label" className={cn("max-w-48 truncate text-sm leading-5 font-medium", game && "nk-shadow")}>
          {label}
        </span>
      )}
      {cancel &&
        (onCancel ? (
          <button
            type="button"
            data-slot="progress-ring-cancel"
            onClick={onCancel}
            className="rounded-md px-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {cancel}
          </button>
        ) : (
          <span data-slot="progress-ring-cancel">{cancel}</span>
        ))}
    </div>
  )
}

export { ProgressRing, progressRingVariants, ringPercent, ringOffset, type ProgressRingTone, type ProgressRingProps }
