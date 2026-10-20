import { describe, expect, it } from "vitest"

import { ringOffset, ringPercent } from "@/components/ui/progress-ring"

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
})
