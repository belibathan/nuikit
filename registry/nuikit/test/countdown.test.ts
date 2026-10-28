import { describe, expect, it } from "vitest"

import { countdownDrain, countdownState, countdownVariants, formatCountdown, spokenCountdown } from "@/components/ui/countdown"
import { cn } from "@/lib/utils"

describe("countdown", () => {
  it("is the figure text style at every size, never a fixed text-* class, after tailwind-merge", () => {
    for (const size of ["sm", "default", "hero"] as const) {
      // the component merges exactly like this: cn(countdownVariants({ size }), …)
      const classes = cn(countdownVariants({ size }), "text-destructive opacity-40").split(" ")
      // the figure style carries the face, weight, tabular figures and leading 1; a size re-points --nk-text-figure
      expect(classes, size).toContain("nk-text-figure")
      expect(classes.filter((c) => c.startsWith("text-[") || c === "text-xl" || c.startsWith("leading-")), size).toHaveLength(0)
    }
  })

  it("glides the line one second at a time from Lua's value, or all the way on its own run", () => {
    expect(countdownDrain(30, 60)).toEqual({ from: 0.5, to: 29 / 60, ms: 1000 })
    expect(countdownDrain(0.5, 60)).toEqual({ from: 0.5 / 60, to: 0, ms: 500 })
    expect(countdownDrain(0, 60)).toEqual({ from: 0, to: 0, ms: 0 })
    expect(countdownDrain(90, 60).from).toBe(1)
    expect(countdownDrain(10, 0)).toEqual({ from: 0, to: 0, ms: 0 })
    expect(countdownDrain(90, 90, true)).toEqual({ from: 1, to: 0, ms: 90000 })
  })

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
