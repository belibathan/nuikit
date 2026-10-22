import { describe, expect, it } from "vitest"

import {
  groupNotices,
  noticePosition,
  noticeReducer,
  noticeShown,
  noticeStatus,
  noticeTimeLeft,
  NOTICE_DURATION,
  NOTICE_ITEM_MERGE_MS,
  formatItemDelta,
  noticeItemKey,
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

describe("notice items", () => {
  it("shows an item change with no title", () => {
    const s = show([], "a", 0, { item: { name: "Water bottle", count: 2 } })
    expect(s).toHaveLength(1)
    expect(s[0]!.item!.count).toBe(2)
  })

  it("merges the same item, same direction, within 1.5 s; the time restarts", () => {
    let s = show([], "a", 0, { item: { name: "Water bottle", count: 1 } })
    s = show(s, "b", 600, { item: { name: "Water bottle", count: 1 } })
    s = show(s, "c", 600 + NOTICE_ITEM_MERGE_MS, { item: { name: "Water bottle", count: 3 } })
    expect(s).toHaveLength(1)
    expect(s[0]).toMatchObject({ key: "a", at: 600 + NOTICE_ITEM_MERGE_MS, merged: 2 })
    expect(s[0]!.item!.count).toBe(5)
  })

  it("keeps changes apart when late, opposite, another item, elsewhere or with an id", () => {
    let s = show([], "a", 0, { item: { name: "Lockpick", count: 1 } })
    s = show(s, "b", NOTICE_ITEM_MERGE_MS + 1, { item: { name: "Lockpick", count: 1 } })
    s = show(s, "c", NOTICE_ITEM_MERGE_MS + 2, { item: { name: "Lockpick", count: -1 } })
    s = show(s, "d", NOTICE_ITEM_MERGE_MS + 3, { item: { name: "Bandage", count: 1 } })
    s = show(s, "e", NOTICE_ITEM_MERGE_MS + 4, { item: { name: "Lockpick", count: 1 }, position: "top-left" })
    s = show(s, "f", NOTICE_ITEM_MERGE_MS + 5, { id: 7, item: { name: "Lockpick", count: 1 } }, 9)
    expect(s.map((n) => n.key)).toEqual(["a", "b", "c", "d", "e", "f"])
  })

  it("merges by item id when the name isn't text", () => {
    const name = { label: "Water" } as unknown as string
    let s = show([], "a", 0, { item: { id: "water", name, count: 1 } })
    s = show(s, "b", 10, { item: { id: "water", name, count: 1 } })
    expect(s).toHaveLength(1)
    expect(noticeItemKey(s[0]!.item)).toBe("id:water")
  })

  it("writes the change with a true minus", () => {
    expect(formatItemDelta(2)).toBe("+2")
    expect(formatItemDelta(-1)).toBe("−1")
    expect(formatItemDelta(1200)).toBe("+1,200")
    expect(formatItemDelta(0)).toBe("0")
  })
})

// The queue policy (wave 3): one at a time or stacked, a capped queue, a shorter dwell while others wait.
describe("notice queue policy", () => {
  const queued = (keys: string[], max: number, queue: number, position?: NoticeData["position"]) =>
    keys.reduce<NoticeEntry[]>((s, k, i) => noticeReducer(s, { type: "show", key: k, at: i, notice: { title: k, position }, max, queue }), [])

  it("one at a time: the first shows, the rest wait, and they hurry it", () => {
    const all = queued(["a", "b", "c"], 1, 5)
    expect(all.map((n) => n.key)).toEqual(["a", "b", "c"])
    const shown = noticeShown(all, 1, 0.5)
    expect(shown.map((n) => [n.key, n.dwell])).toEqual([["a", 0.5]])
  })

  it("the next waiting one shows when the shown one goes, at full time when nobody else waits", () => {
    const all = noticeReducer(queued(["a", "b"], 1, 5), { type: "dismiss", key: "a" })
    expect(noticeShown(all, 1, 0.5).map((n) => [n.key, n.dwell])).toEqual([["b", undefined]])
  })

  it("past the queue, the oldest waiting goes; the shown one stays", () => {
    const all = queued(["a", "b", "c", "d"], 1, 2)
    expect(all.map((n) => n.key)).toEqual(["a", "c", "d"])
  })

  it("stacked with no queue: as before, the oldest shown goes and nothing waits", () => {
    const all = queued(["a", "b", "c", "d"], 3, 0)
    expect(all.map((n) => n.key)).toEqual(["b", "c", "d"])
    expect(noticeShown(all, 3, 0.5).every((n) => n.dwell === undefined)).toBe(true)
  })

  it("each position queues on its own", () => {
    const left = queued(["l1", "l2"], 1, 5, "top-left")
    const all = noticeReducer(left, { type: "show", key: "r1", at: 9, notice: { title: "r1", position: "top-right" }, max: 1, queue: 5 })
    expect(noticeShown(all, 1, 0.5).map((n) => [n.key, n.dwell])).toEqual([["l1", 0.5], ["r1", undefined]])
  })
})
