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
  -- minimap.lua has its own tests (minimap.test.ts); main.lua only flags it
  Minimap = { resend = function() end }
  -- the vehicle and the street (vehicle.lua, location.lua, adapters.lua)
  VEH, SPEED_MS, RPM, CLASS = 0, 0.0, 0.2, 0
  function DisplayRadar() end
  HIDDEN_HUD = {}
  function HideHudComponentThisFrame(c) HIDDEN_HUD[c] = true end
  function GetVehiclePedIsIn() return VEH end
  function IsPedInAnyVehicle() return VEH ~= 0 end
  function GetVehicleClass() return CLASS end
  function GetEntitySpeed() return SPEED_MS end
  function GetEntitySpeedVector() return { x = 0.0, y = SPEED_MS, z = 0.0 } end
  function GetVehicleCurrentRpm() return RPM end
  function GetVehicleCurrentGear() return 3 end
  function GetVehicleHighGear() return 6 end
  function GetVehicleFuelLevel() return 64.0 end
  function GetVehicleHandlingFloat() return 100.0 end
  function GetVehicleEngineHealth() return 1000.0 end
  function GetVehicleBodyHealth() return 1000.0 end
  function GetIsVehicleEngineRunning() return true end
  function GetVehicleHandbrake() return false end
  function GetPedInVehicleSeat() return 1 end
  HANDBRAKE_KEY = false
  function IsControlPressed() return HANDBRAKE_KEY end
  function GetVehicleIndicatorLights() return 0 end
  function GetVehicleLightsState() return true, 0, 0 end
  function GetEntityHeading() return 0.0 end
  function GetEntityCoords() return { x = 0.0, y = 0.0, z = 30.0 } end
  function GetStreetNameAtCoord() return 1, 0 end
  function GetStreetNameFromHashKey() return 'Elgin Ave' end
  function GetNameOfZone() return 'PBOX' end
  function GetLabelText() return 'Pillbox Hill' end
  function IsWaypointActive() return false end
  function Entity() return { state = {} } end
