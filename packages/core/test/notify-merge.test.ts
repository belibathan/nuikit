// nuikit's notify renderer folds repeats (systems/nuikit/web/src/renderers/notify-merge.ts): the same
// title/description/status/position again while on screen takes the first one's slot and counts ×N.
import { describe, expect, it } from "vitest";
import { mergeRepeats, mergeState } from "../../../systems/nuikit/web/src/renderers/notify-merge";

const pos = (p?: string) => p ?? "top-right";
const n = (id: string, seq: number, props: Record<string, unknown> = { title: "ID: 1" }) => ({ id, seq, props });

describe("notify repeats", () => {
  it("/id twice: one slot counting 2, the older intent absorbed once", () => {
    const s = mergeState();
    expect(mergeRepeats([n("a", 1)], s, pos)).toEqual([]);
    expect(mergeRepeats([n("a", 1), n("b", 2)], s, pos)).toEqual(["a"]);
    expect(s.slots.get("b")).toEqual({ root: "a", count: 2, seq: 1 });
    // the same render again (StrictMode, a later update): nothing new
    expect(mergeRepeats([n("a", 1), n("b", 2)], s, pos)).toEqual([]);
    // the runtime drops the cancelled one; a third repeat counts 3 in the same slot
    expect(mergeRepeats([n("b", 2), n("c", 3)], s, pos)).toEqual(["b"]);
    expect(s.slots.get("c")).toEqual({ root: "a", count: 3, seq: 1 });
    expect(s.absorbed.has("a")).toBe(false);
  });

  it("different text, status or position, an id or an item: stacked as before", () => {
    const s = mergeState();
    const list = [
      n("a", 1),
      n("b", 2, { title: "ID: 2" }),
      n("c", 3, { title: "ID: 1", status: "error" }),
      n("d", 4, { title: "ID: 1", position: "top-left" }),
      n("e", 5, { title: "ID: 1", id: "mine" }),
      n("f", 6, { title: "ID: 1", item: { name: "Water", count: 1 } }),
    ];
    expect(mergeRepeats(list, s, pos)).toEqual([]);
    expect([...s.slots.values()].every((x) => x.count === 1)).toBe(true);
  });

  it("a repeat after the first has gone starts fresh", () => {
    const s = mergeState();
    mergeRepeats([n("a", 1)], s, pos);
    mergeRepeats([], s, pos);
    expect(mergeRepeats([n("b", 2)], s, pos)).toEqual([]);
    expect(s.slots.get("b")).toEqual({ root: "b", count: 1, seq: 2 });
  });
});
