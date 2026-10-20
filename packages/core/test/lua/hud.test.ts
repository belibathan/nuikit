import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

const HUD = fileURLToPath(new URL("../../../../systems/nuikit_hud/", import.meta.url));
let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const natives = `
  PAUSED = false
  STARTED = { qbx_core = true }
  PD = { citizenid = 'ABC', charinfo = { firstname = 'Niko', lastname = 'Bellic' }, money = { cash = 1, bank = 2 }, metadata = {} }
  function GetResourceState(r) return STARTED[r] and 'started' or 'missing' end
  function GetConvar(_, d) return d end
  function PlayerPedId() return 1 end
  function PlayerId() return 0 end
  function GetPlayerServerId() return 7 end
  BAGS = {}
  function AddStateBagChangeHandler(key, bag, fn) BAGS[key] = { bag = bag, fn = fn } end
  function GetEntityHealth() return 200 end
  function GetEntityMaxHealth() return 200 end
  function GetPedArmour() return 0 end
  function IsEntityDead() return false end
  function NetworkIsPlayerTalking() return false end
  function IsPauseMenuActive() return PAUSED end
  function CreateThread() end
  function Wait() end
  LocalPlayer = { state = {} }
  exports = { qbx_core = { GetPlayerData = function() return PD end } }
`;

describe("systems/nuikit_hud", () => {
  it("shows the HUD once a character is loaded and hides it on logout", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", {
      before: natives + ` PD = {} `,
      scripts: [HUD + "config.lua", "bridge.lua", HUD + "client/main.lua"],
    });
    expect(hud.surfaces().hud.open).toBe(false);

    client.event("QBCore:Player:SetPlayerData", { citizenid: "ABC", charinfo: { firstname: "Niko" }, money: { cash: 5, bank: 0 }, metadata: {} });
    expect(hud.surfaces().hud).toMatchObject({ open: true, visible: true, focused: false, data: { units: "mph", needs: true } });

    client.event("QBCore:Client:OnPlayerUnload");
    expect(hud.surfaces().hud.open).toBe(false);
  });

  it("never takes focus, so it can't block other UIs", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts: [HUD + "config.lua", "bridge.lua", HUD + "client/main.lua"] });
    const shop = await client.start("shop");
    await shop.run(`S = NUI.surface('shop', { hides = { 'hud' } }) S:open()`);
    expect(client.focused()).toBe("shop");
    expect(hud.surfaces().hud).toMatchObject({ open: true, visible: false });
  });

  it("streams speed and rpm as live values while driving; hud:vehicle only when the rest changes", async () => {
    client = await createClient();
    // main.lua's threads run as coroutines; STEP(ms) moves the clock and wakes the ones that are due
    const threads = `
      Minimap = {}
      NOW, THREADS = 0, {}
      function GetGameTimer() return NOW end
      function CreateThread(fn) THREADS[#THREADS + 1] = { co = coroutine.create(fn), at = 0 } end
      function Wait(ms) coroutine.yield(ms) end
      function STEP(ms)
        NOW = NOW + ms
        for _, t in ipairs(THREADS) do
          if coroutine.status(t.co) == 'suspended' and t.at <= NOW then
            local ok, wait = coroutine.resume(t.co)
            assert(ok, wait)
            t.at = NOW + (wait or 0)
          end
        end
      end
      VEH, SPEED_MS, RPM = 0, 0.0, 0.2
      function DisplayRadar() end
      function GetVehiclePedIsIn() return VEH end
      function GetEntityModel() return 1 end
      function IsThisModelABicycle() return false end
      function GetEntitySpeed() return SPEED_MS end
      function GetVehicleCurrentRpm() return RPM end
      function GetVehicleCurrentGear() return 3 end
      function GetVehicleFuelLevel() return 64.0 end
      function GetVehicleEngineHealth() return 1000.0 end
      function Entity() return { state = {} } end
    `;
    const hud = await client.start("nuikit_hud", { before: natives + threads, scripts: [HUD + "config.lua", "bridge.lua", HUD + "client/main.lua"] });
    const sent = (a: string) => hud.messages.filter((m) => m.action === a).map((m) => m.data);
    await hud.run(`STEP(0)`);

    // gets in: hud:vehicle with where the gauge starts
    await hud.run(`VEH, SPEED_MS, RPM = 5, 4.47, 0.31 STEP(1000)`);
    expect(sent("hud:vehicle").at(-1)).toMatchObject({ speed: 10, rpm: 0.31, gear: 3, fuel: 64, moving: false, units: "mph" });

    // accelerating for a second: speed and rpm on their own channels at ≤30/s; hud:vehicle once more
    // (moving crosses 10 mph), not ten times
    await hud.run(`for i = 1, 100 do SPEED_MS = 4.47 + i * 0.1 RPM = 0.31 + i * 0.005 STEP(10) end`);
    const speeds = sent("hud:vehicle:speed");
    const rpms = sent("hud:vehicle:rpm");
    expect(rpms.length).toBeGreaterThanOrEqual(20);
    expect(rpms.length).toBeLessThanOrEqual(31);
    expect(speeds.every((s: number) => Number.isInteger(s))).toBe(true);
    expect(sent("hud:vehicle").length).toBe(2);
    expect(sent("hud:vehicle").at(-1)).toMatchObject({ moving: true });
    // the last change lands on the thread's next round
    await hud.run(`STEP(40)`);
    expect(sent("hud:vehicle:speed").at(-1)).toBe(Math.round(14.47 * 2.236936));
    expect(sent("hud:vehicle:rpm").at(-1)).toBeCloseTo(0.81, 5);

    // holding still: nothing more
    const before = hud.messages.length;
    await hud.run(`for i = 1, 50 do STEP(10) end`);
    expect(hud.messages.length).toBe(before);

    // gets out: hud:vehicle false, and the streams start over next time
    await hud.run(`VEH = 0 for i = 1, 50 do STEP(10) end`);
    expect(sent("hud:vehicle").at(-1)).toBe(false);
    const rpmCount = sent("hud:vehicle:rpm").length;
    await hud.run(`VEH = 5 for i = 1, 60 do STEP(10) end`);
    expect(sent("hud:vehicle:rpm").length).toBe(rpmCount + 1); // the same rpm, sent again once
  });

  it("hides while ox_inventory is open (its invOpen state bag), the moment it changes", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts: [HUD + "config.lua", "bridge.lua", HUD + "client/main.lua"] });
    expect(hud.surfaces().hud.open).toBe(true);
    expect(await hud.run(`return BAGS.invOpen.bag`)).toBe("player:7");
    await hud.run(`BAGS.invOpen.fn("player:7", "invOpen", true)`);
    expect(hud.surfaces().hud.open).toBe(false);
    await hud.run(`BAGS.invOpen.fn("player:7", "invOpen", false)`);
    expect(hud.surfaces().hud.open).toBe(true);
  });
});
