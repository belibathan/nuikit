// nuikit_hud v2: the HUD area, adapters (fuel, seatbelt, cruise, postal), the vehicle and the
// location, in real Lua 5.4 with the FiveM natives mocked.
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

const HUD = fileURLToPath(new URL("../../../../systems/nuikit_hud/", import.meta.url));
let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const natives = `
  STARTED = {}
  function GetResourceState(r) return STARTED[r] and 'started' or 'missing' end
  function CreateThread() end
  function Wait() end
  function print() end
  NOW = 0
  function GetGameTimer() NOW = NOW + 40 return NOW end
  function PlayerPedId() return 1 end
  LocalPlayer = { state = {} }
  STATE = {}
  function Entity() return { state = STATE } end
  FUEL_L, TANK = 32.5, 65.0
  function GetVehicleFuelLevel() return FUEL_L end
  function GetVehicleHandlingFloat() return TANK end
  -- the vehicle
  SPEED_MS, FORWARD, RPM, GEAR, ENGINE_ON = 0.0, 0.0, 0.2, 1, true
  function GetEntitySpeed() return SPEED_MS end
  function GetEntitySpeedVector() return { x = 0.0, y = FORWARD, z = 0.0 } end
  function GetVehicleCurrentRpm() return RPM end
  function GetVehicleCurrentGear() return GEAR end
  function GetVehicleHighGear() return 6 end
  function GetVehicleEngineHealth() return 350.0 end
  function GetVehicleBodyHealth() return 905.0 end
  function GetIsVehicleEngineRunning() return ENGINE_ON end
  HANDBRAKE = true
  function GetVehicleHandbrake() return HANDBRAKE end
  function GetPedInVehicleSeat() return 1 end
  HANDBRAKE_KEY = false
  function IsControlPressed(_, c) return c == 76 and HANDBRAKE_KEY end
  function GetVehiclePedIsIn() return 5 end
  function GetVehicleIndicatorLights() return 3 end
  function GetVehicleLightsState() return true, 1, 1 end
  function GetLandingGearState() return 3 end
  function GetEntityHeading() return 90.0 end
  function GetEntityCoords() return { x = 0.0, y = 0.0, z = 1000.0 } end
  -- the street
  function GetStreetNameAtCoord() return 11, 22 end
  NAMES = { [11] = 'Elgin Ave', [22] = 'Vespucci Blvd' }
  function GetStreetNameFromHashKey(h) return NAMES[h] end
  function GetNameOfZone() return 'PBOX' end
  function GetLabelText() return 'Pillbox Hill' end
  WAYPOINT = nil
  function IsWaypointActive() return WAYPOINT ~= nil end
  function GetFirstBlipInfoId() return 8 end
  function GetBlipInfoIdCoord() return WAYPOINT end
`;
const scripts = ["config.lua", "client/layout.lua", "client/adapters.lua", "client/location.lua", "client/vehicle.lua"].map((f) => HUD + f);

async function start(extra = "") {
  client = await createClient();
  return client.start("nuikit_hud", { before: natives + extra, scripts });
}

