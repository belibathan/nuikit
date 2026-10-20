import { describe, expect, it } from "vitest"

import { meterColor, meterLevel, segmentFills, timedStep } from "@/components/ui/meter"

describe("meter", () => {
  it("turns a value into a clamped percentage of max", () => {
    expect(meterLevel(50).percent).toBe(50)
    expect(meterLevel(15, { max: 30 }).percent).toBe(50)
    expect(meterLevel(-4).percent).toBe(0)
    expect(meterLevel(140).percent).toBe(100)
    expect(meterLevel(Number.NaN).percent).toBe(0)
    expect(meterLevel(10, { max: 0 }).percent).toBe(0)
  })

  it("is low at or below `low` and high at or above `high`", () => {
    expect(meterLevel(21, { low: 20 }).level).toBe("normal")
    expect(meterLevel(20, { low: 20 }).level).toBe("low")
    expect(meterLevel(0, { low: 20 }).level).toBe("low")
    expect(meterLevel(89, { high: 90 }).level).toBe("normal")
    expect(meterLevel(27, { max: 30, high: 90 }).level).toBe("high")
    // thresholds are percentages of max, not raw values
    expect(meterLevel(5, { max: 30, low: 20 }).level).toBe("low")
    expect(meterLevel(50).level).toBe("normal")
  })

  it("fills segments in order", () => {
    expect(segmentFills(0, 4)).toEqual([0, 0, 0, 0])
    expect(segmentFills(100, 4)).toEqual([100, 100, 100, 100])
    expect(segmentFills(50, 4)).toEqual([100, 100, 0, 0])
    expect(segmentFills(62.5, 4)).toEqual([100, 100, 50, 0])
    expect(segmentFills(40, 1)).toEqual([40])
    expect(segmentFills(Number.NaN, 2)).toEqual([0, 0])
  })

  it("maps a library's colour to a theme tone, or passes a CSS colour through", () => {
    expect(meterColor("green")).toEqual({ tone: "success" })
    expect(meterColor("red.6")).toEqual({ tone: "destructive" })
    expect(meterColor("Yellow.4")).toEqual({ tone: "warning" })
    expect(meterColor("cyan")).toEqual({ tone: "info" })
    expect(meterColor("grape")).toEqual({ tone: "stress" })
    expect(meterColor("gray")).toEqual({ tone: "foreground" })
    expect(meterColor("success")).toEqual({ tone: "success" })
    expect(meterColor("#4dabf7")).toEqual({ color: "#4dabf7" })
    expect(meterColor("rgb(77, 171, 247)")).toEqual({ color: "rgb(77, 171, 247)" })
    expect(meterColor("chartreuse")).toEqual({})
    expect(meterColor("")).toEqual({})
    expect(meterColor(undefined)).toEqual({})
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

  it("draws a timed run on the true value: full exactly at duration, within a step at half", () => {
    const duration = 5000
    const lead: Step = (e, d) => timedStep(e, d)
    expect(shownAt(duration, duration, lead)).toBe(duration) // 100% at duration
    expect(Math.abs(shownAt(duration / 2, duration, lead) - duration / 2)).toBeLessThanOrEqual(100) // 50% ± one step
    for (const t of [250, 1000, 3333, 4950]) expect(Math.abs(shownAt(t, duration, lead) - t)).toBeLessThanOrEqual(100)
    // The old way (aim at the current value, 100ms transition) trails by about a step at duration.
    const old: Step = (e) => ({ at: e, ms: 100 })
    expect(duration - shownAt(duration, duration, old)).toBeGreaterThan(50)
    // A duration that isn't a whole number of steps still lands on time: the last glide is shorter.
    expect(shownAt(2550, 2550, lead)).toBe(2550)
  })

  it("aims one step ahead, clamped, and draws the true value with motion off", () => {
    expect(timedStep(0, 5000)).toEqual({ at: 100, ms: 100 })
    expect(timedStep(2403, 5000)).toEqual({ at: 2503, ms: 100 })
    expect(timedStep(4950, 5000)).toEqual({ at: 5000, ms: 50 })
    expect(timedStep(5000, 5000)).toEqual({ at: 5000, ms: 0 })
    expect(timedStep(6000, 5000)).toEqual({ at: 5000, ms: 0 })
    expect(timedStep(Number.NaN, 5000)).toEqual({ at: 100, ms: 100 })
    // motion off: no transition, so never ahead of the clock
    expect(timedStep(2403, 5000, false)).toEqual({ at: 2403, ms: 0 })
    const off: Step = (e, d) => timedStep(e, d, false)
    for (const t of [16, 250, 2500, 4999]) expect(shownAt(t, 5000, off)).toBeLessThanOrEqual(t)
    expect(shownAt(5003, 5000, off)).toBe(5000)
  })
})
