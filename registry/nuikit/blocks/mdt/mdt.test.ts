import { describe, expect, it } from "vitest"

import { mdtQueryError, mdtReportError, mdtWhen } from "./mdt"
import { mdtFixtures } from "./fixtures"

const { limits } = mdtFixtures.police

describe("mdt input checks", () => {
  it("says what's wrong with a search before asking", () => {
    expect(mdtQueryError("", limits)).toBe("Type at least 2 characters.")
    expect(mdtQueryError(" a ", limits)).toBe("Type at least 2 characters.")
    expect(mdtQueryError("vale", limits)).toBeNull()
    expect(mdtQueryError("x".repeat(33), limits)).toBe("Keep it under 32 characters.")
  })

  it("says what's wrong with a report before asking", () => {
    const ok = { title: "Traffic stop", person: null, text: "Stopped a speeding car on Route 1." }
    expect(mdtReportError(ok, limits)).toBeNull()
    expect(mdtReportError({ ...ok, title: "ab" }, limits)).toBe("Give the report a title of at least 3 characters.")
    expect(mdtReportError({ ...ok, title: "x".repeat(61) }, limits)).toBe("Keep the title under 60 characters.")
    expect(mdtReportError({ ...ok, text: "short" }, limits)).toBe("Write at least 10 characters.")
    expect(mdtReportError({ ...ok, text: "x".repeat(1001) }, limits)).toBe("Keep the report under 1000 characters.")
  })

  it("formats the server's time", () => {
    expect(mdtWhen(0)).toBe("1970-01-01 00:00")
    expect(mdtWhen(Date.UTC(2026, 9, 22, 12, 45) / 1000)).toBe("2026-10-22 12:45")
  })
})
