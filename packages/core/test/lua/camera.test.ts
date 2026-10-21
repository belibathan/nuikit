import { afterEach, describe, expect, it } from "vitest";
import { createClient as create } from "./harness";

let client: Awaited<ReturnType<typeof create>>;
afterEach(() => client?.close());

// Cameras and RenderScriptCams are recorders; threads are coroutines driven by TICK(n) (Wait yields).
const natives = `
  NOW = 1000
  DEAD = false
  CAMS = {}          -- handle → { exists, active, pos, rot, fov }
  RENDER = {}        -- every RenderScriptCams call: { on, ease, ms }
  FOCUS, STREAM = 0, nil
  THREADS = {}
  PED = { x = 100.0, y = 200.0, z = 30.0, heading = 90.0 }
  function GetGameTimer() return NOW end
  function PlayerPedId() return 1 end
  function IsEntityDead() return DEAD end
  function GetEntityCoords() return { x = PED.x, y = PED.y, z = PED.z } end
  function GetEntityHeading() return PED.heading end
  function GetFinalRenderedCamCoord() return { x = 100.0, y = 196.0, z = 31.0 } end
  function GetFinalRenderedCamRot() return { x = -10.0, y = 0.0, z = 0.0 } end
  function GetFinalRenderedCamFov() return 50.0 end
  function CreateCamWithParams(_, x, y, z, rx, ry, rz, fov) CAMS[#CAMS + 1] = { exists = true, active = false, pos = { x, y, z }, rot = { rx, ry, rz }, fov = fov } return #CAMS end
  function DoesCamExist(c) return CAMS[c] ~= nil and CAMS[c].exists end
  function DestroyCam(c) CAMS[c].exists = false CAMS[c].active = false end
  function SetCamActive(c, on) CAMS[c].active = on end
  function SetCamCoord(c, x, y, z) CAMS[c].pos = { x, y, z } end
  function SetCamRot(c, x, y, z) CAMS[c].rot = { x, y, z } end
  function SetCamFov(c, f) CAMS[c].fov = f end
  function RenderScriptCams(on, ease, ms) RENDER[#RENDER + 1] = { on = on, ease = ease, ms = ms } end
  function ClearFocus() FOCUS = FOCUS + 1 end
  function SetFocusPosAndVel(x, y, z) STREAM = { x, y, z } end
  function CreateThread(fn) THREADS[#THREADS + 1] = coroutine.create(fn) end
  function Wait(ms) coroutine.yield(ms) end
  -- run every thread once per frame, n frames, 16 ms apart
  function TICK(n)
    for _ = 1, n do
      NOW = NOW + 16
      for i = #THREADS, 1, -1 do
        local co = THREADS[i]
        if coroutine.status(co) == 'dead' then table.remove(THREADS, i)
        else local ok, err = coroutine.resume(co) if not ok then error(err) end end
      end
    end
  end
  function LIVE() local n = 0 for _, co in ipairs(THREADS) do if coroutine.status(co) ~= 'dead' then n = n + 1 end end return n end
  function ACTIVE() local out = {} for i, c in ipairs(CAMS) do if c.exists and c.active then out[#out + 1] = tostring(i) end end return table.concat(out, ',') end
  function POS(h, i) return CAMS[h.cam].pos[i] end
  function ROT(h, i) return CAMS[h.cam].rot[i] end
  function LASTRENDER() return RENDER[#RENDER] end
`;
const scripts = ["camera.lua", "controls.lua"];

