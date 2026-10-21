import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

const PAUSE = fileURLToPath(new URL("../../../../systems/nuikit_pause/", import.meta.url));
const scripts = [PAUSE + "config.lua", "bridge.lua", "camera.lua", "controls.lua", PAUSE + "client/camera.lua", PAUSE + "client/map3d.lua", PAUSE + "client/focus.lua", PAUSE + "client/keys.lua", PAUSE + "client/main.lua", PAUSE + "client/inventory.lua"];
let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

// A player at (100, 200, 30), on foot or in a car; cameras and shape tests are recorders.
const natives = `
  NOW = 1000
  IN_VEHICLE = false
  ESC = false
  BLUR = 0
  CAMS, DESTROYED, FOCUS, WAYPOINT, SERVER, THREADS = {}, 0, 0, nil, {}, {}
  WALL = nil -- set to a distance to put a wall between the player and the focus camera
  CAMPOS = {}
  RENDER = {}
  function vec3(x, y, z) return { x = x, y = y, z = z } end
  local V = {}
  V.__sub = function(a, b) return setmetatable({ x = a.x - b.x, y = a.y - b.y, z = a.z - b.z }, V) end
  V.__len = function(a) return math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) end
  function vector3(x, y, z) return setmetatable({ x = x, y = y, z = z }, V) end
  LOGS = {}
  function print(s) LOGS[#LOGS + 1] = s end
  function IsEntityVisible() return true end
  LIGHTS = 0
  function DrawLightWithRange() LIGHTS = LIGHTS + 1 end
  function GetResourceState() return 'missing' end
  function GetConvar(_, d) return d end
  function GetGameTimer() return NOW end
  function PlayerPedId() return 1 end
  function PlayerId() return 0 end
  function GetPlayerServerId() return 7 end
  function GetPlayerName() return 'niko' end
  function GetEntityHealth() return 200 end
  function GetEntityMaxHealth() return 200 end
  function GetPedArmour() return 0 end
  function NetworkIsPlayerTalking() return false end
  function IsPauseMenuActive() return false end
  function IsNuiFocused() return false end
  function SetPauseMenuActive() end
  function TriggerScreenblurFadeIn() BLUR = BLUR + 1 end
  function TriggerScreenblurFadeOut() BLUR = BLUR - 1 end
  function DisableControlAction() end
  function IsDisabledControlJustPressed(_, c) return c == 200 and ESC end
  function TriggerServerEvent(e) SERVER[#SERVER + 1] = e end
  function CreateThread(fn) THREADS[#THREADS + 1] = fn end
  function Wait() end
  LocalPlayer = { state = {} }
  exports = setmetatable({}, { __call = function() end })
  -- the player and the world
  function GetEntityCoords() return vec3(100.0, 200.0, 30.0) end
  function GetEntityHeading() return 90.0 end
  function IsPedInAnyVehicle() return IN_VEHICLE end
  function GetVehiclePedIsIn() return IN_VEHICLE and 77 or 0 end
  function GetEntityModel() return 1 end
  function GetModelDimensions() return vec3(-1.0, -2.4, -0.6), vec3(1.0, 2.4, 0.9) end
  function GetOffsetFromEntityInWorldCoords(_, x, y, z) return vec3(100.0 + x, 200.0 + y, 30.0 + z) end
  function GetFinalRenderedCamCoord() return vec3(100.0, 196.0, 31.0) end
  function GetFinalRenderedCamRot() return vec3(-10.0, 0.0, 0.0) end
  function GetFinalRenderedCamFov() return 50.0 end
  function IsPedRagdoll() return false end
  function IsPedSwimming() return false end
  function IsPedFalling() return false end
  function IsPedInParachuteFreeFall() return false end
  function GetGroundZFor_3dCoord() return true, 30.0 end
  function GetGameplayCamCoord() return vec3(100.0, 196.0, 31.0) end
  function GetGameplayCamRot() return vec3(-10.0, 0.0, 0.0) end
  function GetAspectRatio() return 16 / 9 end
  function GetActiveScreenResolution() return 1920, 1080 end
  function GetFirstBlipInfoId() return 0 end
  function DoesBlipExist() return false end
  function SetNewWaypoint(x, y) WAYPOINT = { x, y } end
  function SetWaypointOff() WAYPOINT = 'off' end
  -- cameras
  function CreateCam() CAMS[#CAMS + 1] = 'preview' return #CAMS end
  function CreateCamWithParams() CAMS[#CAMS + 1] = 'map' return #CAMS end
  function DestroyCam() DESTROYED = DESTROYED + 1 end
  function SetCamActive() end
  function SetCamFov() end
  function SetCamCoord(_, x, y, z) CAMPOS = { x, y, z } end
  function SetCamRot() end
  function RenderScriptCams(on) RENDER[#RENDER + 1] = on end
  function ClearFocus() FOCUS = FOCUS + 1 end
  STREAM = nil
  function SetFocusPosAndVel(x, y, z) STREAM = { x, y, z } end
  function DoesCamExist(c) return c ~= nil end
  DEAD = false
  function IsEntityDead() return DEAD end
  STOP_HANDLERS = {}
  function SetTimecycleModifier() end
  function ClearTimecycleModifier() end
  -- picking
  function GetCamCoord() return vec3(100.0, 200.0, 930.0) end
  function GetCamRot() return vec3(-89.0, 0.0, 0.0) end
  function GetCamFov() return 50.0 end
  PROBE = nil
  function StartExpensiveSynchronousShapeTestLosProbe(x1, y1, z1, x2, y2, z2, flags, ignore) PROBE = { x1, y1, z1, x2, y2, z2, ignore } return 9 end
  function GetShapeTestResult()
    -- the map's pick ray starts high above: it hits the ground at (110, 200, 30)
    if PROBE[3] > 500 then return 2, 1, vec3(110.0, 200.0, 30.0) end
    -- the focus camera's wall check starts at the player: a wall WALL metres along it, or nothing
    if not WALL then return 2, 0, vec3(0, 0, 0) end
    local dx, dy, dz = PROBE[4] - PROBE[1], PROBE[5] - PROBE[2], PROBE[6] - PROBE[3]
    local len = math.sqrt(dx * dx + dy * dy + dz * dz)
    return 2, 1, vec3(PROBE[1] + dx / len * WALL, PROBE[2] + dy / len * WALL, PROBE[3] + dz / len * WALL)
  end
  function GetStreetNameAtCoord() return 11, 22 end
  function GetStreetNameFromHashKey(h) return h == 11 and 'Elgin Ave' or 'Vespucci Blvd' end
  function GetNameOfZone() return 'PBOX' end
  function GetLabelText(z) return z == 'PBOX' and 'Pillbox Hill' or z end
  -- keys
  function GetHashKey(s) return #s end
  function GetControlInstructionalButton(_, c) if c == 23 then return 't_f' end if c == 249 then return 'b_1015' end return '' end
`;

