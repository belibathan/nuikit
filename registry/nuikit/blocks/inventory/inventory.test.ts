import { describe, expect, it } from "vitest"

import { containerWeight, dragCount, formatWeight } from "./inventory"

describe("inventory", () => {
  it("drags all, half with Shift, one with Ctrl", () => {
    expect(dragCount(10)).toBe(10)
    expect(dragCount(10, { shift: true })).toBe(5)
    expect(dragCount(7, { shift: true })).toBe(3)
    expect(dragCount(10, { ctrl: true })).toBe(1)
    expect(dragCount(10, { ctrl: true, shift: true })).toBe(1)
    expect(dragCount(1, { shift: true })).toBe(1)
  })

  it("weighs a container, items without a weight counting nothing", () => {
    expect(
      containerWeight({
        id: "p",
        label: "P",
        slots: 5,
        items: [
          { slot: 1, name: "water", label: "Water", count: 4, weight: 500 },
          { slot: 2, name: "cash", label: "Cash", count: 900 },
        ],
      })
    ).toBe(2000)
  })

  it("writes weights the way people say them", () => {
    expect(formatWeight(350)).toBe("350 g")
    expect(formatWeight(1500)).toBe("1.5 kg")
    expect(formatWeight(30000)).toBe("30 kg")
    expect(formatWeight(Number.NaN)).toBe("0 g")
  })
})
