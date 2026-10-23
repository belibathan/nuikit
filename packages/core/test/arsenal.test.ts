// The arsenal spec (src/spec/api): the naming rule holds, and arsenal.json is what the generator makes of it.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

describe("the two sides mirror", () => {
  const arsenal = JSON.parse(readFileSync(fileURLToPath(new URL("../arsenal.json", import.meta.url)), "utf8"));
  it("every entry is on both sides, or says why it is on one (from the generated manifest)", () => {
    const gaps = arsenal.domains.flatMap((d: { lua: string; entries: { name: string; side: string; only?: string }[] }) =>
      d.entries.filter((e) => e.side !== "both" && !e.only).map((e) => `${d.lua}.${e.name}`),
    );
    expect(gaps).toEqual([]);
  });
  it("every Lua name is nk.<domain>.<verb> or a handle method", () => {
    const bad = arsenal.domains.flatMap((d: { lua: string; entries: { lua?: string; kind: string }[] }) =>
      d.entries.filter((e) => e.lua && !(e.lua.startsWith(`nk.${d.lua}.`) || /^[A-Z]\w+[:]?\w*$/.test(e.lua))).map((e) => e.lua),
    );
    expect(bad).toEqual([]);
  });
});
