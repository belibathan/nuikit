import { describe, expect, it } from "vitest";
import { runServerSpec, spec } from "./harness";

const checks = await runServerSpec("mdt", spec(new URL("./mdt.spec.lua", import.meta.url).href));

describe("mdt template: server", () => {
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(80));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
