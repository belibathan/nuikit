import { describe, expect, it } from "vitest"

import { nkLevel, nkState } from "@/lib/utils"

// Foundation 2: one data-state per interactive component, and the --level contract.
describe("states and level", () => {
  it("picks the most telling state: disabled, confirm, hold, alert, focus, rest", () => {
    expect(nkState({})).toBe("rest")
    expect(nkState({ focus: true })).toBe("focus")
    expect(nkState({ focus: true, alert: true })).toBe("alert")
    expect(nkState({ alert: true, hold: true })).toBe("hold")
    expect(nkState({ hold: true, confirm: true })).toBe("confirm")
    expect(nkState({ confirm: true, disabled: true, focus: true })).toBe("disabled")
  })

  it("sets --level as a 0–1 number, clamped, 0 for no data", () => {
    expect(nkLevel(0.5)).toEqual({ "--level": "0.500" })
    expect(nkLevel(1.4)).toEqual({ "--level": "1.000" })
    expect(nkLevel(-1)).toEqual({ "--level": "0.000" })
    expect(nkLevel(undefined)).toEqual({ "--level": "0.000" })
    expect(nkLevel(Number.NaN)).toEqual({ "--level": "0.000" })
  })
})