const press = `ESC = true Pause.tick() ESC = false`;

describe("systems/nuikit_pause: the bigger menu", () => {
  it("Home focuses the camera on the player instead of blurring, on foot or in a vehicle", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    expect(await pause.run(`return Focus.isActive()`)).toBe(true);
    expect(await pause.run(`return BLUR`)).toBe(0);
    expect(pause.surfaces().pause.data.preview).toBe(true);
    expect(await pause.run(`return LOGS[#LOGS]`)).toMatch(/focus: shown on foot: camera \d+\.\d m back/);
    const onFoot = await pause.run<number>(`return Focus.state().last.d`);
    await pause.run(`Pause.close()`);
    expect(await pause.run(`return RENDER[#RENDER]`)).toBe(false); // back to the gameplay camera
    expect(await pause.run(`return Focus.isActive()`)).toBe(false);

    await pause.run(`IN_VEHICLE = true NOW = NOW + 1000`);
    await pause.run(press);
    expect(await pause.run(`return BLUR`)).toBe(0);
    expect(await pause.run(`return LOGS[#LOGS]`)).toMatch(/focus: shown vehicle/);
    expect(await pause.run<number>(`return Focus.state().last.d`)).toBeGreaterThan(onFoot); // a car needs more room
    await pause.run(`Pause.close()`);
    expect(await pause.run(`return BLUR`)).toBe(0);
  });

  it("on foot the camera keeps the heading it started with: a ped that turns toward it can't spin it (0.7.0 F5)", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    await pause.run(`for _ = 1, 120 do Focus.step(0.05) end`);
    const before = await pause.run<number[]>(`return CAMPOS`);
    // first person: GTA turns the ped toward the camera, every frame
    await pause.run(`HEADING = 90.0 GetEntityHeading = function() HEADING = HEADING + 15.0 return HEADING end`);
    await pause.run(`for _ = 1, 60 do Focus.step(0.05) end`);
    const after = await pause.run<number[]>(`return CAMPOS`);
    expect(Math.hypot(after[0]! - before[0]!, after[1]! - before[1]!)).toBeLessThan(0.01);
  });

  it("the focus camera glides in from the current view, and never sits behind a wall", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    // it starts exactly where the gameplay camera was, then settles into its framing
    const first = await pause.run<{ x: number; y: number }>(`return Focus.state().residual`);
    expect(Math.abs(first.x) + Math.abs(first.y)).toBeGreaterThan(0.1);
    await pause.run(`for _ = 1, 120 do Focus.step(0.05) end`);
    const settled = await pause.run<{ x: number; y: number }>(`return Focus.state().residual`);
    expect(Math.abs(settled.x) + Math.abs(settled.y)).toBeLessThan(0.001);
    const free = await pause.run<number[]>(`return CAMPOS`);
    const dist = (p: number[]) => Math.hypot(p[0]! - 100, p[1]! - 200);
    // a wall 1.5 m out from the player: the camera comes in to just in front of it
    await pause.run(`WALL = 1.5 Focus.step(0.05)`);
    const walled = await pause.run<number[]>(`return CAMPOS`);
    expect(dist(walled)).toBeLessThan(1.5);
    expect(dist(walled)).toBeLessThan(dist(free));
    expect(await pause.run(`return PROBE[7]`)).toBe(1); // the player is not their own wall
  });

  it("Map takes over from the focus camera without a second blend, and hands back the same way", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    const rendersAtOpen = await pause.run<number>(`return #RENDER`);
    expect(await pause.call("pause:view", { view: "map" })).toEqual({ ok: true, preview: false });
    expect(await pause.run(`return Map3D.isActive() and not Focus.isActive()`)).toBe(true);
    // the map's camera cut in on the very same view; nothing blended back to the game in between
    expect(await pause.run(`local out = {} for i = ${rendersAtOpen} + 1, #RENDER do out[#out + 1] = RENDER[i] end return out`)).toEqual([true]);
    expect(await pause.run(`return BLUR`)).toBe(0);

    expect(await pause.call("pause:view", { view: "keys" })).toEqual({ ok: true, preview: true });
    expect(await pause.run(`return Map3D.isActive()`)).toBe(false);
    expect(await pause.run(`return FOCUS`)).toBe(1); // world streaming handed back
    expect(await pause.run(`return BLUR`)).toBe(0); // Key bindings keeps the player in view
    const keys = pause.messages.filter((m) => m.action === "pause:keys").at(-1)!.data;
    expect(keys.find((k: { label: string }) => k.label === "Enter vehicle").key).toBe("F");
    expect(keys.find((k: { label: string }) => k.label === "Push to talk").key).toBe("Alt");
    expect(keys.find((k: { label: string }) => k.label === "Inventory").key).toBeUndefined(); // not bound

    expect(await pause.call("pause:view", { view: "home" })).toEqual({ ok: true, preview: true });
    await pause.call("pause:view", { view: "map" });
    await pause.run(`Pause.close()`);
    expect(await pause.run(`return Map3D.isActive() or Focus.isActive()`)).toBe(false);
    expect(await pause.run(`return RENDER[#RENDER]`)).toBe(false);
    expect(await pause.run(`return BLUR`)).toBe(0);

    expect(await pause.call("pause:view", { view: "map" })).toEqual({ ok: false }); // closed: ignored
    expect(await pause.run(`return Map3D.isActive()`)).toBe(false);
  });

  it("picks the ground under the cursor with its street, zone and distance; sets the waypoint", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    await pause.call("pause:view", { view: "map" });
    const hit = await pause.call("pause:map:pick", { u: 0.5, v: 0.5 });
    expect(hit).toMatchObject({ ok: true, street: "Elgin Ave", crossing: "Vespucci Blvd", zone: "Pillbox Hill", point: { x: 110, y: 200, z: 30 } });
    expect(hit.distance).toBeCloseTo(10, 5);
    await pause.call("pause:map:waypoint", { x: 110, y: 200 });
    expect(await pause.run(`return WAYPOINT[1]`)).toBe(110);
    await pause.call("pause:map:waypoint", { clear: true });
    expect(await pause.run(`return WAYPOINT`)).toBe("off");
  });

  it("the camera eases toward its goal and never leaves its limits", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    await pause.call("pause:view", { view: "map" });
    await pause.call("pause:map:zoom", { delta: 0.5 });
    for (let i = 0; i < 40; i++) await pause.call("pause:map:zoom", { delta: 0.5 });
    await pause.call("pause:map:rotate", { dx: 0, dy: 5 });
    await pause.run(`Map3D.step(1)`); // the turn lands
    const goal = await pause.run<{ d: number; pitch: number }>(`local _, g = Map3D.state() return { d = g.d, pitch = g.pitch }`);
    expect(goal.d).toBe(6000);
    expect(goal.pitch).toBe(-89);
    await pause.run(`for _ = 1, 200 do Map3D.step(0.05) end`);
    const cur = await pause.run<{ d: number; pitch: number }>(`local c = Map3D.state() return { d = c.d, pitch = c.pitch }`);
    expect(cur.d).toBeCloseTo(6000, 0);
    expect(cur.pitch).toBeCloseTo(-89, 3);
    // straight down from 1000 m: the eye is right above the target
    const eye = await pause.run<number[]>(`return { Map3D.eye({ x = 10, y = 20, z = 30, d = 1000, pitch = -90, heading = 45 }) }`);
    expect(eye[0]).toBeCloseTo(10, 6);
    expect(eye[1]).toBeCloseTo(20, 6);
    expect(eye[2]).toBeCloseTo(1030, 6);
    expect(await pause.run(`return Map3D.turn(350, 10)`)).toBe(20);
  });

  it("projects pins from the camera it set this frame: the target is the centre, east is right", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    const s = "{ x = 0, y = 0, z = 0, d = 500, pitch = -89.9, heading = 0 }";
    const centre = await pause.run<number[]>(`return { Map3D.project(${s}, 16 / 9, 0, 0, 0) }`);
    expect(centre[0]).toBeCloseTo(0.5, 3);
    expect(centre[1]).toBeCloseTo(0.5, 3);
    const east = await pause.run<number[]>(`return { Map3D.project(${s}, 16 / 9, 100, 0, 0) }`);
    expect(east[0]).toBeGreaterThan(0.5);
    expect(east[1]).toBeCloseTo(0.5, 2);
    const north = await pause.run<number[]>(`return { Map3D.project(${s}, 16 / 9, 0, 100, 0) }`);
    expect(north[1]).toBeLessThan(0.5); // north is up the screen at heading 0
    // behind the camera: nothing
    expect(await pause.run(`return Map3D.project({ x = 0, y = 0, z = 0, d = 100, pitch = -30, heading = 0 }, 16 / 9, 0, -5000, 0)`)).toBeFalsy();
  });

  it("a drag lands on the live camera within a 60 Hz interval (the ground follows the cursor); zoom still eases", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    await pause.call("pause:view", { view: "map" });
    await pause.run(`for _ = 1, 300 do Map3D.step(0.05) end`);
    const x = () => pause.run<number>(`local c = Map3D.state() return c.x`);
    const before = await pause.run<{ x: number; d: number }>(`local c = Map3D.state() return { x = c.x, d = c.d }`);
    await pause.call("pause:map:pan", { dx: -0.1, dy: 0 });
    expect(await x()).toBeCloseTo(before.x, 6); // nothing moves until the next frame
    await pause.run(`Map3D.step(1 / 60)`);
    const one = (await x()) - before.x;
    for (let i = 0; i < 20; i++) await pause.run(`Map3D.step(1 / 60)`);
    const all = (await x()) - before.x;
    expect(all).toBeGreaterThan(50); // dragged left at heading 0: the view moves east
    expect(one / all).toBeGreaterThan(0.7); // most of it in the first frame, not eased
    expect(one / all).toBeLessThan(0.8);
    // a turn lands the same way, and the pitch never leaves its limits
    await pause.call("pause:map:rotate", { dx: 0, dy: -5 });
    for (let i = 0; i < 20; i++) await pause.run(`Map3D.step(1 / 60)`);
    expect(await pause.run<number>(`local _, g = Map3D.state() return g.pitch`)).toBeCloseTo(-25, 3);
    await pause.call("pause:map:zoom", { delta: 0.5 });
    expect((await pause.run<{ d: number }>(`local c = Map3D.state() return { d = c.d }`)).d).toBeCloseTo(before.d, 3);
  });

  it("frames the player between the inventory panels while ox_inventory is open", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    // the override's middle gap at 1080p: 37.5rem in from each side (36rem sheets + 1.5rem air), between the bar and the top
    const f = await pause.run<{ x: number; w: number; y: number; h: number }>(`return Inventory.frame(1920, 1080)`);
    expect(f.x).toBeCloseTo((37.5 * 16) / 1920, 3);
    expect(f.x + f.w).toBeCloseTo(1 - f.x, 6);
    expect(f.y + f.h).toBeCloseTo(1 - (4 * 16) / 1080, 4); // room for the key bar

    await pause.run(`LocalPlayer.state.invOpen = true Inventory.tick()`);
    expect(await pause.run(`return Focus.isActive() and Inventory.isFocusing()`)).toBe(true);
    expect(await pause.run(`return Focus.state().frame.x`)).toBeCloseTo(f.x, 6);
    expect(await pause.run(`return BLUR`)).toBe(0);

    await pause.run(`LocalPlayer.state.invOpen = false Inventory.tick()`);
    expect(await pause.run(`return Focus.isActive()`)).toBe(false);
    expect(await pause.run(`return RENDER[#RENDER]`)).toBe(false); // glided back to the game

    // the pause menu's own framing is untouched by the inventory's
    await pause.run(press);
    expect(await pause.run(`return Focus.state().frame.x`)).toBeCloseTo(0.36, 6);
  });

  it("the camera service hands over between owners, streams with the claim and always gives the camera back", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(`LOST = {} Camera.claim({ id = 'a', onLost = function(r) LOST[#LOST + 1] = 'a:' .. r end }) Camera.stream(1, 2, 3)`);
    expect(await pause.run(`return Camera.owner()`)).toBe("a");
    expect(await pause.run(`return STREAM[1]`)).toBe(1);
    // b takes over: a's camera goes, a's streaming is cleared, a hears about it; nothing blended back
    const renders = await pause.run<number>(`return #RENDER`);
    await pause.run(`Camera.claim({ id = 'b' })`);
    expect(await pause.run(`return Camera.owner()`)).toBe("b");
    expect(await pause.run(`return LOST[1]`)).toBe("a:handover");
    expect(await pause.run(`return FOCUS`)).toBe(1);
    expect(await pause.run(`return RENDER[${renders} + 1]`)).toBe(true);
    // only the owner can release
    expect(await pause.run(`return Camera.release('a')`)).toBe(false);
    expect(await pause.run(`return Camera.release('b')`)).toBe(true);
    expect(await pause.run(`return RENDER[#RENDER]`)).toBe(false);
    expect(await pause.run(`return Camera.isActive()`)).toBe(false);
  });

  it("the camera comes back when the player dies, and when the resource stops", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    expect(await pause.run(`return Camera.owner()`)).toBe("focus");
    // the service's watch thread is the last one created: run one pass of it as the player dies
    await pause.run(`DEAD = true THREADS[#THREADS]()`);
    expect(await pause.run(`return Camera.isActive()`)).toBe(false);
    expect(await pause.run(`return RENDER[#RENDER]`)).toBe(false);
    expect(await pause.run(`return Focus.isActive()`)).toBe(false);
    expect(await pause.run(`return Pause.isOpen()`)).toBe(false); // the death screen owns the screen now
    expect(await pause.run(`return BLUR`)).toBe(0);

    await pause.run(`DEAD = false NOW = NOW + 1000`);
    await pause.run(press);
    await pause.call("pause:view", { view: "map" });
    expect(await pause.run(`return Camera.owner()`)).toBe("map");
    await pause.run(`TriggerEvent('onClientResourceStop', GetCurrentResourceName())`);
    expect(await pause.run(`return Camera.isActive()`)).toBe(false);
    expect(await pause.run(`return RENDER[#RENDER]`)).toBe(false);
  });

  it("going down with the map open (Qbox last stand: the ped is alive again) closes the menu and gives the camera back", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    await pause.call("pause:view", { view: "map" });
    expect(await pause.run(`return Camera.owner()`)).toBe("map");
    // nuikit_death sets the client-wide state; GTA doesn't think the ped is dead
    await pause.run(`NUI.state('dead', 'laststand')`);
    await pause.run(`Pause.tick()`);
    expect(await pause.run(`return Pause.isOpen()`)).toBe(false);
    expect(await pause.run(`return Camera.isActive()`)).toBe(false);
    expect(await pause.run(`return RENDER[#RENDER]`)).toBe(false);
    expect(await pause.run(`return Map3D.isActive()`)).toBe(false);
    expect(client.focused()).toBe(null);
    // nothing brings the focus camera back while down: not the inventory, not Esc
    expect(await pause.run(`return Focus.start()`)).toBe(false);
    await pause.run(`NOW = NOW + 1000 ${press}`);
    expect(await pause.run(`return Pause.isOpen()`)).toBe(false);

    await pause.run(`NUI.state('dead', false) NOW = NOW + 1000`);
    await pause.run(press);
    expect(await pause.run(`return Pause.isOpen()`)).toBe(true);
    expect(await pause.run(`return Camera.owner()`)).toBe("focus");
  });

  it("is flat for reduced motion or Config.camera = false: no scripted cameras, Home blurs, Map is GTA's", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(`NUI.prefs.set({ reducedMotion = true })`);
    await pause.run(press);
    expect(await pause.run(`return Camera.isActive()`)).toBe(false);
    expect(await pause.run(`return BLUR`)).toBe(1);
    const data = pause.surfaces().pause.data;
    expect(data.views.map).toBe(false); // the UI sends Map to GTA's map instead
    expect(data.views.preview).toBe(false);
    expect(await pause.call("pause:view", { view: "map" })).toEqual({ ok: false });
    await pause.run(`LocalPlayer.state.invOpen = true Inventory.tick()`);
    expect(await pause.run(`return Camera.isActive()`)).toBe(false);
    await pause.run(`Pause.close() LocalPlayer.state.invOpen = false Inventory.tick()`);

    await pause.run(`NUI.prefs.set({ reducedMotion = false }) Config.camera = false NOW = NOW + 1000`);
    await pause.run(press);
    expect(await pause.run(`return Camera.isActive()`)).toBe(false);
  });

  it("names keys from GTA's button codes", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    expect(await pause.run(`return { Keys.name('t_e'), Keys.name('b_170'), Keys.name('b_2000'), Keys.name('b_116'), Keys.name(''), Keys.name(nil) }`)).toEqual(["E", "F1", "Space", "Wheel down"]);
  });
});
