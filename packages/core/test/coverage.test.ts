import { describe, expect, it } from "vitest";
import { computeCoverage, formatCoverage, parseSessionLog } from "../src/coverage";

const log = [
  '{"framework":"qbox","step":5,"source":"ox_lib","intent":"notify","expected":true}',
  '{"framework":"qbox","step":5,"source":"ox_lib","intent":"notify","expected":true}',
  '{"framework":"qbox","step":7,"source":"ox_target","intent":"target","expected":true}',
  '{"framework":"qbox","step":8,"source":"qbx_radialmenu","intent":"radial","expected":false}',
  '{"framework":"esx","step":6,"source":"esx_menu_default","intent":"menu","expected":true}',
  "not json",
  "",
].join("\n");

describe("coverage", () => {
  it("parses JSON lines, skipping junk", () => {
    expect(parseSessionLog(log)).toHaveLength(5);
  });

  it("pairs asked with drawn per framework; drawn is capped at asked", () => {
    const r = computeCoverage("qbox", parseSessionLog(log), [{ source: "ox_lib", byIntent: { notify: 9 } }]);
    expect(r.asked).toBe(3);
    expect(r.drawn).toBe(2);
    expect(r.pct).toBeCloseTo(2 / 3);
    expect(r.target).toBe(0.9);
    expect(r.pass).toBe(false);
    expect(r.misses).toEqual([{ source: "ox_target", intent: "target", asked: 1, drawn: 0 }]);
  });

  it("passes at the target and accepts the raw count map", () => {
    const r = computeCoverage("esx", parseSessionLog(log), { esx_menu_default: { menu: 1 } });
    expect([r.pct, r.target, r.pass, r.misses]).toEqual([1, 0.75, true, []]);
  });

  it("no target, nothing asked", () => {
    expect(computeCoverage("standalone", [], []).pass).toBeNull();
    expect(computeCoverage("qbox", [], []).pass).toBe(false);
  });

  it("formats markdown", () => {
    const md = formatCoverage(computeCoverage("qbox", parseSessionLog(log), []), { date: "2026-10-22" });
    expect(md).toContain("FAIL");
    expect(md).toContain("- ox_lib: notify (asked 2, drawn 0)");
  });
});
