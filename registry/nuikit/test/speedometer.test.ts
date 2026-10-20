import { describe, expect, it } from "vitest"

import { gaugeStroke, speedometerDash } from "@/components/ui/speedometer"

describe("speedometer", () => {
  const parts = (s: string) => s.split(" ").map(Number)

  it("draws the rpm arc over 240° of the circle", () => {
    const [full, circumference] = parts(speedometerDash(1, 192))
    expect(full! / circumference!).toBeCloseTo(240 / 360)
    const [half] = parts(speedometerDash(0.5, 192))
    expect(half! / circumference!).toBeCloseTo(120 / 360)
  })

  it("clamps rpm to 0–1 (NaN is 0)", () => {
    expect(parts(speedometerDash(-1))[0]).toBe(0)
    expect(parts(speedometerDash(Number.NaN))[0]).toBe(0)
    expect(speedometerDash(2)).toBe(speedometerDash(1))
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
