// @vitest-environment jsdom
// StaggerGroup reads --nk-stagger once per theme, not on every flush (getComputedStyle forces a recalc).
import { afterEach, describe, expect, it, vi } from "vitest";
import { StaggerGroup } from "../src/react";
import { applyTheme, clearTheme } from "../src/theme";

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("stagger token cache", () => {
  afterEach(() => {
    clearTheme();
    vi.restoreAllMocks();
  });

  it("reads --nk-stagger once across flushes, and again after a new theme", async () => {
    const spy = vi.spyOn(window, "getComputedStyle");
    const g = new StaggerGroup();
    const els = [document.createElement("div"), document.createElement("div")];
    els.forEach((el) => document.body.append(el));
    const run = async () => {
      els.forEach((el) => g.request({ el, on: true }));
      await flush();
    };
    await run();
    await run();
    await run();
    const reads = () => spy.mock.calls.filter(([el]) => el === document.documentElement).length;
    expect(reads()).toBe(1);
    applyTheme(".dark { --primary: #ff00ff; }");
    await run();
    expect(reads()).toBe(2);
    expect(els[1]!.style.getPropertyValue("--nk-stagger-delay")).toMatch(/^\d+ms$/);
  });
});
