import { describe, expect, it } from "vitest"

import { collapseExpire, collapseInit, collapseOrder, collapseReport, type CollapseOptions } from "@/hooks/use-collapse"

const opts: CollapseOptions = { restDelay: 2000, batchMs: 400 }
const run = (steps: [string, number, number, boolean?][], o: CollapseOptions = opts) =>
  steps.reduce((s, [key, value, at, critical]) => collapseReport(s, key, value, at, o, critical), collapseInit())

describe("collapse engine", () => {
  it("records the first value without opening; a change opens", () => {
    let s = run([["hunger", 50, 0]])
    expect(s.open).toEqual([])
    s = collapseReport(s, "hunger", 75, 100, opts)
    expect(s.open.map((e) => [e.key, e.delta])).toEqual([["hunger", 25]])
  })

  it("an unchanged value doesn't open; a small change doesn't when `min` says so, unless critical", () => {
    expect(run([["armor", 40, 0], ["armor", 40, 50]]).open).toEqual([])
    const o = { ...opts, min: 3 }
    expect(run([["thirst", 60, 0], ["thirst", 59, 50]], o).open).toEqual([])
    expect(run([["thirst", 20, 0], ["thirst", 19, 50, true]], o).open.map((e) => e.key)).toEqual(["thirst"])
  })

  it("crossing into critical opens even without a change", () => {
    expect(run([["health", 18, 0], ["health", 18, 10, true]]).open.map((e) => e.key)).toEqual(["health"])
  })

  it("changes within the batch window join one stack and close together", () => {
    const s = run([
      ["hunger", 50, 0],
      ["thirst", 50, 0],
      ["hunger", 70, 1000],
      ["thirst", 80, 1300],
    ])
    expect(new Set(s.open.map((e) => e.batch)).size).toBe(1)
    expect(s.open.every((e) => e.until === 1300 + opts.restDelay)).toBe(true)
  })

  it("a change after the window starts a new batch, which closes on its own", () => {
    const s = run([
      ["hunger", 50, 0],
      ["thirst", 50, 0],
      ["hunger", 70, 1000],
      ["thirst", 80, 1500],
    ])
    expect(s.open.find((e) => e.key === "hunger")!.until).toBe(3000)
    expect(s.open.find((e) => e.key === "thirst")!.until).toBe(3500)
    expect(collapseExpire(s, 3000).open.map((e) => e.key)).toEqual(["thirst"])
    expect(collapseExpire(s, 3500).open).toEqual([])
  })

  it("changes to an open key add up", () => {
    const s = run([["hunger", 40, 0], ["hunger", 50, 100], ["hunger", 65, 200]])
    expect(s.open[0]!.delta).toBe(25)
  })

  it("orders critical first, then the biggest change; at most max, the rest +N", () => {
    const s = run([
      ["hunger", 50, 0],
      ["thirst", 50, 0],
      ["armor", 50, 0],
      ["health", 50, 0],
      ["hunger", 55, 100],
      ["thirst", 90, 100],
      ["armor", 30, 100],
      ["health", 15, 100, true],
    ])
    const { shown, overflow } = collapseOrder(s.open, 3)
    expect(shown.map((e) => e.key)).toEqual(["health", "thirst", "armor"])
    expect(overflow).toBe(1)
    expect(collapseOrder(s.open, 0)).toMatchObject({ shown: [], overflow: 4 })
  })

  it("an opted-out key never opens", () => {
    expect(run([["voice", 0, 0], ["voice", 1, 50]], { ...opts, optOut: ["voice"] }).open).toEqual([])
  })
})
