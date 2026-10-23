// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/countdown.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toneVars } from "@/components/ui/fill"

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
 *
 * The clock is the identity's display type in its numeric face (nk-display, --nk-num-font); the
 * label is a caption (nk-caption). The line drains on its own between updates: one linear
 * compositor animation from the time left to zero, re-aimed whenever `seconds` changes, so a clock
 * Lua updates once a second still drains smoothly. With motion off it steps.
 *
 * Role: a wait that matters, read from across the screen (respawn, alarm, restart).
 * Anatomy: root > clock (display size, num face, role="timer") > label (caption) > line (a track and a fill
 *   that drains, transform only).
 * Props: seconds, total, duration, onComplete, label, warnAt, warnTone, lineTone, hue, size, surface, line, format.
 * Level means: the line is the time left over the total, 1 at the start, 0 when it is done.
 * Rules: at or under warnAt the root is data-state="alert" (data-phase keeps running | warning | done) and the
 *   clock pulses; tones use the shared vocabulary (danger = destructive) through toneVars(), `hue` a role.
 */

// Display type in the numeric face: nk-display's size, weight and tracking, the numbers' font.
// The line-height lives in each size: tailwind-merge treats a font size as overriding an earlier
// leading-*, so a base leading-none would be dropped (the hero clock then got a tall line box).
const countdownVariants = cva("nk-display tabular-nums [font-family:var(--nk-num-font)]!", {
  variants: {
    size: {
      /** A clock in a row or a slab: the HUD value size. */
      sm: "[--nk-display-size:var(--nk-hud-value-size)] leading-none",
      /** nk-display (36px in Graphite): a number that is the point of a panel. */
      default: "leading-none",
      /** The full-screen clock (death, loading): 3.5× display, at most 8rem (128px at 1080p). */
      hero: "[--nk-display-size:min(8rem,calc(var(--nk-text-display)*3.5))] leading-none",
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
  danger: "text-destructive",
} as const

type CountdownLineTone = "neutral" | "primary" | "warning" | "destructive" | "danger"

/** The line's fill per tone (literal class names, so Tailwind finds them). Neutral follows the surface. */
const LINE_FILL: Record<Exclude<CountdownLineTone, "neutral">, string> = {
  primary: "bg-[var(--brand,var(--primary))]",
  warning: "bg-warning",
  destructive: "bg-destructive",
  danger: "bg-destructive",
}

/**
 * The line's glide from a value Lua sent: from `seconds / total` towards where it will be one
 * second later (never below 0), over that second. Lua's next value re-aims it, so a clock updated
 * every second drains without steps, and a clock that stops updating (a paused timer) stops too.
 * `whole`: drain all the way to 0 over the time left (a run the countdown times itself).
 */
function countdownDrain(seconds: number, total: number, whole = false) {
  const s = Math.max(0, Number.isFinite(seconds) ? seconds : 0)
  if (!(total > 0)) return { from: 0, to: 0, ms: 0 }
  const from = Math.min(1, s / total)
  const step = whole ? s : Math.min(1, s)
  return { from, to: Math.max(0, (s - step) / total), ms: Math.round(step * 1000) }
}

/**
 * Motion is off when the theme or the player turned it off (data-nk-motion="off" on any ancestor,
 * kit.css) or the OS asks for less.
 */
const motionOn = (el: Element) =>
  typeof document === "undefined" ||
  ((el.closest("[data-nk-motion]") ?? document.documentElement).getAttribute("data-nk-motion") !== "off" &&
    !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches))

/**
 * Drains the line on its own: one linear WAAPI transform (on the compositor) from `from` to `to`
 * over `ms`, restarted when they change. With motion off, the static `from` is drawn.
 */
function useDrain(ref: React.RefObject<HTMLDivElement | null>, from: number, to: number, ms: number) {
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = `scaleX(${from})`
    if (!(ms > 0) || !motionOn(el) || typeof el.animate !== "function") return
    const a = el.animate([{ transform: `scaleX(${from})` }, { transform: `scaleX(${to})` }], { duration: ms, easing: "linear", fill: "forwards" })
    return () => a.cancel()
  }, [ref, from, to, ms])
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
  // danger is the shared name of destructive (1.5)
  if (state === "warning") return has(TONE, warnTone) ? (warnTone === "danger" ? "destructive" : warnTone) : "destructive"
  if (lineTone === "danger") return "destructive"
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
  hue,
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
    /** A role (health, police…): the line in its colour until the warning (1.5). */
    hue?: string
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
  const fill = React.useRef<HTMLDivElement>(null)
  // Timed runs drain once over the whole duration (from mount); from Lua, from each new value.
  const drain = timed ? countdownDrain(duration / 1000, duration / 1000, true) : countdownDrain(seconds, whole ?? 0)
  useDrain(fill, drain.from, drain.to, showLine ? drain.ms : 0)

  return (
    <div
      data-slot="countdown"
      data-state={state === "warning" ? "alert" : undefined}
      data-phase={state}
      data-hue={hue || undefined}
      className={cn("inline-flex flex-col items-center", game ? "nk-on-game" : "text-foreground", className)}
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
        <div data-slot="countdown-label" className={cn("nk-caption", size === "hero" ? "mt-4" : "mt-2")}>
          {label}
        </div>
      )}
      {showLine && (
        <div
          data-slot="countdown-line"
          {...toneVars({ tone: lineFill === "neutral" ? undefined : lineFill })}
          aria-hidden
          className={cn(
            "relative h-(--nk-meter-height) overflow-hidden rounded-(--nk-meter-radius)",
            size === "hero" ? "mt-6 w-80" : size === "sm" ? "mt-2 w-24" : "mt-3 w-40",
            game ? "nk-track" : "bg-foreground/15"
          )}
        >
          <div
            ref={fill}
            data-slot="countdown-line-fill"
            className={cn(
              "absolute inset-0 origin-left [box-shadow:var(--nk-meter-glow)]",
              hue && state !== "warning" ? "bg-(--hue-solid)" : lineFill !== "neutral" ? LINE_FILL[lineFill as keyof typeof LINE_FILL] : "bg-foreground"
            )}
          />
        </div>
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
  countdownDrain,
  type CountdownState,
  type CountdownLineTone,
}