describe("nuikit_hud: the HUD area (client/layout.lua)", () => {
  it("falls back to the 0.5.0 rule: the middle 16:9, inset by the safe zone", async () => {
    const hud = await start();
    const a = await hud.run<any>(`return Layout.stage(2560, 1080, 1.0)`);
    expect(a.left).toBeCloseTo(320, 3); // (2560 - 1920) / 2
    expect(a.right).toBeCloseTo(2240, 3);
    expect(a.unitW).toBeCloseTo(1920, 3);
    const s = await hud.run<any>(`return Layout.stage(1920, 1080, 0.9)`);
    expect(s.left).toBeCloseTo(96, 3);
    expect(s.bottom).toBeCloseTo(1026, 3);
  });

  it("reads GTA's own alignment when it looks like a HUD area, and rejects nonsense", async () => {
    const hud = await start();
    // 21:9 with the HUD at the screen's edges: origin 0, a 16:9 unit is 1920/2560 of the width
    const edge = await hud.run<any>(`return Layout.fromGfx(2560, 1080, 0.0, 1.0, 0.75, 2.0)`);
    expect(edge).toMatchObject({ left: 0, right: 2560, bottom: 1080, top: 0, source: "game" });
    expect(edge.unitW).toBeCloseTo(1920, 3);
    // 32:9 with a centred 16:9 band and a 0.95 safe zone
    const mid = await hud.run<any>(`return Layout.fromGfx(5120, 1440, 0.25 + 0.025 * 0.5, 0.975, 0.25 + 0.025 * 0.5 + 0.5, 1.975)`);
    expect(mid.left).toBeCloseTo(1344, 3);
    expect(mid.unitW).toBeCloseTo(2560, 3);
    expect(mid.top).toBeCloseTo(36, 3);
    // wrong answers fall back
    expect(await hud.run(`return Layout.fromGfx(1920, 1080, 0.7, 1.0, 1.7, 2.0) == nil`)).toBe(true); // origin past the middle
    expect(await hud.run(`return Layout.fromGfx(1920, 1080, 0.0, 1.0, 0.1, 2.0) == nil`)).toBe(true); // unit too narrow
    expect(await hud.run(`return Layout.fromGfx(1920, 1080, nil, nil, nil, nil) == nil`)).toBe(true);
  });

  it("sends the area to the page as screen fractions, only when it changed", async () => {
    const hud = await start(`
      SCREEN = { 1920, 1080 }
      function GetActiveScreenResolution() return SCREEN[1], SCREEN[2] end
      function GetSafeZoneSize() return 0.9 end
    `);
    await hud.run(`Config.area = 'stage' Layout.update() Layout.update()`);
    const sent = hud.messages.filter((m) => m.action === "hud:layout").map((m) => m.data);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ l: 0.05, r: 0.05, t: 0.05, b: 0.05, source: "stage" });
    await hud.run(`SCREEN = { 2560, 1080 } Layout.update()`);
    expect(hud.messages.filter((m) => m.action === "hud:layout")).toHaveLength(2);
  });

  it("knows where GTA's stock minimap is, for Config.minimap.enabled = false", async () => {
    const hud = await start();
    const box = await hud.run<any>(`return Layout.stockMinimap(Layout.stage(1920, 1080, 1.0))`);
    expect(box.w).toBeCloseTo(0.15 * 1920, 3);
    expect(box.h).toBeCloseTo(0.188888 * 1080, 3);
    expect(box.x).toBeCloseTo(-0.0045 * 1920, 3);
    expect(box.y + box.h).toBeCloseTo(1080 + 0.002 * 1080, 3);
  });
});

describe("nuikit_hud: fuel adapter", () => {
  it("auto: ox_fuel's state bag, then LegacyFuel / cdn-fuel exports, else the native as a percentage", async () => {
    const hud = await start();
    // nothing started: the native, litres over the tank
    expect(await hud.run(`return Adapters.fuel(5)`)).toBe(50);
    expect(await hud.run(`return Adapters.fuelName()`)).toBe("native");

    await hud.run(`STARTED.LegacyFuel = true exports.LegacyFuel = { GetFuel = function(_, veh) return 41.6 end } Adapters.pickFuel()`);
    expect(await hud.run(`return Adapters.fuel(5)`)).toBe(42);
    expect(await hud.run(`return Adapters.fuelName()`)).toBe("LegacyFuel");

    await hud.run(`STARTED['cdn-fuel'] = true STARTED.LegacyFuel = nil exports['cdn-fuel'] = { GetFuel = function() return 12 end } Adapters.pickFuel()`);
    expect(await hud.run(`return Adapters.fuel(5)`)).toBe(12);

    await hud.run(`STARTED.ox_fuel = true STATE.fuel = 77.4 Adapters.pickFuel()`);
    expect(await hud.run(`return Adapters.fuel(5)`)).toBe(77);
  });

  it("falls back to the native when the source has no answer, and hides fuel with Config.fuel = false", async () => {
    const hud = await start();
    await hud.run(`STARTED.LegacyFuel = true exports.LegacyFuel = { GetFuel = function() error('not tracked') end } Adapters.pickFuel()`);
    expect(await hud.run(`return Adapters.fuel(5)`)).toBe(50);
    await hud.run(`Config.fuel = false Adapters.pickFuel()`);
    expect(await hud.run(`return Adapters.fuel(5) == nil`)).toBe(true);
    // a resource starting later is picked up
    await hud.run(`Config.fuel = 'auto' STARTED.LegacyFuel = nil Adapters.pickFuel()`);
    client.event("onClientResourceStart", "ox_fuel");
    await hud.run(`STARTED.ox_fuel = true STATE.fuel = 9`);
    expect(await hud.run(`return Adapters.fuel(5)`)).toBe(9);
  });
});

