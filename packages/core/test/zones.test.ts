import { describe, expect, it } from "vitest";
import { clearOf, type Zones } from "../src/zones";

const screen = { w: 1920, h: 1080 };
const opts = { screen, width: 320, edge: 24, gap: 12 };
// the compact HUD: the map ring and its column top right, the cluster bottom right, vitals bottom left
const hud: Zones = {
  "nuikit_hud:hud": [
    { x: 0.85, y: 0.03, w: 0.12, h: 0.22 }, // ring
    { x: 0.84, y: 0.26, w: 0.14, h: 0.08 }, // location and money under it
    { x: 0.82, y: 0.72, w: 0.15, h: 0.24 }, // cluster
    { x: 0.02, y: 0.9, w: 0.2, h: 0.06 }, // vitals
  ],
};

describe("screen zones: clearOf", () => {
  it("starts a top-right stack under the map and its column", () => {
    expect(clearOf(hud, "top-right", opts)).toEqual({ top: (0.26 + 0.08) * 1080 + 12 });
  });

  it("lifts a bottom-right stack over the cluster, a bottom-left one over the vitals", () => {
    expect(clearOf(hud, "bottom-right", opts)).toEqual({ bottom: 1080 - 0.72 * 1080 + 12 });
    expect(clearOf(hud, "bottom-left", opts).bottom).toBeCloseTo(1080 - 0.9 * 1080 + 12, 6);
  });

  it("leaves a stack alone when nothing is in its column (top left, the centre, no zones)", () => {
    expect(clearOf(hud, "top-left", opts)).toEqual({});
    expect(clearOf(hud, "center-right", opts)).toEqual({});
    expect(clearOf({}, "top-right", opts)).toEqual({});
  });

  it("ignores the other half of the screen and the zones it is told to (its own)", () => {
    // the cluster is bottom right: it never pushes a top-right stack
    expect(clearOf({ c: [{ x: 0.82, y: 0.72, w: 0.15, h: 0.24 }] }, "top-right", opts)).toEqual({});
    expect(clearOf(hud, "top-right", { ...opts, ignore: ["nuikit_hud"] })).toEqual({});
  });
});

import { stackOffsets, toZoneId, zoneOf, zonePlacement, zoneRect, ZONE_IDS } from "../src/zones";

describe("layout zones: placement is deterministic", () => {
  it("every id flows towards the centre and aligns to its own side", () => {
    expect(zonePlacement("tr")).toEqual({ x: "end", y: "start", flow: "column", align: "flex-end", edge: false });
    expect(zonePlacement("bl")).toEqual({ x: "start", y: "end", flow: "column-reverse", align: "flex-start", edge: false });
    expect(zonePlacement("mc")).toMatchObject({ x: "center", y: "center", align: "center" });
    expect(zonePlacement("r")).toMatchObject({ edge: true, flow: "row-reverse", y: "stretch" });
    for (const id of ZONE_IDS) expect(zonePlacement(id)).toEqual(zonePlacement(id));
  });

  it("position words map to ids (ours, ox, qb), unknown falls back", () => {
    expect(toZoneId("top-right")).toBe("tr");
    expect(toZoneId("right-center")).toBe("mr");
    expect(toZoneId("right")).toBe("mr");
    expect(toZoneId("bc")).toBe("bc");
    expect(toZoneId("nonsense", "bl")).toBe("bl");
  });

  it("the nine zones tile the safe box in thirds, inset; an ultrawide keeps them on the 16:9 box", () => {
    const f = { screen: { w: 1920, h: 1080 }, inset: 24 };
    expect(zoneRect("tl", f)).toEqual({ x: 24, y: 24, w: (1920 - 48) / 3, h: (1080 - 48) / 3 });
    const br = zoneRect("br", f);
    expect(br.x + br.w).toBeCloseTo(1920 - 24, 6);
    expect(br.y + br.h).toBeCloseTo(1080 - 24, 6);
    // 3440×1440: the box is 2560 wide, 440px in from each side
    const uw = { screen: { w: 3440, h: 1440 }, area: { l: 440, r: 440, t: 0, b: 0 }, inset: 32 };
    expect(zoneRect("tl", uw).x).toBe(472);
    const r = zoneRect("tr", uw);
    expect(r.x + r.w).toBeCloseTo(3440 - 472, 6);
    // edges are flush to the box
    expect(zoneRect("l", uw).x).toBe(440);
  });

  it("zones never overlap each other", () => {
    const f = { screen: { w: 2560, h: 1440 }, safe: { x: 10, y: 10 }, inset: 32 };
    const nine = (["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"] as const).map((id) => zoneRect(id, f));
    for (let i = 0; i < nine.length; i++)
      for (let j = i + 1; j < nine.length; j++) {
        const a = nine[i]!, b = nine[j]!;
        const overlap = a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;
        expect(overlap, `${i} × ${j}`).toBe(false);
      }
  });

  it("a rectangle belongs to the third its centre is in", () => {
    expect(zoneOf({ x: 0.85, y: 0.03, w: 0.12, h: 0.22 })).toBe("tr");
    expect(zoneOf({ x: 0.02, y: 0.9, w: 0.2, h: 0.06 })).toBe("bl");
    expect(zoneOf({ x: 0.45, y: 0.45, w: 0.1, h: 0.1 })).toBe("mc");
  });

  it("stacked items in one zone start after each other: no overlap", () => {
    const o = stackOffsets([40, 60, 20], 100, 12);
    expect(o).toEqual([100, 152, 224]);
    for (let i = 1; i < o.length; i++) expect(o[i]!).toBeGreaterThanOrEqual(o[i - 1]! + [40, 60, 20][i - 1]!);
  });
});

describe("clearOf: generalised", () => {
  it("takes zone ids as well as words", () => {
    expect(clearOf(hud, "tr", opts)).toEqual(clearOf(hud, "top-right", opts));
  });

  it("pushes a middle-right stack inwards past what sits on the right edge in its band", () => {
    const phone = { phone: [{ x: 0.8, y: 0.3, w: 0.18, h: 0.5 }] };
    expect(clearOf(phone, "center-right", opts).right).toBeCloseTo(1920 - 0.8 * 1920 + 12, 6);
    expect(clearOf(phone, "center-left", opts)).toEqual({});
  });

  it("on an ultrawide the column follows the 16:9 box", () => {
    const uw = { screen: { w: 3440, h: 1440 }, width: 320, edge: 24, gap: 12, area: { l: 440, r: 440 } };
    // a map at the box's right edge, not the screen's
    const map = { m: [{ x: (3440 - 440 - 24 - 300) / 3440, y: 0.02, w: 300 / 3440, h: 0.2 }] };
    expect(clearOf(map, "top-right", uw).top).toBeCloseTo(0.22 * 1440 + 12, 6);
    // without the area the stack's column is at the screen edge and misses it
    expect(clearOf(map, "top-right", { ...uw, area: undefined })).toEqual({});
  });
});
