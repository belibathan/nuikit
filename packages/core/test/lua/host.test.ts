// The nuikit host (lua/host.lua + the hosted mode in lua/nuikit.lua): discovery, routing both
// ways, focus through the host frame, fallback to the ui_page, and that a module can only ever
// reach its own resource.
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const MODULE = { nuikit_ui: ["web/dist/module.js"] };
const startHost = () => client.start("nuikit", { scripts: ["host.lua"] });
const loads = (host: { messages: { action: string; data: any }[] }) =>
  host.messages.filter((m) => m.action === "nuikit:host:load").map((m) => m.data);
const tokenOf = (host: Parameters<typeof loads>[0], resource: string) => loads(host).find((l) => l.resource === resource)!.token as string;
const toModule = (host: { messages: any[] }, resource: string) => host.messages.filter((m) => m.nkm === resource);

const shopLua = `
  NUI.on('shop:buy', function(d) BOUGHT = d.id return { ok = true, id = d.id } end)
  RegisterNUICallback('shop:later', function(d, cb) LATER = cb end)
  NUI.on('shop:boom', function() error('nope') end)
  S = NUI.surface('shop', { layer = 'panel', hides = { 'hud' } })
`;

describe("host: discovery", () => {
  it("adopts resources that declare nuikit_ui, started before the host", async () => {
    client = await createClient();
    const shop = await client.start("shop", { metadata: MODULE });
    await client.start("plain");
    expect(await shop.run("return NUI.hosted")).toBe(false);

    const host = await startHost();
    expect(loads(host)).toEqual([{ resource: "shop", url: "https://cfx-nui-shop/web/dist/module.js", token: expect.stringMatching(/^[0-9a-f]{32}$/) }]);
    expect(await shop.run("return NUI.hosted")).toBe(true);
    // Its own ui_page is told to stay empty (nuikit-core/boot).
    expect(shop.messages.some((m) => m.action === "nuikit:host:adopted")).toBe(true);
    expect(await shop.call("nuikit:host:mode")).toEqual({ hosted: true });
  });

  it("adopts resources started after the host, and resends loads when the page reloads", async () => {
    client = await createClient();
    const host = await startHost();
    expect(loads(host)).toEqual([]);
    const shop = await client.start("shop", { metadata: MODULE });
    expect(await shop.run("return NUI.hosted")).toBe(true);
    expect(loads(host).map((l) => l.resource)).toEqual(["shop"]);

    host.messages.length = 0;
    expect(await host.call("nuikit:host:ready")).toEqual({ ok: true, modules: 1 });
    expect(loads(host).map((l) => l.resource)).toEqual(["shop"]);
  });

  it("stays off with convar nuikit_host 0", async () => {
    client = await createClient();
    await client.start("nuikit", { before: "function GetConvarInt(k, d) if k == 'nuikit_host' then return 0 end return d end", scripts: ["host.lua"] });
    const shop = await client.start("shop", { metadata: MODULE });
    expect(await shop.run("return NUI.hosted")).toBe(false);
    expect(await shop.call("nuikit:host:mode")).toEqual({ hosted: false });
  });
});

describe("host: routing", () => {
  it("Lua → module: NUI.send from a hosted resource reaches only its module", async () => {
    client = await createClient();
    const host = await startHost();
    const shop = await client.start("shop", { metadata: MODULE });
    shop.messages.length = 0;
    await shop.run(`NUI.send('shop:stock', { apples = 3 })`);
    expect(toModule(host, "shop").at(-1)).toEqual({ nkm: "shop", action: "shop:stock", data: { apples: 3 } });
    expect(shop.messages.some((m) => m.action === "shop:stock")).toBe(false);
  });

  it("module → Lua: the host forwards fetchNui to the owning resource and returns its response", async () => {
    client = await createClient();
    const host = await startHost();
    const shop = await client.start("shop", { metadata: MODULE, scripts: [] });
    await shop.run(shopLua);
    const t = tokenOf(host, "shop");

    expect(await host.call("nuikit:host:call", { t, n: "shop:buy", d: { id: 7 } })).toEqual({ ok: true, id: 7 });
    expect(await shop.run("return BOUGHT")).toBe(7);
    // Errors come back the way fetchNui expects them.
    expect((await host.call("nuikit:host:call", { t, n: "shop:boom" })).error).toMatch(/nope/);
    expect((await host.call("nuikit:host:call", { t, n: "shop:missing" })).error).toMatch(/no NUI callback "shop:missing" in shop/);
  });

  it("module → Lua: raw RegisterNUICallback handlers that answer later", async () => {
    client = await createClient();
    const host = await startHost();
    const shop = await client.start("shop", { metadata: MODULE });
    await shop.run(shopLua);
    const pending = host.callPending("nuikit:host:call", { t: tokenOf(host, "shop"), n: "shop:later", d: {} });
    expect(pending.done).toBe(false);
    await shop.run(`LATER({ ok = 'later' })`);
    expect(pending).toEqual({ done: true, result: { ok: "later" } });
  });

  it("the built-in handshake works through the host (state resent to the module)", async () => {
    client = await createClient();
    const host = await startHost();
    const shop = await client.start("shop", { metadata: MODULE, before: "function LoadResourceFile() return '.dark { --primary: red; }' end" });
    await shop.run(shopLua + " S:open({ items = 2 })");
    const t = tokenOf(host, "shop");
    host.messages.length = 0;
    expect(await host.call("nuikit:host:call", { t, n: "nuikit:ready" })).toEqual({ ok: true, resource: "shop" });
    const surfaces = toModule(host, "shop").find((m) => m.action === "nuikit:surfaces");
    expect(surfaces.data.surfaces.shop).toMatchObject({ open: true, focused: true, data: { items: 2 } });
    expect(toModule(host, "shop").find((m) => m.action === "nuikit:theme")?.data).toMatch(/--primary/);
  });
});

