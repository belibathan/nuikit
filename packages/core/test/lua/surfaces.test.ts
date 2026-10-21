import { afterEach, describe, expect, it } from "vitest";
import { createClient as create } from "./harness";

let client: Awaited<ReturnType<typeof create>>;
afterEach(() => client?.close());

describe.each([
  ["queued events", false],
  ["synchronous events", true],
])("surface manager (lua/nuikit.lua in Lua 5.4, %s)", (_label, syncEvents) => {
  const createClient = () => create({ syncEvents });
  it("a HUD takes no focus; a panel takes focus with the cursor", async () => {
    client = await createClient();
    const hud = await client.start("hud");
    await hud.run(`H = NUI.surface('hud', { layer = 'hud' }) H:open({ health = 80 })`);
    expect(client.focused()).toBe(null);
    expect(hud.surfaces().hud).toMatchObject({ open: true, visible: true, focused: false, data: { health: 80 } });

    const inv = await client.start("inventory");
    await inv.run(`I = NUI.surface('inventory', { layer = 'panel' }) I:open()`);
    expect(client.focused()).toBe("inventory");
    expect(inv.focus).toMatchObject({ focus: true, cursor: true, keepInput: false });
  });

  it("focus follows the top-most surface across resources, and returns when it closes", async () => {
    client = await createClient();
    const inv = await client.start("inventory");
    const bank = await client.start("bank");
    await inv.run(`I = NUI.surface('inventory') I:open()`);
    await bank.run(`D = NUI.surface('confirm', { layer = 'modal' }) D:open({ amount = 500 })`);
    expect(client.focused()).toBe("bank");

    await bank.run(`D:close()`);
    expect(client.focused()).toBe("inventory");
    await inv.run(`I:close()`);
    expect(client.focused()).toBe(null);
  });

  it("a modal stays above a panel opened after it", async () => {
    client = await createClient();
    const a = await client.start("a");
    const b = await client.start("b");
    await a.run(`M = NUI.surface('dialog', { layer = 'modal' }) M:open()`);
    await b.run(`P = NUI.surface('phone', { layer = 'panel' }) P:open()`);
    expect(client.focused()).toBe("a");
  });

  it("Escape closes surfaces top-down, one per press", async () => {
    client = await createClient();
    const ui = await client.start("ui");
    await ui.run(`
      Menu = NUI.surface('menu', { layer = 'panel' })
      Dialog = NUI.surface('dialog', { layer = 'modal' })
      Menu:open() Dialog:open()
    `);
    expect(await ui.call("nuikit:escape")).toMatchObject({ ok: true, closed: "dialog" });
    expect(ui.surfaces().menu.focused).toBe(true);
    expect(await ui.call("nuikit:escape")).toMatchObject({ ok: true, closed: "menu" });
    expect(client.focused()).toBe(null);
    expect(await ui.call("nuikit:escape")).toMatchObject({ ok: false });
  });

  it("escape = 'back' asks the UI to step back instead of closing", async () => {
    client = await createClient();
    const ui = await client.start("ui");
    await ui.run(`S = NUI.surface('shop', { escape = 'back' }) S:open()`);
    expect(await ui.call("nuikit:escape")).toMatchObject({ ok: true, back: "shop" });
    expect(ui.messages.at(-1)).toEqual({ action: "nuikit:back", data: "shop" });
    expect(await ui.run(`return S:isOpen()`)).toBe(true);
  });

  it("exclusive panels replace each other, even across resources", async () => {
    client = await createClient();
    const inv = await client.start("inventory");
    const phone = await client.start("phone");
    await inv.run(`I = NUI.surface('inventory', { exclusive = true }) I:open()`);
    await phone.run(`P = NUI.surface('phone', { exclusive = true }) P:open()`);
    expect(await inv.run(`return I:isOpen()`)).toBe(false);
    expect(inv.surfaces().inventory.open).toBe(false);
    expect(client.focused()).toBe("phone");
  });

  it("hides: a full-screen panel hides the HUD without closing it", async () => {
    client = await createClient();
    const hud = await client.start("hud");
    const inv = await client.start("inventory");
    await hud.run(`H = NUI.surface('hud', { layer = 'hud' }) H:open()`);
    await inv.run(`I = NUI.surface('inventory', { hides = { 'hud' } }) I:open()`);
    expect(hud.surfaces().hud).toMatchObject({ open: true, visible: false });
    await inv.run(`I:close()`);
    expect(hud.surfaces().hud).toMatchObject({ open: true, visible: true });
  });

  it("states block surfaces and are shared by every resource", async () => {
    client = await createClient();
    const core = await client.start("core");
    const inv = await client.start("inventory");
    await inv.run(`I = NUI.surface('inventory', { blockedBy = { 'dead' } })`);
    await core.run(`NUI.state('dead', true)`);
    expect(await inv.run(`return I:open()`)).toBe(false);
    expect(await inv.run(`return NUI.getState('dead')`)).toBe(true);
    await core.run(`NUI.state('dead', false)`);
    expect(await inv.run(`return I:open()`)).toBe(true);
  });

  it("a resource started mid-session gets the current stack", async () => {
    client = await createClient();
    const inv = await client.start("inventory");
    await inv.run(`I = NUI.surface('inventory') I:open()`);
    const late = await client.start("late");
    expect(await late.run(`return #NUI.surfaces()`)).toBe(1);
    await late.run(`D = NUI.surface('dialog', { layer = 'modal' }) D:open() D:close()`);
    expect(client.focused()).toBe("inventory");
  });

  it("stopping a resource drops its surfaces and hands focus back", async () => {
    client = await createClient();
    const inv = await client.start("inventory");
    const bank = await client.start("bank");
    await inv.run(`I = NUI.surface('inventory') I:open()`);
    await bank.run(`B = NUI.surface('bank', { layer = 'modal' }) B:open()`);
    client.stop("bank");
    expect(client.focused()).toBe("inventory");
    expect(await inv.run(`return #NUI.surfaces()`)).toBe(1);
  });

  it("a stopping resource's own stop handler runs: it releases its focus and sees itself as stopping", async () => {
    client = await createClient();
    const bank = await client.start("bank");
    await bank.run(`
      B = NUI.surface('bank', { layer = 'modal' }) B:open()
      STATE_AT_STOP = nil
      AddEventHandler('onClientResourceStop', function(r) if r == 'bank' then STATE_AT_STOP = GetResourceState('bank') end end)
    `);
    expect(bank.focus).toMatchObject({ focus: true, cursor: true });
    const state = { seen: undefined as unknown };
    bank.lua.global.set("__report", (s: unknown) => (state.seen = s));
    await bank.run(`AddEventHandler('onClientResourceStop', function(r) if r == 'bank' then __report(STATE_AT_STOP) end end)`);
    client.stop("bank");
    // nuikit.lua's own handler (`resource == RESOURCE`) released the focus before the script unloaded
    expect(bank.focus).toMatchObject({ focus: false, cursor: false, keepInput: false });
    expect(state.seen).toBe("stopping");
    expect(client.focused()).toBeNull();
  });

  it("the UI can open and close declared surfaces, never undeclared ones", async () => {
    client = await createClient();
    const ui = await client.start("ui");
    await ui.run(`NUI.surface('settings')`);
    expect(await ui.call("nuikit:surface:open", { name: "settings", data: { tab: 2 } })).toEqual({ ok: true });
    expect(ui.surfaces().settings).toMatchObject({ open: true, data: { tab: 2 } });
    expect(await ui.call("nuikit:surface:open", { name: "nope" })).toHaveProperty("error");
    await ui.call("nuikit:surface:close", { name: "settings" });
    expect(ui.surfaces().settings.open).toBe(false);
  });

  it("simple mode: NUI.open/close still work and send nuikit:visible", async () => {
    client = await createClient();
    const ui = await client.start("ui");
    await ui.run(`NUI.open()`);
    expect(client.focused()).toBe("ui");
    expect(ui.messages.filter((m) => m.action === "nuikit:visible").at(-1)?.data).toBe(true);
    await ui.call("nuikit:close");
    expect(client.focused()).toBe(null);
    expect(ui.messages.filter((m) => m.action === "nuikit:visible").at(-1)?.data).toBe(false);
    await ui.run(`NUI.open({ cursor = false, keepInput = true })`);
    expect(ui.focus).toMatchObject({ focus: true, cursor: false, keepInput: true });
    await ui.run(`NUI.toggle()`);
    expect(await ui.run(`return NUI.isOpen()`)).toBe(false);
  });

  it("nuikit:ready resends state the page missed, plus the server theme", async () => {
    client = await createClient();
    const ui = await client.start("ui", {
      before: `
        function GetResourceState(r) return r == 'nuikit' and 'started' or 'missing' end
        function LoadResourceFile(r, f) return '.dark { --primary: oklch(0.7 0.2 150); }' end
      `,
    });
    await ui.run(`H = NUI.surface('hud', { layer = 'hud' }) H:open()`);
    ui.messages.length = 0; // the page wasn't listening yet
    expect(await ui.call("nuikit:ready")).toMatchObject({ ok: true, resource: "ui" });
    expect(ui.messages.map((m) => m.action)).toEqual(["nuikit:surfaces", "nuikit:theme", "nuikit:prefs"]);
    expect(ui.surfaces().hud.open).toBe(true);
  });

  it("nuikit:ready answers with the protocol version and the capabilities Lua provides (§2.2)", async () => {
    client = await createClient();
    const themed = await client.start("themed", {
      before: `
        function GetResourceState(r) return r == 'nuikit' and 'started' or 'missing' end
        function LoadResourceFile(r, f) return '.dark { --primary: red; }' end
      `,
    });
    const reply = await themed.call("nuikit:ready", { protocol: 1, client: "nuikit-core@test" });
    expect(reply).toMatchObject({ ok: true, resource: "themed", protocol: 1 });
    expect([...reply.capabilities].sort()).toEqual(["notify", "prefs", "states", "surfaces", "theme"]);
    // no nuikit resource → no theme; no bridge.lua → no player; a 0.4.0 page (empty request) still gets an answer
    const bare = await client.start("bare", { before: `function GetResourceState() return 'missing' end` });
    const old = await bare.call("nuikit:ready");
    expect(old.protocol).toBe(1);
    expect(old.capabilities).not.toContain("theme");
    expect(old.capabilities).not.toContain("player");
  });

  it("NUI.open({ escape = 'ignore' }) keeps the UI open on Escape", async () => {
    client = await createClient();
    const ui = await client.start("ui");
    await ui.run(`NUI.open({ escape = 'ignore' })`);
    expect(await ui.call("nuikit:escape")).toEqual({ ok: false });
    expect(await ui.run(`return NUI.isOpen()`)).toBe(true);
    await ui.run(`NUI.close() NUI.open()`);
    expect(await ui.call("nuikit:escape")).toEqual({ ok: true, closed: "main" });
    expect(await ui.run(`return NUI.isOpen()`)).toBe(false);
  });

  it("NUI.on still returns handler results and turns errors into { error }", async () => {
    client = await createClient();
    const ui = await client.start("ui");
    await ui.run(`
      NUI.on('add', function(d) return { sum = d.a + d.b } end)
      NUI.on('boom', function() error('nope') end)
    `);
    expect(await ui.call("add", { a: 2, b: 3 })).toEqual({ sum: 5 });
    expect((await ui.call("boom")).error).toMatch(/nope/);
  });
});
