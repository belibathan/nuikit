import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

const DEATH = fileURLToPath(new URL("../../../../systems/nuikit_death/", import.meta.url));
const PAUSE = fileURLToPath(new URL("../../../../systems/nuikit_pause/", import.meta.url));
const scripts = [DEATH + "config.lua", DEATH + "client/main.lua"];
let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

// Config files as the medical resources ship them (only the lines nuikit reads).
const natives = (started: string) => `
  NOW = 0
  STARTED = { ${started} }
  KEYS = {}
  JUST = {}
  SERVER = {}
  DEAD = false
  FILES = {
    ['qbx_medical/config/client.lua'] = "return {\\n  laststandReviveInterval = 360,\\n  deathTime = 300,\\n}",
    ['qbx_ambulancejob/config/client.lua'] = "return { laststandTimer = 300, -- seconds }",
    ['qbx_ambulancejob/config/shared.lua'] = "return { checkInCost = 2000 }",
    ['qb-ambulancejob/config.lua'] = "Config.BillCost = 2000\\nConfig.DeathTime = 300\\nConfig.ReviveInterval = 360\\nConfig.MinimumRevive = 300",
    ['esx_death/config.lua'] = "Config.EarlyRespawnTimer          = 60000 * 1  -- x\\nConfig.BleedoutTimer              = 60000 * 10\\nConfig.HoldDuration = 1500",
  }
  function GetResourceState(r) return STARTED[r] and 'started' or 'missing' end
  function LoadResourceFile(r, f) return FILES[r .. '/' .. f] end
  function GetGameTimer() return NOW end
  function PlayerPedId() return 1 end
  function IsEntityDead() return DEAD end
  function IsControlPressed(_, c) return KEYS[c] == true end
  function IsDisabledControlPressed() return false end
  function IsControlJustPressed(_, c) return JUST[c] == true end
  function IsDisabledControlJustPressed() return false end
  function TriggerServerEvent(e) SERVER[#SERVER + 1] = e end
  FX = {}
  function AnimpostfxPlay(n) FX[#FX + 1] = '+' .. n end
  function AnimpostfxStop(n) FX[#FX + 1] = '-' .. n end
  function CreateThread() end
  function Wait() end
  LocalPlayer = { state = {} }
  LS, DT, HOLD = 0, 0, 5
  QBX = {
    GetLaststandTime = function() return LS end,
    GetDeathTime = function() return DT end,
    GetRespawnHoldTimeDeprecated = function() return HOLD end,
  }
  ESXDEATH = { dead = false }
  exports = setmetatable({
    qbx_medical = QBX,
    esx_death = { GetDeathState = function() return ESXDEATH end },
    ['qb-core'] = { GetCoreObject = function() return { Functions = { GetPlayerData = function() return { metadata = {} } end } } end },
  }, { __call = function() end })
`;

const update = `return Death.update()`;

