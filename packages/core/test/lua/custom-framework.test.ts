import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

// A page's natives, without touching `exports` (the harness wires cross-resource exports).
const natives = (extra = "") => `
  PED = { health = 200, max = 200, armor = 0, dead = false }
  STARTED = {}
  RESOURCES = {}
  CONVARS = {}
  function GetResourceState(r) return STARTED[r] and 'started' or 'missing' end
  function GetConvar(k, d) return CONVARS[k] or d end
  function GetNumResources() return #RESOURCES end
  function GetResourceByFindIndex(i) return RESOURCES[i + 1] end
  function GetNumResourceMetadata(r, key) return (key == 'nuikit_framework' and STARTED['meta:' .. r]) and 1 or 0 end
  function PlayerPedId() return 1 end
  function PlayerId() return 0 end
  function GetEntityHealth() return PED.health end
  function GetEntityMaxHealth() return PED.max end
  function GetPedArmour() return PED.armor end
  function IsEntityDead() return PED.dead end
  function NetworkIsPlayerTalking() return false end
  function CreateThread() end
  function Wait() end
  LocalPlayer = LocalPlayer or { state = {} }
  ${extra}
`;

// A fake in-memory framework as a resource: required nuikitGetPlayer, optional nuikitPoll / nuikitEvents.
const adapterLua = (opts: { poll?: boolean; events?: boolean } = {}) => `
  FW = { id = 'c1', name = 'Ada Lovelace', cash = 120, bank = 900, hunger = 140, thirst = 40,
         job = { name = 'taxi', label = 'Taxi', grade = 1, gradeLabel = 'Driver', onDuty = true }, secret = 'x' }
  exports('nuikitGetPlayer', function() return FW end)
  ${opts.poll ? `exports('nuikitPoll', function() return { stress = FW.stress } end)` : ""}
  ${opts.events ? `exports('nuikitEvents', function() return { 'myfw:changed' } end)` : ""}
`;

const latest = (r: { messages: { action: string; data: any }[] }) =>
  [...r.messages].reverse().find((m) => m.action === "nuikit:player")?.data;

async function startHud(setup: string) {
  return client.start("hud", { before: natives(setup), scripts: ["bridge.lua"] });
}

describe("bridge.lua custom framework adapter", () => {
  it("picks a resource with nuikit_framework metadata over a built-in and maps the getter", async () => {
    client = await createClient();
    await client.start("myfw", { runtime: "none", before: adapterLua({ poll: true }) });
    const hud = await startHud(`
      STARTED.myfw = true; STARTED['meta:myfw'] = true; RESOURCES = { 'myfw', 'qbx_core' }
      STARTED.qbx_core = true
      exports.qbx_core = { GetPlayerData = function() error('built-in must not run') end }
    `);
    expect(await hud.run(`return NUI.player.framework`)).toBe("myfw");
    expect(latest(hud)).toMatchObject({
      loaded: true, id: "c1", name: "Ada Lovelace", cash: 120, bank: 900,
      hunger: 100, thirst: 40, job: { name: "taxi", gradeLabel: "Driver", onDuty: true },
    });
    expect(latest(hud).secret).toBeUndefined();
  });

  it("the convar names a custom framework directly", async () => {
    client = await createClient();
    await client.start("myfw", { runtime: "none", before: adapterLua() });
    const hud = await startHud(`STARTED.myfw = true; CONVARS.nuikit_framework = 'myfw'`);
    expect(await hud.run(`return NUI.player.framework`)).toBe("myfw");
    expect(latest(hud)).toMatchObject({ loaded: true, id: "c1" });
  });

  it("nuikit:framework:update and nuikitEvents change the page", async () => {
    client = await createClient();
    const fw = await client.start("myfw", { runtime: "none", before: adapterLua({ events: true }) });
    const hud = await startHud(`STARTED.myfw = true; CONVARS.nuikit_framework = 'myfw'`);
    client.event("nuikit:framework:update", { cash: 5, job: { name: "none", label: "Unemployed", grade: 0 }, bogus: 1 });
    expect(latest(hud)).toMatchObject({ cash: 5, job: { name: "none" }, bank: 900 });
    expect(latest(hud).bogus).toBeUndefined();
    await fw.run(`FW.bank = 777`);
    client.event("myfw:changed");
    expect(latest(hud)).toMatchObject({ bank: 777 });
  });

  it("optional functions may be missing: no poll, no events, loaded falls back to id", async () => {
    client = await createClient();
    await client.start("myfw", { runtime: "none", before: adapterLua() });
    const hud = await startHud(`STARTED.myfw = true; CONVARS.nuikit_framework = 'myfw'`);
    await hud.run(`NUI.player.poll()`);
    expect(latest(hud)).toMatchObject({ loaded: true, health: 100, name: "Ada Lovelace" });
  });

  it("a failing required getter degrades to a not-loaded player instead of crashing", async () => {
    client = await createClient();
    await client.start("myfw", { runtime: "none", before: `exports('nuikitGetPlayer', function() error('boom') end)` });
    const hud = await startHud(`STARTED.myfw = true; CONVARS.nuikit_framework = 'myfw'`);
    expect(latest(hud)).toMatchObject({ loaded: false });
  });

  it("built-ins still win when no custom adapter is registered", async () => {
    client = await createClient();
    const hud = await startHud(`
      STARTED.qbx_core = true; RESOURCES = { 'qbx_core' }
      exports.qbx_core = { GetPlayerData = function() return { citizenid = 'Q1', charinfo = { firstname = 'A', lastname = 'B' }, money = { cash = 1, bank = 2 }, metadata = {} } end }
    `);
    expect(await hud.run(`return NUI.player.framework`)).toBe("qbox");
    expect(latest(hud)).toMatchObject({ id: "Q1", cash: 1, bank: 2 });
  });
});
