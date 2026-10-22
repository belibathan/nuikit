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
