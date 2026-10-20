import { describe, expect, it } from "vitest"

import { SKILL_CHECK_PRESETS, skillCheckAngle, skillCheckHit, skillCheckTurnMs, skillCheckZone } from "@/components/ui/skill-check"

describe("skill-check", () => {
  it("turns once in 2000ms / speed", () => {
    expect(skillCheckTurnMs()).toBe(2000)
    expect(skillCheckTurnMs(2)).toBe(1000)
    expect(skillCheckTurnMs(0)).toBe(2000)
    expect(skillCheckTurnMs(-1)).toBe(2000)
    expect(skillCheckAngle(500, 2000)).toBe(90)
    expect(skillCheckAngle(1000, 1000)).toBe(360)
    expect(skillCheckAngle(-5, 2000)).toBe(0)
  })

  it("hits inside the zone, edges included", () => {
    expect(skillCheckHit(150, 140, 40)).toBe(true)
    expect(skillCheckHit(140, 140, 40)).toBe(true)
    expect(skillCheckHit(180, 140, 40)).toBe(true)
    expect(skillCheckHit(181, 140, 40)).toBe(false)
    expect(skillCheckHit(139.9, 140, 40)).toBe(false)
  })

  it("handles zones that wrap past 360", () => {
    expect(skillCheckHit(350, 340, 40)).toBe(true)
    expect(skillCheckHit(10, 340, 40)).toBe(true)
    expect(skillCheckHit(21, 340, 40)).toBe(false)
    expect(skillCheckHit(330, 340, 40)).toBe(false)
  })

  it("misses on nonsense", () => {
    expect(skillCheckHit(Number.NaN, 140, 40)).toBe(false)
    expect(skillCheckHit(150, 140, 0)).toBe(false)
  })

  it("places zones between 120° and 360° − size", () => {
    expect(skillCheckZone(40, { random: () => 0 })).toEqual({ start: 120, size: 40 })
    expect(skillCheckZone(40, { random: () => 0.999 }).start).toBe(319)
    expect(skillCheckZone(25, { random: () => 0.5 })).toEqual({ start: 227, size: 25 })
    for (let i = 0; i < 50; i++) {
      const z = skillCheckZone(50)
      expect(z.start).toBeGreaterThanOrEqual(120)
      expect(z.start + z.size).toBeLessThanOrEqual(360)
    }
  })

  it("has the usual presets, harder = smaller and faster", () => {
    expect(SKILL_CHECK_PRESETS.easy.zoneSize).toBeGreaterThan(SKILL_CHECK_PRESETS.hard.zoneSize)
    expect(SKILL_CHECK_PRESETS.hard.speed).toBeGreaterThan(SKILL_CHECK_PRESETS.easy.speed)
  })
})
