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
  ANIM = false -- the ped lies in a qbx_ambulancejob bed
  function IsEntityPlayingAnim(_, dict, anim) return ANIM and dict == 'anim@gangops@morgue@table@' and anim == 'body_search' end
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
/** The values sent on the respawn bar's live channel (NUI.stream 'death:hold'), oldest first. */
const holds = (d: { messages: { action: string; data: any }[] }) =>
  d.messages.filter((m) => m.action === "death:hold").map((m) => m.data as number);

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
      respawn: { key: "E", available: false, cost: 2000 },
    });
    // the hold bar is never drawn from qbx_medical's own counter (HOLD = 3 above)
    expect(d.surfaces().death.data.respawn.progress).toBeUndefined();

    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 1`);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(false);
    // GTA's own effect only while unconscious, stopped on revive
    expect(await d.run(`return table.concat(FX, ',')`)).toBe("+DeathFailMPIn,-DeathFailMPIn");
  });

  it("Qbox: the E bar is nuikit's own hold time, smooth, ending on the qbx_medical tick that respawns", async () => {
    client = await createClient();
    const d = await client.start("nuikit_death", { before: natives("qbx_medical = true, qbx_ambulancejob = true"), scripts });
    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 3 DT = 100`);
    await d.run(update); // no doctors on duty: "Hold E to respawn"
    expect(d.surfaces().death.data.respawn).toMatchObject({ available: true, cost: 2000 });
    expect(holds(d)).toEqual([0]);

    // qbx_medical's loop ticks at 1000, 2000, … (seen as GetDeathTime() changing). E goes down at
    // 1300; it respawns on the fifth tick that finds E down: 2000, 3000, 4000, 5000, 6000.
    await d.run(`NOW = 0 Death.watchKeys() NOW = 1000 DT = 99 Death.watchKeys() NOW = 1300 KEYS[38] = true Death.watchKeys()`);
    const seen: Record<number, number> = {};
    for (let t = 1400; t <= 6500; t += 100) {
      if (t % 1000 === 0) await d.run(`DT = DT - 1`);
      // qbx_medical's own counter moves in whole seconds (5 → 1); nuikit doesn't read it any more
      await d.run(`NOW = ${t} HOLD = ${Math.max(1, 5 - Math.floor((t - 1000) / 1000))} Death.watchKeys()`);
      seen[t] = holds(d).at(-1)!;
    }
    expect(seen[1400]).toBeCloseTo(100 / 4700, 2);
    expect(seen[3600]).toBeCloseTo(2300 / 4700, 2);
    expect(seen[5900]).toBeCloseTo(4600 / 4700, 2);
    expect(seen[6000]).toBe(1);
    // smooth: a new value every 100 ms, never going back
    const values = holds(d).slice(1);
    expect(new Set(values).size).toBeGreaterThan(40);
    values.forEach((v, i) => expect(v).toBeGreaterThanOrEqual(i > 0 ? values[i - 1]! : 0));
    // nuikit never respawns anyone: qbx_medical does, on its own tick
    expect(await d.run(`return table.concat(SERVER, ',')`)).toBe("nuikit_death:doctors");

    // released between ticks: qbx_medical hasn't seen it yet, so neither has the bar
    await d.run(`KEYS[38] = false NOW = 6600 Death.watchKeys()`);
    expect(holds(d).at(-1)).toBe(1);
    // the next tick finds E up: qbx_medical resets its count, and the bar empties with it
    await d.run(`NOW = 7000 DT = DT - 1 Death.watchKeys()`);
    expect(holds(d).at(-1)).toBe(0);
  });

  it("Qbox: a release and re-press between two ticks keeps the bar in step; a tick with E up resets it", async () => {
    client = await createClient();
    const d = await client.start("nuikit_death", { before: natives("qbx_medical = true, qbx_ambulancejob = true"), scripts });
    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 3 DT = 100`);
    await d.run(update);
    // ticks at 1000, 2000, …; E down at 1300: the bar runs over 4700 ms, full on the 6000 tick
    await d.run(`NOW = 0 Death.watchKeys() NOW = 1000 DT = 99 Death.watchKeys() NOW = 1300 KEYS[38] = true Death.watchKeys()`);
    const at = async (t: number, lua = "") => {
      await d.run(`NOW = ${t} ${t % 1000 === 0 ? "DT = DT - 1" : ""} ${lua} Death.watchKeys()`);
      return holds(d).at(-1)!;
    };
    expect(await at(2000)).toBeCloseTo(700 / 4700, 2);
    // let go at 2300, press again at 2700: no tick in between, so qbx_medical counts on
    expect(await at(2300, "KEYS[38] = false")).toBeCloseTo(1000 / 4700, 2);
    expect(await at(2500)).toBeCloseTo(1200 / 4700, 2); // still moving: the hold isn't over until a tick
    expect(await at(2700, "KEYS[38] = true")).toBeCloseTo(1400 / 4700, 2);
    expect(await at(3000)).toBeCloseTo(1700 / 4700, 2);
    expect(await at(3600)).toBeCloseTo(2300 / 4700, 2); // exactly where an unbroken hold would be
    // let go at 3800 and stay up through the 4000 tick: qbx_medical resets to 5, the bar empties
    expect(await at(3800, "KEYS[38] = false")).toBeCloseTo(2500 / 4700, 2);
    expect(await at(4000)).toBe(0);
    // a fresh press at 4200: 800 ms to the 5000 tick + 4 s
    expect(await at(4200, "KEYS[38] = true")).toBe(0);
    expect(await at(4300)).toBeCloseTo(100 / 4800, 2);
    expect(await at(9000)).toBe(1);
  });

  it("QBCore: a release empties the bar at once (qb-ambulancejob reads E every frame)", async () => {
    client = await createClient();
    const d = await client.start("nuikit_death", { before: natives("['qb-ambulancejob'] = true"), scripts });
    client.event("QBCore:Player:SetPlayerData", { metadata: { isdead: true } });
    await d.run(`NOW = 1000`);
    await d.run(update);
    expect(d.surfaces().death.data.respawn).toMatchObject({ available: true });
    await d.run(`KEYS[38] = true Death.watchKeys() NOW = NOW + 2500 Death.watchKeys()`);
    expect(holds(d).at(-1)).toBe(0.5);
    await d.run(`KEYS[38] = false NOW = NOW + 100 Death.watchKeys()`);
    expect(holds(d).at(-1)).toBe(0);
  });

  it("Qbox: hides during qbx_ambulancejob's hospital-bed treatment, and comes back if it's interrupted", async () => {
    client = await createClient();
    const d = await client.start("nuikit_death", { before: natives("qbx_medical = true, qbx_ambulancejob = true"), scripts });
    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 3 DT = 0`);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(true);

    // respawned: the server checks the player into a bed (deathState stays 3 until treated)
    client.event("qbx_ambulancejob:client:checkedIn", "pillboxhospital", 2);
    await d.run(update); // fading out, the animation hasn't started yet
    expect(d.surfaces().death.open).toBe(false);
    expect(await d.run(`return NUI.getState('dead')`)).toBe("dead"); // still down: the pause menu stays blocked
    expect(await d.run(`return Death.isDown()`)).toBe(true);
    await d.run(`NOW = 3000 ANIM = true`);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(false);
    await d.run(`NOW = 15000`);
    await d.run(update); // past the grace window, the animation keeps it hidden
    expect(d.surfaces().death.open).toBe(false);

    // interrupted (out of the bed while still dead): the dead screen is back
    await d.run(`NOW = 16000 ANIM = false`);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(true);
    expect(d.surfaces().death.data).toMatchObject({ phase: "dead" });
    expect(d.surfaces().death.data.treatment).toBeUndefined();

    // an EMS puts the player in a bed but the animation never comes: back after the grace window
    client.event("qbx_ambulancejob:client:putPlayerInBed", "pillboxhospital", 3);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(false);
    await d.run(`NOW = 16000 + 10001`);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(true);

    // the animation alone (a bed reached without the events) also hides it
    await d.run(`ANIM = true`);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(false);

    // treated: qbx_medical revives, everything ends as usual
    await d.run(`LocalPlayer.state['qbx_medical:deathState'] = 1`);
    await d.run(update);
    expect(d.surfaces().death.open).toBe(false);
    expect(await d.run(`return NUI.getState('dead')`)).toBeFalsy();
    // the screen effect stops in the bed and plays again whenever the screen comes back
    expect(await d.run(`return table.concat(FX, ',')`)).toBe(
      "+DeathFailMPIn,-DeathFailMPIn,+DeathFailMPIn,-DeathFailMPIn,+DeathFailMPIn,-DeathFailMPIn",
    );
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
      scripts: [PAUSE + "config.lua", "bridge.lua", "camera.lua", "controls.lua", PAUSE + "client/camera.lua", PAUSE + "client/map3d.lua", PAUSE + "client/focus.lua", PAUSE + "client/keys.lua", PAUSE + "client/main.lua"],
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

    await d.run(`NOW = 70000 + 291000`);
    await d.run(update);
    expect(d.surfaces().death.data).toMatchObject({ seconds: 0, respawn: { available: true } });
    await d.run(`KEYS[38] = true Death.watchKeys() NOW = NOW + 2500 Death.watchKeys()`);
    expect(holds(d).at(-1)).toBe(0.5); // qb-ambulancejob's 5 s hold (Config.fallback.qb.hold)

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
