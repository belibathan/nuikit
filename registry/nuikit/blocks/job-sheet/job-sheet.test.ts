import { describe, expect, it } from "vitest"

import { jobSheetFixtures } from "./fixtures"
import { jobSheetEnabled, jobSheetPage } from "./job-sheet"

const pages = jobSheetFixtures.officer.pages

describe("job sheet pages", () => {
  it("opens on the root and finds a sub-page by id", () => {
    expect(jobSheetPage(pages, undefined)?.id).toBe("root")
    expect(jobSheetPage(pages, "armory")?.title).toBe("Armory")
  })

  it("falls back to the root for a page the snapshot no longer has, and to the first page without a root", () => {
    expect(jobSheetPage(pages, "gone")?.id).toBe("root")
    expect(jobSheetPage([pages[1]!], "gone")?.id).toBe("armory")
    expect(jobSheetPage([], "x")).toBeUndefined()
  })

  it("tolerates Lua's {} for an empty list", () => {
    expect(jobSheetPage({} as never, "root")).toBeUndefined()
  })
})

describe("job sheet rows", () => {
  it("greys out on-duty-only rows off duty, and disabled rows always", () => {
    expect(jobSheetEnabled({ onDutyOnly: true }, false)).toBe(false)
    expect(jobSheetEnabled({ onDutyOnly: true }, true)).toBe(true)
    expect(jobSheetEnabled({ disabled: true }, true)).toBe(false)
    expect(jobSheetEnabled({}, false)).toBe(true)
  })
})
