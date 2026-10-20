import { describe, expect, it } from "vitest";
import { runServerSpec, spec } from "./harness";

const checks = await runServerSpec("character-select", spec(new URL("./character-select.spec.lua", import.meta.url).href));

describe("character-select template: server", () => {
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(35));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
