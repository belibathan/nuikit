import { afterEach, describe, expect, it } from "vitest";
import { createClient as create } from "./harness";

let client: Awaited<ReturnType<typeof create>>;
afterEach(() => client?.close());

// DisableControlAction is a recorder per frame; threads are coroutines driven by TICK(n).
const natives = `
  NOW = 1000
  DEAD = false
  FRAME = {}         -- ids disabled this frame (as a set), or ALL = true
  ALL = false
  THREADS = {}
  function GetGameTimer() return NOW end
  function PlayerPedId() return 1 end
  function IsEntityDead() return DEAD end
  function DisableControlAction(_, id) FRAME[id] = true end
  function DisableAllControlActions() ALL = true end
  function CreateThread(fn) THREADS[#THREADS + 1] = coroutine.create(fn) end
  function Wait(ms) coroutine.yield(ms) end
  function TICK(n)
    for _ = 1, n do
      NOW = NOW + 16
      FRAME, ALL = {}, false
      for i = #THREADS, 1, -1 do
        local co = THREADS[i]
        if coroutine.status(co) == 'dead' then table.remove(THREADS, i)
        else local ok, err = coroutine.resume(co) if not ok then error(err) end end
      end
    end
  end
  function LIVE() local n = 0 for _, co in ipairs(THREADS) do if coroutine.status(co) ~= 'dead' then n = n + 1 end end return n end
  function DISABLED() local out = {} for id in pairs(FRAME) do out[#out + 1] = id end table.sort(out) return table.concat(out, ',') end
  function ACTIVE() local a = NUI.controls.active() if a == 'all' then return 'all' end local out = {} for _, id in ipairs(a) do out[#out + 1] = tostring(id) end return table.concat(out, ',') end
`;
const scripts = ["camera.lua", "controls.lua"];

