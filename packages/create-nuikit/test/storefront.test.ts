import { describe, expect, it } from "vitest";
import { runServerSpec, spec } from "./harness";

const checks = await runServerSpec("storefront", spec(new URL("./storefront.spec.lua", import.meta.url).href));

describe("storefront template: server", () => {
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(60));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
