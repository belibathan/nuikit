// synced by pnpm sync: don't edit here. Change registry/nuikit/hooks/use-linear-run.ts, then run pnpm sync.
import * as React from "react"

/**
 * useLinearRun — the kit's one timed run (docs/design/components.md, foundation: Motion): a linear Web
 * Animation on each target (transform only, on the compositor, no React render while it runs), all on one
 * start time so they reach the end together, and a completion that fires from a timer (never an animation
 * event), so it still fires with motion off. Meter's and ProgressRing's `duration`, Notice's time line and
 * Countdown's drain are this hook.
 *
 *   const done = useLinearRun(root, {
 *     duration: 5000,
 *     targets: (el) => fillTargets(el.querySelector("[data-slot=fill]"), 0, 1),
 *     onComplete,
 *   })
 *
 * - `elapsed` starts part-way (a preview, a notice restored after a reload); `paused` freezes the animations
 *   and the timer, which resumes with the time it had left.
 * - `motion: "respect"` skips the animations (not the timer) when motion is off (data-nk-motion="off" on an
 *   ancestor, or the OS asks for less); "always" (default) plays them: progress is information.
 * - `release`: once done, cancel the animations so React's own end state is what is drawn.
 * - A new `duration`, `elapsed` or anything in `deps` restarts the run.
 */

type LinearRunTarget = {
  el: Element | null | undefined
  keyframes: Keyframe[]
  /** Animate a pseudo-element ("::before"): Fill's bar and edge. */
  pseudoElement?: string
}

type LinearRunOptions = {
  /** ms. Undefined, 0 or not finite: no run. */
  duration?: number
  /** ms already run. */
  elapsed?: number
  paused?: boolean
  /** What to animate, read from the root when the run starts. */
  targets?: (root: HTMLElement) => LinearRunTarget[]
  /** Called once when the time is up (from a timer). */
  onComplete?: () => void
  motion?: "always" | "respect"
  release?: boolean
  deps?: React.DependencyList
}

/**
 * Motion is off when the theme or the player turned it off (data-nk-motion="off" on any ancestor, kit.css) or
 * the OS asks for less.
 */
function motionOn(el: Element) {
  return (
    typeof document === "undefined" ||
    ((el.closest("[data-nk-motion]") ?? document.documentElement).getAttribute("data-nk-motion") !== "off" &&
      !(typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches))
  )
}

type Run = { anims: Animation[]; left: number; at: number; timer: ReturnType<typeof setTimeout> | 0; fired: boolean; arm: () => void }

function useLinearRun(root: React.RefObject<HTMLElement | null>, options: LinearRunOptions): boolean {
  const { duration, elapsed = 0, paused = false, motion = "always", release = false, deps = [] } = options
  const [done, setDone] = React.useState(false)
  const latest = React.useRef(options)
  const run = React.useRef<Run | null>(null)
  const pausedNow = React.useRef(paused)
  React.useEffect(() => {
    latest.current = options
    pausedNow.current = paused
  })
  const active = duration !== undefined && Number.isFinite(duration) && duration > 0

  React.useLayoutEffect(() => {
    if (!active) return
    setDone(false)
    const el = root.current
    const ran = Math.max(0, Math.min(duration!, Number.isFinite(elapsed) ? elapsed : 0))
    const start = performance.now() - ran
    const play = !!el && (motion === "always" || motionOn(el))
    const anims =
      play && el
        ? (latest.current.targets?.(el) ?? []).flatMap(({ el: t, keyframes, pseudoElement }) => {
            if (!t || typeof (t as HTMLElement).animate !== "function") return []
            const a = (t as HTMLElement).animate(keyframes, { duration, easing: "linear", fill: "both", pseudoElement })
            a.startTime = start // the document timeline's clock: every target ends exactly at start + duration
            return [a]
          })
        : []
    const r: Run = {
      anims,
      left: duration! - ran,
      at: 0,
      timer: 0,
      fired: false,
      arm: () => {
        if (r.fired || r.timer) return
        r.at = performance.now()
        r.timer = setTimeout(() => {
          r.timer = 0
          r.fired = true
          setDone(true)
          latest.current.onComplete?.()
        }, Math.max(0, r.left))
      },
    }
    run.current = r
    if (pausedNow.current) anims.forEach((a) => a.pause())
    else r.arm()
    return () => {
      if (r.timer) clearTimeout(r.timer)
      anims.forEach((a) => a.cancel())
      run.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, duration, elapsed, motion, ...deps])

  // pause and resume: the animations hold, the timer keeps what it had left
  React.useEffect(() => {
    const r = run.current
    if (!r || r.fired) return
    if (paused) {
      if (r.timer) {
        clearTimeout(r.timer)
        r.timer = 0
        r.left -= performance.now() - r.at
      }
      r.anims.forEach((a) => a.playState !== "finished" && a.pause())
    } else {
      r.anims.forEach((a) => a.playState !== "finished" && a.play())
      r.arm()
    }
  }, [paused])

  // at the end React draws the end state; the animations are let go, so nothing is left running
  React.useLayoutEffect(() => {
    if (!done || !release || !run.current) return
    run.current.anims.forEach((a) => a.cancel())
    run.current.anims = []
  }, [done, release])

  return active && done
}

export { useLinearRun, motionOn, type LinearRunOptions, type LinearRunTarget }
