import { describe, expect, it } from "vitest";
import { runServerSpec, spec } from "./harness";

const checks = await runServerSpec("bank", spec(new URL("./bank.spec.lua", import.meta.url).href));

describe("bank template: server", () => {
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(40));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
