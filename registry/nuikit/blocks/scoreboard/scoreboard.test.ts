import { describe, expect, it } from "vitest"

import { scoreboardFixtures } from "./fixtures"
import { filterPlayers, pingLevel } from "./scoreboard"

describe("scoreboard", () => {
  it("grades ping: under 100 good, under 200 fair, then poor", () => {
    expect(pingLevel(undefined)).toBe("good")
    expect(pingLevel(99)).toBe("good")
    expect(pingLevel(100)).toBe("fair")
    expect(pingLevel(199)).toBe("fair")
    expect(pingLevel(200)).toBe("poor")
    expect(pingLevel(Number.NaN)).toBe("good")
  })

  const players = scoreboardFixtures.full.players

  it("sorts by server ID and keeps everyone without a search", () => {
    const ids = filterPlayers([...players].reverse(), "  ").map((p) => p.id)
    expect(ids).toEqual([...ids].sort((a, b) => a - b))
    expect(ids).toHaveLength(players.length)
  })

  it("finds players by name, exact server ID or job, ignoring case", () => {
    expect(filterPlayers(players, "riley").map((p) => p.name)).toEqual(["Riley Chen"])
    expect(filterPlayers(players, "12").map((p) => p.id)).toEqual([12])
    expect(filterPlayers(players, "lspd").every((p) => p.job === "LSPD")).toBe(true)
    expect(filterPlayers(players, "lspd")).toHaveLength(3)
    expect(filterPlayers(players, "nobody")).toEqual([])
  })
})
