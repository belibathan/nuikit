import { describe, expect, it } from "vitest"

import { durabilityLevel, itemSlotState } from "@/components/ui/item-slot"

describe("item-slot", () => {
  it("shows one state: drop target and dragging first, then locked, empty, active", () => {
    expect(itemSlotState({ filled: false })).toBe("empty")
    expect(itemSlotState({ filled: true })).toBe("filled")
    expect(itemSlotState({ filled: true, active: true })).toBe("active")
    expect(itemSlotState({ filled: true, locked: true, active: true })).toBe("locked")
    expect(itemSlotState({ filled: false, dropTarget: true })).toBe("drop-target")
    expect(itemSlotState({ filled: true, dragging: true, locked: true })).toBe("dragging")
    expect(itemSlotState({ filled: true, dragging: true, dropTarget: true })).toBe("drop-target")
  })

  it("clamps durability and calls under 20 low", () => {
    expect(durabilityLevel(42)).toEqual({ value: 42, low: false })
    expect(durabilityLevel(19.9)).toEqual({ value: 19.9, low: true })
    expect(durabilityLevel(20)).toEqual({ value: 20, low: false })
    expect(durabilityLevel(-5)).toEqual({ value: 0, low: true })
    expect(durabilityLevel(150)).toEqual({ value: 100, low: false })
    expect(durabilityLevel(Number.NaN)).toEqual({ value: 0, low: true })
  })
})
