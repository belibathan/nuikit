// The arsenal spec (src/spec/api): the naming rule holds, and arsenal.json is what the generator makes of it.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DOMAINS, checkDomain, checkSpec } from "../src/spec/api";

describe("arsenal spec", () => {
  it("every domain follows the naming rule", () => {
    expect(checkSpec(DOMAINS)).toEqual([]);
  });
  it("the rule catches a stray name", () => {
    const bad = { js: "x", lua: "x", title: "X", doc: "x", entries: [{ name: "a", kind: "call" as const, doc: "a", lua: "NUI.a", since: "0.1.0" }], events: [{ name: "nuikit:a", dir: "local" as const, payload: "x", sender: "any" as const, doc: "x", since: "0.1.0" }] };
    expect(checkDomain(bad).length).toBe(3);
  });
  it("arsenal.json is up to date (node scripts/arsenal.mjs)", () => {
    const script = fileURLToPath(new URL("../scripts/arsenal.mjs", import.meta.url));
    expect(() => execFileSync("node", [script, "--check"], { stdio: "pipe" })).not.toThrow();
  });
});
