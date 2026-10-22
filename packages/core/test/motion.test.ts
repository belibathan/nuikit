// @vitest-environment jsdom
// nuikit-core/motion: springs sampled into WAAPI keyframes, retargeting, FLIP, timed runs, motion levels.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flip, flipFrom, indicator, motionLevel, parseSpring, solveSpring, spring, springOf, springValues, stagger, timed, valueOf } from "../src/motion";

/** A stand-in for WAAPI (jsdom has none): records what was asked, lets a test move the clock and finish. */
class FakeAnimation {
  static all: FakeAnimation[] = [];
  currentTime: number | null = 0;
  startTime: number | null = null;
  onfinish: (() => void) | null = null;
  cancelled = false;
  constructor(
    public el: Element,
    public keyframes: Keyframe[],
    public options: KeyframeAnimationOptions,
  ) {
    FakeAnimation.all.push(this);
  }
  cancel() {
    this.cancelled = true;
  }
  finish() {
    this.currentTime = Number(this.options.duration);
    this.onfinish?.();
  }
}
const animated = () => FakeAnimation.all.filter((a) => !a.cancelled);
const html = () => document.documentElement;

beforeEach(() => {
  FakeAnimation.all = [];
  (Element.prototype as any).animate = function (k: Keyframe[], o: KeyframeAnimationOptions) {
    return new FakeAnimation(this, k, o);
  };
  html().setAttribute("data-nk-motion", "on");
  html().style.setProperty("--nk-spring-move", "240ms 0.1");
  html().style.setProperty("--nk-spring-snap", "160ms 0");
  html().style.setProperty("--nk-time-base", "140ms");
  html().style.setProperty("--nk-stagger", "20ms");
  html().style.setProperty("--nk-stagger-max", "100ms");
});
afterEach(() => {
  delete (Element.prototype as any).animate;
  html().removeAttribute("style");
  vi.restoreAllMocks();
});

describe("springs", () => {
  it("sample from → to at 60 Hz and settle about when motion.md says", () => {
    const snap = parseSpring("160ms 0")!;
    const v = springValues(snap, 0, 100);
    expect(v[0]).toBe(0);
    expect(v.at(-1)).toBe(100);
    for (let i = 1; i < v.length; i++) expect(v[i]!).toBeGreaterThanOrEqual(v[i - 1]!); // critically damped: no overshoot
    const settle = ((v.length - 1) * 1000) / 60;
    expect(settle).toBeGreaterThan(150);
    expect(settle).toBeLessThan(240); // motion.md §2.2: ~195 ms
    expect(v.length).toBeGreaterThanOrEqual(10);
    expect(v.length).toBeLessThanOrEqual(30);
  });

  it("the analytic velocity is the derivative of the position", () => {
    const s = parseSpring("240ms 0.1")!;
    for (const t of [0.01, 0.05, 0.12]) {
      const h = 1e-5;
      const d = (solveSpring(s, 1, 3, t + h)[0] - solveSpring(s, 1, 3, t - h)[0]) / (2 * h);
      expect(solveSpring(s, 1, 3, t)[1]).toBeCloseTo(d, 3);
    }
  });

  it("reads presets from the theme tokens, falling back to the defaults", () => {
    expect(springOf("move").duration).toBe(240);
    html().style.setProperty("--nk-spring-move", "340ms 0.1");
    expect(springOf("move").duration).toBe(340);
    html().style.removeProperty("--nk-spring-pop");
    expect(springOf("pop").bounce).toBe(0.3);
    expect(springOf("200ms 0.2").duration).toBe(200);
  });
});

describe("spring()", () => {
  it("runs as linear WAAPI keyframes on transform, then writes the end inline and leaves nothing behind", async () => {
    const el = document.createElement("div");
    const done = spring(el, "y", 0, { from: 8 });
    const [a] = animated();
    expect(a!.options.easing).toBe("linear");
    expect(a!.keyframes[0]).toEqual({ transform: "translateY(8px)" });
    expect(a!.keyframes.at(-1)).toEqual({ transform: "translateY(0px)" });
    a!.finish();
    expect(await done).toBe(true);
    expect(el.style.transform).toBe("translateY(0px)");
    expect(animated()).toHaveLength(0);
  });

  it("retargets mid-flight from the current value and velocity, without reading computed style", async () => {
    const el = document.createElement("div");
    const cs = vi.spyOn(window, "getComputedStyle");
    const first = spring(el, "x", 100, { from: 0 });
    const a = animated()[0]!;
    a.currentTime = 60; // 60 ms in
    const now = valueOf(el, "x")!;
    expect(now).toBeGreaterThan(20);
    expect(now).toBeLessThan(100);
    void spring(el, "x", 0);
    expect(await first).toBe(false);
    expect(a.cancelled).toBe(true);
    const b = animated()[0]!;
    const start = parseFloat(String(b.keyframes[0]!.transform).slice(11));
    expect(start).toBeCloseTo(now, 6);
    // still moving toward 100 at first: the old velocity carries over
    expect(parseFloat(String(b.keyframes[1]!.transform).slice(11))).toBeGreaterThan(start);
    expect(cs).not.toHaveBeenCalled();
  });

  it("jumps when motion is off; under reduced only opacity fades, in at most 100 ms", async () => {
    const el = document.createElement("div");
    html().setAttribute("data-nk-motion", "off");
    expect(await spring(el, "opacity", 1, { from: 0 })).toBe(true);
    expect(el.style.opacity).toBe("1");
    expect(animated()).toHaveLength(0);
    html().setAttribute("data-nk-motion", "reduced");
    expect(await spring(el, "scale", 1, { from: 0.9 })).toBe(true);
    expect(animated()).toHaveLength(0);
    void spring(el, "opacity", 0, { from: 1 });
    const [fade] = animated();
    expect(fade!.keyframes).toEqual([{ opacity: "1" }, { opacity: "0" }]);
    expect(fade!.options.duration).toBeLessThanOrEqual(100);
  });
});

