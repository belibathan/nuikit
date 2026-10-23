// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/progress-ring.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, nkLevel } from "@/lib/utils"
import { toneVars } from "@/components/ui/fill"
import { Kbd } from "@/components/ui/tile"

/**
 * ProgressRing — a circle that fills: a timed action ("Lockpicking…"), a level, a download. The
 * round half of the `progress` intent (docs/architecture.md §2); `meter` is the bar.
 *
 *   <ProgressRing value={62} label="Downloading" />
 *   <ProgressRing duration={5000} label="Lockpicking" cancelKey="X" onCancel={stop} onComplete={done} />
 *
 * With `duration` it runs on its own and `onComplete` fires from a timer when the time is up
 * (never from an animation event, so it still fires with motion off). Restart it with a new `key`.
 * The timed ring is drawn on the compositor: two half-rings, each rotated by one linear Web Animation
 * (transform only) on one start time, so it closes exactly at `duration` with no React render and no
 * repaint while it runs (ringHalfKeyframes()). It plays at every motion level: progress is information.
 *
 * Role: the round half of the progress intent: a timed action or a level, on the game or a panel.
 * Anatomy: root (role="progressbar", --level) > ring (track circle, fill circle or two timed half-rotors)
 *   > center (the percentage, num role) > label > cancel (a Kbd and its label; a button with onCancel).
 * Props: value, max, duration, onComplete, label, tone, hue, track, center, cancelKey, cancelLabel, onCancel, size.
 * Level means: the fraction done, 0 at the start, 1 when complete (data-complete).
 * Rules: tones use the shared vocabulary through toneVars() (danger = destructive), `hue` a role; a timed ring
 *   moves by transform only; the value ring steps with the data (no tween on the dash).
 */

