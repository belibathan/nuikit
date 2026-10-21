"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/kbd"

/**
 * SkillCheck — press the key while the needle is in the zone: lockpicking, hacking, fishing. The
 * default look of the `challenge` intent (docs/architecture.md §2).
 *
 *   <SkillCheck key={round} zoneStart={zone.start} zoneSize={zone.size} keyLabel="E" speed={1.5}
 *     running listen onResult={(hit) => next(hit)} />
 *
 * Two ways to drive it:
 * - It runs itself (`running`): the needle sweeps once, clockwise from 12 o'clock, in
 *   2000ms / speed, drawn straight onto the SVG each frame (no re-render). With `listen` the
 *   page reads the key; a full turn without a press is a miss. `onResult(hit)` fires once.
 * - From outside: pass `angle` (Lua, a replay, a preview) and `result` to show the outcome.
 *
 * One check per mount: a sequence of checks is a sequence of `key`s. skillCheckZone() places a
 * zone, skillCheckHit() is the rule, SKILL_CHECK_PRESETS has easy / medium / hard.
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

function SkillCheck({
  className,
  size,
  zoneStart,
  zoneSize,
  keyLabel = "E",
  speed = 1,
  angle: angleProp,
  running = false,
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
    /** The needle, from outside (0–360). Ignored while `running`. */
    angle?: number
    /** Run the sweep here. */
    running?: boolean
    /** Read the key in the page (true: `keyLabel`; a string: that KeyboardEvent.key). */
    listen?: boolean | string
    /** Show an outcome: the zone turns success or destructive. */
    result?: "success" | "fail"
    /** Once per run: a press in the zone (true), elsewhere or a full turn without one (false). */
    onResult?: (hit: boolean, angle: number) => void
  }) {
  const needle = React.useRef<SVGCircleElement>(null)
  const live = React.useRef({ angle: angleProp ?? 0, done: false })
  const report = React.useRef(onResult)
  const [outcome, setOutcome] = React.useState<"success" | "fail" | undefined>(undefined)
  React.useEffect(() => {
    report.current = onResult
  })

  const finish = React.useCallback((hit: boolean) => {
    if (live.current.done) return
    live.current.done = true
    setOutcome(hit ? "success" : "fail")
    report.current?.(hit, live.current.angle)
  }, [])

  const draw = (a: number) => {
    const n = needle.current
    if (n) n.setAttribute("transform", arc(a - 1, 2).rotate)
  }

  // The sweep: drawn straight onto the needle, no React render per frame.
  React.useEffect(() => {
    if (!running) return
    live.current = { angle: 0, done: false }
    setOutcome(undefined)
    const turn = skillCheckTurnMs(speed)
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      if (live.current.done) return
      const a = skillCheckAngle(now - t0, turn)
      if (a >= 360) {
        live.current.angle = 360
        draw(360)
        return finish(false)
      }
      live.current.angle = a
      draw(a)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, speed])

  // The key, read in the page when asked to.
  React.useEffect(() => {
    if (!running || !listen) return
    const want = (typeof listen === "string" ? listen : keyLabel).toLowerCase()
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || live.current.done) return
      const k = keyOf(e)
      if (k !== want) return
      e.preventDefault()
      finish(skillCheckHit(live.current.angle, zoneStart, zoneSize))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [running, listen, keyLabel, zoneStart, zoneSize, finish])

  const shown = result ?? outcome
  const a = running ? live.current.angle : (angleProp ?? 0)
  const zone = arc(zoneStart, zoneSize)
  const hand = arc(a - 1, 2)

  return (
    <div
      role="group"
      aria-label={`Press ${keyLabel} in the zone`}
      data-slot="skill-check"
      data-state={shown ?? (running ? "running" : "idle")}
      className={cn(skillCheckVariants({ size }), className)}
      {...props}
    >
      <svg viewBox="0 0 120 120" aria-hidden className="size-full overflow-visible nk-shadow">
        {/* track and its hairlines, the zone (the one primary), the needle */}
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="6" className="stroke-popover" />
        <circle cx="60" cy="60" r={R + 3} fill="none" strokeWidth="1" className="stroke-border" />
        <circle cx="60" cy="60" r={R - 3} fill="none" strokeWidth="1" className="stroke-border" />
        <circle
          data-slot="skill-check-zone"
          cx="60"
          cy="60"
          r={R}
          fill="none"
          strokeWidth="6"
          strokeDasharray={zone.dash}
          transform={zone.rotate}
          className={shown === "success" ? "stroke-success" : shown === "fail" ? "stroke-destructive" : "stroke-primary"}
        />
        <circle
          ref={needle}
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
      <div className="absolute inset-0 grid place-items-center">
        <Kbd
          data-slot="skill-check-key"
          className={cn(
            "h-8 min-w-8 rounded-md bg-popover px-2 text-sm font-semibold text-popover-foreground uppercase shadow-sm ring-1 ring-border",
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
}
