import { describe, expect, it } from "vitest"

import {
  groupNotices,
  noticePosition,
  noticeReducer,
  noticeStatus,
  noticeTimeLeft,
  NOTICE_DURATION,
  type NoticeData,
  type NoticeEntry,
} from "@/components/ui/notice"

const show = (state: NoticeEntry[], key: string, at: number, notice: NoticeData, max?: number) =>
  noticeReducer(state, { type: "show", key, at, notice, max })

describe("notice", () => {
  it("maps other libraries' status words to the four statuses", () => {
    expect(noticeStatus("success")).toBe("success")
    expect(noticeStatus("inform")).toBe("info")
    expect(noticeStatus("primary")).toBe("info")
    expect(noticeStatus("WARN")).toBe("warning")
    expect(noticeStatus("error")).toBe("error")
    expect(noticeStatus("danger")).toBe("error")
    expect(noticeStatus("police")).toBe("info")
    expect(noticeStatus(undefined)).toBe("info")
  })

  it("normalizes positions: top and bottom are centred, unknown is top-right", () => {
    expect(noticePosition("bottom-left")).toBe("bottom-left")
    expect(noticePosition("center-right")).toBe("center-right")
    expect(noticePosition("top")).toBe("top-center")
    expect(noticePosition("bottom")).toBe("bottom-center")
    expect(noticePosition("middle")).toBe("top-right")
    expect(noticePosition(undefined)).toBe("top-right")
  })

  it("computes the time left; 0, negative and Infinity stay until dismissed", () => {
    expect(noticeTimeLeft()).toBe(NOTICE_DURATION)
    expect(noticeTimeLeft(3000, 1000)).toBe(2000)
    expect(noticeTimeLeft(3000, 5000)).toBe(0)
    expect(noticeTimeLeft(3000, -50)).toBe(3000)
    expect(noticeTimeLeft(3000, Number.NaN)).toBe(3000)
    expect(noticeTimeLeft(0)).toBe(Infinity)
    expect(noticeTimeLeft(-1)).toBe(Infinity)
    expect(noticeTimeLeft(Infinity)).toBe(Infinity)
    expect(noticeTimeLeft(Number.NaN)).toBe(Infinity)
  })

  it("queues notices, replaces one with the same key in place, and drops empty ones", () => {
    let s: NoticeEntry[] = []
    s = show(s, "n:1", 1, { title: "Paid" })
    s = show(s, "id:fuel", 2, { title: "Low fuel", status: "warning" })
    s = show(s, "n:3", 3, { title: "Stored" })
    s = show(s, "id:fuel", 4, { title: "Fuel critical", status: "error" })
    expect(s.map((n) => n.key)).toEqual(["n:1", "id:fuel", "n:3"])
    expect(s[1]).toMatchObject({ title: "Fuel critical", status: "error", at: 4 })

    const same = show(s, "n:5", 5, {})
    expect(same).toBe(s)
    expect(show(s, "n:6", 6, { description: "Only a description" })).toHaveLength(4)
  })

  it("keeps at most `max` per position, dropping the oldest there", () => {
    let s: NoticeEntry[] = []
    s = show(s, "left", 0, { title: "Elsewhere", position: "bottom-left" })
    for (let i = 1; i <= 7; i++) s = show(s, `n:${i}`, i, { title: `#${i}` })
    expect(s.map((n) => n.key)).toEqual(["left", "n:3", "n:4", "n:5", "n:6", "n:7"])
    expect(show(s, "n:8", 8, { title: "#8", position: "top-right" }, 2).map((n) => n.key)).toEqual(["left", "n:7", "n:8"])
    // An update in place never drops anything.
    expect(show(s, "n:3", 9, { title: "#3 again" }).map((n) => n.key)).toEqual(["left", "n:3", "n:4", "n:5", "n:6", "n:7"])
  })

  it("dismisses one and clears all", () => {
    let s: NoticeEntry[] = []
    s = show(s, "a", 1, { title: "A" })
    s = show(s, "b", 2, { title: "B" })
    expect(noticeReducer(s, { type: "dismiss", key: "a" }).map((n) => n.key)).toEqual(["b"])
    expect(noticeReducer(s, { type: "dismiss", key: "zzz" })).toHaveLength(2)
    expect(noticeReducer(s, { type: "clear" })).toEqual([])
    const empty: NoticeEntry[] = []
    expect(noticeReducer(empty, { type: "clear" })).toBe(empty)
  })

  it("groups by position, newest first in each group", () => {
    const s: NoticeEntry[] = [
      { key: "a", at: 1, title: "A" },
      { key: "b", at: 2, title: "B", position: "bottom-left" },
      { key: "c", at: 3, title: "C", position: "top-right" },
      { key: "d", at: 4, title: "D", position: "bottom-center" },
    ]
    expect(groupNotices(s).map(([p, list]) => [p, list.map((n) => n.key)])).toEqual([
      ["top-right", ["c", "a"]],
      ["bottom-left", ["b"]],
      ["bottom-center", ["d"]],
    ])
  })
})
