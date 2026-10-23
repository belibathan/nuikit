import { describe, expect, it } from "vitest";
import { ALL_TOKENS, compileTheme, SELECTION_TOKENS, toDtcg } from "../src/tokens";

const NEW = ["nk-tile-lift", "nk-tile-press-ratio", "nk-leading-tight", "nk-leading-normal", "nk-row-bar-thickness", "nk-row-bar-inset-scale", "nk-hold-ring-pad", "nk-pip-size", "nk-pip-gap", "nk-meter-segment-gap", "nk-glow-radius"];

describe("kit.css levers", () => {
  it("registers each lever once, in the DTCG export", () => {
    const names = ALL_TOKENS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    const dtcg = JSON.stringify(toDtcg(compileTheme({ "nk-tile-lift": "0px" })));
    for (const n of NEW) {
      expect(SELECTION_TOKENS.some((t) => t.name === n), n).toBe(true);
      if (n === "nk-tile-lift") expect(dtcg).toContain("lift");
    }
  });
  it("compiles the stock theme with no warnings and no lever set", () => {
    const { vars, warnings } = compileTheme({});
    expect(warnings).toEqual([]);
    for (const n of NEW) expect(vars[n], n).toBeUndefined();
  });
  it("round-trips a set lever through DTCG", () => {
    const t = compileTheme({ "nk-tile-lift": "0px", "nk-glow-radius": "2rem", "nk-pip-size": "20%" });
    expect(compileTheme(toDtcg(t)).vars).toEqual(t.vars);
    expect(t.vars["nk-glow-radius"]).toBe("2rem");
  });
  it("accepts a lever and rejects a bad number", () => {
    expect(compileTheme({ "nk-tile-lift": "0px", "nk-pip-gap": "1px" }).warnings).toEqual([]);
    expect(compileTheme({ "nk-tile-press-ratio": "9" }).warnings.length).toBeGreaterThan(0);
  });
});
