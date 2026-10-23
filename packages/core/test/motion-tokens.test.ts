// @vitest-environment jsdom
// Tokens 1.2: the motion tokens (docs/tokens.md#motion, docs/archive/design-research/motion.md §2).
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseSpring, solveSpring } from "../src/motion";
import { __resetTheme, applyTheme, setPrefs } from "../src/theme";
import { compileTheme, IDENTITY_TOKENS, MOTION_TOKENS, motionTokens, themeJsonSchema, themeMotionLevel, toDtcg, TOKEN_NAMES, withPrefs } from "../src/tokens";

const root = path.resolve(__dirname, "../../..") + "/";
const identity = (n: string) => compileTheme(readFileSync(`${root}packages/core/themes/${n}.css`, "utf8"));
const ms = (v: string | undefined) => parseFloat(v ?? "NaN");
const html = () => document.documentElement;
const css = (k: string) => html().style.getPropertyValue(`--${k}`);

afterEach(() => __resetTheme());

describe("motion tokens", () => {
  it("are additive: identity inputs plus derived outputs, none required by the schema", () => {
    for (const t of MOTION_TOKENS) {
      expect(TOKEN_NAMES).not.toContain(t.name);
      expect(IDENTITY_TOKENS).toContain(t);
      expect(["1.2", "1.5"]).toContain(t.since);
    }
    const schema = themeJsonSchema() as any;
    expect(schema.properties.vars.required).toEqual([...TOKEN_NAMES]);
    expect(schema.properties.vars.properties["nk-motion-feel"].enum).toEqual(["crisp", "snap", "smooth", "stepped"]);
  });

  it("derive the Graphite ladder from --nk-duration: 140ms", () => {
    const v = compileTheme(".dark { --primary: #22c55e; }").vars;
    expect(v["nk-motion-feel"]).toBe("crisp");
    expect(v).toMatchObject({
      "nk-motion-move": "1",
      "nk-time-instant": "0ms",
      "nk-time-press": "70ms",
      "nk-time-hover": "105ms",
      "nk-time-base": "140ms",
      "nk-time-exit": "98ms",
      "nk-time-move": "210ms",
      "nk-time-modal": "175ms",
      "nk-time-screen": "350ms",
      "nk-stagger": "20ms",
      "nk-stagger-max": "100ms",
      "nk-ease-out": "cubic-bezier(0.2, 0.8, 0.2, 1)",
      "nk-ease-in": "cubic-bezier(0.4, 0, 1, 1)",
      "nk-ease-in-out": "cubic-bezier(0.2, 0, 0, 1)",
      "nk-ease-emphasized": "cubic-bezier(0.05, 0.7, 0.1, 1)",
      "nk-ease-linear": "linear",
      "nk-spring-snap": "160ms 0",
      "nk-spring-move": "240ms 0.1",
      "nk-spring-soft": "360ms 0",
      "nk-spring-pop": "260ms 0.3",
    });
  });

  it("exits are faster than entrances, and every ceiling holds", () => {
    for (const d of [60, 100, 140, 240, 400]) {
      const t = motionTokens(d);
      expect(ms(t["nk-time-exit"])).toBeLessThan(ms(t["nk-time-base"]));
      expect(ms(t["nk-time-press"])).toBeGreaterThanOrEqual(50);
      expect(ms(t["nk-time-press"])).toBeLessThanOrEqual(100);
      expect(ms(t["nk-time-move"])).toBeLessThanOrEqual(300);
      expect(ms(t["nk-time-screen"])).toBeLessThanOrEqual(400);
      expect(ms(t["nk-stagger"])).toBeLessThanOrEqual(20);
    }
  });

  it("map each identity: Graphite crisp, Signal snap, Velvet smooth with slight bounce, Vector stepped", () => {
    const g = identity("graphite").vars;
    const s = identity("signal").vars;
    const ve = identity("velvet").vars;
    const vc = identity("vector").vars;
    expect([g, s, ve, vc].map((v) => v["nk-motion-feel"])).toEqual(["crisp", "snap", "smooth", "stepped"]);
    // motion.md §2.4: spring periods snap / move / soft
    expect([g, s, ve, vc].map((v) => [v["nk-spring-snap"], v["nk-spring-move"], v["nk-spring-soft"]])).toEqual([
      ["160ms 0", "240ms 0.1", "360ms 0"],
      ["130ms 0", "200ms 0.1", "300ms 0"],
      ["260ms 0.1", "340ms 0.1", "420ms 0.1"],
      ["140ms 0", "200ms 0.1", "300ms 0"],
    ]);
    expect(ve["nk-spring-pop"]).toBe("360ms 0.3");
    expect([g, s, ve, vc].map((v) => v["nk-stagger"])).toEqual(["20ms", "15ms", "30ms", "20ms"]);
    // snappy is shorter than smooth on every step
    for (const k of ["nk-time-base", "nk-time-exit", "nk-time-move", "nk-time-screen"]) expect(ms(s[k])).toBeLessThan(ms(ve[k]));
    for (const v of [g, s, ve, vc]) expect(v["nk-ease-out"]).toBe(v["nk-ease"]);
    for (const n of ["graphite", "signal", "velvet", "vector"]) expect(identity(n).warnings, n).toEqual([]);
  });

  it("springs are calibrated: Graphite snap is critically damped, pop overshoots about 4–5%", () => {
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
    expect(under).toBeGreaterThan(-1e-9); // no overshoot
  });

  it("validates the inputs and warns on slow identities", () => {
    const t = compileTheme(".dark { --nk-motion-feel: wobbly; --nk-spring-bounce: 0.8; --nk-duration: 300ms; }");
    expect(t.vars["nk-motion-feel"]).toBe("crisp");
    expect(t.vars["nk-spring-bounce"]).toBe("0");
    expect(t.warnings.join("\n")).toMatch(/--nk-motion-feel must be crisp, snap, smooth, stepped/);
    expect(t.warnings.join("\n")).toMatch(/--nk-spring-bounce must be a number from 0 to 0.3/);
    expect(t.warnings.join("\n")).toMatch(/--nk-duration is 300ms/);
  });

  it("a theme may set a derived token itself; DTCG carries it, and nothing derivation gives back", () => {
    const t = compileTheme(".dark { --nk-time-press: 60ms; --nk-motion-feel: snap; }");
    expect(t.vars["nk-time-press"]).toBe("60ms");
    const doc = toDtcg(t) as any;
    expect(doc.nk["motion-feel"].$value).toBe("snap");
    expect(doc.nk["time-press"].$value).toEqual({ value: 60, unit: "ms" });
    expect(doc.nk["time-hover"]).toBeUndefined();
    expect(compileTheme(doc).vars).toEqual(t.vars);
  });
});

