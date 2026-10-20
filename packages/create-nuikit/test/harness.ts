/**
 * Runs a block template's server Lua (config.lua + server/main.lua, `{{name}}` filled as "demo") in
 * real Lua 5.4 (wasmoon) under a spec written in Lua: the spec stubs the FiveM natives it needs,
 * calls boot() to load the template, drives the request handlers, and records each rule with
 * check(cond, name). Every template that moves money, items or vehicles, or acts for a player, has a
 * spec here for each rule of the server-authoritative checklist (docs/next/dispatch.md), failure
 * paths included.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LuaFactory } from "wasmoon";

export interface Check {
  ok: boolean;
  name: string;
}

const templates = (rel: string) => fileURLToPath(new URL(`../templates/${rel}`, import.meta.url));
const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, "demo");

const PRELUDE = `
local __checks = {}
function check(cond, name) __checks[#__checks + 1] = (cond and '1' or '0') .. '\\t' .. tostring(name):gsub('[\\r\\n\\t]', ' ') end
--- Load the template (config.lua, then server/main.lua) into the current globals.
function boot()
  assert(load(CONFIG, 'config.lua', 't'))()
  assert(load(SERVER, 'server/main.lua', 't'))()
end
function __report() return table.concat(__checks, '\\n') end
`;

/** Run `spec` (Lua source) against `templates/<template>`; the checks it recorded, in order. */
export async function runServerSpec(template: string, spec: string): Promise<Check[]> {
  const lua = await new LuaFactory().createEngine();
  const checks: Check[] = [];
  try {
    lua.global.set("CONFIG", fill(readFileSync(templates(`${template}/config.lua`), "utf8")));
    lua.global.set("SERVER", fill(readFileSync(templates(`${template}/server/main.lua`), "utf8")));
    await lua.doString(PRELUDE);
    let error: string | null = null;
    try {
      await lua.doString(spec);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const report = String(await lua.doString("return __report()"));
    for (const line of report ? report.split("\n") : []) {
      const [ok, ...name] = line.split("\t");
      checks.push({ ok: ok === "1", name: name.join("\t") });
    }
    // A spec that stops half-way must fail, not quietly check less.
    checks.push({ ok: error === null, name: error ? `the spec ran to the end (${error})` : "the spec ran to the end" });
  } finally {
    lua.global.close();
  }
  return checks;
}

/** A spec file next to the test that reads it. */
export const spec = (url: string) => readFileSync(fileURLToPath(url), "utf8");
