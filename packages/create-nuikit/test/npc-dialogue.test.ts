import { describe, expect, it } from "vitest";
import { runServerSpec, spec } from "./harness";

const checks = await runServerSpec("npc-dialogue", spec(new URL("./npc-dialogue.spec.lua", import.meta.url).href));

describe("npc-dialogue template: server", () => {
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(40));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