describe("controls service (lua/controls.lua)", () => {
  it("a preset disables its controls every frame while held, and nothing after release", async () => {
    client = await create();
    const r = await client.start("shop", { before: natives, scripts });
    expect(await r.run(`return LIVE()`)).toBe(0);
    await r.run(`H = NUI.controls.disable('look')`);
    expect(await r.run(`return LIVE()`)).toBe(1); // one loop
    await r.run(`TICK(1)`);
    expect(await r.run(`return DISABLED()`)).toBe("1,2,3,4,5,6,270,271,272,273");
    expect(await r.run(`return NUI.controls.isDisabled(2)`)).toBe(true);
    expect(await r.run(`return NUI.controls.isDisabled(24)`)).toBe(false);
    expect(await r.run(`return H:release()`)).toBe(true);
    expect(await r.run(`return H:release()`)).toBe(false);
    await r.run(`TICK(2)`);
    expect(await r.run(`return DISABLED()`)).toBe("");
    expect(await r.run(`return LIVE()`)).toBe(0); // the loop ended with the last set
    expect(await r.run(`return NUI.controls.count()`)).toBe(0);
  });

  it("sets merge as a union; releasing one keeps what the others still need", async () => {
    client = await create();
    const r = await client.start("shop", { before: natives, scripts });
    await r.run(`A = NUI.controls.disable({ 24, 25 }) B = NUI.controls.disable({ 25, 'frontend' })`);
    expect(await r.run(`return LIVE()`)).toBe(1); // still one loop
    await r.run(`TICK(1)`);
    expect(await r.run(`return DISABLED()`)).toBe("24,25,199,200,244,245,246,249");
    await r.run(`A:release() TICK(1)`);
    expect(await r.run(`return DISABLED()`)).toBe("25,199,200,244,245,246,249"); // 25 stays: B wants it
    await r.run(`B:release() TICK(1)`);
    expect(await r.run(`return DISABLED()`)).toBe("");
  });

  it("'all' disables everything with one native call, and other sets ride along until it goes", async () => {
    client = await create();
    const r = await client.start("shop", { before: natives, scripts });
    await r.run(`A = NUI.controls.disable('movement') B = NUI.controls.disable('all')`);
    await r.run(`TICK(1)`);
    expect(await r.run(`return ALL`)).toBe(true);
    expect(await r.run(`return DISABLED()`)).toBe(""); // not id by id
    expect(await r.run(`return ACTIVE()`)).toBe("all");
    expect(await r.run(`return NUI.controls.isDisabled(999)`)).toBe(true);
    await r.run(`B:release() TICK(1)`);
    expect(await r.run(`return ALL`)).toBe(false);
    expect(await r.run(`return DISABLED()`)).toBe("21,22,23,30,31,32,33,34,35,36,44");
  });

  it("an unknown preset is an error; numbers and mixed lists resolve", async () => {
    client = await create();
    const r = await client.start("shop", { before: natives, scripts });
    expect(await r.run(`local ok, err = pcall(NUI.controls.disable, 'jetpack') return ok`)).toBe(false);
    await r.run(`H = NUI.controls.disable(37)`);
    expect(await r.run(`return ACTIVE()`)).toBe("37");
    await r.run(`H:release() H = NUI.controls.disable({ 'look', { 24 }, 25.0 })`);
    expect(await r.run(`return ACTIVE()`)).toBe("1,2,3,4,5,6,24,25,270,271,272,273");
  });

  it("death releases every set, except those that opt to keep (the death screen's own)", async () => {
    client = await create();
    const r = await client.start("shop", { before: natives, scripts });
    await r.run(`A = NUI.controls.disable('movement') K = NUI.controls.disable('weapons', { onDeath = 'keep' })`);
    await r.run(`TICK(2)`);
    expect(await r.run(`return NUI.controls.count()`)).toBe(2);
    await r.run(`DEAD = true TICK(20)`); // death is polled every 250 ms
    expect(await r.run(`return NUI.controls.count()`)).toBe(1);
    expect(await r.run(`return NUI.controls.isDisabled(24)`)).toBe(true);
    expect(await r.run(`return NUI.controls.isDisabled(30)`)).toBe(false);
    await r.run(`K:release() TICK(2)`);
    expect(await r.run(`return LIVE()`)).toBe(0);
    // the client-wide 'dead' state (last stand) counts too
    await r.run(`DEAD = false NUI.state('dead', 'laststand')`);
    await r.run(`A = NUI.controls.disable('movement') TICK(1)`);
    expect(await r.run(`return NUI.controls.count()`)).toBe(0);
  });

  it("a surface's `controls` set is held while it is open, across close, Escape and exclusive takeovers", async () => {
    client = await create();
    const r = await client.start("shop", { before: natives, scripts });
    await r.run(`
      Shop = NUI.surface('shop', { layer = 'panel', controls = { 'movement', 'weapons' } })
      Menu = NUI.surface('menu', { layer = 'panel', exclusive = true, controls = 'all' })
      Shop:open()
    `);
    expect(await r.run(`return NUI.controls.count()`)).toBe(1);
    expect(await r.run(`return NUI.controls.isDisabled(30)`)).toBe(true);
    await r.run(`Shop:update({ page = 2 })`); // updates don't double it
    expect(await r.run(`return NUI.controls.count()`)).toBe(1);
    await r.run(`Shop:close()`);
    expect(await r.run(`return NUI.controls.count()`)).toBe(0);

    await r.run(`Shop:open()`);
    expect(await r.call("nuikit:escape")).toMatchObject({ ok: true, closed: "shop" });
    expect(await r.run(`return NUI.controls.count()`)).toBe(0);

    await r.run(`Shop:open() Menu:open()`); // exclusive on the same layer: shop closes, menu holds 'all'
    expect(await r.run(`return NUI.controls.count()`)).toBe(1);
    expect(await r.run(`return ACTIVE()`)).toBe("all");
    await r.run(`Menu:close()`);
    expect(await r.run(`return NUI.controls.count()`)).toBe(0);
    await r.run(`TICK(2)`);
    expect(await r.run(`return LIVE()`)).toBe(0);
  });

  it("another resource stopping with a surface open releases that surface's controls set in its own copy", async () => {
    client = await create();
    const shop = await client.start("shop", { before: natives, scripts });
    const hud = await client.start("hud", { before: natives, scripts });
    await shop.run(`Shop = NUI.surface('shop', { controls = 'movement' }) Shop:open()`);
    await hud.run(`Hud = NUI.surface('hud', { layer = 'hud' }) Hud:open()`);
    expect(await shop.run(`return NUI.controls.count()`)).toBe(1);
    expect(await hud.run(`return NUI.controls.count()`)).toBe(0); // sets are per resource
    client.stop("hud");
    expect(await shop.run(`return NUI.controls.count()`)).toBe(1); // unaffected
    await shop.run(`Shop:close()`);
    expect(await shop.run(`return NUI.controls.count()`)).toBe(0);
  });
});
