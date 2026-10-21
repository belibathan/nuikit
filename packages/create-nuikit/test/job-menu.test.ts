import { describe, expect, it } from "vitest";
import { runServerSpec, spec } from "./harness";

const checks = await runServerSpec("job-menu", spec(new URL("./job-menu.spec.lua", import.meta.url).href));

describe("job-menu template: server", () => {
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(70));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
