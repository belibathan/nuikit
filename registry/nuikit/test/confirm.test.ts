import { describe, expect, it } from "vitest"

import { wrapFocus } from "@/components/ui/confirm"

describe("confirm", () => {
  it("keeps Tab inside the dialog, wrapping at both ends", () => {
    expect(wrapFocus(0, 2, false)).toBe(1)
    expect(wrapFocus(1, 2, false)).toBe(0)
    expect(wrapFocus(0, 2, true)).toBe(1)
    expect(wrapFocus(1, 3, true)).toBe(0)
  })

  it("enters from outside at the first (Tab) or last (Shift+Tab) button", () => {
    expect(wrapFocus(-1, 2, false)).toBe(0)
    expect(wrapFocus(-1, 2, true)).toBe(1)
  })

  it("has nowhere to go with nothing focusable", () => {
    expect(wrapFocus(0, 0, false)).toBe(-1)
  })
})
