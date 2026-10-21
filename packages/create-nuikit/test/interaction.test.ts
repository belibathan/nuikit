import { describe, expect, it } from "vitest";
import { runServerSpec, spec } from "./harness";

const checks = await runServerSpec("interaction", spec(new URL("./interaction.spec.lua", import.meta.url).href));

describe("interaction template: server", () => {
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(40));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
