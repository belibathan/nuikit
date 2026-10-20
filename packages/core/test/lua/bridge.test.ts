import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

// Natives and statebags a client exposes; each test swaps in a framework.
const natives = (extra = "") => `
  PED = { health = 200, max = 200, armor = 0, dead = false }
  STARTED = {}
  function GetResourceState(r) return STARTED[r] and 'started' or 'missing' end
  function GetConvar(_, d) return d end
  function PlayerPedId() return 1 end
  function PlayerId() return 0 end
  function GetEntityHealth() return PED.health end
  function GetEntityMaxHealth() return PED.max end
  function GetPedArmour() return PED.armor end
  function IsEntityDead() return PED.dead end
  function NetworkIsPlayerTalking() return TALKING == true end
  function CreateThread() end
  function Wait() end
  LocalPlayer = { state = {} }
  exports = {}
  ${extra}
`;

const qboxPlayer = {
  citizenid: "ABC123",
  charinfo: { firstname: "Niko", lastname: "Bellic" },
  money: { cash: 500, bank: 13370 },
  job: { name: "police", label: "LSPD", grade: { name: "Officer", level: 1 }, onduty: true },
  gang: { name: "none", label: "No Gang", grade: { name: "None", level: 0 } },
  metadata: { hunger: 80, thirst: 64.4, stress: 3, isdead: false, inlaststand: false },
};

const latest = (r: { messages: { action: string; data: any }[] }) =>
  [...r.messages].reverse().find((m) => m.action === "nuikit:player")?.data;