`;
// main.lua's threads run as coroutines; STEP(ms) moves the clock and wakes the ones that are due
const threads = `
  Minimap = { resend = function() end }
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
`;
const HUD_SCRIPTS = ["config.lua", "client/layout.lua", "client/adapters.lua", "client/location.lua", "client/vehicle.lua", "client/main.lua"].map((f) => HUD + f);
HUD_SCRIPTS.splice(1, 0, "bridge.lua");

describe("systems/nuikit_hud", () => {
  it("shows the HUD once a character is loaded and hides it on logout", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", {
      before: natives + ` PD = {} `,
      scripts: HUD_SCRIPTS,
    });
    expect(hud.surfaces().hud.open).toBe(false);

    client.event("QBCore:Player:SetPlayerData", { citizenid: "ABC", charinfo: { firstname: "Niko" }, money: { cash: 5, bank: 0 }, metadata: {} });
    expect(hud.surfaces().hud).toMatchObject({ open: true, visible: true, focused: false, data: { units: "mph", needs: true } });

    client.event("QBCore:Client:OnPlayerUnload");
    expect(hud.surfaces().hud.open).toBe(false);
  });

  it("places the parts by preset with Config.parts on top", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", {
      before: natives + ` PD = {} `,
      scripts: HUD_SCRIPTS,
    });
    await hud.run(`Config.parts = { vitals = 'top-left', ammo = { order = 3 }, wallet = false, map = 'bottom-left', location = 'nowhere' }`);
    client.event("QBCore:Player:SetPlayerData", { citizenid: "ABC", charinfo: { firstname: "Niko" }, money: { cash: 5, bank: 0 }, metadata: {} });
    expect(hud.surfaces().hud.data).toMatchObject({
      layout: "compact",
      parts: {
        map: "bottom-left",
        location: { at: "map", order: 1 },
        wallet: { at: false, order: 2 },
        vitals: { at: "top-left", order: 1 },
        ammo: { at: "bottom-right", order: 3 },
        vehicle: { at: "bottom-right", order: 2 },
      },
    });
  });

  it("/hud edit: a player's layout goes on top of Config.parts, saved per preset; reset and export", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", {
      before: natives + ` PD = {} function DeleteResourceKvp(k) DELETED = k end PRINTED = {} function print(s) PRINTED[#PRINTED + 1] = s end`,
      scripts: HUD_SCRIPTS,
    });
    await hud.run(`Config.parts = { vitals = 'top-left' }`);
    client.event("QBCore:Player:SetPlayerData", { citizenid: "ABC", charinfo: { firstname: "Niko" }, money: { cash: 5, bank: 0 }, metadata: {} });
    hud.commands.get("hud")!(0, ["edit"]);
    await hud.run(`return 1`); // flush
    expect(hud.surfaces()["hud-edit"]).toMatchObject({ open: true, focused: true, data: { preset: "compact", parts: { vitals: { at: "top-left" } } } });

    // the page's draft, with junk the server must drop
    const parts = { map: "bottom-left", vitals: { at: "bottom-right", order: 3 }, ammo: { at: false, order: 1 }, wallet: { at: "nowhere", order: 1 }, money: { at: "map", order: 1 } };
    expect(await hud.call("hud:parts:save", { parts })).toEqual({ ok: true });
    expect(hud.surfaces()["hud-edit"].open).toBe(false);
    expect(JSON.parse(hud.kvp.get("nuikit_hud:parts:compact")!)).toEqual({ map: "bottom-left", vitals: { at: "bottom-right", order: 3 }, ammo: { at: false, order: 1 } });
    expect(hud.surfaces().hud.data.parts).toMatchObject({ map: "bottom-left", vitals: { at: "bottom-right", order: 3 }, ammo: { at: false }, wallet: { at: "map", order: 2 } });
    expect(await hud.call("hud:parts:save", { parts: "nope" })).toEqual({ ok: false });

    hud.commands.get("hud")!(0, ["export"]);
    const printed = await hud.run<string>(`return PRINTED[#PRINTED]`);
    expect(printed).toContain("    map = 'bottom-left',");
    expect(printed).toContain("    ammo = { at = false, order = 1 },");
    expect(printed).toContain("    vitals = { at = 'bottom-right', order = 3 },");

    // a new session reads it back; reset drops it (Config.parts stays)
    expect(await hud.run(`Layout.player = nil Layout.loadPlayer() return Layout.parts().vitals.at`)).toBe("bottom-right");
    hud.commands.get("hud")!(0, ["reset"]);
    await hud.run(`return 1`); // flush
    expect(await hud.run(`return DELETED`)).toBe("nuikit_hud:parts:compact");
    expect(hud.surfaces().hud.data.parts.vitals.at).toBe("top-left");
    // playerLayout = false: no editor, saved layouts ignored
    await hud.run(`Config.playerLayout = false`);
    hud.commands.get("hud")!(0, ["edit"]);
    await hud.run(`return 1`); // flush
    expect(hud.surfaces()["hud-edit"].open).toBe(false);
  });

  it("legibility (Foundation 2): day or night from the game clock, sent on hud:ready and when it changes", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives + ` HOUR = 12 function GetClockHours() return HOUR end`, scripts: HUD_SCRIPTS });
    expect(await hud.run(`return { LegibilityOf(6), LegibilityOf(7), LegibilityOf(18), LegibilityOf(19) }`)).toEqual(["night", "day", "day", "night"]);
    await hud.call("hud:ready");
    expect(hud.messages.filter((m) => m.action === "hud:legibility").at(-1)!.data).toEqual({ mode: "day" });
    await hud.run(`Config.legibility.dayTo = 11`);
    await hud.call("hud:ready");
    expect(hud.messages.filter((m) => m.action === "hud:legibility").at(-1)!.data).toEqual({ mode: "night" });
  });

  it("named zones (Foundation 2): measured parts by zone, defaults and Config.zones for the rest", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts: HUD_SCRIPTS });
    await hud.run(`Config.zones = { prompts = { x = 0.5, y = 0.5, w = 0.1, h = 0.1 }, toasts = 'junk' }`);
    await hud.call("hud:zones", {
      rects: [
        { x: 0.8, y: 0.3, w: 0.1, h: 0.02, zone: "status" },
        { x: 0.79, y: 0.32, w: 0.12, h: 0.03, zone: "status" },
        { x: 0.02, y: 0.9, w: 0.2, h: 0.05, zone: "vitals" },
      ],
    });
    const z = await hud.run<any>(`return Layout.zones()`);
    expect(z.status).toMatchObject({ x: 0.79, y: 0.3, source: "hud" });
    expect(z.status.w).toBeCloseTo(0.12, 6);
    expect(z.status.h).toBeCloseTo(0.05, 6);
    expect(z.vitals).toMatchObject({ x: 0.02, y: 0.9, w: 0.2, h: 0.05, source: "hud" });
    expect(z.prompts).toMatchObject({ x: 0.5, y: 0.5, w: 0.1, h: 0.1, source: "config" }); // no safe area measured: the whole screen
    expect(z.toasts).toMatchObject({ x: 0, y: 0, source: "default" });
    expect(Object.keys(z).sort()).toEqual(["interaction", "map", "prompts", "status", "toasts", "vehicle", "vitals"]);
  });

  it("situations (Foundation 2): rest, interaction from other resources, sent only when they change", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts: HUD_SCRIPTS });
    const sent = () => hud.messages.filter((m) => m.action === "hud:situation").map((m) => m.data.name);
    await hud.call("hud:ready");
    expect(sent()).toEqual(["rest"]);
    await hud.run(`TriggerEvent('nuikit_hud:interaction', true)`);
    await hud.run(`TriggerEvent('nuikit_hud:interaction', true)`);
    await hud.run(`TriggerEvent('nuikit_hud:interaction', false)`);
    expect(sent()).toEqual(["rest", "interaction", "rest"]);
    // the page gets the lists and the lever (off by default)
    client.event("QBCore:Player:SetPlayerData", { citizenid: "ABC", charinfo: { firstname: "Niko" }, money: { cash: 5, bank: 0 }, metadata: {} });
    expect(hud.surfaces().hud.data.situations).toMatchObject({ retract: false, rest: ["map", "vehicle"] });
  });

  it("never takes focus, so it can't block other UIs", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts: HUD_SCRIPTS });
    const shop = await client.start("shop");
    await shop.run(`S = NUI.surface('shop', { hides = { 'hud' } }) S:open()`);
    expect(client.focused()).toBe("shop");
    expect(hud.surfaces().hud).toMatchObject({ open: true, visible: false });
  });

  it("streams speed and rpm as live values while driving; hud:vehicle only when the rest changes", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives + threads, scripts: HUD_SCRIPTS });
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
    const hud = await client.start("nuikit_hud", { before: natives, scripts: HUD_SCRIPTS });
    expect(hud.surfaces().hud.open).toBe(true);
    expect(await hud.run(`return BAGS.invOpen.bag`)).toBe("player:7");
    await hud.run(`BAGS.invOpen.fn("player:7", "invOpen", true)`);
    expect(hud.surfaces().hud.open).toBe(false);
    await hud.run(`BAGS.invOpen.fn("player:7", "invOpen", false)`);
    expect(hud.surfaces().hud.open).toBe(true);
  });

  it("flies: airspeed in knots, heading and altitude streamed, no rpm; on foot it costs no messages", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives + threads + ` CLASS = 16 function GetLandingGearState() return 0 end `, scripts: HUD_SCRIPTS });
    const sent = (a: string) => hud.messages.filter((m) => m.action === a).map((m) => m.data);
    // on foot for ten seconds: after the first location, nothing
    await hud.run(`for i = 1, 100 do STEP(100) end`);
    const idle = hud.messages.length;
    await hud.run(`for i = 1, 100 do STEP(100) end`);
    expect(hud.messages.length).toBe(idle);

    await hud.run(`VEH, SPEED_MS = 9, 60.0 for i = 1, 20 do STEP(50) end`);
    expect(sent("hud:vehicle").at(-1)).toMatchObject({ kind: "plane", units: "kts", altUnits: "ft", landingGear: "down", speed: 117, heading: 0, altitude: 98 });
    await hud.run(`for i = 1, 30 do SPEED_MS = 60.0 + i GetEntityHeading = function() return 360 - i * 2 end STEP(34) end`);
    expect(sent("hud:vehicle:speed").length).toBeGreaterThan(10);
    expect(sent("hud:vehicle:heading").at(-1)).toBeGreaterThan(40);
    expect(sent("hud:vehicle:rpm")).toEqual([]);
  });
});
