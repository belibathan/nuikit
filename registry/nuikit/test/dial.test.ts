import { describe, expect, it } from "vitest"

import { dialDash, dialGeometry, dialSegments, gaugeStroke } from "@/components/ui/dial"
import { speedometerDash } from "@/components/ui/speedometer"
import { countdownLineTone } from "@/components/ui/countdown"
import { noticeStatus } from "@/components/ui/notice"

describe("dial", () => {
  const parts = (s: string) => s.split(" ").map(Number)

  it("sweeps 256° (the in-game speedometer's) and clamps the level", () => {
    const { arc, circumference } = dialGeometry(192)
    expect(arc / circumference).toBeCloseTo(256 / 360)
    expect(parts(dialDash(0.5, 192))[0]).toBeCloseTo(arc / 2)
    expect(dialDash(2)).toBe(dialDash(1))
    expect(parts(dialDash(Number.NaN))[0]).toBe(0)
  })

  it("is the speedometer's geometry (a live HUD writes the same dash)", () => {
    for (const v of [0, 0.3, 0.88, 1]) expect(speedometerDash(v, 192)).toBe(dialDash(v, 192, 256))
  })

  it("lights a segment once the level reaches it", () => {
    expect(dialSegments(0, 10)).toBe(0)
    expect(dialSegments(0.01, 10)).toBe(1)
    expect(dialSegments(0.5, 10)).toBe(5)
    expect(dialSegments(1, 10)).toBe(10)
    expect(dialSegments(1.5, 4)).toBe(4)
  })

  it("reads --nk-gauge-width in rem or px", () => {
    expect(gaugeStroke("0.25rem")).toBe(4)
    expect(gaugeStroke("6px")).toBe(6)
    expect(gaugeStroke("")).toBe(3)
  })
})

describe("the shared tone vocabulary (1.5)", () => {
  it("danger is destructive on a countdown line", () => {
    expect(countdownLineTone("running", "danger")).toBe("destructive")
    expect(countdownLineTone("warning", "neutral", "danger")).toBe("destructive")
  })

  it("a notice tone maps onto its status (danger = error, neutral = info)", () => {
    expect(noticeStatus("danger")).toBe("error")
    expect(noticeStatus("neutral")).toBe("info")
    expect(noticeStatus("success")).toBe("success")
  })
})
