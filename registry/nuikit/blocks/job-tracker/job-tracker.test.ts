import { describe, expect, it } from "vitest"

import { jobDistance, jobProgress, jobStepState, jobSummary } from "./job-tracker"
import type { JobStep } from "./nui"

const boxes: JobStep = { id: "load", label: "Load the boxes", count: 5, unit: "boxes" }
const drive: JobStep = { id: "drive", label: "Deliver" }

describe("job tracker", () => {
  it("marks steps done, current and locked", () => {
    expect([0, 1, 2].map((i) => jobStepState(i, 1))).toEqual(["done", "current", "locked"])
    expect(jobStepState(0, 3)).toBe("done")
  })

  it("draws a count as a meter", () => {
    expect(jobProgress(boxes, 3, undefined)).toEqual({ value: 3, max: 5, text: "3 / 5 boxes" })
    expect(jobProgress(boxes, undefined, undefined)).toEqual({ value: 0, max: 5, text: "0 / 5 boxes" })
    expect(jobProgress(boxes, 9, undefined)?.value).toBe(5)
  })

  it("draws a place as a distance, fuller when closer", () => {
    expect(jobProgress(drive, undefined, 640)).toEqual({ value: 0, max: 100, text: "640 m" })
    expect(jobProgress(drive, undefined, 125)?.value).toBe(50)
    expect(jobProgress(drive, undefined, undefined)).toBeNull()
    expect(jobProgress(undefined, 1, 1)).toBeNull()
  })

  it("formats distance and summary", () => {
    expect(jobDistance(38.4)).toBe("38 m")
    expect(jobDistance(1440)).toBe("1.4 km")
    expect(jobSummary([boxes, drive], 1)).toBe("1 of 2 steps")
    expect(jobSummary([boxes], 5)).toBe("1 of 1 step")
  })
})