describe("nuikit_hud: seatbelt, cruise and postal hooks", () => {
  it("is unknown until something reports it, then follows the hook events and state bags", async () => {
    const hud = await start();
    expect(await hud.run(`return Adapters.seatbelt() == nil`)).toBe(true);
    client.event("nuikit_hud:seatbelt", true);
    expect(await hud.run(`return Adapters.seatbelt()`)).toBe(true);
    // qb-smallresources' toggle
    client.event("seatbelt:client:ToggleSeatbelt");
    expect(await hud.run(`return Adapters.seatbelt()`)).toBe(false);
    // a state bag wins
    await hud.run(`LocalPlayer.state.seatbelt = true`);
    expect(await hud.run(`return Adapters.seatbelt()`)).toBe(true);

    expect(await hud.run(`return Adapters.cruise() == nil`)).toBe(true);
    client.event("nuikit_hud:cruise", true, 64.6);
    expect(await hud.run(`return { Adapters.cruise() }`)).toEqual([true, 65]);
    await hud.run(`Adapters.leftVehicle()`);
    expect(await hud.run(`return Adapters.cruise()`)).toBe(false);
  });

  it("reads nearest-postal's getPostal when it's started", async () => {
    const hud = await start();
    expect(await hud.run(`return Adapters.postal() == nil`)).toBe(true);
    await hud.run(`STARTED['nearest-postal'] = true exports['nearest-postal'] = { getPostal = function() return 7023 end } Adapters.pickPostal()`);
    expect(await hud.run(`return Adapters.postal()`)).toBe("7023");
    await hud.run(`Config.location.postal = false Adapters.pickPostal()`);
    expect(await hud.run(`return Adapters.postal() == nil`)).toBe(true);
  });
});

