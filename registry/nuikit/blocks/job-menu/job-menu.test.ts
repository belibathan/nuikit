import { describe, expect, it } from "vitest"

import { jobNextGrade } from "./job-menu"
import type { JobGrade } from "./nui"

const grades: JobGrade[] = [
  { grade: 2, label: "Sergeant" },
  { grade: 0, label: "Cadet" },
  { grade: 4, label: "Chief", boss: true },
  { grade: 1, label: "Officer" },
]

describe("job grades", () => {
  it("steps to the next grade up or down, in order whatever order Lua sent", () => {
    expect(jobNextGrade(grades, 1, 1)).toBe(2)
    expect(jobNextGrade(grades, 1, -1)).toBe(0)
  })

  it("stops below the boss grade and at the bottom", () => {
    expect(jobNextGrade(grades, 2, 1)).toBeNull()
    expect(jobNextGrade(grades, 0, -1)).toBeNull()
  })

  it("never moves the boss or an unknown grade", () => {
    expect(jobNextGrade(grades, 4, -1)).toBeNull()
    expect(jobNextGrade(grades, 7, 1)).toBeNull()
  })
})
