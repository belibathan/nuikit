import { describe, expect, it } from "vitest";
import { runServerSpec, spec } from "./harness";

const checks = await runServerSpec("vehicle-shop", spec(new URL("./vehicle-shop.spec.lua", import.meta.url).href));

describe("vehicle-shop template: server", () => {
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(30));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
