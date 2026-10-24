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
 * It is the speedometer's language (the baseline, docs/design/baseline.md): a segmented Dial on a dark disc, the
 * segments lit solid in the accent (or the tone), the percentage in the numeric voice, the label in the label
 * voice. A timed ring lights its segments on the compositor: one linear opacity step per segment on one start
 * time, the last exactly at `duration`, with no React render (ringSegmentKeyframes()). It plays at every motion
 * level: progress is information. Segments and their gap are levers (--nk-ring-segments, --nk-ring-gap).
 *
 * Role: the round half of the progress intent: a timed action or a level, on the game or a panel.
 * Anatomy: root (role="progressbar", --level) > Dial (sweep 360, a disc, segmented track and value segments)
 *   > center (the percentage, num voice) > label (label voice) > cancel (a Kbd Tile and its label; a button with onCancel).
 * Props: value, max, duration, onComplete, label, tone, hue, track, center, cancelKey, cancelLabel, onCancel, size.
 * Level means: the fraction done, 0 at the start, 1 when complete (data-complete).
 * Rules: tones use the shared vocabulary through toneVars() (danger = destructive), `hue` a role; a timed ring
 *   lights by opacity only; the value steps with the data (no tween); never a thick continuous ring.
 */

const progressRingVariants = cva("", {
  variants: {
    size: {
      sm: "text-(length:--nk-text-label)",
      default: "text-(length:--nk-text-title)",
      lg: "text-(length:--nk-text-section)",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

type ProgressRingTone = "primary" | "success" | "warning" | "info" | "destructive" | "danger"

/** Literal class names, so Tailwind finds them; tokens read as variables (docs/tokens.md). */
const TONE: Record<ProgressRingTone, string> = {
  primary: "stroke-(--nk-gauge-fill-color)",
  success: "stroke-(--success)",
  warning: "stroke-(--warning)",
  info: "stroke-(--info)",
  destructive: "stroke-(--destructive)",
  danger: "stroke-(--destructive)",
}

/** The ring's diameter per size, px at 1080p (the Dial's size). */
const RING_SIZE = { sm: 48, default: 72, lg: 104 } as const

const STEP_MS = 100
/** The ring baseline (1.6): --nk-ring-segments and --nk-ring-gap (degrees) when the theme sets none. */
const RING_SEGMENTS = 24
const RING_GAP = 4
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

/** A CSS number lever read once from the element (the ring's segments and gap), else its default. */
function useNumberLever(ref: React.RefObject<HTMLElement | null>, name: string, fallback: number) {
  const [n, setN] = React.useState(fallback)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof getComputedStyle !== "function") return
    const v = parseFloat(getComputedStyle(el).getPropertyValue(name))
    if (Number.isFinite(v) && v >= 0) setN(v)
  }, [ref, name])
  return n
}

/**
 * Each segment of a timed ring lights when the run reaches it: an opacity step at (i + 1) / n, linear over one
 * duration, so the last one lights exactly at the end (opacity only, on the compositor).
 */
function ringSegmentKeyframes(i: number, n: number): Keyframe[] {
  const at = Math.min(1, (i + 1) / Math.max(1, n))
  return [{ opacity: 0, offset: 0 }, { opacity: 0, offset: at }, { opacity: 1, offset: at }, { opacity: 1, offset: 1 }]
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
  // the baseline levers: segments and the degrees between them (the speedometer's even gaps)
  const segments = Math.round(useNumberLever(box, "--nk-ring-segments", RING_SEGMENTS))
  const gap = useNumberLever(box, "--nk-ring-gap", RING_GAP)
  // Motion: every segment lights on one start time, the last exactly at `duration`; onComplete from a timer
  const done = useLinearRun(box, {
    duration,
    onComplete,
    targets: (el) =>
      Array.from(el.querySelectorAll("[data-slot=dial-segment]")).map((seg, i, all) => ({
        el: seg,
        keyframes: ringSegmentKeyframes(i, all.length),
      })),
    deps: [segments],
  })
  useRunText(box, duration, center === undefined)
  const timed = duration !== undefined && duration > 0
  const running = timed && !done
  const percent = timed ? (done ? 100 : 0) : ringPercent(value, max)
  const game = track === "game"
  const inside = center === undefined ? `${Math.round(percent)}%` : center
  // the primary paints in the accent's stops (the speedometer's level); a tone or a role, its colour
  const accent = !hue && (tone === "primary" || tone === undefined)
  const toneClass = hue ? "stroke-(--hue-solid)" : accent ? undefined : (TONE[tone] ?? TONE.primary)
  const px = RING_SIZE[size ?? "default"] ?? RING_SIZE.default

  const cancel = (cancelKey || onCancel) && (
    <span className="flex items-center gap-(--nk-gap-cluster)">
      {cancelKey && <Kbd>{cancelKey}</Kbd>}
      <span data-slot="progress-ring-cancel-label" className={game ? "opacity-75" : "text-muted-foreground"}>
        {cancelLabel}
      </span>
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
      data-size={size ?? "default"}
      {...toneVars({ tone, hue })}
      data-complete={percent >= 100 || undefined}
      className={cn("inline-flex flex-col items-center gap-(--nk-space-3)", game && "text-(color:--hud-foreground)", className)}
      {...props}
      style={{ ...nkLevel(percent / 100), ...props.style }}
    >
      <Dial
        size={px}
        sweep={360}
        surface={game ? "none" : "theme"}
        ticks={0}
        segments={segments}
        segmentGap={gap}
        paint={accent ? "accent" : "tone"}
        disc
        // the speedometer's proportions: a thick segment stroke, a hair in from the edge
        thickness={px * 0.09}
        inset={px * 0.07}
        level={running ? 0 : percent / 100}
        trackProps={{ className: game ? "stroke-[rgba(var(--hud-foreground-rgb),0.16)]" : "stroke-(--nk-fill-track)" }}
        valueProps={{ "data-slot": "progress-ring-fill", className: toneClass, strokeLinecap: "butt" }}
        className={cn(progressRingVariants({ size }))}
      >
        {inside !== false && inside !== null && (
          <span
            data-slot="progress-ring-center"
            data-auto={(running && center === undefined) || undefined}
            // While running, a ticking counter repaints only itself: its own layer, its own layout
            className={cn("absolute inset-0 grid place-items-center", running && "[contain:strict] will-change-transform")}
          >
            {inside}
          </span>
        )}
      </Dial>
      {label && (
        <span data-slot="progress-ring-label" className={cn("max-w-(--nk-ring-label-max-width) truncate", game && "nk-shadow")}>
          {label}
        </span>
      )}
      {cancel &&
        (onCancel ? (
          <button
            type="button"
            data-slot="progress-ring-cancel"
            onClick={onCancel}
            className="rounded-(--nk-radius-control) px-(--nk-space-1) outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--nk-line-focus)]"
          >
            {cancel}
          </button>
        ) : (
          <span data-slot="progress-ring-cancel">{cancel}</span>
        ))}
    </div>
  )
}

export { ProgressRing, progressRingVariants, ringPercent, ringOffset, ringHalfKeyframes, ringSegmentKeyframes, type ProgressRingTone, type ProgressRingProps }
