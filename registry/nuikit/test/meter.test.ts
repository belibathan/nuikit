import { describe, expect, it } from "vitest"

import { meterColor, meterLevel, segmentFills, segmentKeyframes } from "@/components/ui/meter"

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

  // A timed run is one linear animation over the whole duration (design v2 §5A): each segment owns its
  // share of the run, so the bar is full exactly at duration and segments hand over with no gap.
  it("splits a timed run across segments, back to back, full at the end", () => {
    expect(segmentKeyframes(0, 1)).toEqual([
      { transform: "scaleX(0)", offset: 0 },
      { transform: "scaleX(0)", offset: 0 },
      { transform: "scaleX(1)", offset: 1 },
      { transform: "scaleX(1)", offset: 1 },
    ])
    const four = [0, 1, 2, 3].map((i) => segmentKeyframes(i, 4))
    expect(four.map((k) => [k[1]!.offset, k[2]!.offset])).toEqual([
      [0, 0.25],
      [0.25, 0.5],
      [0.5, 0.75],
      [0.75, 1],
    ])
    for (const k of four) {
      expect(k.at(-1)).toEqual({ transform: "scaleX(1)", offset: 1 })
      for (const f of k) expect(Object.keys(f).sort()).toEqual(["offset", "transform"]) // transform only
    }
  })

})
