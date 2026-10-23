// systems/nuikit_stress/server.lua: the client-sent stress events are validated, limited per player and
// capped in what they relieve; the exports (server scripts) are only validated.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LuaFactory, type LuaEngine } from "wasmoon";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const dir = (f: string) => readFileSync(fileURLToPath(new URL(`../../../../systems/nuikit_stress/${f}`, import.meta.url)), "utf8");
// CfxLua's `weapon_x` hash literals aren't Lua 5.4: strings stand in for them here
const CONFIG = dir("config.lua").replace(/`([^`]+)`/g, "'$1'");
const SERVER = dir("server.lua");

let lua: LuaEngine;
beforeEach(async () => {
  lua = await new LuaFactory().createEngine();
  await lua.doString(`
    NOW = 0
    STRESS = {}       -- src → stress
    SENT = {}
    NET, EXPORTS, HANDLERS = {}, {}, {}
    function GetGameTimer() return NOW end
    function IsDuplicityVersion() return true end
    function GetResourceState(r) if r == 'qbx_core' then return 'started' end return 'missing' end
    function RegisterNetEvent(name, fn) NET[name] = fn end
    function AddEventHandler(name, fn) HANDLERS[name] = fn end
    function TriggerClientEvent(name, src, v) SENT[#SENT + 1] = { name = name, src = src, v = v } end
    function exports(name, fn) EXPORTS[name] = fn end
    local function player(src)
      if src ~= 1 and src ~= 2 then return nil end
      return {
        PlayerData = { job = { type = 'civ' }, metadata = { stress = STRESS[src] or 0 } },
        Functions = { SetMetaData = function(_, v) STRESS[src] = v end },
      }
    end
    exports = setmetatable({ qbx_core = { GetPlayer = function(_, src) return player(src) end } }, { __call = function(_, name, fn) EXPORTS[name] = fn end })
    -- a net event from player src
    function FROM(src, name, amount) source = src NET[name](amount) end
  `);
  await lua.doString(CONFIG);
  await lua.doString(SERVER);
});
afterEach(() => lua.global.close());

const run = <T = unknown>(code: string) => lua.doString(code) as Promise<T>;

describe("nuikit_stress server", () => {
  it("gains and relieves within 0..100 for valid amounts only", async () => {
    await run(`FROM(1, 'hud:server:GainStress', 30)`);
    expect(await run(`return STRESS[1]`)).toBe(30);
    for (const bad of ["0/0", "-5", "0", "101", "'10'", "{}", "math.huge"]) await run(`FROM(1, 'hud:server:GainStress', ${bad})`);
    expect(await run(`return STRESS[1]`)).toBe(30);
    await run(`FROM(1, 'hud:server:RelieveStress', 40)`);
    expect(await run(`return STRESS[1]`)).toBe(0);
  });

  it("limits each player's events per window, and players are independent", async () => {
    await run(`for i = 1, 25 do FROM(1, 'hud:server:GainStress', 1) end`);
    expect(await run(`return STRESS[1]`)).toBe(10);
    await run(`FROM(2, 'hud:server:GainStress', 1)`);
    expect(await run(`return STRESS[2]`)).toBe(1);
    await run(`NOW = 10000 FROM(1, 'hud:server:GainStress', 1)`);
    expect(await run(`return STRESS[1]`)).toBe(11);
  });

  it("caps what a client relieves per minute; the exports aren't capped", async () => {
    await run(`STRESS[1] = 100`);
    await run(`FROM(1, 'hud:server:RelieveStress', 50) FROM(1, 'hud:server:RelieveStress', 20)`);
    expect(await run(`return STRESS[1]`)).toBe(50); // 50 of 60 used: 20 more is over
    await run(`FROM(1, 'hud:server:RelieveStress', 10)`);
    expect(await run(`return STRESS[1]`)).toBe(40);
    await run(`EXPORTS.RelieveStress(1, 40)`);
    expect(await run(`return STRESS[1]`)).toBe(0);
    await run(`NOW = 60000 STRESS[1] = 100 FROM(1, 'hud:server:RelieveStress', 60)`);
    expect(await run(`return STRESS[1]`)).toBe(40);
  });

  it("exports refuse a source that isn't a player id; a dropped player's budget is cleared", async () => {
    await run(`EXPORTS.AddStress('1', 10) EXPORTS.AddStress(1.5, 10) EXPORTS.AddStress(-1, 10) EXPORTS.AddStress(9, 10)`);
    expect(await run(`return STRESS[1]`)).toBeFalsy();
    await run(`for i = 1, 10 do FROM(1, 'hud:server:GainStress', 1) end source = 1 HANDLERS.playerDropped()`);
    await run(`FROM(1, 'hud:server:GainStress', 1)`);
    expect(await run(`return STRESS[1]`)).toBe(11);
  });
});
