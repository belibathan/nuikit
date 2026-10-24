// @vitest-environment jsdom
// The glow budget (tokens 1.4): at most --nk-surface-glow-budget parts glow, the focused one first.
import { afterEach, describe, expect, it } from "vitest";
import { __resetGlowBudget, applyGlowBudget, startGlowBudget } from "../src/glow";

afterEach(() => {
  __resetGlowBudget();
  document.body.innerHTML = "";
});
const on = () => [...document.querySelectorAll("[data-nk-glow-on]")].map((e) => e.id);
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("glow budget", () => {
  it("one glows: the focused part, else the highest rank, else the last in the document", async () => {
    document.body.innerHTML = `<div id="a" data-nk-glow></div><div id="b" data-nk-glow="2"></div><div id="c" data-nk-glow></div>`;
    startGlowBudget(1);
    await tick();
    expect(on()).toEqual(["b"]);
    document.getElementById("c")!.setAttribute("data-state", "focus");
    await tick();
    expect(on()).toEqual(["c"]);
  });
  it("budget 0 lets every part glow; 2 lets two", () => {
    document.body.innerHTML = `<i id="a" data-nk-glow></i><i id="b" data-nk-glow></i><i id="c" data-nk-glow></i>`;
    startGlowBudget(0);
    applyGlowBudget();
    expect(on()).toEqual(["a", "b", "c"]);
    startGlowBudget(2);
    applyGlowBudget();
    expect(on()).toEqual(["b", "c"]);
  });
});
