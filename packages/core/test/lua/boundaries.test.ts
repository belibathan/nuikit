// Trust boundaries of the client runtime (docs/next/security.md): replicated surface and camera events,
// other players' state bags, the settings and keys exports, and values a page sends.
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

describe("replicated events speak only for their sender", () => {
  it("another resource can't open, close or push out a surface in someone else's name", async () => {
    client = await createClient();
    const inv = await client.start("inventory");
    const evil = await client.start("evil");
    await inv.run(`I = NUI.surface('inventory', { layer = 'panel' }) I:open()`);
    expect(client.focused()).toBe("inventory");
    await evil.run(`TriggerEvent('nuikit:sf:close', 'inventory', 'inventory')`);
    await evil.run(`TriggerEvent('nuikit:sf:open', { resource = 'inventory', name = 'fake', layer = 'modal', input = 'full', exclusive = true })`);
    await evil.run(`TriggerEvent('nuikit:sf:open', 'junk')`);
    expect(inv.surfaces().inventory).toMatchObject({ open: true, focused: true });
    expect(await inv.run(`local n = 0 for _, e in ipairs(NUI.surfaces()) do n = n + 1 end return n`)).toBe(1);
    expect(client.focused()).toBe("inventory");
    // its own surfaces still replicate
    await evil.run(`E = NUI.surface('panel', { layer = 'modal' }) E:open()`);
    expect(client.focused()).toBe("evil");
  });

  it("another resource can't claim or release a camera in someone else's name", async () => {
    const natives = `
      local n = 0
      function GetGameTimer() return 1000 end
      function PlayerPedId() return 1 end
      function IsEntityDead() return false end
      function GetEntityCoords() return { x = 0.0, y = 0.0, z = 0.0 } end
      function GetEntityHeading() return 0.0 end
      function GetFinalRenderedCamCoord() return { x = 0.0, y = -4.0, z = 1.0 } end
      function GetFinalRenderedCamRot() return { x = 0.0, y = 0.0, z = 0.0 } end
      function GetFinalRenderedCamFov() return 50.0 end
      function CreateCamWithParams() n = n + 1 return n end
      function DoesCamExist() return true end
      function DestroyCam() end function SetCamActive() end function RenderScriptCams() end
      function SetCamCoord() end function SetCamRot() end function SetCamFov() end
      function ClearFocus() end function SetFocusPosAndVel() end
      function CreateThread() end function Wait() end
    `;
    client = await createClient();
    const shop = await client.start("shop", { before: natives, scripts: ["camera.lua"] });
    const evil = await client.start("evil", { before: natives, scripts: ["camera.lua"] });
    await shop.run(`A = NUI.camera.claim({ id = 'fit' })`);
    await evil.run(`TriggerEvent('nuikit:cam:release', 'shop', 'fit')`);
    await evil.run(`TriggerEvent('nuikit:cam:claim', { resource = 'shop', id = 'other' })`);
    expect(await shop.run(`local s = NUI.camera.stack() return #s .. ':' .. s[1].id`)).toBe("1:fit");
    expect(await shop.run(`return NUI.camera.owner()`)).toBe("shop");
  });
});

describe("state bags", () => {
  it("zones and slots from another player's replicated bag are ignored", async () => {
    const bags = `
      BAGS = {}
      function AddStateBagChangeHandler(key, bag, fn) BAGS[key] = fn end
      function PlayerId() return 0 end
      function GetPlayerServerId() return 7 end
    `;
    client = await createClient();
    const ui = await client.start("ui", { before: bags });
    const count = () => ui.messages.filter((m) => m.action === "nuikit:zones" || m.action === "nuikit:slots").length;
    await ui.run(`BAGS.nuikitZones('player:12', 'nuikitZones', { ['x:y'] = { { x = 0, y = 0, w = 1, h = 1 } } })`);
    await ui.run(`BAGS.nuikitSlots('player:12', 'nuikitSlots', { hud = {} })`);
    await ui.run(`BAGS.nuikitZones('entity:3', 'nuikitZones', {})`);
    expect(count()).toBe(0);
    await ui.run(`BAGS.nuikitZones('player:7', 'nuikitZones', {})`);
    expect(count()).toBe(1);
  });
});

describe("settings and keys exports", () => {
  const SCHEMA = `{ label = 'HUD', rows = { { key = 'scale', label = 'Size', range = { 0.8, 1.2, 0.05 }, default = 1.0 } } }`;
  async function setup() {
    client = await createClient();
    const nuikit = await client.start("nuikit", { scripts: ["settings.lua", "keys.lua"] });
    const hud = await client.start("hud", { scripts: ["settings.lua", "keys.lua"] });
    const evil = await client.start("evil", { scripts: ["settings.lua", "keys.lua"] });
    await hud.run(`S = NUI.settings.define(${SCHEMA})`);
    return { nuikit, hud, evil };
  }

  it("a resource can't redefine, draft, save or reset another resource's section", async () => {
    const { hud, evil } = await setup();
    expect(await evil.run(`return exports.nuikit:settingsDefine('hud', { rows = { { key = 'scale', toggle = true, default = true } } }, {})`)).toBeFalsy();
    expect(await evil.run(`return exports.nuikit:settingsDraft('hud', { scale = 0.8 })`)).toBeFalsy();
    expect(await evil.run(`return exports.nuikit:settingsSave('hud')`)).toBeFalsy();
    expect(await evil.run(`return exports.nuikit:settingsReset('hud')`)).toBeFalsy();
    expect(await hud.run(`return S.values()`)).toEqual({ scale: 1 });
    // its own section still works
    expect(await hud.run(`return S.draft({ scale = 0.9 }).scale`)).toBeCloseTo(0.9);
  });

  it("a range refuses NaN (it would skip the clamp)", async () => {
    const { hud } = await setup();
    expect(await hud.run(`return NUI.settings.normalize({ range = { 0.8, 1.2, 0.05 } }, 0/0)`)).toBeFalsy();
    expect(await hud.run(`return S.draft({ scale = 0/0 }).scale`)).toBe(1);
    expect(await hud.run(`return NUI.settings.normalize({ range = { 0.8, 1.2 } }, math.huge)`)).toBe(1.2);
  });

  it("a resource declares keys only in its own name", async () => {
    const { nuikit, evil } = await setup();
    expect(await evil.run(`return exports.nuikit:keysDefine('hud', { id = 'open', label = 'Open', key = 'F1' })`)).toBe(false);
    expect(await evil.run(`return exports.nuikit:keysDefine('evil', 'junk')`)).toBe(false);
    expect(await evil.run(`return exports.nuikit:keysDefine('evil', { id = 'open', label = 'Open', key = 'F1' })`)).toBe(true);
    expect(await nuikit.run(`local l = NUI.keys.list() return #l .. ':' .. l[1].resource`)).toBe("1:evil");
  });
});
