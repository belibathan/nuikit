import { describe, expect, it } from "vitest"

import { ringOffset, ringPercent, ringStep } from "@/components/ui/progress-ring"

describe("progress-ring", () => {
  it("turns a value into a clamped percentage of max", () => {
    expect(ringPercent(62)).toBe(62)
    expect(ringPercent(2500, 5000)).toBe(50)
    expect(ringPercent(-1)).toBe(0)
    expect(ringPercent(140)).toBe(100)
    expect(ringPercent(Number.NaN)).toBe(0)
    expect(ringPercent(5, 0)).toBe(0)
  })

  it("draws the right share of the circle", () => {
    expect(ringOffset(0, 100)).toBe(100)
    expect(ringOffset(25, 100)).toBe(75)
    expect(ringOffset(100, 100)).toBe(0)
    expect(ringOffset(150, 100)).toBe(0)
  })

  // What a linear CSS transition shows at time t when, at each tick, the hook sets the target and
  // transition length that `step` gives. Ticks: a first frame at 16ms, then every 100ms, 3ms late.
  type Step = (elapsed: number, duration: number) => { at: number; ms: number }
  function shownAt(t: number, duration: number, step: Step) {
    const ticks = [16, ...Array.from({ length: Math.ceil(duration / 100) + 1 }, (_, i) => (i + 1) * 100 + 3)]
    let from = 0
    let to = 0
    let start = 0
    let ms = 0
    const at = (now: number) => (ms > 0 ? from + (to - from) * Math.min(1, (now - start) / ms) : to)
    for (const tick of ticks) {
      if (tick > t) break
      const s = step(Math.min(duration, tick), duration)
      from = at(tick)
      to = s.at
      start = tick
      ms = s.ms
    }
    return at(t)
  }

  it("draws a timed run on the true value: closed exactly at duration, within a step at half", () => {
    const duration = 4000
    const lead: Step = (e, d) => ringStep(e, d)
    expect(ringPercent(shownAt(duration, duration, lead), duration)).toBe(100)
    expect(Math.abs(ringPercent(shownAt(duration / 2, duration, lead), duration) - 50)).toBeLessThanOrEqual((100 / duration) * 100)
    // The old way (aim at the current value, 100ms transition) is a step short at duration.
    const old: Step = (e) => ({ at: e, ms: 100 })
    expect(ringPercent(shownAt(duration, duration, old), duration)).toBeLessThan(99)
    expect(shownAt(2550, 2550, lead)).toBe(2550)
  })

  it("aims one step ahead, clamped, and draws the true value with motion off", () => {
    expect(ringStep(0, 4000)).toEqual({ at: 100, ms: 100 })
    expect(ringStep(3950, 4000)).toEqual({ at: 4000, ms: 50 })
    expect(ringStep(4000, 4000)).toEqual({ at: 4000, ms: 0 })
    expect(ringStep(1203, 4000, false)).toEqual({ at: 1203, ms: 0 })
    const off: Step = (e, d) => ringStep(e, d, false)
    for (const t of [16, 250, 2000, 3999]) expect(shownAt(t, 4000, off)).toBeLessThanOrEqual(t)
    expect(shownAt(4003, 4000, off)).toBe(4000)
  })
})