describe("host: security", () => {
  it("a module's token only ever reaches its own resource", async () => {
    client = await createClient();
    const host = await startHost();
    const shop = await client.start("shop", { metadata: MODULE });
    const bank = await client.start("bank", { metadata: MODULE });
    await shop.run(shopLua);
    await bank.run(`NUI.on('bank:withdraw', function() WITHDRAWN = true return { ok = true } end)`);

    // The shop module asking for the bank's callback lands in the shop, which has none.
    const res = await host.call("nuikit:host:call", { t: tokenOf(host, "shop"), n: "bank:withdraw", d: {} });
    expect(res.error).toMatch(/in shop/);
    expect(await bank.run("return WITHDRAWN")).toBeNull();
    // No token, a made-up token, or a resource name instead of a token: refused.
    for (const req of [{ n: "bank:withdraw" }, { t: "0".repeat(32), n: "bank:withdraw" }, { t: "bank", n: "bank:withdraw" }]) {
      expect(await host.call("nuikit:host:call", req)).toEqual({ error: "unknown module" });
    }
    expect(await bank.run("return WITHDRAWN")).toBeNull();
  });

  it("other resources can't forge host events", async () => {
    client = await createClient();
    const host = await startHost();
    const bank = await client.start("bank", { metadata: MODULE });
    await bank.run(`NUI.on('bank:withdraw', function() WITHDRAWN = true return { ok = true } end)`);
    const rogue = await client.start("rogue");
    const bankToken = tokenOf(host, "bank");

    // Call the bank's Lua directly, pretending to be the host.
    await rogue.run(`TriggerEvent('nuikit:host:forward', 'bank', 1, 'bank:withdraw', {})`);
    expect(await bank.run("return WITHDRAWN")).toBeNull();
    // Message the bank's module (the host uses the real sender, which has no module).
    host.messages.length = 0;
    await rogue.run(`TriggerEvent('nuikit:host:send', 'bank:balance', { cash = 1e9 })`);
    expect(host.messages).toEqual([]);
    // Answer a pending call meant for the bank.
    await bank.run(`RegisterNUICallback('bank:slow', function(d, cb) end)`);
    const pending = host.callPending("nuikit:host:call", { t: bankToken, n: "bank:slow" });
    await rogue.run(`for id = 1, 10 do TriggerEvent('nuikit:host:reply', id, { forged = true }) end`);
    expect(pending.done).toBe(false);
    // Adopt or release someone else.
    const plain = await client.start("plain", { metadata: MODULE, before: "" });
    await rogue.run(`TriggerEvent('nuikit:host:adopt', 'rogue')`);
    expect(await rogue.run("return NUI.hosted")).toBe(false);
    expect(await plain.run("return NUI.hosted")).toBe(true);
  });
});

describe("host: focus and fallback", () => {
  it("the host's frame takes focus for a hosted resource's surfaces", async () => {
    client = await createClient();
    await startHost();
    const shop = await client.start("shop", { metadata: MODULE });
    const legacy = await client.start("legacy");
    await shop.run(shopLua + " S:open()");
    expect(client.focused()).toBe("nuikit");

    // A resource that isn't hosted still takes focus itself, above it.
    await legacy.run(`L = NUI.surface('legacy', { layer = 'modal' }) L:open()`);
    expect(client.focused()).toBe("legacy");
    await legacy.run(`L:close()`);
    expect(client.focused()).toBe("nuikit");
    await shop.run(`S:close()`);
    expect(client.focused()).toBeNull();
  });

  it("falls back to the ui_page when the host stops, and back when it returns", async () => {
    client = await createClient();
    await startHost();
    const shop = await client.start("shop", { metadata: MODULE });
    await shop.run(shopLua + " S:open()");
    expect(client.focused()).toBe("nuikit");

    client.stop("nuikit");
    expect(await shop.run("return NUI.hosted")).toBe(false);
    expect(shop.messages.some((m) => m.action === "nuikit:host:fallback")).toBe(true);
    // Focus moves to the resource's own frame; messages go to it again.
    expect(client.focused()).toBe("shop");
    await shop.run(`NUI.send('shop:stock', 1)`);
    expect(shop.messages.at(-1)).toEqual({ action: "shop:stock", data: 1 });

    const host = await startHost();
    expect(await shop.run("return NUI.hosted")).toBe(true);
    expect(client.focused()).toBe("nuikit");
    expect(loads(host).map((l) => l.resource)).toEqual(["shop"]);
  });

  it("unloads a stopped resource's module and fails its pending calls", async () => {
    client = await createClient();
    const host = await startHost();
    const shop = await client.start("shop", { metadata: MODULE });
    await shop.run(shopLua);
    const pending = host.callPending("nuikit:host:call", { t: tokenOf(host, "shop"), n: "shop:later" });
    const token = tokenOf(host, "shop");
    client.stop("shop");
    expect(pending).toEqual({ done: true, result: { error: "resource stopped" } });
    expect(host.messages.at(-1)).toMatchObject({ action: "nuikit:host:unload", data: "shop" });
    expect(await host.call("nuikit:host:call", { t: token, n: "shop:buy" })).toEqual({ error: "unknown module" });
  });
});
