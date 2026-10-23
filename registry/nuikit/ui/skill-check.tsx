"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/tile"

/**
 * SkillCheck — press the key while the needle is in the zone: lockpicking, hacking, fishing. The
 * default look of the `challenge` intent (docs/architecture.md §2).
 *
 *   <SkillCheck key={round} zoneStart={zone.start} zoneSize={zone.size} keyLabel="E" speed={1.5}
 *     running listen onResult={(hit) => next(hit)} />
 *
 * Three ways to drive it:
 * - It runs itself (`running`): the needle sweeps once, clockwise from 12 o'clock, in
 *   2000ms / speed. With `listen` the page reads the key; a full turn without a press is a miss
 *   (from a timer). `onResult(hit)` fires once.
 * - On a clock kept elsewhere (`startedAt`, a performance.now() reading): the needle sweeps from
 *   then, and `clock.current.angle()` says where it is drawn. The caller judges the press.
 * - From outside: pass `angle` (Lua, a replay, a preview) and `result` to show the outcome.
 *
 * The sweep is one linear Web Animation rotating the needle's layer (transform only, on the
 * compositor): no requestAnimationFrame, no React render per frame. The hit test reads the
 * animation's currentTime, so the angle judged is the angle drawn. It plays at every motion level.
 *
 * One check per mount: a sequence of checks is a sequence of `key`s. skillCheckZone() places a
 * zone, skillCheckHit() is the rule, SKILL_CHECK_PRESETS has easy / medium / hard.
 *
 * Role: Press the key while the needle is in the zone: the challenge intent.
 * Anatomy: dial (track, zone arc) > needle (drawn per frame) > key (a Kbd tile) > outcome
 * Props: size, zoneStart, zoneSize, keyLabel, speed, running, listen, result, onResult.
 * Rules: The needle moves without re-rendering; a full turn is a miss. The outcome is success or fail on the
 *   key, never colour alone.
 */

