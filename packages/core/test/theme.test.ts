// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyTheme, parseTheme, toRgba } from "../src/theme";

const near = (a: number[] | null, b: number[], tol = 2) => {
  expect(a).not.toBeNull();
  a!.slice(0, 3).forEach((v, i) => expect(Math.abs(v - b[i]!)).toBeLessThanOrEqual(tol));
};

describe("toRgba", () => {
  it("matches Lightning CSS for oklch", () => {
    near(toRgba("oklch(0.62 0.24 295)"), [149, 90, 255], 3); // nuikit primary
    near(toRgba("oklch(0.145 0 0)"), [10, 10, 10]); // shadcn foreground
    near(toRgba("oklch(0.577 0.245 27.325)"), [228, 0, 20], 3); // shadcn destructive
  });
  it("handles alpha, hsl, rgb and hex", () => {
    expect(toRgba("oklch(1 0 0 / 10%)")![3]).toBe(0.1);
    near(toRgba("hsl(0 100% 50%)"), [255, 0, 0]);
    near(toRgba("hsl(240, 5%, 26%)"), [63, 63, 70]);
    expect(toRgba("rgb(1 2 3 / .5)")).toEqual([1, 2, 3, 0.5]);
    expect(toRgba("#ff000080")).toEqual([255, 0, 0, 0.502]);
    expect(toRgba("0.5rem")).toBeNull();
  });
});

describe("themes", () => {
  const tweakcn = `:root { --primary: oklch(0.6 0.2 150); --radius: 0.5rem; }
.dark { --primary: oklch(0.7 0.2 150); --border: oklch(1 0 0 / 10%); }`;

  it("parses pasted TweakCN CSS", () => {
    const { light, dark } = parseTheme(tweakcn);
    expect(light.radius).toBe("0.5rem");
    expect(dark.primary).toBe("oklch(0.7 0.2 150)");
  });

  it("applies values and Chromium-103 channels", () => {
    const el = document.createElement("div");
    applyTheme(tweakcn, el, "dark");
    expect(el.style.getPropertyValue("--radius")).toBe("0.5rem");
    expect(el.style.getPropertyValue("--primary")).toMatch(/^rgba\(/);
    expect(el.style.getPropertyValue("--primary-rgb")).toMatch(/^\d+, \d+, \d+$/);
    expect(el.style.getPropertyValue("--border-a")).toBe("0.1");
  });
});