describe("systems/nuikit_death", () => {
  it("reads numbers from the medical resource's config, including `60000 * 10`", async () => {
    client = await createClient();
    const d = await client.start("nuikit_death", { before: natives(""), scripts });
    expect(await d.run(`return Death.configNumber('esx_death', 'config.lua', 'Config.BleedoutTimer')`)).toBe(600000);
    expect(await d.run(`return Death.configNumber('qbx_medical', 'config/client.lua', 'deathTime')`)).toBe(300);
    expect(await d.run(`return Death.configNumber('qb-ambulancejob', 'config.lua', 'Config.DeathTime')`)).toBe(300);
    expect(await d.run(`return Death.configNumber('nope', 'config.lua', 'x')`)).toBeNull();
    expect(await d.run(`return Death.medical`)).toBe("native");
  });

  it("Qbox: last stand from qbx_medical's statebag and exports, G only once qbx_ambulancejob would offer it", async () => {
    client = await createClient();
    const d = await client.start("nuikit_death", { before: natives("qbx_medical = true, qbx_ambulancejob = true"), scripts });
    expect(await d.run(`return Death.medical`)).toBe("qbx");
    expect(await d.run(update)).toBeNull();
    expect(d.surfaces().death.open).toBe(false);

    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 2 LS = 340`);
    await d.run(update);
    expect(d.surfaces().death).toMatchObject({ open: true, focused: false, layer: "system", data: { phase: "laststand", seconds: 340, total: 360, medical: "qbx", title: "You are down" } });
    expect(d.surfaces().death.data.ems).toBeUndefined(); // 340 s left > laststandTimer 300
    expect(client.focused()).toBe(null); // never takes the cursor: the medical resource needs the keys
    expect(await d.run(`return table.concat(SERVER, ',')`)).toBe("nuikit_death:doctors");

    // G pressed before help is offered doesn't count later
    await d.run(`JUST[47] = true Death.watchKeys() JUST[47] = false Death.update()`);
    await d.run(`LS = 290`);
    await d.run(update);
    expect(d.surfaces().death.data.ems).toBeUndefined(); // no doctors on duty
    client.event("nuikit_death:doctors", 2);
    await d.run(update);
    expect(d.surfaces().death.data).toMatchObject({ helpable: true, ems: { key: "G", state: "available" } });
    await d.run(`JUST[47] = true Death.watchKeys() JUST[47] = false Death.update()`);
    expect(d.surfaces().death.data.ems.state).toBe("requested");

    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 3 DT = 120 HOLD = 3`);
    await d.run(update);
    expect(d.surfaces().death.data).toMatchObject({
      phase: "dead", seconds: 120, total: 300,
      respawn: { key: "E", available: false, progress: 0.5, cost: 2000 },
    });

    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 1`);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(false);
    // GTA's own effect only while unconscious, stopped on revive
    expect(await d.run(`return table.concat(FX, ',')`)).toBe("+DeathFailMPIn,-DeathFailMPIn");
  });

  it("sets the client-wide 'dead' state, so the pause menu won't open over it", async () => {
    client = await createClient();
    const d = await client.start("nuikit_death", { before: natives("qbx_medical = true"), scripts });
    const pause = await client.start("nuikit_pause", {
      before: `
        function GetResourceState() return 'missing' end function GetConvar(_, d) return d end
        function CreateThread() end function Wait() end function IsPauseMenuActive() return false end
        function IsNuiFocused() return false end exports = setmetatable({}, { __call = function() end })
        LocalPlayer = { state = {} } function vec3(x, y, z) return { x = x, y = y, z = z } end`,
      scripts: [PAUSE + "config.lua", "bridge.lua", PAUSE + "client/camera.lua", PAUSE + "client/map3d.lua", PAUSE + "client/focus.lua", PAUSE + "client/keys.lua", PAUSE + "client/main.lua"],
    });
    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 2 LS = 100 Death.update()`);
    expect(await pause.run(`return NUI.getState('dead')`)).toBe("laststand");
    expect(await pause.run(`return Pause.blocked()`)).toBe("dead");
    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 3 Death.update()`);
    expect(await pause.run(`return NUI.getState('dead')`)).toBe("dead");
    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 1 Death.update()`);
    expect(await pause.run(`return Pause.blocked()`)).toBeNull();
  });

  it("QBCore: mirrors qb-ambulancejob's timers from the metadata change (estimated)", async () => {
    client = await createClient();
    const d = await client.start("nuikit_death", { before: natives("['qb-ambulancejob'] = true"), scripts });
    expect(await d.run(`return Death.medical`)).toBe("qb");

    client.event("QBCore:Player:SetPlayerData", { metadata: { inlaststand: true } });
    await d.run(update);
    expect(d.surfaces().death.data).toMatchObject({ phase: "laststand", seconds: 360, total: 360, estimated: true });
    expect(d.surfaces().death.data.ems).toBeUndefined();

    await d.run(`NOW = 70000`);
    await d.run(update);
    expect(d.surfaces().death.data).toMatchObject({ seconds: 290, helpable: true, ems: { key: "G", state: "available" } });

    // killed again in last stand: qb's death timer starts from what was left
    client.event("QBCore:Player:SetPlayerData", { metadata: { isdead: true, inlaststand: false } });
    await d.run(update);
    expect(d.surfaces().death.data).toMatchObject({ phase: "dead", seconds: 290, respawn: { key: "E", available: false, cost: 2000 } });

    await d.run(`NOW = 70000 + 291000 KEYS[38] = true`);
    await d.run(`Death.watchKeys() NOW = NOW + 2500 Death.watchKeys()`);
    await d.run(update);
    expect(d.surfaces().death.data).toMatchObject({ seconds: 0, respawn: { available: true, progress: 0.5 } });

    client.event("QBCore:Player:SetPlayerData", { metadata: {} });
    await d.run(update);
    expect(d.surfaces().death.open).toBe(false);
  });

  it("ESX: esx_death's live state, distress cooldown and early respawn", async () => {
    client = await createClient();
    const d = await client.start("nuikit_death", { before: natives("esx_death = true"), scripts });
    expect(await d.run(`return Death.medical`)).toBe("esx_death");
    await d.run(`ESXDEATH = { dead = true, earlyRemaining = 42.2, remaining = 642, distressRemaining = 0 }`);
    await d.run(update);
    expect(d.surfaces().death.data).toMatchObject({
      phase: "dead", seconds: 642, total: 660,
      respawn: { key: "E", available: false, wait: 43 }, ems: { key: "G", state: "available" },
    });
    await d.run(`ESXDEATH = { dead = true, earlyRemaining = 0, remaining = 500, distressRemaining = 30 }`);
    await d.run(update);
    expect(d.surfaces().death.data).toMatchObject({ respawn: { available: true }, ems: { state: "cooldown", seconds: 30 } });
    await d.run(`ESXDEATH = { dead = false }`);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(false);
  });

  it("standalone: the game's own death, no keys", async () => {
    client = await createClient();
    const d = await client.start("nuikit_death", { before: natives(""), scripts });
    await d.run(`DEAD = true`);
    await d.run(update);
    expect(d.surfaces().death.data).toMatchObject({ phase: "dead", medical: "native" });
    expect(d.surfaces().death.data.respawn).toBeUndefined();
    await d.run(`DEAD = false`);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(false);
  });
});
