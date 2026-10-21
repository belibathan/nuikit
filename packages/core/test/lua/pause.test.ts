import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

const PAUSE = fileURLToPath(new URL("../../../../systems/nuikit_pause/", import.meta.url));
const SIMPLE = fileURLToPath(new URL("./fixtures/pause-simple.lua", import.meta.url));
const scripts = [PAUSE + "config.lua", SIMPLE, "bridge.lua", "camera.lua", "controls.lua", PAUSE + "client/camera.lua", PAUSE + "client/map3d.lua", PAUSE + "client/focus.lua", PAUSE + "client/keys.lua", PAUSE + "client/main.lua", PAUSE + "client/inventory.lua"];
let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

// Standalone framework; every native the menu touches is a knob or a recorder.
const natives = `
  NOW = 1000
  FRONTEND = false
  FOCUSED = false
  ESC = false
  DISABLED = 0
  SERVER = {}
  MENUS = {}
  THREADS = {}
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
  function IsEntityDead() return false end
  function NetworkIsPlayerTalking() return false end
  function IsPauseMenuActive() return FRONTEND end
  function IsNuiFocused() return FOCUSED end
  function SetPauseMenuActive() end
  BLUR = 0
  function TriggerScreenblurFadeIn() BLUR = BLUR + 1 end
  function TriggerScreenblurFadeOut() BLUR = BLUR - 1 end
  function DisableControlAction(_, c) if c == 200 then DISABLED = DISABLED + 1 end end
  function IsDisabledControlJustPressed(_, c) return c == 200 and ESC end
  function TriggerServerEvent(e) SERVER[#SERVER + 1] = e end
  function GetHashKey(s) return s end
  function ActivateFrontendMenu(menu) MENUS[#MENUS + 1] = menu end
  function PauseMenuceptionGoDeeper(n) MENUS[#MENUS + 1] = 'deeper:' .. n end
  function CreateThread(fn) THREADS[#THREADS + 1] = fn end
  function Wait() end
  LocalPlayer = { state = {} }
  -- the bigger menu: no stand-in here (the player is in a vehicle), so Home blurs like before
  function IsPedInAnyVehicle() return true end
  function IsEntityDead() return false end
  function vec3(x, y, z) return { x = x, y = y, z = z } end
  EXPORTS = {}
  exports = setmetatable({}, { __call = function(_, name, fn) EXPORTS[name] = fn end })
`;

/** Press Esc for one frame. */
const press = `ESC = true Pause.tick() ESC = false`;