const progressRingVariants = cva("relative shrink-0", {
  variants: {
    size: {
      sm: "size-10 text-(length:--nk-text-label)",
      default: "size-16 text-(length:--nk-text-label)",
      lg: "size-24 text-(length:--nk-text-title)",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

type ProgressRingTone = "primary" | "success" | "warning" | "info" | "destructive" | "danger"

/** Literal class names, so Tailwind finds them; tokens read as variables (docs/tokens.md). */
const TONE: Record<ProgressRingTone, string> = {
  primary: "stroke-(--nk-gauge-fill)",
  success: "stroke-(--success)",
  warning: "stroke-(--warning)",
  info: "stroke-(--info)",
  destructive: "stroke-(--destructive)",
  danger: "stroke-(--destructive)",
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
 * The rotation of each half of a timed ring. The right half's rotor turns 0 → 180° over the first half
 * of the run and holds; the left half's waits, then turns over the second half. Linear over one
 * duration, so the ring closes exactly at the end.
 */
function ringHalfKeyframes(half: "right" | "left"): Keyframe[] {
  return half === "right"
    ? [{ transform: "rotate(0deg)", offset: 0 }, { transform: "rotate(180deg)", offset: 0.5 }, { transform: "rotate(180deg)", offset: 1 }]
    : [{ transform: "rotate(0deg)", offset: 0 }, { transform: "rotate(0deg)", offset: 0.5 }, { transform: "rotate(180deg)", offset: 1 }]
}

/**
 * A timed run from mount (or a new `duration`): the two half-ring rotors in `root` animate on one start
 * time; the default centre text is written straight to the DOM every STEP_MS (no React render).
 * React renders at the start and at the end, when `onComplete` fires from its own timer.
 */
function useTimedRun(root: React.RefObject<HTMLElement | null>, duration: number | undefined, onComplete?: () => void) {
  const [done, setDone] = React.useState(false)
  const complete = React.useRef(onComplete)
  React.useEffect(() => {
    complete.current = onComplete
  })
  React.useLayoutEffect(() => {
    if (!duration || duration <= 0) return
    setDone(false)
    const t0 = performance.now()
    const el = root.current
    const anims: Animation[] = []
    for (const half of ["right", "left"] as const) {
      const rotor = el?.querySelector<HTMLElement>(`[data-slot=progress-ring-rotor][data-half=${half}]`)
      if (!rotor?.animate) continue
      const a = rotor.animate(ringHalfKeyframes(half), { duration, easing: "linear", fill: "both" })
      a.startTime = t0 // the document timeline's clock: closed exactly at t0 + duration
      anims.push(a)
    }
    const text = el?.querySelector<HTMLElement>("[data-slot=progress-ring-center][data-auto]")
    const tick = text
      ? setInterval(() => {
          text.textContent = `${Math.round(ringPercent(performance.now() - t0, duration))}%`
        }, STEP_MS)
      : undefined
    const end = setTimeout(() => {
      clearInterval(tick)
      setDone(true)
      complete.current?.()
    }, duration)
    return () => {
      clearInterval(tick)
      clearTimeout(end)
      anims.forEach((a) => a.cancel())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])
  return done
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
    /** A role (health, police…): the ring in its colour (1.5). */
    hue?: string
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
  hue,
  track = "game",
  center,
  cancelKey,
  cancelLabel = "Cancel",
  onCancel,
  ...props
}: ProgressRingProps) {
  const box = React.useRef<HTMLDivElement>(null)
  const done = useTimedRun(box, duration, onComplete)
  const timed = duration !== undefined && duration > 0
  const running = timed && !done
  const percent = timed ? (done ? 100 : 0) : ringPercent(value, max)
  const drawn = percent
  const game = track === "game"
  const inside = center === undefined ? `${Math.round(percent)}%` : center
  const toneClass = hue ? "stroke-(--hue-solid)" : (TONE[tone] ?? TONE.primary)

  const cancel = (cancelKey || onCancel) && (
    <span className="flex items-center gap-(--nk-gap-cluster) text-(length:--nk-text-label) leading-4 [font-weight:var(--nk-type-label-weight,500)]">
      {cancelKey && <Kbd>{cancelKey}</Kbd>}
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
      {...toneVars({ tone, hue })}
      data-complete={percent >= 100 || undefined}
      className={cn("inline-flex flex-col items-center gap-2", game && "text-(color:--hud-foreground)", className)}
      {...props}
      style={{ ...nkLevel(percent / 100), ...props.style }}
    >
      <div ref={box} className={cn(progressRingVariants({ size }), game && "nk-shadow")}>
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
          {!running && (
            <circle
              data-slot="progress-ring-fill"
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="8"
              strokeLinecap={timed ? "butt" : "round"}
              transform="rotate(-90 50 50)"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={ringOffset(drawn)}
              className={toneClass}
            />
          )}
        </svg>
        {running &&
          // Timed: each half of the box clips a rotor carrying the opposite half-ring; rotating the rotor
          // sweeps its arc into view (right half first, from 12 o'clock clockwise). Transform only.
          (["right", "left"] as const).map((half) => (
            <div
              key={half}
              aria-hidden
              className={cn("absolute inset-y-0 w-1/2 overflow-hidden", half === "right" ? "right-0" : "left-0")}
            >
              <div
                data-slot="progress-ring-rotor"
                data-half={half}
                className={cn("absolute inset-y-0 w-[200%]", half === "right" ? "right-0" : "left-0")}
              >
                <svg viewBox="0 0 100 100" className="size-full">
                  <path
                    d={half === "right" ? `M50 ${50 + RADIUS} A${RADIUS} ${RADIUS} 0 0 1 50 ${50 - RADIUS}` : `M50 ${50 - RADIUS} A${RADIUS} ${RADIUS} 0 0 1 50 ${50 + RADIUS}`}
                    fill="none"
                    strokeWidth="8"
                    className={toneClass}
                  />
                </svg>
              </div>
            </div>
          ))}
        {inside !== false && inside !== null && (
          <span
            data-slot="progress-ring-center"
            data-auto={(running && center === undefined) || undefined}
            // While running, a ticking counter repaints only itself: its own layer, its own layout
            className={cn("absolute inset-0 grid place-items-center nk-num [font-weight:var(--nk-weight-strong,600)]", running && "[contain:strict] will-change-transform")}
          >
            {inside}
          </span>
        )}
      </div>
      {label && (
        <span data-slot="progress-ring-label" className={cn("nk-body max-w-48 truncate leading-5 [font-weight:var(--nk-type-label-weight,500)]", game && "nk-shadow")}>
          {label}
        </span>
      )}
      {cancel &&
        (onCancel ? (
          <button
            type="button"
            data-slot="progress-ring-cancel"
            onClick={onCancel}
            className="rounded-(--nk-r-control) px-(--nk-space-1) outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {cancel}
          </button>
        ) : (
          <span data-slot="progress-ring-cancel">{cancel}</span>
        ))}
    </div>
  )
}

export { ProgressRing, progressRingVariants, ringPercent, ringOffset, ringHalfKeyframes, type ProgressRingTone, type ProgressRingProps }
