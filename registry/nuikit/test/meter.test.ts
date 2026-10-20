import { describe, expect, it } from "vitest"

import { meterColor, meterLevel, segmentFills } from "@/components/ui/meter"

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
})
