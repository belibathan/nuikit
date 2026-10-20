import { describe, expect, it } from "vitest"

import { countdownState, formatCountdown, spokenCountdown } from "@/components/ui/countdown"

describe("countdown", () => {
  it("formats as mm:ss, h:mm:ss past an hour, rounding up", () => {
    expect(formatCountdown(0)).toBe("00:00")
    expect(formatCountdown(0.2)).toBe("00:01")
    expect(formatCountdown(59.01)).toBe("01:00")
    expect(formatCountdown(65)).toBe("01:05")
    expect(formatCountdown(600)).toBe("10:00")
    expect(formatCountdown(3599)).toBe("59:59")
    expect(formatCountdown(3600)).toBe("1:00:00")
    expect(formatCountdown(3723)).toBe("1:02:03")
    expect(formatCountdown(-5)).toBe("00:00")
    expect(formatCountdown(Number.NaN)).toBe("00:00")
  })

  it("reads out the time left", () => {
    expect(spokenCountdown(65)).toBe("1 minute 5 seconds")
    expect(spokenCountdown(1)).toBe("1 second")
    expect(spokenCountdown(3600)).toBe("1 hour")
    expect(spokenCountdown(0)).toBe("0 seconds")
  })

  it("is done at 0, warning at or below warnAt, running otherwise", () => {
    expect(countdownState(0)).toBe("done")
    expect(countdownState(-1, 10)).toBe("done")
    expect(countdownState(0.3, 10)).toBe("warning")
    expect(countdownState(10, 10)).toBe("warning")
    expect(countdownState(10.5, 10)).toBe("running")
    expect(countdownState(5)).toBe("running")
  })
})
