import { describe, expect, it } from "vitest"

import { gaugeStroke, speedometerDash, speedometerDigits, speedometerLit, SPEEDOMETER_GEOMETRY } from "@/components/ui/speedometer"

describe("speedometer", () => {
  const parts = (s: string) => s.split(" ").map(Number)

  it("draws the rpm arc over the in-game sweep (256°) of the circle", () => {
    const [full, circumference] = parts(speedometerDash(1, 216))
    expect(full! / circumference!).toBeCloseTo(SPEEDOMETER_GEOMETRY.sweep / 360)
    const [half] = parts(speedometerDash(0.5, 216))
    expect(half! / circumference!).toBeCloseTo(SPEEDOMETER_GEOMETRY.sweep / 720)
  })

  it("clamps rpm to 0–1 (NaN is 0)", () => {
    expect(parts(speedometerDash(-1))[0]).toBe(0)
    expect(parts(speedometerDash(Number.NaN))[0]).toBe(0)
    expect(speedometerDash(2)).toBe(speedometerDash(1))
  })

  it("writes the speed as three digits and dims the leading zeros", () => {
    expect(speedometerDigits(64)).toEqual({ digits: "064", lead: 1 })
    expect(speedometerDigits(0)).toEqual({ digits: "000", lead: 2 })
    expect(speedometerDigits(132.4)).toEqual({ digits: "132", lead: 0 })
    expect(speedometerDigits(1500)).toEqual({ digits: "999", lead: 0 })
    expect(speedometerDigits(Number.NaN)).toEqual({ digits: "000", lead: 2 })
  })

  it("lights the segments with the rpm (11 by default)", () => {
    expect(speedometerLit(0)).toBe(0)
    expect(speedometerLit(0.5)).toBe(6)
    expect(speedometerLit(1)).toBe(SPEEDOMETER_GEOMETRY.segments)
  })

  it("reads the track thickness from --nk-gauge-width in the SVG's units", () => {
    expect(gaugeStroke("0.25rem")).toBe(4)
    expect(gaugeStroke(" 0.375rem ")).toBe(6)
    expect(gaugeStroke("5px")).toBe(5)
    expect(gaugeStroke("")).toBe(3)
    expect(gaugeStroke("calc(1px + 1rem)")).toBe(3)
    expect(gaugeStroke("4rem")).toBe(12)
  })
})