describe("bridge.lua", () => {
  it("keeps downed internal: last stand makes the player dead, but downed never goes on the wire (§7.1)", async () => {
    client = await createClient();
    const hud = await client.start("hud", {
      before: natives(`
        STARTED.qbx_core = true
        PD = ${luaTable({ ...qboxPlayer, metadata: { ...qboxPlayer.metadata, inlaststand: true } })}
        exports.qbx_core = { GetPlayerData = function() return PD end }
      `),
      scripts: ["bridge.lua"],
    });
    await hud.run(`NUI.player.poll()`);
    expect(latest(hud).dead).toBe(true);
    expect(hud.messages.filter((m) => m.action === "nuikit:player").some((m) => "downed" in m.data)).toBe(false);
    expect(await hud.run(`return NUI.player.get().downed`)).toBeNull();
  });

  it("Qbox: maps PlayerData to the nuikit player shape", async () => {
    client = await createClient();
    const hud = await client.start("hud", {
      before: natives(`
        STARTED.qbx_core = true
        PD = ${luaTable(qboxPlayer)}
        exports.qbx_core = { GetPlayerData = function() return PD end }
      `),
      scripts: ["bridge.lua"],
    });
    expect(await hud.run(`return NUI.player.framework`)).toBe("qbox");
    expect(latest(hud)).toMatchObject({
      loaded: true,
      id: "ABC123",
      name: "Niko Bellic",
      cash: 500,
      bank: 13370,
      job: { name: "police", label: "LSPD", grade: 1, gradeLabel: "Officer", onDuty: true },
      hunger: 80,
      thirst: 64,
      stress: 3,
    });
    expect(latest(hud).gang).toBeUndefined();
  });

  it("Qbox: SetPlayerData, statebag needs, natives and unload all update the UI", async () => {
    client = await createClient();
    const hud = await client.start("hud", {
      before: natives(`
        STARTED.qbx_core = true
        PD = ${luaTable(qboxPlayer)}
        exports.qbx_core = { GetPlayerData = function() return PD end }
      `),
      scripts: ["bridge.lua"],
    });
    client.event("QBCore:Player:SetPlayerData", { ...qboxPlayer, money: { cash: 20, bank: 13370 } });
    expect(latest(hud).cash).toBe(20);

    await hud.run(`
      LocalPlayer.state.hunger = 41
      LocalPlayer.state.proximity = { distance = 3.5 }
      LocalPlayer.state.radioChannel = 101
      TALKING = true
      PED.health = 150 PED.armor = 37
      NUI.player.poll()
    `);
    expect(latest(hud)).toMatchObject({ hunger: 41, health: 50, armor: 37, voice: { range: 3.5, talking: true, radio: 101 } });

    client.event("QBCore:Client:OnPlayerUnload");
    expect(latest(hud).loaded).toBe(false);
  });

  it("only sends when something changed", async () => {
    client = await createClient();
    const hud = await client.start("hud", { before: natives(), scripts: ["bridge.lua"] });
    const count = () => hud.messages.filter((m) => m.action === "nuikit:player").length;
    const before = count();
    await hud.run(`NUI.player.poll() NUI.player.poll() NUI.player.poll()`);
    expect(count()).toBe(before);
    await hud.run(`PED.armor = 10 NUI.player.poll()`);
    expect(count()).toBe(before + 1);
  });

  it("QBCore: core object, needs and stress events", async () => {
    client = await createClient();
    const hud = await client.start("hud", {
      before: natives(`
        STARTED['qb-core'] = true
        PD = ${luaTable(qboxPlayer)}
        exports['qb-core'] = { GetCoreObject = function() return { Functions = { GetPlayerData = function() return PD end } } end }
      `),
      scripts: ["bridge.lua"],
    });
    expect(await hud.run(`return NUI.player.framework`)).toBe("qbcore");
    client.event("hud:client:UpdateNeeds", 55, 66);
    client.event("hud:client:UpdateStress", 12);
    expect(latest(hud)).toMatchObject({ name: "Niko Bellic", hunger: 55, thirst: 66, stress: 12 });
  });

  it("ESX: accounts, job and esx_status", async () => {
    client = await createClient();
    const hud = await client.start("hud", {
      before: natives(`
        STARTED.es_extended = true
        XP = { identifier = 'char1:abc', name = 'Niko Bellic', accounts = { { name = 'money', money = 900 }, { name = 'bank', money = 5000 } },
               job = { name = 'mechanic', label = 'Mechanic', grade = 2, grade_label = 'Lead' } }
        exports.es_extended = { getSharedObject = function() return { GetPlayerData = function() return XP end } end }
      `),
      scripts: ["bridge.lua"],
    });
    expect(latest(hud)).toMatchObject({ loaded: true, cash: 900, bank: 5000, job: { name: "mechanic", grade: 2, gradeLabel: "Lead" } });
    client.event("esx:setAccountMoney", { name: "bank", money: 4200 });
    client.event("esx_status:onTick", [
      { name: "hunger", percent: 33.3 },
      { name: "thirst", percent: 90 },
    ]);
    expect(latest(hud)).toMatchObject({ bank: 4200, hunger: 33, thirst: 90 });
  });

  it("standalone: loaded with natives only", async () => {
    client = await createClient();
    const hud = await client.start("hud", { before: natives(), scripts: ["bridge.lua"] });
    expect(await hud.run(`return NUI.player.framework`)).toBe("standalone");
    expect(latest(hud)).toMatchObject({ loaded: true, health: 100, armor: 0, dead: false });
    expect(latest(hud).cash).toBeUndefined();
  });

  it("pma-voice: Mumble talking (returns 1) and the proximity mode label", async () => {
    client = await createClient();
    const hud = await client.start("hud", {
      before: natives(`
        MUMBLE = 0
        function MumbleIsPlayerTalking() return MUMBLE end
        LocalPlayer.state.proximity = { index = 3, distance = 6.0, mode = "Shouting" }
      `),
      scripts: ["bridge.lua"],
    });
    await hud.run(`NUI.player.poll()`);
    expect(latest(hud).voice).toMatchObject({ talking: false, range: 6, mode: "Shouting" });
    await hud.run(`MUMBLE = 1; NUI.player.poll()`);
    expect(latest(hud).voice.talking).toBe(true);
  });
});

/** JS value → Lua table literal (test fixtures only). */
function luaTable(v: unknown): string {
  if (v === null || v === undefined) return "nil";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `{ ${v.map(luaTable).join(", ")} }`;
  return `{ ${Object.entries(v as object).map(([k, x]) => `[${JSON.stringify(k)}] = ${luaTable(x)}`).join(", ")} }`;
}
