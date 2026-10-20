"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

/**
 * Countdown — a big timer that matters: until you can respawn, until the heist alarm, until the
 * server restarts. `mm:ss` (or `h:mm:ss`) in tabular numbers, a label, an optional line that
 * drains, and a warning threshold.
 *
 *   <Countdown seconds={data.seconds} total={data.total} label="Until you can respawn" size="hero" />
 *   <Countdown duration={90_000} warnAt={10} label="Alarm" onComplete={trigger} />
 *
 * Driven from Lua, pass the remaining `seconds` (and `total` for the line). Or give it a
 * `duration` in ms and it runs on its own; `onComplete` fires from a timer (never an animation
 * event), so it still fires with motion off. Restart a run with a new `key`.
 */

const countdownVariants = cva("nk-num leading-none font-semibold tracking-tight", {
  variants: {
    size: {
      sm: "text-xl",
      /** nk-display: 32px, a number that is the point of a panel. */
      default: "text-[2rem]",
      /** The full-screen clock (death, loading): 128px at 1080p. */
      hero: "text-[8rem]",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

type CountdownState = "running" | "warning" | "done"

/** "05:07", "1:02:03" for whole seconds left (rounded up, so 0.2s left still shows 00:01). */
function formatCountdown(seconds: number) {
  const t = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`
}

/** "1 minute 5 seconds", for screen readers. */
function spokenCountdown(seconds: number) {
  const t = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0))
  const parts: string[] = []
  const unit = (n: number, word: string) => n && parts.push(`${n} ${word}${n === 1 ? "" : "s"}`)
  unit(Math.floor(t / 3600), "hour")
  unit(Math.floor((t % 3600) / 60), "minute")
  unit(t % 60, "second")
  return parts.length ? parts.join(" ") : "0 seconds"
}

/** done at 0; warning at or below `warnAt` seconds (when set); running otherwise. */
function countdownState(seconds: number, warnAt?: number): CountdownState {
  const t = Math.max(0, Math.ceil(Number.isFinite(seconds) ? seconds : 0))
  if (t <= 0) return "done"
  return warnAt !== undefined && t <= warnAt ? "warning" : "running"
}

const TICK_MS = 250

/** Seconds left of a `duration` ms run, ticking from mount; `onComplete` once from its own timer. */
function useRun(duration: number | undefined, onComplete?: () => void) {
  const [left, setLeft] = React.useState(duration ? duration / 1000 : 0)
  const done = React.useRef(onComplete)
  React.useEffect(() => {
    done.current = onComplete
  })
  React.useEffect(() => {
    if (!duration || duration <= 0) return
    const end = Date.now() + duration
    setLeft(duration / 1000)
    const tick = setInterval(() => {
      const ms = Math.max(0, end - Date.now())
      setLeft(ms / 1000)
      if (ms <= 0) clearInterval(tick)
    }, TICK_MS)
    const finish = setTimeout(() => done.current?.(), duration)
    return () => {
      clearInterval(tick)
      clearTimeout(finish)
    }
  }, [duration])
  return left
}

const TONE = {
  warning: "text-warning",
  destructive: "text-destructive",
} as const

type CountdownLineTone = "neutral" | "primary" | "warning" | "destructive"

/** The line's fill per tone (literal class names, so Tailwind finds them). Neutral follows the surface. */
const LINE_FILL: Record<Exclude<CountdownLineTone, "neutral">, string> = {
  primary: "[&_[data-slot=progress-indicator]]:bg-primary",
  warning: "[&_[data-slot=progress-indicator]]:bg-warning",
  destructive: "[&_[data-slot=progress-indicator]]:bg-destructive",
}

/**
 * The line's tone: `warnTone` once the warning starts (warnAt), the caller's `lineTone` before
 * that (a last stand drains in destructive from the start), neutral otherwise.
 */
function countdownLineTone(
  state: CountdownState,
  lineTone: CountdownLineTone = "neutral",
  warnTone: keyof typeof TONE = "destructive"
): CountdownLineTone {
  const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)
  if (state === "warning") return has(TONE, warnTone) ? warnTone : "destructive"
  return has(LINE_FILL, lineTone) ? lineTone : "neutral"
}

function Countdown({
  className,
  size,
  seconds: secondsProp,
  total,
  duration,
  onComplete,
  label,
  warnAt,
  warnTone = "destructive",
  lineTone = "neutral",
  surface = "theme",
  line,
  format = formatCountdown,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof countdownVariants> & {
    /** Seconds left, from outside (Lua). Ignored when `duration` is set. */
    seconds?: number
    /** Seconds the whole wait was: draws the line that drains. */
    total?: number
    /** Run on its own for this many ms. */
    duration?: number
    onComplete?: () => void
    label?: React.ReactNode
    /** At or below this many seconds the clock turns `warnTone` and pulses (not with motion off). */
    warnAt?: number
    warnTone?: keyof typeof TONE
    /**
     * The line's tone from the start (a theme token): a last stand drains in `destructive`, a
     * heist timer in `primary`. Neutral (default) follows the surface. Once `warnAt` is reached,
     * `warnTone` takes over.
     */
    lineTone?: CountdownLineTone
    /** theme: on a full-screen surface or a panel. game: straight on the world (HUD tokens). */
    surface?: "theme" | "game"
    /** Draw the line (default: when there's a total, or when running on its own). */
    line?: boolean
    format?: (seconds: number) => React.ReactNode
  }) {
  const running = useRun(duration, onComplete)
  const timed = duration !== undefined && duration > 0
  const seconds = timed ? running : (secondsProp ?? 0)
  const whole = timed ? duration / 1000 : total
  const state = countdownState(seconds, warnAt)
  const showLine = (line ?? whole !== undefined) && !!whole && whole > 0
  const game = surface === "game"
  const lineFill = countdownLineTone(state, lineTone, warnTone)

  return (
    <div
      data-slot="countdown"
      data-state={state}
      className={cn("inline-flex flex-col items-center", game ? "nk-shadow text-hud-foreground" : "text-foreground", className)}
      {...props}
    >
      <div
        role="timer"
        aria-live="off"
        aria-label={`${typeof label === "string" ? `${label}: ` : ""}${spokenCountdown(seconds)}`}
        data-slot="countdown-clock"
        className={cn(
          countdownVariants({ size }),
          state === "warning" && [TONE[warnTone] ?? TONE.destructive, "animate-pulse"],
          state === "done" && "opacity-40"
        )}
      >
        {format(seconds)}
      </div>
      {label && (
        <div
          data-slot="countdown-label"
          className={cn("text-sm leading-5 font-medium opacity-75", size === "hero" ? "mt-4" : "mt-2")}
        >
          {label}
        </div>
      )}
      {showLine && (
        <Progress
          data-slot="countdown-line"
          data-tone={lineFill}
          value={Math.max(0, Math.min(100, (seconds / whole!) * 100))}
          aria-hidden
          className={cn(
            "h-1",
            size === "hero" ? "mt-6 w-80" : size === "sm" ? "mt-2 w-24" : "mt-3 w-40",
            game ? "bg-scrim/35" : "bg-foreground/15",
            lineFill !== "neutral"
              ? LINE_FILL[lineFill]
              : game
                ? "[&_[data-slot=progress-indicator]]:bg-hud-foreground"
                : "[&_[data-slot=progress-indicator]]:bg-foreground",
            timed && "[&_[data-slot=progress-indicator]]:duration-[250ms] [&_[data-slot=progress-indicator]]:ease-linear"
          )}
        />
      )}
    </div>
  )
}

export {
  Countdown,
  countdownVariants,
  formatCountdown,
  spokenCountdown,
  countdownState,
  countdownLineTone,
  type CountdownState,
  type CountdownLineTone,
}
