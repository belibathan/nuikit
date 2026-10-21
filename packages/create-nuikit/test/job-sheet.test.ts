import { describe, expect, it } from "vitest";
import { runServerSpec, spec } from "./harness";

const checks = await runServerSpec("job-sheet", spec(new URL("./job-sheet.spec.lua", import.meta.url).href));

describe("job-sheet template: server", () => {
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(30));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