describe("nuikit_hud: the vehicle (client/vehicle.lua)", () => {
  it("shows R in reverse or rolling back, N stopped at idle or with the engine off", async () => {
    const hud = await start();
    const gear = (raw: number, fwd: number, rpm: number, on = true) => hud.run(`return Vehicle.gear(${raw}, ${fwd}, ${rpm}, ${on})`);
    expect(await gear(0, 0, 0.3)).toBe("R");
    expect(await gear(1, -2, 0.4)).toBe("R");
    expect(await gear(1, 0, 0.2)).toBe("N");
    expect(await gear(1, 0, 0.6)).toBe(1); // revving at a standstill: in gear
    expect(await gear(3, 0, 0.2, false)).toBe("N");
    expect(await gear(4, 20, 0.7)).toBe(4);
  });

  it("maps classes to clusters and units", async () => {
    const hud = await start();
    expect(await hud.run(`return { Vehicle.kind(0), Vehicle.kind(8), Vehicle.kind(14), Vehicle.kind(15), Vehicle.kind(16) }`)).toEqual(["car", "bike", "boat", "heli", "plane"]);
    expect(await hud.run(`return Vehicle.kind(13) == nil`)).toBe(true); // bicycles off by default
    expect(await hud.run(`return { Vehicle.speedUnits('plane', 'kmh'), Vehicle.speedUnits('boat', 'mph'), Vehicle.speedUnits('car', 'kmh') }`)).toEqual(["kts", "kts", "kmh"]);
    expect(await hud.run(`return { Vehicle.lights(0, 0), Vehicle.lights(1, 0), Vehicle.lights(1, 1) }`)).toEqual(["off", "low", "high"]);
  });

  it("reads a car's slow fields; the same read twice is the same (no re-send)", async () => {
    const hud = await start(`LocalPlayer.state.seatbelt = false`);
    await hud.run(`SPEED_MS, FORWARD, RPM, GEAR = 20.0, 20.0, 0.7, 4`);
    const v = await hud.run<any>(`return Vehicle.read(5, 'car', 'kmh')`);
    expect(v).toMatchObject({
      kind: "car", units: "kmh", engineOn: true, gear: 4, gears: 6, fuel: 50, engine: 35, body: 91,
      handbrake: true, indicators: 3, lights: "high", seatbelt: false, moving: true, redline: 0.9,
    });
    expect(await hud.run(`return Vehicle.same(Vehicle.read(5, 'car', 'kmh'), Vehicle.read(5, 'car', 'kmh'))`)).toBe(true);
    expect(await hud.run(`local a = Vehicle.read(5, 'car', 'kmh') GEAR = 5 return Vehicle.same(a, Vehicle.read(5, 'car', 'kmh'))`)).toBe(false);
  });

  it("gives aircraft altitude and heading instead of gear and rpm", async () => {
    const hud = await start();
    const v = await hud.run<any>(`return Vehicle.read(5, 'plane', 'mph')`);
    expect(v).toMatchObject({ kind: "plane", units: "kts", altUnits: "ft", landingGear: "up" });
    expect(v.gear).toBeUndefined();
    expect(v.handbrake).toBeUndefined();
    const live = await hud.run<any>(`SPEED_MS = 50.0 return Vehicle.live(5, 'plane', 'mph')`);
    expect(live).toMatchObject({ speed: 97, heading: 270, altitude: 3281 }); // GTA heading 90 = west
    expect(live.rpm).toBeUndefined();
  });
});

describe("nuikit_hud: the location (client/location.lua)", () => {
  it("rounds the waypoint distance to what is shown", async () => {
    const hud = await start();
    const q = (m: number, u: string) => hud.run<number>(`return Location.quantize(${m}, '${u}')`);
    expect(await q(437, "kmh")).toBe(440);
    expect(await q(1849, "kmh")).toBe(1800);
    expect(await q(100, "mph")).toBe(Math.round(Math.round((100 * 3.28084) / 50) * 50 / 3.28084));
    expect(await q(1850, "mph")).toBe(Math.round(Math.round(1850 / 160.9344) * 160.9344));
  });

  it("sends hud:location only when something shown changed", async () => {
    const hud = await start();
    const sent = () => hud.messages.filter((m) => m.action === "hud:location").map((m) => m.data);
    await hud.run(`Location.tick('mph', true) Location.tick('mph', true)`);
    expect(sent()).toEqual([{ visible: true, street: "Elgin Ave", crossing: "Vespucci Blvd", zone: "Pillbox Hill" }]);
    // walking a few metres towards a waypoint 2 km away: one message, then nothing until it rounds differently
    await hud.run(`WAYPOINT = { x = 2000.0, y = 0.0, z = 0.0 } Location.tick('kmh', true) WAYPOINT = { x = 1990.0, y = 0.0, z = 0.0 } Location.tick('kmh', true)`);
    expect(sent()).toHaveLength(2);
    expect(sent()[1].waypoint).toBe(2000);
    await hud.run(`Location.tick('kmh', false) Location.tick('kmh', false)`);
    expect(sent().at(-1)).toEqual({ visible: false });
    expect(sent()).toHaveLength(3);
  });
});

