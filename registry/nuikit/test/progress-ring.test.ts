import { describe, expect, it } from "vitest"

import { ringHalfKeyframes, ringOffset, ringPercent } from "@/components/ui/progress-ring"

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

  // The timed ring is two rotors on one linear run (design v2 §5A). What it shows at progress p is the
  // right rotor's angle (its arc sweeps 12 → 6 o'clock) plus the left one's (6 → 12): it must be 360·p.
  const angleAt = (frames: Keyframe[], p: number) => {
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1]!
      const b = frames[i]!
      const [o0, o1] = [Number(a.offset), Number(b.offset)]
      if (p <= o1) {
        const deg = (k: Keyframe) => parseFloat(String(k.transform).slice(7))
        return o1 === o0 ? deg(b) : deg(a) + ((deg(b) - deg(a)) * (p - o0)) / (o1 - o0)
      }
    }
    return NaN
  }

  it("draws a timed run exactly: closed at the end, the arc proportional to time all the way", () => {
    const right = ringHalfKeyframes("right")
    const left = ringHalfKeyframes("left")
    for (const p of [0, 0.1, 0.25, 0.49, 0.5, 0.51, 0.8, 1]) expect(angleAt(right, p) + angleAt(left, p)).toBeCloseTo(360 * p, 6)
    expect(angleAt(right, 1)).toBe(180)
    expect(angleAt(left, 1)).toBe(180)
    // transform only: nothing but the compositor works while it runs
    for (const f of [...right, ...left]) expect(Object.keys(f).sort()).toEqual(["offset", "transform"])
  })

})