describe("flip", () => {
  const box = (top: number) => {
    const el = document.createElement("div");
    Object.defineProperty(el, "offsetTop", { configurable: true, get: () => (el as any)._top ?? top });
    Object.defineProperty(el, "offsetLeft", { configurable: true, get: () => 0 });
    return el;
  };
  it("glides moved elements from their old place with a transform; unmoved ones stay still", () => {
    const a = box(0);
    const b = box(40);
    flip([a, b], () => {
      (a as any)._top = 40;
    });
    expect(animated()).toHaveLength(1);
    const [run] = animated();
    expect(run!.el).toBe(a);
    expect(run!.keyframes[0]).toEqual({ transform: "translate(0px, -40px)" });
    expect(run!.keyframes.at(-1)).toEqual({ transform: "translate(0px, 0px)" });
  });
  it("an interrupted FLIP starts from where it is drawn", () => {
    const a = box(0);
    const prev = new WeakMap<Element, [number, number]>();
    flipFrom([a], prev);
    (a as any)._top = 40;
    flipFrom([a], prev);
    const first = animated()[0]!;
    first.currentTime = 100;
    (a as any)._top = 80;
    flipFrom([a], prev);
    const second = animated()[0]!;
    expect(first.cancelled).toBe(true);
    const dy = parseFloat(String(second.keyframes[0]!.transform).split(",")[1]!);
    // drawn at 40 + (−40 × what's left), now laid out at 80
    expect(dy).toBeLessThan(-40);
    expect(dy).toBeGreaterThan(-80);
  });
  it("doesn't move under reduced motion", () => {
    html().setAttribute("data-nk-motion", "reduced");
    const a = box(0);
    flip([a], () => ((a as any)._top = 40));
    expect(animated()).toHaveLength(0);
  });
});

describe("timed", () => {
  it("is one linear animation joined to an outside clock, at every motion level", () => {
    html().setAttribute("data-nk-motion", "off");
    const el = document.createElement("div");
    const a = timed(el, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], 5000, { startedAt: 1234 }) as unknown as FakeAnimation;
    expect(a.options).toMatchObject({ duration: 5000, easing: "linear", fill: "both" });
    expect(a.startTime).toBe(1234);
  });
});

describe("choreography", () => {
  it("staggers 20 ms per item, capped at 100 ms", () => {
    expect([0, 1, 4, 5, 9].map(stagger)).toEqual([0, 20, 80, 100, 100]);
  });
  it("the indicator glides, then speeds up and jumps under key-repeat", () => {
    const el = document.createElement("div");
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const move = indicator(el);
    move(0);
    expect(el.getAttribute("data-repeat")).toBe("");
    now = 500;
    move(40);
    expect(el.getAttribute("data-repeat")).toBe("");
    expect(el.style.transform).toBe("translateY(40px)");
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      now += 33; // a held d-pad, ~30 moves a second
      move(80 + i * 40);
      seen.push(el.getAttribute("data-repeat")!);
    }
    expect(seen).toEqual(["fast", "fast", "jump", "jump", "jump"]);
    now += 400;
    move(0, 1.5);
    expect(el.getAttribute("data-repeat")).toBe("");
    expect(el.style.transform).toBe("translateY(0px) scaleY(1.5)");
  });
});

describe("motionLevel", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-nk-motion");
    document.body.innerHTML = "";
  });

  it("reads the nearest data-nk-motion from an element up, else <html>'s", () => {
    document.documentElement.setAttribute("data-nk-motion", "reduced");
    document.body.innerHTML = `<div data-nk-motion="off"><span id="in"></span></div><span id="out"></span>`;
    expect(motionLevel(document.getElementById("in"))).toBe("off");
    expect(motionLevel(document.getElementById("out"))).toBe("reduced");
    expect(motionLevel()).toBe("reduced");
  });
});