const skillCheckVariants = cva("relative shrink-0", {
  variants: {
    size: {
      sm: "size-28",
      default: "size-40",
      lg: "size-52",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

/** Zone size (degrees) and speed (turns per 2s) for the usual difficulty words. */
const SKILL_CHECK_PRESETS = {
  easy: { zoneSize: 50, speed: 1 },
  medium: { zoneSize: 40, speed: 1.5 },
  hard: { zoneSize: 25, speed: 1.75 },
} as const

/** ms for one turn at `speed` (1 = 2000ms). */
function skillCheckTurnMs(speed = 1) {
  return 2000 / Math.max(0.0001, Number.isFinite(speed) && speed > 0 ? speed : 1)
}

/** The needle's angle (0–360, clockwise from 12) after `elapsed` ms of a turn of `turnMs`. */
function skillCheckAngle(elapsed: number, turnMs: number) {
  return Math.max(0, (elapsed / turnMs) * 360)
}

/** Is `angle` inside the zone? Zones may wrap past 360 (start 340, size 40 covers 340–20). */
function skillCheckHit(angle: number, zoneStart: number, zoneSize: number) {
  if (!(zoneSize > 0) || !Number.isFinite(angle)) return false
  const a = ((angle % 360) + 360) % 360
  const s = ((zoneStart % 360) + 360) % 360
  const end = s + Math.min(360, zoneSize)
  return end <= 360 ? a >= s && a <= end : a >= s || a <= end - 360
}

/**
 * A zone start for a zone of `zoneSize` degrees, between `min` and 360 − size, so the player has
 * time to see it coming. `random` is injectable for tests.
 */
function skillCheckZone(zoneSize: number, { min = 120, random = Math.random }: { min?: number; random?: () => number } = {}) {
  const size = Math.max(1, Math.min(359, zoneSize))
  const hi = Math.max(min + 1, 360 - size)
  return { start: min + Math.floor(random() * (hi - min)), size }
}

const R = 52
/** 24 ticks (every 15°) on the circle at R + 6: one dash of 1 unit per step, the first centred on 12 o'clock. */
const TICKS = (() => {
  const step = (2 * Math.PI * (R + 6)) / 24
  return { dash: `1 ${(step - 1).toFixed(3)}`, offset: 0.5 }
})()
const C = 2 * Math.PI * R

/** stroke-dasharray + rotation drawing an arc of `len` degrees from `from` (clockwise from 12). */
function arc(from: number, len: number) {
  return { dash: `${(Math.max(0, len) / 360) * C} ${C}`, rotate: `rotate(${from - 90} 60 60)` }
}

function keyOf(e: KeyboardEvent) {
  const k = e.key.toLowerCase()
  // Non-Latin layouts: fall back to the physical key (KeyE → e).
  if (k.length === 1 && k.charCodeAt(0) >= 880) {
    if (e.code.startsWith("Key")) return e.code.slice(3).toLowerCase()
    if (e.code.startsWith("Digit")) return e.code.slice(5)
  }
  return k
}

/** Where a sweep is drawn now, for a caller that keeps the clock (`startedAt`) and judges the press itself. */
interface SkillCheckClock {
  /** The needle's angle as drawn (0–360, clockwise from 12). */
  angle(): number
}

/** The needle's sweep: one turn, linear, as a rotation of its layer. */
const SWEEP: Keyframe[] = [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }]

function SkillCheck({
  className,
  size,
  zoneStart,
  zoneSize,
  keyLabel = "E",
  speed = 1,
  angle: angleProp,
  running = false,
  startedAt,
  clock,
  listen = false,
  result,
  onResult,
  ...props
}: Omit<React.ComponentProps<"div">, "children" | "onResult"> &
  VariantProps<typeof skillCheckVariants> & {
    /** Where the zone starts, degrees clockwise from 12 o'clock. */
    zoneStart: number
    /** How wide the zone is, in degrees. */
    zoneSize: number
    /** The key to press, as shown. */
    keyLabel?: string
    /** Turns per 2 seconds (1 = one turn in 2000ms). */
    speed?: number
    /** The needle, from outside (0–360). Ignored while it sweeps. */
    angle?: number
    /** Run the sweep here and judge it (a full turn without a press is a miss). */
    running?: boolean
    /** Sweep from this performance.now() reading, on a clock kept elsewhere (the caller judges). */
    startedAt?: number
    /** Filled while it sweeps: `clock.current.angle()` is the angle drawn now. */
    clock?: { current: SkillCheckClock | null }
    /** Read the key in the page (true: `keyLabel`; a string: that KeyboardEvent.key). */
    listen?: boolean | string
    /** Show an outcome: the zone turns success or destructive, and the needle stops. */
    result?: "success" | "fail"
    /** Once per run: a press in the zone (true), elsewhere or a full turn without one (false). */
    onResult?: (hit: boolean, angle: number) => void
  }) {
  const rotor = React.useRef<HTMLDivElement>(null)
  const sweep = React.useRef<{ anim: Animation | null; t0: number; turn: number; done: boolean }>({ anim: null, t0: 0, turn: 2000, done: true })
  const report = React.useRef(onResult)
  const [outcome, setOutcome] = React.useState<"success" | "fail" | undefined>(undefined)
  React.useEffect(() => {
    report.current = onResult
  })

  // The angle drawn: the animation's own clock (the frame on screen), else the wall clock since t0.
  const angleNow = React.useCallback(() => {
    const s = sweep.current
    const ms = s.anim && s.anim.currentTime !== null ? Number(s.anim.currentTime) : performance.now() - s.t0
    return Math.min(360, skillCheckAngle(ms, s.turn))
  }, [])

  const finish = React.useCallback(
    (hit: boolean) => {
      const s = sweep.current
      if (s.done) return
      const a = angleNow()
      s.done = true
      s.anim?.pause()
      setOutcome(hit ? "success" : "fail")
      report.current?.(hit, a)
    },
    [angleNow]
  )

  // The sweep: one compositor animation, started on the given clock (or now).
  const sweeping = running || startedAt !== undefined
  React.useLayoutEffect(() => {
    if (!sweeping) return
    const t0 = startedAt ?? performance.now()
    const turn = skillCheckTurnMs(speed)
    const anim = rotor.current?.animate?.(SWEEP, { duration: turn, easing: "linear", fill: "both" }) ?? null
    if (anim) anim.startTime = t0
    sweep.current = { anim, t0, turn, done: false }
    setOutcome(undefined)
    if (clock) clock.current = { angle: angleNow }
    // Running here: a full turn without a press is a miss, from a timer (never an animation event).
    const miss = running ? setTimeout(() => finish(false), Math.max(0, t0 + turn - performance.now())) : undefined
    return () => {
      clearTimeout(miss)
      anim?.cancel()
      sweep.current = { ...sweep.current, anim: null, done: true }
      if (clock) clock.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sweeping, running, speed, startedAt])

  // An outcome from outside stops the needle where it is.
  React.useEffect(() => {
    if (result) sweep.current.anim?.pause()
  }, [result])

  // The key, read in the page when asked to.
  React.useEffect(() => {
    if (!running || !listen) return
    const want = (typeof listen === "string" ? listen : keyLabel).toLowerCase()
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || sweep.current.done) return
      const k = keyOf(e)
      if (k !== want) return
      e.preventDefault()
      finish(skillCheckHit(angleNow(), zoneStart, zoneSize))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [running, listen, keyLabel, zoneStart, zoneSize, finish, angleNow])

  const shown = result ?? outcome
  const zone = arc(zoneStart, zoneSize)
  const hand = arc(-1, 2)

  return (
    <div
      role="group"
      aria-label={`Press ${keyLabel} in the zone`}
      data-slot="skill-check"
      data-state={shown ?? (sweeping ? "running" : "idle")}
      className={cn(skillCheckVariants({ size }), className)}
      {...props}
    >
      <svg viewBox="0 0 120 120" aria-hidden className="size-full overflow-visible nk-shadow">
        {/* track and its hairlines, the zone (the one primary) */}
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="6" className="stroke-popover" />
        <circle cx="60" cy="60" r={R + 3} fill="none" strokeWidth="1" className="stroke-border" />
        <circle cx="60" cy="60" r={R - 3} fill="none" strokeWidth="1" className="stroke-border" />
        {/* tick marks every 15° outside the ring, on the gauge tick token (× --nk-gauge-ticks: none when the identity turns them off) */}
        <circle
          data-slot="skill-check-ticks"
          cx="60"
          cy="60"
          r={R + 6}
          fill="none"
          strokeWidth="2.5"
          strokeDasharray={TICKS.dash}
          strokeDashoffset={TICKS.offset}
          className="stroke-(--nk-gauge-tick)"
        />
        <circle
          data-slot="skill-check-zone"
          cx="60"
          cy="60"
          r={R}
          fill="none"
          strokeWidth="6"
          strokeDasharray={zone.dash}
          transform={zone.rotate}
          className={shown === "success" ? "stroke-success" : shown === "fail" ? "stroke-destructive" : "stroke-(--nk-gauge-fill)"}
        />
      </svg>
      {/* the needle, drawn at 12 o'clock on its own layer; the layer turns (transform only) */}
      <div
        ref={rotor}
        data-slot="skill-check-rotor"
        aria-hidden
        className="absolute inset-0"
        style={sweeping ? undefined : { transform: `rotate(${angleProp ?? 0}deg)` }}
      >
        <svg viewBox="0 0 120 120" className="size-full overflow-visible nk-shadow">
          <circle
            data-slot="skill-check-needle"
            cx="60"
            cy="60"
            r={R}
            fill="none"
            strokeWidth="12"
            strokeDasharray={hand.dash}
            transform={hand.rotate}
            className="stroke-foreground"
          />
        </svg>
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <Kbd
          data-slot="skill-check-key"
          className={cn(
            "h-8 min-w-8 rounded-(--nk-r-control) bg-popover px-2 text-(length:--nk-text-label) [font-weight:var(--nk-weight-strong,600)] text-popover-foreground uppercase ring-1 ring-border",
            shown === "success" && "ring-success",
            shown === "fail" && "ring-destructive"
          )}
        >
          {keyLabel}
        </Kbd>
      </div>
    </div>
  )
}

export {
  SkillCheck,
  skillCheckVariants,
  skillCheckHit,
  skillCheckAngle,
  skillCheckTurnMs,
  skillCheckZone,
  SKILL_CHECK_PRESETS,
  SWEEP as SKILL_CHECK_SWEEP,
  type SkillCheckClock,
}
