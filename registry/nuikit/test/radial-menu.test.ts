import { describe, expect, it } from "vitest"

import { radialCenterAction, radialIndex, radialStep, wedgePath } from "@/components/ui/radial-menu"

describe("radial-menu", () => {
  it("picks the wedge under the pointer, clockwise from 12 o'clock", () => {
    // 4 wedges, radius 100: up, right, down, left
    expect(radialIndex(0, -80, 4, 100)).toBe(0)
    expect(radialIndex(80, 0, 4, 100)).toBe(1)
    expect(radialIndex(0, 80, 4, 100)).toBe(2)
    expect(radialIndex(-80, 0, 4, 100)).toBe(3)
    // just left of 12 o'clock is still the top wedge
    expect(radialIndex(-10, -80, 4, 100)).toBe(0)
  })

  it("has a dead zone in the middle and nothing for no items", () => {
    expect(radialIndex(5, 5, 4, 100)).toBeNull()
    expect(radialIndex(20, 0, 4, 100, 0.25)).toBeNull()
    expect(radialIndex(30, 0, 4, 100, 0.25)).toBe(1)
    expect(radialIndex(0, -80, 0, 100)).toBeNull()
  })

  it("steps over disabled items, wrapping", () => {
    const items = [{}, { disabled: true }, {}, {}]
    expect(radialStep(items, null, 1)).toBe(0)
    expect(radialStep(items, 0, 1)).toBe(2)
    expect(radialStep(items, 3, 1)).toBe(0)
    expect(radialStep(items, 2, -1)).toBe(0)
    expect(radialStep(items, null, -1)).toBe(3)
    expect(radialStep([{ disabled: true }], null, 1)).toBeNull()
    expect(radialStep([], null, 1)).toBeNull()
  })

  it("draws a closed ring wedge", () => {
    const d = wedgePath(50, 50, 20, 50, -Math.PI / 2, 0)
    expect(d.startsWith("M 50.00 0.00 A 50 50 0 0 1 100.00 50.00")).toBe(true)
    expect(d.endsWith("Z")).toBe(true)
  })

  it("makes the centre Back in a submenu and Close at the root when the wheel can close", () => {
    expect(radialCenterAction(1, false)).toBe("back")
    expect(radialCenterAction(2, true)).toBe("back")
    expect(radialCenterAction(0, true)).toBe("close")
    expect(radialCenterAction(0, false)).toBeNull()
  })
})
