// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/progress-ring.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, nkLevel } from "@/lib/utils"
import { Dial } from "@/components/ui/dial"
import { toneVars } from "@/components/ui/fill"
import { Kbd } from "@/components/ui/tile"
import { useLinearRun } from "@/hooks/use-linear-run"

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
 * Anatomy: root (role="progressbar", --level) > Dial (sweep 360: track, value arc; or two timed half-rotors)
 *   > center (the percentage, num role) > label > cancel (a Kbd Tile and its label; a button with onCancel).
 * Props: value, max, duration, onComplete, label, tone, hue, track, center, cancelKey, cancelLabel, onCancel, size.
 * Level means: the fraction done, 0 at the start, 1 when complete (data-complete).
 * Rules: tones use the shared vocabulary through toneVars() (danger = destructive), `hue` a role; a timed ring
 *   moves by transform only; the value ring steps with the data (no tween on the dash).
 */

const progressRingVariants = cva("", {
  variants: {
    size: {
      sm: "text-(length:--nk-text-label)",
      default: "text-(length:--nk-text-label)",
      lg: "text-(length:--nk-text-title)",
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

/** The ring's diameter per size, px at 1080p (the Dial's size). */
const RING_SIZE = { sm: 40, default: 64, lg: 96 } as const

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
 * The default centre text of a timed run, written straight to the DOM every STEP_MS (no React render); the
 * rotors themselves run on useLinearRun.
 */
function useRunText(root: React.RefObject<HTMLElement | null>, duration: number | undefined, auto: boolean) {
  React.useLayoutEffect(() => {
    if (!duration || duration <= 0 || !auto) return
    const t0 = performance.now()
    const text = root.current?.querySelector<HTMLElement>("[data-slot=progress-ring-center]")
    if (!text) return
    const tick = setInterval(() => {
      text.textContent = `${Math.round(ringPercent(performance.now() - t0, duration))}%`
    }, STEP_MS)
    const end = setTimeout(() => clearInterval(tick), duration)
    return () => {
      clearInterval(tick)
      clearTimeout(end)
    }
  }, [root, duration, auto])
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
  // Motion: the two half-ring rotors on one start time, closed exactly at `duration`; onComplete from a timer
  const done = useLinearRun(box, {
    duration,
    onComplete,
    targets: (el) =>
      (["right", "left"] as const).map((half) => ({
        el: el.querySelector(`[data-slot=progress-ring-rotor][data-half=${half}]`),
        keyframes: ringHalfKeyframes(half),
      })),
  })
  useRunText(box, duration, center === undefined)
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
      ref={box}
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
      <Dial
        size={RING_SIZE[size ?? "default"] ?? RING_SIZE.default}
        sweep={360}
        surface="none"
        ticks={0}
        // the ring's own proportions: an 8% stroke 6% in from the edge (r 44 of 100)
        thickness={(RING_SIZE[size ?? "default"] ?? RING_SIZE.default) * 0.08}
        inset={(RING_SIZE[size ?? "default"] ?? RING_SIZE.default) * 0.06}
        level={running ? 0 : drawn / 100}
        trackProps={{ className: game ? "stroke-(--scrim)" : "stroke-(--muted)", strokeOpacity: game ? 0.35 : 1 }}
        // timed: the rotors draw the run, the value arc waits (a butt cap draws nothing at 0)
        valueProps={{ "data-slot": "progress-ring-fill", className: toneClass, strokeLinecap: timed ? "butt" : "round" }}
        className={cn(progressRingVariants({ size }), game && "nk-shadow")}
      >
        {timed &&
          // Timed: each half of the box clips a rotor carrying the opposite half-ring; rotating the rotor
          // sweeps its arc into view (right half first, from 12 o'clock clockwise). Transform only.
          (["right", "left"] as const).map((half) => (
            <div
              key={half}
              aria-hidden
              // mounted for the whole timed life (a restart finds them), hidden once the run is done
              hidden={!running}
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
      </Dial>
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
