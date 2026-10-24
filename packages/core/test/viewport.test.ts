import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { aspectOf, parseViewport, viewportOf, VIEWPORT_SAMPLES, VIEWPORTS } from "../src/viewport";

describe("viewport table", () => {
  it("covers every aspect a player runs, in order, each with a floor and a sample of its own class", () => {
    expect(VIEWPORTS.map((v) => v.id)).toEqual(["4-3", "16-10", "16-9", "21-9", "32-9"]);
    for (let i = 1; i < VIEWPORTS.length; i++) expect(VIEWPORTS[i]!.min[0] / VIEWPORTS[i]!.min[1]).toBeGreaterThan(VIEWPORTS[i - 1]!.min[0] / VIEWPORTS[i - 1]!.min[1]);
    for (const v of VIEWPORTS) {
      expect(v.scaleMin).toBeGreaterThan(0.5);
      expect(aspectOf(...v.sample).id, v.id).toBe(v.id);
    }
  });

  it("classifies the real sizes", () => {
    expect(aspectOf(1280, 720).id).toBe("16-9");
    expect(aspectOf(1920, 1080).id).toBe("16-9");
    expect(aspectOf(2560, 1440).id).toBe("16-9");
    expect(aspectOf(1920, 1200).id).toBe("16-10");
    expect(aspectOf(2560, 1080).id).toBe("21-9");
    expect(aspectOf(3440, 1440).id).toBe("21-9");
    expect(aspectOf(5120, 1440).id).toBe("32-9");
    expect(aspectOf(1024, 768).id).toBe("4-3");
    for (const s of VIEWPORT_SAMPLES) expect(VIEWPORTS.map((v) => v.id)).toContain(aspectOf(...s).id);
  });

  it("rem: 16px at 1080p, 21.3 at 1440p, the width decides under 16:9, the floor holds at 720p and 4:3", () => {
    expect(viewportOf(1920, 1080).rem).toBeCloseTo(16, 6);
    expect(viewportOf(2560, 1440).rem).toBeCloseTo(21.333, 2);
    expect(viewportOf(3440, 1440).rem).toBeCloseTo(21.333, 2); // the height decides on an ultrawide
    expect(viewportOf(1280, 720).rem).toBe(12); // 10.67 natural, floored at 16 × 0.75
    expect(viewportOf(1280, 720).floored).toBe(true);
    expect(viewportOf(1024, 768).rem).toBe(12); // the width decides (8.5), floored
    expect(viewportOf(1920, 1080, { scale: 1.25 }).rem).toBe(20);
    expect(viewportOf(7680, 4320).rem).toBe(32); // the ceiling
  });

  it("the content box: 16:9 centred on an ultrawide, the whole screen otherwise, full width when it bleeds", () => {
    expect(viewportOf(3440, 1440).box).toEqual({ x: 440, y: 0, w: 2560, h: 1440 });
    expect(viewportOf(1920, 1080).box).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
    expect(viewportOf(1024, 768).box.w).toBe(1024);
    expect(viewportOf(3440, 1440, { ratio: Infinity }).box.x).toBe(0);
  });

  it("parses --viewport sizes", () => {
    expect(parseViewport("2560x1440")).toEqual([2560, 1440]);
    expect(parseViewport("3440×1440")).toEqual([3440, 1440]);
    expect(parseViewport("big")).toBeNull();
  });

  it("kit.css mirrors the table: the edge per aspect, the floor, the ratio", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../create-nuikit/kit.css"), "utf8");
    const layer = css; // the defaults are in the generated block, the aspect rules in @layer nk.layout
    expect(layer).toMatch(/--nk-screen-ratio: 1\.7778;/);
    expect(layer).toMatch(new RegExp(`--nk-screen-scale-min: ${VIEWPORTS.find((v) => v.id === "16-9")!.scaleMin};`));
    expect(layer).toMatch(new RegExp(`--nk-screen-edge: ${VIEWPORTS.find((v) => v.id === "16-9")!.edge}rem;`));
    expect(layer).toMatch(new RegExp(`max-aspect-ratio: 3/2\\)[^}]*--nk-screen-edge: ${VIEWPORTS.find((v) => v.id === "4-3")!.edge}rem`));
    expect(layer).toMatch(new RegExp(`max-aspect-ratio: 17/10\\)[^}]*--nk-screen-edge: ${VIEWPORTS.find((v) => v.id === "16-10")!.edge}rem`));
    const tpl = fs.readFileSync(path.resolve(__dirname, "../../create-nuikit/index.css.tpl"), "utf8");
    expect(tpl).toContain("min(1.4815vh, 0.8333vw)");
    expect(tpl).toContain("var(--nk-screen-scale-min, 0.75)");
  });
});
