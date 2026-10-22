import { describe, expect, it } from "vitest";
import { ALL_TOKENS, compileTheme, IDENTITY_TOKENS, KIT_TOKENS, motionTokens, TOKENS_REVISION, TREATMENT_PRESETS, withPrefs } from "../src/tokens";

// tokens 1.5 (docs/design/ink.md §2): the Ink levers. Graphite keeps today's look; `tile` is Ink's values.
describe("tokens 1.5", () => {
  it("is revision 1.5", () => expect(TOKENS_REVISION).toBe("1.5"));

  it("lists every lever once, in the schema, out of the compiled defaults", () => {
    const names = KIT_TOKENS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const t of KIT_TOKENS) {
      expect(t.since, t.name).toBe("1.5");
      expect(t.css, t.name).toBe(true);
      expect(IDENTITY_TOKENS.some((i) => i.name === t.name), t.name).toBe(false);
      expect(ALL_TOKENS).toContain(t);
    }
    for (const n of ["nk-space-unit", "nk-r-key", "nk-h-row", "nk-icon-md", "nk-type-scan-family", "nk-type-body-pad", "nk-tile-skew", "nk-plate", "nk-fill-edge", "nk-lift", "nk-chip-shape", "nk-vital-neighbours"]) expect(names).toContain(n);
    // removed in 1.5
    expect(ALL_TOKENS.some((t) => t.name.startsWith("nk-hang-"))).toBe(false);
  });

  it("leaves Graphite as it was: no 1.5 lever is compiled, the ladder keeps the 1.2 rungs", () => {
    const { vars, warnings } = compileTheme({});
    expect(warnings.filter((w) => /1\.5|kit default/.test(w))).toEqual([]);
    for (const t of KIT_TOKENS) expect(vars[t.name], t.name).toBeUndefined();
    expect(vars["nk-treatment"]).toBe("soft");
    expect(vars["nk-time-press"]).toBe("70ms");
    expect(vars["nk-time-hover"]).toBe("105ms");
    expect(vars["nk-time-fill"]).toBe("420ms");
    expect(vars["nk-time-exit"]).toBe("98ms");
    expect(vars["nk-exit-factor"]).toBe("0.7");
    expect(vars["nk-time-reduced"]).toBe("100ms");
    // the new rungs are additive
    expect([vars["nk-time-snap"], vars["nk-time-fast"], vars["nk-time-slow"]]).toEqual(["70ms", "93ms", "218ms"]);
  });

  it("compiles the tile treatment to Ink's values, on the 1.5 ladder", () => {
    const { vars, warnings } = compileTheme({ "nk-treatment": "tile" });
    expect(warnings.filter((w) => /must be/.test(w))).toEqual([]);
    expect(vars["nk-tile-skew"]).toBe("-12deg");
    expect(vars["nk-tile-plate-x"]).toBe("2px");
    expect(vars["nk-r-chip"]).toBe("0.375rem");
    expect(vars["nk-h-row"]).toBe("3rem");
    expect(vars["nk-type-scan-weight"]).toBe("800");
    expect(vars["nk-type-label-case"]).toBe("uppercase");
    expect(vars["nk-row-indicator"]).toBe("sweep");
    expect(vars["nk-row-bar"]).toBe("0");
    expect(vars["nk-plate"]).toBe("rgb(10, 10, 10)");
    // d = 180: 90 / 120 / 180 / 280 / 420, legacy rungs aliased
    expect(["nk-time-snap", "nk-time-fast", "nk-time-base", "nk-time-slow", "nk-time-fill"].map((k) => vars[k])).toEqual(["90ms", "120ms", "180ms", "280ms", "420ms"]);
    expect(vars["nk-time-press"]).toBe(vars["nk-time-snap"]);
    expect(vars["nk-time-modal"]).toBe(vars["nk-time-slow"]);
    expect(vars["nk-time-exit"]).toBe("126ms");
    expect(vars["nk-stagger"]).toBe("40ms");
  });

  it("lets a theme override a tile value and validates what it sets", () => {
    const { vars, warnings } = compileTheme({ "nk-treatment": "tile", "nk-tile-skew": "-30deg", "nk-r-key": "0.125rem", "nk-type-scan-case": "shout" });
    expect(vars["nk-r-key"]).toBe("0.125rem");
    expect(vars["nk-tile-skew"]).toBeUndefined();
    expect(vars["nk-type-scan-case"]).toBeUndefined();
    expect(warnings.some((w) => w.startsWith("--nk-tile-skew"))).toBe(true);
    expect(warnings.some((w) => w.startsWith("--nk-type-scan-case"))).toBe(true);
    expect(TREATMENT_PRESETS.tile["nk-tile-skew"]).toBe("-12deg");
  });

  it("clamps reduced motion to --nk-time-reduced", () => {
    const { vars } = compileTheme({ "nk-time-reduced": "60ms" });
    const out = withPrefs(vars, { reducedMotion: true });
    expect(out["nk-time-slow"]).toBe("60ms");
    expect(out["nk-time-base"]).toBe("60ms");
    expect(out["nk-stagger"]).toBe("0ms");
  });

  it("derives the exit from --nk-exit-factor", () => {
    expect(motionTokens(200, "crisp", 0, { exitFactor: 0.5 })["nk-time-exit"]).toBe("100ms");
  });
});