describe("nuikit_hud: the waypoint bearing and the weapon (client/location.lua, client/weapon.lua)", () => {
  it("gives the waypoint's compass bearing in 5 degree steps", async () => {
    const hud = await start();
    expect(await hud.run(`return Location.bearing(0, 100)`)).toBe(0); // north is +y
    expect(await hud.run(`return Location.bearing(100, 0)`)).toBe(90); // east is +x
    expect(await hud.run(`return Location.bearing(-100, -100)`)).toBe(225);
    expect(await hud.run(`return Location.bearing(-1, 1000)`)).toBe(0); // 359.9 rounds to north
    await hud.run(`WAYPOINT = { x = 100.0, y = 100.0, z = 0.0 } Location.tick('kmh', true)`);
    const loc = hud.messages.filter((m) => m.action === "hud:location").at(-1)!.data;
    expect(loc).toMatchObject({ bearing: 45, waypoint: 140 });
  });

  it("sends the weapon's clip and reserve while armed, nothing for melee, only on change", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", {
      before: natives + `
        WEAPON, GROUP, TOTAL, CLIP = 0, 0, 0, 0
        function GetSelectedPedWeapon() return WEAPON end
        function GetWeapontypeGroup() return GROUP end
        function GetAmmoInPedWeapon() return TOTAL end
        function GetAmmoInClip() return true, CLIP end
      `,
      scripts: [...scripts, HUD + "client/weapon.lua"],
    });
    const sent = () => hud.messages.filter((m) => m.action === "hud:weapon").map((m) => m.data);
    expect(await hud.run(`return Weapon.kind(416676503)`)).toBe("pistol");
    expect(await hud.run(`return Weapon.kind(-957766203)`)).toBe("smg"); // signed, as the native returns it
    expect(await hud.run(`return Weapon.kind(-728555052)`)).toBe(null); // melee
    await hud.run(`Weapon.tick()`);
    expect(sent()).toEqual([false]);
    await hud.run(`WEAPON, GROUP, TOTAL, CLIP = 453432689, 416676503, 60, 12 Weapon.tick() Weapon.tick()`);
    expect(sent()).toEqual([false, { clip: 12, reserve: 48, kind: "pistol" }]);
    await hud.run(`TOTAL, CLIP = 59, 11 Weapon.tick()`);
    expect(sent().at(-1)).toEqual({ clip: 11, reserve: 48, kind: "pistol" });
    await hud.run(`GROUP, TOTAL = 1548507267, 3 Weapon.tick()`);
    expect(sent().at(-1)).toEqual({ clip: 3, kind: "thrown" });
    await hud.run(`GROUP = -728555052 Weapon.tick()`);
    expect(sent().at(-1)).toBe(false);
  });
});

describe("nuikit_hud: in-game fixes (Oct 20)", () => {
  it("lights the handbrake while the driver holds the key, when GetVehicleHandbrake misses it", async () => {
    const hud = await start();
    expect(await hud.run(`HANDBRAKE = false return Vehicle.read(5, 'car', 'mph').handbrake`)).toBe(false);
    expect(await hud.run(`HANDBRAKE_KEY = true return Vehicle.read(5, 'car', 'mph').handbrake`)).toBe(true);
  });

  it("follows qbx_cruise's bare toggle event, with the speed it held", async () => {
    const hud = await start();
    expect(await hud.run(`local on = Adapters.cruise(2.236936) return on`)).toBe(null);
    await hud.run(`SPEED_MS = 26.8224 TriggerEvent('seatbelt:client:ToggleCruise')`);
    expect(await hud.run(`return { Adapters.cruise(2.236936) }`)).toEqual([true, 60]);
    await hud.run(`TriggerEvent('seatbelt:client:ToggleCruise')`);
    expect(await hud.run(`return { Adapters.cruise(2.236936) }`)).toEqual([false]);
    // leaving the vehicle ends it (qbx_cruise's loop stops without an event)
    await hud.run(`TriggerEvent('seatbelt:client:ToggleCruise')`); // events are delivered after the call
    await hud.run(`Adapters.leftVehicle()`);
    expect(await hud.run(`local on = Adapters.cruise(2.236936) return on`)).toBe(false);
  });
});
