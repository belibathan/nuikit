// packages/create-nuikit/helpers/*.lua: the fivem-foundation helpers (Log, WaitLimiter, RateLimiter, Sanitize,
// JsonSafe, ServerId) every template loads, each guarantee checked in real Lua 5.4.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LuaFactory } from "wasmoon";
import { describe, expect, it } from "vitest";

const dir = fileURLToPath(new URL("../helpers/", import.meta.url));
const sources = readdirSync(dir).filter((f) => f.endsWith(".lua")).sort().map((f) => readFileSync(dir + f, "utf8"));
const spec = readFileSync(fileURLToPath(new URL("./helpers.spec.lua", import.meta.url)), "utf8");

const lua = await new LuaFactory().createEngine();
await lua.doString(`
  local __checks = {}
  function check(cond, name) __checks[#__checks + 1] = (cond and '1' or '0') .. '\\t' .. tostring(name) end
  function boot() for _, src in ipairs(HELPERS) do assert(load(src, 'helpers', 't'))() end end
  function __report() return table.concat(__checks, '\\n') end
`);
lua.global.set("HELPERS", sources);
let error: string | null = null;
try {
  await lua.doString(spec);
} catch (e) {
  error = e instanceof Error ? e.message : String(e);
}
const report = String(await lua.doString("return __report()"));
lua.global.close();
const checks = (report ? report.split("\n") : []).map((line) => {
  const [ok, ...name] = line.split("\t");
  return { ok: ok === "1", name: name.join("\t") };
});

describe("fivem-foundation helpers", () => {
  it("has the six helpers", () => expect(sources.length).toBe(6));
  it("the spec ran to the end", () => expect(error, error ?? "").toBeNull());
  it("runs its checks", () => expect(checks.length).toBeGreaterThan(40));
  for (const c of checks) it(c.name, () => expect(c.ok, c.name).toBe(true));
});