describe.each([
  ["queued events", false],
  ["synchronous events", true],
])("camera service (lua/camera.lua, %s)", (_label, syncEvents) => {
  const createClient = () => create({ syncEvents });

  it("a claim starts on the current view and cuts in; release blends back to the gameplay camera", async () => {
    client = await createClient();
    const r = await client.start("shop", { before: natives, scripts });
    expect(await r.run(`return LIVE()`)).toBe(0); // idle: no thread
    const from = await r.run<{ fov: number; coord: { y: number } }>(`H, FROM = NUI.camera.claim({ id = 'preview' }) return FROM`);
    expect(from.fov).toBe(50);
    expect(from.coord.y).toBe(196);
    expect(await r.run(`return POS(H, 2)`)).toBe(196);
    expect(await r.run(`return LASTRENDER().on`)).toBe(true);
    expect(await r.run(`return LASTRENDER().ease`)).toBe(false); // a cut to the same view
    expect(await r.run(`return NUI.camera.isActive()`)).toBe(true);
    expect(await r.run(`return NUI.camera.handle()`)).toBe(1);
    expect(await r.run(`local res, id = NUI.camera.owner() return res .. ':' .. id`)).toBe("shop:preview");
    expect(await r.run(`return LIVE()`)).toBe(1); // the watch thread, while a claim is held
    expect(await r.run(`return H:release({ ms = 400 })`)).toBe(true);
    expect(await r.run(`local l = LASTRENDER() return l.on == false and l.ease == true and l.ms == 400`)).toBe(true);
    expect(await r.run(`return CAMS[H.cam].exists`)).toBe(false);
    expect(await r.run(`return NUI.camera.isActive()`)).toBe(false);
    expect(await r.run(`return H:release()`)).toBe(false); // twice is a no-op
    await r.run(`TICK(2)`);
    expect(await r.run(`return LIVE()`)).toBe(0); // and the thread is gone
  });

  it("a claim on top suspends the one below; releasing the top resumes it, not the gameplay camera", async () => {
    client = await createClient();
    const r = await client.start("shop", { before: natives, scripts });
    await r.run(`
      LOG = {}
      A = NUI.camera.claim({ id = 'a', onSuspend = function() LOG[#LOG + 1] = 'a:suspend' end, onResume = function() LOG[#LOG + 1] = 'a:resume' end })
      B = NUI.camera.claim({ id = 'b' })
    `);
    expect(await r.run(`return ACTIVE()`)).toBe("2"); // only b renders; a's camera still exists
    expect(await r.run(`return CAMS[A.cam].exists`)).toBe(true);
    expect(await r.run(`return LOG[#LOG]`)).toBe("a:suspend");
    expect(await r.run(`return A:isActive()`)).toBe(false);
    expect(await r.run(`return B:isActive()`)).toBe(true);
    const renders = await r.run<number>(`return #RENDER`);
    expect(await r.run(`return B:release()`)).toBe(true);
    expect(await r.run(`return ACTIVE()`)).toBe("1"); // a is back
    expect(await r.run(`return LOG[#LOG]`)).toBe("a:resume");
    expect(await r.run(`return RENDER[#RENDER].on`)).toBe(true); // script cams stayed on: no blend to the game
    expect((await r.run<{ on: boolean }[]>(`local out = {} for i = ${renders} + 1, #RENDER do out[#out + 1] = RENDER[i] end return out`)).every((x) => x.on)).toBe(true);
    expect(await r.run(`local _, id = NUI.camera.owner() return id`)).toBe("a");
    await r.run(`A:release()`);
    expect(await r.run(`return RENDER[#RENDER].on`)).toBe(false);
    expect(await r.run(`return NUI.camera.isActive()`)).toBe(false);
  });

  it("releasing a suspended claim changes nothing on screen; the stack is client-wide across resources", async () => {
    client = await createClient();
    const shop = await client.start("shop", { before: natives, scripts });
    const garage = await client.start("garage", { before: natives, scripts });
    await shop.run(`A = NUI.camera.claim({ id = 'fit' })`);
    await garage.run(`B = NUI.camera.claim({ id = 'preview' })`);
    expect(await shop.run(`return ACTIVE()`)).toBe(""); // shop's camera is suspended
    expect(await garage.run(`return ACTIVE()`)).toBe("1");
    expect(await shop.run(`return #NUI.camera.stack()`)).toBe(2);
    expect(await garage.run(`local s = NUI.camera.stack() return s[1].resource .. '/' .. s[2].resource`)).toBe("shop/garage");
    // shop lets go underneath: no RenderScriptCams, garage keeps the screen
    const renders = await shop.run<number>(`return #RENDER`);
    expect(await shop.run(`return A:release()`)).toBe(true);
    expect(await shop.run(`return #RENDER`)).toBe(renders);
    expect(await garage.run(`return ACTIVE()`)).toBe("1");
    expect(await garage.run(`local res = NUI.camera.owner() return res`)).toBe("garage");
    // only the owner can release its claim
    expect(await shop.run(`return NUI.camera.release('preview')`)).toBe(false);
    await garage.run(`B:release()`);
    expect(await garage.run(`return RENDER[#RENDER].on`)).toBe(false);
    expect(await shop.run(`return NUI.camera.isActive()`)).toBe(false);
  });

  it("a resource stopping releases its claims: the one below resumes, or the gameplay camera comes back", async () => {
    client = await createClient();
    const shop = await client.start("shop", { before: natives, scripts });
    const garage = await client.start("garage", { before: natives, scripts });
    await shop.run(`A = NUI.camera.claim({ id = 'fit' })`);
    await garage.run(`B = NUI.camera.claim({ id = 'preview' })`);
    client.stop("garage");
    expect(await shop.run(`return ACTIVE()`)).toBe("1"); // shop's camera renders again
    expect(await shop.run(`local res, id = NUI.camera.owner() return res .. ':' .. id`)).toBe("shop:fit");
    expect(await shop.run(`return #NUI.camera.stack()`)).toBe(1);
    client.stop("shop");
    // shop was the last: nothing left anywhere (checked from a fresh copy)
    const hud = await client.start("hud", { before: natives, scripts });
    expect(await hud.run(`return NUI.camera.isActive()`)).toBe(false);
  });

  it("the resource that stops cuts back to the gameplay camera itself when it was the last owner", async () => {
    client = await createClient();
    const shop = await client.start("shop", { before: natives, scripts });
    await shop.run(`A = NUI.camera.claim({ id = 'fit' }) A:stream(1, 2, 3)`);
    await shop.run(`TriggerEvent('onClientResourceStop', 'shop')`);
    expect(await shop.run(`local l = LASTRENDER() return l.on == false and l.ms == 0`)).toBe(true);
    expect(await shop.run(`return CAMS[A.cam].exists`)).toBe(false);
    expect(await shop.run(`return FOCUS`)).toBe(1); // world streaming cleared with the claim
  });

  it("death releases every claim at once, instantly, and runs onLost('dead')", async () => {
    client = await createClient();
    const r = await client.start("shop", { before: natives, scripts });
    await r.run(`
      LOST = {}
      A = NUI.camera.claim({ id = 'a', onLost = function(why) LOST[#LOST + 1] = 'a:' .. why end })
      B = NUI.camera.claim({ id = 'b', onLost = function(why) LOST[#LOST + 1] = 'b:' .. why end })
    `);
    await r.run(`TICK(3)`);
    expect(await r.run(`return NUI.camera.isActive()`)).toBe(true); // alive: nothing happens
    await r.run(`DEAD = true TICK(20)`); // the watch polls every 250 ms
    expect(await r.run(`return NUI.camera.isActive()`)).toBe(false);
    expect(await r.run(`return LOST[1]`)).toBe("a:dead");
    expect(await r.run(`return LOST[2]`)).toBe("b:dead");
    expect(await r.run(`local l = LASTRENDER() return l.on == false and l.ease == false and l.ms == 0`)).toBe(true);
    expect(await r.run(`return CAMS[A.cam].exists or CAMS[B.cam].exists`)).toBe(false);
    expect(await r.run(`return LIVE()`)).toBe(0);
  });

  it("the client-wide 'dead' state (last stand) counts as down, like GTA's death", async () => {
    client = await createClient();
    const r = await client.start("shop", { before: natives, scripts });
    await r.run(`A = NUI.camera.claim({ id = 'a' })`);
    await r.run(`NUI.state('dead', 'laststand')`);
    expect(await r.run(`return NUI.camera.down()`)).toBe(true);
    await r.run(`TICK(20)`);
    expect(await r.run(`return NUI.camera.isActive()`)).toBe(false);
    await r.run(`NUI.state('dead', false)`);
    expect(await r.run(`return NUI.camera.down()`)).toBe(false);
  });

  it("re-claiming an id replaces the claim; a stale handle can't release the new one", async () => {
    client = await createClient();
    const r = await client.start("shop", { before: natives, scripts });
    await r.run(`A1 = NUI.camera.claim({ id = 'a' }) A2 = NUI.camera.claim({ id = 'a' })`);
    expect(await r.run(`return #NUI.camera.stack()`)).toBe(1);
    expect(await r.run(`return CAMS[A1.cam].exists`)).toBe(false);
    expect(await r.run(`return CAMS[A2.cam].exists`)).toBe(true);
    expect(await r.run(`return A1:release()`)).toBe(false);
    expect(await r.run(`return NUI.camera.isActive()`)).toBe(true);
    expect(await r.run(`return NUI.camera.release('a')`)).toBe(true); // by id works too
    expect(await r.run(`return NUI.camera.isActive()`)).toBe(false);
  });

  it("a targeted claim places the camera around the entity: in front of a ped facing it, blending in", async () => {
    client = await createClient();
    const r = await client.start("shop", { before: natives, scripts });
    // ped at (100, 200, 30) heading 90 (west): forward is -x. offset y = 2 puts the camera 2 m west, looking east at it
    await r.run(`H = NUI.camera.claim({ id = 'fit', target = 1, offset = { y = 2.0, z = 0.5 }, look = { z = 0.5 }, fov = 40, duration = 500 })`);
    expect(await r.run(`return POS(H, 1)`)).toBeCloseTo(98, 5);
    expect(await r.run(`return POS(H, 2)`)).toBeCloseTo(200, 5);
    expect(await r.run(`return POS(H, 3)`)).toBeCloseTo(30.5, 5);
    expect(await r.run(`return ROT(H, 3)`)).toBeCloseTo(270, 5); // yaw: looking east
    expect(await r.run(`return ROT(H, 1)`)).toBeCloseTo(0, 5); // level: looking at the same height
    expect(await r.run(`return CAMS[H.cam].fov`)).toBe(40);
    expect(await r.run(`local l = LASTRENDER() return l.on == true and l.ease == true and l.ms == 500`)).toBe(true);
    // the ped turns toward the camera (first person): the camera keeps its heading (0.7.0 F5)
    await r.run(`PED.heading = 180.0 TICK(2)`);
    expect(await r.run(`return POS(H, 1)`)).toBeCloseTo(98, 5);
    // the ped walks: the camera follows every frame
    await r.run(`PED.x = 110.0 TICK(1)`);
    expect(await r.run(`return POS(H, 1)`)).toBeCloseTo(108, 5);
    await r.run(`H:release()`);
    // lockHeading = false follows the heading; coords targets are static; looking down gives a negative pitch
    await r.run(`PED.heading = 0.0 G = NUI.camera.claim({ id = 'free', target = 1, offset = { y = 2.0, z = 2.0 }, lockHeading = false })`);
    expect(await r.run(`return POS(G, 2)`)).toBeCloseTo(202, 5);
    expect(await r.run(`return ROT(G, 1)`)).toBeLessThan(-30);
    await r.run(`PED.heading = 90.0 TICK(1)`);
    expect(await r.run(`return POS(G, 1)`)).toBeCloseTo(108, 5);
    await r.run(`G:release()`);
    await r.run(`S = NUI.camera.claim({ id = 'spot', target = { x = 0, y = 0, z = 0 }, offset = { y = -5.0 }, heading = 0.0 })`);
    expect(await r.run(`return POS(S, 2)`)).toBeCloseTo(-5, 5);
    expect(await r.run(`return ROT(S, 3)`)).toBeCloseTo(0, 5); // looking north
  });

  it("a targeted claim on top of another one cuts in (no blend between script cameras)", async () => {
    client = await createClient();
    const r = await client.start("shop", { before: natives, scripts });
    await r.run(`A = NUI.camera.claim({ id = 'a' }) B = NUI.camera.claim({ id = 'b', target = 1, duration = 800 })`);
    expect(await r.run(`local l = LASTRENDER() return l.ease`)).toBe(false);
  });
});
