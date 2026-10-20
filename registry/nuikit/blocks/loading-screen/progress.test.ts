import { describe, expect, it } from "vitest"

import { loadStateAt, loadTimeline } from "./fixtures"
import { initialLoad, reduceLoad, toLoadMessage } from "./progress"

describe("loading screen progress", () => {
  it("never goes backwards", () => {
    let s = reduceLoad(initialLoad, { eventName: "loadProgress", loadFraction: 0.6 })
    s = reduceLoad(s, { eventName: "loadProgress", loadFraction: 0.4 })
    expect(s.fraction).toBe(0.6)
    s = reduceLoad(s, { eventName: "loadProgress", loadFraction: 7 })
    expect(s.fraction).toBe(1)
    expect(s.phase).toBe("finishing")
  })

  it("names the phase from the init type and counts the items", () => {
    let s = reduceLoad(initialLoad, { eventName: "startInitFunctionOrder", type: "INIT_AFTER_MAP_LOADED", count: 42 })
    s = reduceLoad(s, { eventName: "initFunctionInvoking", type: "INIT_AFTER_MAP_LOADED", name: "CPhoneMgr", idx: 16 })
    expect(s).toMatchObject({ phase: "afterMap", detail: "CPhoneMgr", idx: 17, count: 42 })
  })

  it("shows data files by name, capped at the count", () => {
    let s = reduceLoad(initialLoad, { eventName: "startDataFileEntries", count: 1 })
    s = reduceLoad(s, { eventName: "onDataFileEntry", name: "platform:/data/cdimages/scaleform_frontend.rpf" })
    s = reduceLoad(s, { eventName: "onDataFileEntry", name: "x64/props.rpf" })
    expect(s).toMatchObject({ phase: "map", detail: "props.rpf", idx: 1 })
  })

  it("stays ready once Lua says so", () => {
    let s = reduceLoad(initialLoad, { eventName: "nuikit:ready" })
    s = reduceLoad(s, { eventName: "onLogLine", message: "Awaiting scripts" })
    expect(s).toMatchObject({ phase: "ready", fraction: 1 })
  })

  it("reads the game's objects, SendLoadingScreenMessage strings and devtools messages", () => {
    expect(toLoadMessage({ eventName: "loadProgress", loadFraction: 0.5 })?.eventName).toBe("loadProgress")
    expect(toLoadMessage('{"eventName":"nuikit:ready"}')?.eventName).toBe("nuikit:ready")
    expect(toLoadMessage({ action: "onLogLine", data: { message: "hi" } })).toEqual({ eventName: "onLogLine", message: "hi" })
    expect(toLoadMessage("not json")).toBeNull()
    expect(toLoadMessage({ type: "x" })).toBeNull()
  })

  it("replays a whole load to ready, phase by phase", () => {
    const phases = new Set<string>()
    let s = initialLoad
    for (const e of loadTimeline()) {
      s = reduceLoad(s, e)
      phases.add(s.phase)
    }
    expect([...phases]).toEqual(["core", "beforeMap", "map", "afterMap", "session", "finishing", "ready"])
    expect(loadStateAt("map").phase).toBe("map")
    expect(loadStateAt("connecting")).toBe(initialLoad)
  })
})