describe("systems/nuikit_pause", () => {
  it("Esc opens the menu in place of GTA's, takes focus and asks the server for the player count", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(`Pause.tick()`);
    expect(await pause.run(`return DISABLED`)).toBe(1); // Esc is withheld from the game every frame
    expect(pause.surfaces().pause.open).toBe(false);

    await pause.run(press);
    expect(pause.surfaces().pause).toMatchObject({
      open: true, focused: true, layer: "modal",
      data: { serverId: 7, playerName: "niko", buttons: ["resume", "map", "keybinds", "info", "settings", "disconnect"] },
    });
    expect(client.focused()).toBe("nuikit_pause");
    expect(await pause.run(`return table.concat(SERVER, ',')`)).toBe("nuikit_pause:request");

    client.event("nuikit_pause:info", { players: 42, max: 128 });
    expect(pause.surfaces().pause.data).toMatchObject({ players: 42, maxPlayers: 128 });
  });

  it("hides the HUD while open", async () => {
    client = await createClient();
    const hud = await client.start("hud");
    await hud.run(`H = NUI.surface('hud', { layer = 'hud' }) H:open()`);
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    expect(hud.surfaces().hud).toMatchObject({ open: true, visible: false });
  });

  it("leaves Esc to the game while its frontend is open, NUI has focus or the player is dead", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });

    await pause.run(`FRONTEND = true ${press} FRONTEND = false`);
    await pause.run(`FOCUSED = true ${press} FOCUSED = false`);
    await pause.run(`NUI.player.set({ dead = true }) ${press} NUI.player.set({ dead = false })`);
    expect(await pause.run(`return DISABLED`)).toBe(0);
    expect(pause.surfaces().pause.open).toBe(false);

    // the frontend just closed: one Esc press must not fall through into our menu
    await pause.run(`NOW = NOW + 100 ${press}`);
    expect(pause.surfaces().pause.open).toBe(false);
    await pause.run(`NOW = NOW + 500 ${press}`);
    expect(pause.surfaces().pause.open).toBe(true);
  });

  it("won't open over another nuikit modal, a focused panel or the death screen", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    const other = await client.start("other");

    await other.run(`D = NUI.surface('death', { layer = 'system', input = 'none' }) D:open()`);
    expect(await pause.run(`return Pause.blocked()`)).toBe("modal");
    await other.run(`D:close() P = NUI.surface('shop', { layer = 'panel' }) P:open()`);
    expect(await pause.run(`return Pause.blocked()`)).toBe("surface");
    await other.run(`P:close() NUI.state('dead', 'laststand')`);
    expect(await pause.run(`return Pause.blocked()`)).toBe("dead");
    await other.run(`NUI.state('dead', false)`);
    expect(await pause.run(`return Pause.blocked()`)).toBeNull();
  });

  it("Esc in the menu closes it, and that same press can't reopen it", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    expect(await pause.call("nuikit:escape")).toMatchObject({ ok: true, closed: "pause" });
    expect(client.focused()).toBe(null);
    expect(await pause.run(`return BLUR`)).toBe(1); // still blurred until the next frame notices

    await pause.run(`NOW = NOW + 50 Pause.tick() ${press}`);
    expect(pause.surfaces().pause.open).toBe(false);
    expect(await pause.run(`return BLUR`)).toBe(0);
    await pause.run(`NOW = NOW + 1000 ${press}`);
    expect(pause.surfaces().pause.open).toBe(true);
    expect(await pause.call("pause:resume")).toEqual({ ok: true });
    expect(pause.surfaces().pause.open).toBe(false);
    expect(await pause.run(`return BLUR`)).toBe(0);
  });

  it("Map closes the menu and opens the game's pause menu on the map tab; Settings its settings", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    expect(await pause.call("pause:map")).toEqual({ ok: true });
    expect(pause.surfaces().pause.open).toBe(false);
    expect(client.focused()).toBe(null);
    await pause.run(`THREADS[#THREADS]()`);
    expect(await pause.run(`return table.concat(MENUS, ',')`)).toBe("FE_MENU_VERSION_MP_PAUSE,deeper:0");

    await pause.run(`MENUS = {} NOW = NOW + 1000 ${press}`);
    await pause.call("pause:settings");
    await pause.run(`THREADS[#THREADS]()`);
    expect(await pause.run(`return table.concat(MENUS, ',')`)).toBe("FE_MENU_VERSION_LANDING_MENU");
  });

  it("closing GTA's map brings the menu back; never opening it gives up quietly", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    await pause.call("pause:map");
    await pause.run(`THREADS[#THREADS]()`);
    await pause.run(`FRONTEND = true Pause.tick() Pause.tick()`);
    expect(pause.surfaces().pause.open).toBe(false);
    await pause.run(`FRONTEND = false Pause.tick()`);
    expect(pause.surfaces().pause.open).toBe(true);

    // a frontend that never appears: after 2s the next ticks don't reopen anything
    await pause.call("pause:resume");
    await pause.run(`NOW = NOW + 1000 ${press}`);
    await pause.call("pause:settings");
    await pause.run(`NOW = NOW + 2500 Pause.tick() Pause.tick()`);
    expect(pause.surfaces().pause.open).toBe(false);
  });

  it("uses the server's project name when the config leaves it empty", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    await pause.run(press);
    client.event("nuikit_pause:info", { players: 3, max: 64, name: "My City RP" });
    expect(pause.surfaces().pause.data.server.name).toBe("My City RP");
  });

  it("Disconnect asks the server to drop this player; hidden buttons do nothing", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", {
      before: natives,
      scripts: [PAUSE + "config.lua", SIMPLE, "bridge.lua", "camera.lua", "controls.lua", PAUSE + "client/camera.lua", PAUSE + "client/map3d.lua", PAUSE + "client/focus.lua", PAUSE + "client/keys.lua"],
    });
    await pause.run(`Config.buttons = { 'resume', 'disconnect' }`);
    await pause.run(readFileSync(PAUSE + "client/main.lua", "utf8"));
    await pause.run(press);
    expect(await pause.call("pause:settings")).toEqual({ ok: false });
    expect(pause.surfaces().pause.open).toBe(true);
    expect(await pause.call("pause:disconnect")).toEqual({ ok: true });
    expect(await pause.run(`return SERVER[#SERVER]`)).toBe("nuikit_pause:disconnect");
    expect(pause.surfaces().pause.open).toBe(false);
  });

  it("exports open/close for other resources", async () => {
    client = await createClient();
    const pause = await client.start("nuikit_pause", { before: natives, scripts });
    expect(await pause.run(`return EXPORTS.open()`)).toBe(true);
    expect(await pause.run(`return EXPORTS.isOpen()`)).toBe(true);
    await pause.run(`EXPORTS.close()`);
    expect(pause.surfaces().pause.open).toBe(false);
  });
});
