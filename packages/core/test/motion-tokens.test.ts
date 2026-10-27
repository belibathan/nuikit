// @vitest-environment jsdom
// Motion: the identity inputs (duration, ease, feel, bounce, exit factor) and the ladder derived from them.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseSpring, solveSpring } from "../src/motion";
import { __resetTheme, applyTheme, setPrefs } from "../src/theme";
import { compileTheme, motionTokens, themeJsonSchema, themeMotionLevel, toDtcg, TOKEN_NAMES, withPrefs } from "../src/tokens";

const root = path.resolve(__dirname, "../../..") + "/";
const themePath = (n: string) => (["default", "neon-pop"].includes(n) ? `${root}packages/core/themes/${n}.css` : `${root}packages/core/test/fixtures/themes/${n}.css`);
const theme = (n: string) => compileTheme(readFileSync(themePath(n), "utf8"));
const ms = (v: string | undefined) => parseFloat(v ?? "NaN");
const html = () => document.documentElement;
const css = (k: string) => html().style.getPropertyValue(`--${k}`);

afterEach(() => __resetTheme());

describe("the motion ladder", () => {
  it("is outside the required palette; the feel is a validated keyword", () => {
    const schema = themeJsonSchema() as any;
    expect(schema.properties.vars.required).toEqual([...TOKEN_NAMES]);
    expect(schema.properties.vars.properties["nk-motion-feel"].enum).toEqual(["crisp", "snap", "smooth", "stepped"]);
  });

  it("derives from --nk-motion-duration: snap .5, fast .667, base 1, slow 1.556, fill 2.333, exit × 0.7", () => {
    const v = compileTheme(".dark { --primary: #22c55e; }").vars;
    expect(v).toMatchObject({
      "nk-motion-feel": "crisp",
      "nk-time-snap": "90ms",
      "nk-time-fast": "120ms",
      "nk-time-base": "180ms",
      "nk-time-slow": "280ms",
      "nk-time-fill": "420ms",
      "nk-time-exit": "126ms",
      "nk-spring-snap": "210ms 0",
      "nk-spring-move": "310ms 0.1",
      "nk-spring-soft": "450ms 0",
      "nk-spring-pop": "330ms 0.3",
    });
  });

  it("exits are faster than entrances", () => {
    for (const d of [60, 100, 140, 240, 400]) {
      const t = motionTokens(d);
      expect(ms(t["nk-time-exit"])).toBeLessThan(ms(t["nk-time-base"]));
      expect(ms(t["nk-time-snap"])).toBeLessThan(ms(t["nk-time-fast"]));
    }
  });

  it("each theme has its own pace: Default 180 crisp, Flat 160, Square 100 snap", () => {
    expect([theme("default").vars["nk-time-base"], theme("default").vars["nk-motion-feel"]]).toEqual(["180ms", "crisp"]);
    expect(theme("flat").vars["nk-time-base"]).toBe("160ms");
    expect([theme("square").vars["nk-time-base"], theme("square").vars["nk-motion-feel"]]).toEqual(["100ms", "snap"]);
  });

  it("springs are calibrated: snap is critically damped, pop overshoots about 4–5%", () => {
    const snap = parseSpring("160ms 0")!;
    expect(snap.stiffness).toBeCloseTo(1542, 0);
    expect(snap.damping).toBeCloseTo(78.5, 1);
    const pop = parseSpring("260ms 0.3")!;
    let peak = 0;
    for (let t = 0; t < 1; t += 0.002) peak = Math.max(peak, -solveSpring(pop, 1, 0, t)[0]);
    expect(peak).toBeGreaterThan(0.03);
    expect(peak).toBeLessThan(0.07);
    let under = 0;
    for (let t = 0; t < 1; t += 0.002) under = Math.min(under, solveSpring(snap, 1, 0, t)[0]);
    expect(under).toBeGreaterThan(-1e-9);
  });

  it("validates the inputs and warns on slow durations", () => {
    const t = compileTheme(".dark { --nk-motion-feel: wobbly; --nk-motion-bounce: 0.8; --nk-motion-duration: 300ms; }");
    expect(t.vars["nk-motion-feel"]).toBe("crisp");
    expect(t.vars["nk-motion-bounce"]).toBe("0");
    expect(t.warnings.join("\n")).toMatch(/--nk-motion-feel must be crisp, snap, smooth, stepped/);
    expect(t.warnings.join("\n")).toMatch(/--nk-motion-bounce must be a number from 0 to 0.3/);
    expect(t.warnings.join("\n")).toMatch(/--nk-motion-duration is 300ms/);
  });

  it("a theme may set a derived rung itself; DTCG carries it, and nothing derivation gives back", () => {
    const t = compileTheme(".dark { --nk-time-snap: 60ms; --nk-motion-feel: snap; }");
    expect(t.vars["nk-time-snap"]).toBe("60ms");
    const doc = toDtcg(t) as any;
    expect(doc.nk["motion-feel"].$value).toBe("snap");
    expect(doc.nk["time-snap"].$value).toEqual({ value: 60, unit: "ms" });
    expect(doc.nk["time-fast"]).toBeUndefined();
    expect(compileTheme(doc).vars).toEqual(t.vars);
  });
});

describe("reduced motion, two levels", () => {
  const vars = theme("default").vars;

  it("on: nothing changes", () => {
    expect(withPrefs(vars)).toEqual(vars);
    expect(themeMotionLevel(vars)).toBe("on");
  });

  it("reduced (the player's pref): no movement, fades kept but at most 100ms, no stagger", () => {
    const out = withPrefs(vars, { reducedMotion: true });
    expect(themeMotionLevel(vars, { reducedMotion: true })).toBe("reduced");
    expect(out["nk-motion"]).toBe("0");
    for (const k of ["nk-time-base", "nk-time-slow", "nk-time-fill"]) expect(out[k], k).toBe("100ms");
    expect(out["nk-time-snap"]).toBe("90ms"); // already under the cap
    expect(out["nk-stagger"]).toBe("0ms");
    expect(out["nk-motion-duration"]).toBe("180ms");
  });

  it("a theme's --nk-motion-reduced replaces the 100ms cap", () => {
    const out = withPrefs(compileTheme(".dark { --nk-motion-reduced: 60ms; }").vars, { reducedMotion: true });
    expect(out["nk-time-base"]).toBe("60ms");
  });

  it("off (the theme's --nk-motion: 0): every time is 0ms, whatever the prefs", () => {
    const off = compileTheme(".dark { --nk-motion: 0; }").vars;
    expect(themeMotionLevel(off, { reducedMotion: true })).toBe("off");
    const out = withPrefs(off);
    for (const k of ["nk-time-snap", "nk-time-base", "nk-time-exit", "nk-time-slow", "nk-stagger"]) expect(out[k], k).toBe("0ms");
  });

  it("applyTheme paints the level and the feel", () => {
    applyTheme(readFileSync(themePath("square"), "utf8"));
    expect(html().getAttribute("data-nk-motion")).toBe("on");
    expect(html().getAttribute("data-nk-feel")).toBe("snap");
    expect(css("nk-time-base")).toBe("100ms");
    setPrefs({ reducedMotion: true });
    expect(html().getAttribute("data-nk-motion")).toBe("reduced");
    applyTheme({ "nk-motion": "0" });
    expect(html().getAttribute("data-nk-motion")).toBe("off");
    expect(css("nk-time-base")).toBe("0ms");
    setPrefs({ reducedMotion: false });
    applyTheme({ "nk-motion": "1" });
    expect(html().getAttribute("data-nk-motion")).toBe("on");
    expect(css("nk-time-base")).toBe("100ms");
  });
});