describe("reduced motion, two levels", () => {
  const vars = identity("velvet").vars;

  it("on: nothing changes", () => {
    expect(withPrefs(vars)).toEqual(vars);
    expect(themeMotionLevel(vars)).toBe("on");
  });

  it("reduced (the player's pref): no movement, fades kept but at most 100ms, no stagger", () => {
    const out = withPrefs(vars, { reducedMotion: true });
    expect(themeMotionLevel(vars, { reducedMotion: true })).toBe("reduced");
    expect(out["nk-motion"]).toBe("0"); // legacy calc(× --nk-motion) stays instant, as before 1.2
    expect(out["nk-motion-move"]).toBe("0");
    expect(out["nk-time-base"]).toBe("100ms");
    expect(out["nk-time-press"]).toBe("100ms"); // Velvet's is 100ms already
    expect(out["nk-time-screen"]).toBe("100ms");
    expect(out["nk-stagger"]).toBe("0ms");
    expect(out["nk-duration"]).toBe("240ms"); // the identity input is untouched
  });

  it("off (the theme's --nk-motion: 0): every time is 0ms, whatever the prefs", () => {
    const off = compileTheme(".dark { --nk-motion: 0; }").vars;
    expect(themeMotionLevel(off, { reducedMotion: true })).toBe("off");
    const out = withPrefs(off);
    for (const k of ["nk-time-press", "nk-time-base", "nk-time-exit", "nk-time-screen", "nk-stagger"]) expect(out[k], k).toBe("0ms");
    expect(out["nk-motion-move"]).toBe("0");
  });

  it("applyTheme paints the level and the feel; the prefs message is unchanged", () => {
    applyTheme(readFileSync(`${root}packages/core/themes/signal.css`, "utf8"));
    expect(html().getAttribute("data-nk-motion")).toBe("on");
    expect(html().getAttribute("data-nk-feel")).toBe("snap");
    expect(css("nk-time-base")).toBe("120ms");
    setPrefs({ reducedMotion: true });
    expect(html().getAttribute("data-nk-motion")).toBe("reduced");
    expect(css("nk-time-base")).toBe("100ms");
    expect(css("nk-motion-move")).toBe("0");
    applyTheme({ "nk-motion": "0" });
    expect(html().getAttribute("data-nk-motion")).toBe("off");
    expect(css("nk-time-base")).toBe("0ms");
    setPrefs({ reducedMotion: false });
    expect(html().getAttribute("data-nk-motion")).toBe("off");
    applyTheme({ "nk-motion": "1" });
    expect(html().getAttribute("data-nk-motion")).toBe("on");
    expect(css("nk-time-base")).toBe("120ms");
  });
});
