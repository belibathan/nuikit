import { describe, expect, it } from "vitest"

import { countdownLineTone, countdownState, type CountdownLineTone } from "@/components/ui/countdown"

describe("countdown line tone", () => {
  it("is neutral by default and follows warnTone once warnAt is reached", () => {
    expect(countdownLineTone("running")).toBe("neutral")
    expect(countdownLineTone("done")).toBe("neutral")
    expect(countdownLineTone("warning")).toBe("destructive")
    expect(countdownLineTone("warning", "neutral", "warning")).toBe("warning")
  })

  it("takes the caller's lineTone from the start (a last stand drains in destructive)", () => {
    // nuikit_death: 60s of last stand, destructive from the first second
    expect(countdownLineTone(countdownState(60, 10), "destructive")).toBe("destructive")
    expect(countdownLineTone(countdownState(45), "primary")).toBe("primary")
    expect(countdownLineTone("running", "warning")).toBe("warning")
    expect(countdownLineTone("done", "destructive")).toBe("destructive")
  })

  it("lets warnAt work on top of lineTone", () => {
    // a primary heist timer turns warning in its last 10 seconds
    expect(countdownLineTone(countdownState(11, 10), "primary", "warning")).toBe("primary")
    expect(countdownLineTone(countdownState(10, 10), "primary", "warning")).toBe("warning")
    expect(countdownLineTone(countdownState(3, 10), "destructive", "warning")).toBe("warning")
  })

  it("falls back on anything it doesn't know (from Lua)", () => {
    expect(countdownLineTone("running", "toString" as CountdownLineTone)).toBe("neutral")
    expect(countdownLineTone("running", "red" as CountdownLineTone)).toBe("neutral")
    expect(countdownLineTone("warning", "neutral", "toString" as "warning")).toBe("destructive")
  })
})
