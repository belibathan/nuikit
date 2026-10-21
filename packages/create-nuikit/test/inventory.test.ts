import { describe, expect, it } from "vitest";
import { runServerSpec, spec } from "./harness";

const checks = await runServerSpec("inventory", spec(new URL("./inventory.spec.lua", import.meta.url).href));

describe("inventory template: server", () => {
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(45));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
