// The intent API (lua/intents.lua, in every resource) and the runtime (systems/nuikit/client/intents.lua,
// in the nuikit resource): validation at the call, the stack, surfaces per kind, resolve / cancel /
// event paths, page reload sync, exports for other languages and resource-stop cleanup.
import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const RUNTIME = fileURLToPath(new URL("../../../../systems/nuikit/client/intents.lua", import.meta.url));
const natives = `
  function RegisterCommand(name, fn) COMMANDS = COMMANDS or {} COMMANDS[name] = fn end
  function RegisterKeyMapping() end
`;

const startRuntime = () => client.start("nuikit", { before: natives, scripts: ["intents.lua", RUNTIME] });
/** A script resource importing @nuikit/init.lua (nk.* with intents). */
const startScript = (name: string) => client.start(name, { runtime: "import" });

const frame = (host: { messages: { action: string; data: any }[] }) => host.messages.filter((m) => m.action === "nuikit:intent").map((m) => m.data);
const last = (host: { messages: { action: string; data: any }[] }) => frame(host).at(-1);

describe("nk.* validation (lua/intents.lua)", () => {
  it("errors at the call with the path of the first problem", async () => {
    client = await createClient();
    await startRuntime();
    const shop = await startScript("shop");
    await expect(shop.run(`nk.menu({ title = 'x' }, { async = true })`)).rejects.toThrow(/nk\.menu: items is required/);
    await expect(shop.run(`nk.notify({ title = 1 })`)).rejects.toThrow(/nk\.notify: title expected a string, got number/);
    await expect(shop.run(`nk.menu({ title = 'x', items = { { label = 'a', icon = 7 } } }, { async = true })`)).rejects.toThrow(
      /items\[1\]\.icon expected string or a list or a table, got number/,
    );
    await expect(shop.run(`nk.progress({ duration = 0 }, { async = true })`)).rejects.toThrow(/duration must be ≥ 1/);
    await expect(shop.run(`nk.confirm({ title = 'x', tone = 'loud' }, { async = true })`)).rejects.toThrow(/tone expected one of primary, destructive/);
    await expect(shop.run(`nk.intents.open('toast', {})`)).rejects.toThrow(/unknown intent "toast"/);
  });

  it("nk.intents.validate mirrors validateIntent (unknown keys pass, nested self types, oneOf)", async () => {
    client = await createClient();
    await startRuntime();
    const shop = await startScript("shop");
    expect(await shop.run(`return #nk.intents.validate('notify', { title = 'x', oxOnly = true })`)).toBe(0);
    expect(await shop.run(`local i = nk.intents.validate('menu', { title = 'g', items = { { label = 'a', items = { { label = 3 } } } } }) return i[1].path .. ': ' .. i[1].message`)).toBe(
      "items[1].items[1].label: expected a string, got number",
    );
    expect(await shop.run(`return #nk.intents.validate('challenge', { difficulty = { { areaSize = 30, speedMultiplier = 2 }, 'easy' }, keys = { 'w' } })`)).toBe(0);
    expect(await shop.run(`return #nk.intents.validate('input', { title = 't', fields = { { type = 'select', options = { { value = 'a' } } } } })`)).toBe(0);
    expect(await shop.run(`return nk.intents.validate('menu', { title = 't', items = {} })[1].message`)).toBe("needs at least 1 entry");
  });

  it("normalises the Lua sugar: notify strings and ox/qb status words, [E] prompts, numeric progress", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`nk.notify('Saved')`);
    expect(last(host).intent.props).toEqual({ title: "Saved" });
    await shop.run(`nk.notify({ title = 'Oops', type = 'inform' })`);
    expect(last(host).intent.props).toEqual({ title: "Oops", status: "info" });
    await shop.run(`nk.notify({ title = 'No', type = 'danger', duration = 0 })`);
    expect(last(host).intent.props).toEqual({ title: "No", status: "error" });
    await shop.run(`nk.prompt('[E] Open garage')`);
    expect(last(host).intent.props).toEqual({ label: "Open garage", keys: ["E"] });
    await shop.run(`nk.prompt({ text = 'Talk', position = 'left-center' })`);
    expect(last(host).intent.props).toEqual({ label: "Talk", position: "left-center" });
    await shop.run(`nk.progress(1500, { async = true })`);
    expect(last(host).intent.props).toEqual({ duration: 1500 });
    await shop.run(`nk.challenge('hard', { async = true })`);
    expect(last(host).intent.props).toEqual({ difficulty: "hard" });
  });
});

describe("the runtime (systems/nuikit/client/intents.lua)", () => {
  it("opens into the frame with the caller's name, stacks in order, and surfaces follow the kind", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    const bank = await startScript("bank");
    await shop.run(`nk.notify({ title = 'a' })`);
    await bank.run(`H = nk.menu({ title = 'Bank', items = { { label = 'Withdraw' } } }, { async = true })`);
    const msgs = frame(host);
    expect(msgs.map((m) => [m.op, m.intent.kind, m.intent.resource, m.intent.id])).toEqual([
      ["open", "notify", "shop", "shop#1"],
      ["open", "menu", "bank", "bank#1"],
    ]);
    expect(msgs[1].intent.seq).toBeGreaterThan(msgs[0].intent.seq);
    // A notify takes no focus; the menu takes it through the nuikit resource's surface.
    expect(client.focused()).toBe("nuikit");
    expect(host.surfaces()["intent:menu"]).toMatchObject({ open: true, focused: true, layer: "panel" });
    expect(host.focus).toEqual({ focus: true, cursor: true, keepInput: false });
    expect(await host.run(`return #NUI.intents.stack()`)).toBe(2);
  });

  it("menu input variants and the keyboard/keepInput rules; target only takes focus while open", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`M = nk.menu({ title = 'List', input = 'keyboard', items = { { label = 'a' } } }, { async = true })`);
    expect(host.focus).toEqual({ focus: true, cursor: false, keepInput: true });
    await shop.run(`M:cancel()`);
    expect(client.focused()).toBeNull();
    await shop.run(`T = nk.target({ options = { { label = 'Open' } } }, { async = true })`);
    expect(client.focused()).toBeNull();
    await shop.run(`T:update({ open = true })`);
    expect(host.surfaces()["intent:target"]).toMatchObject({ open: true, focused: true });
    expect(host.focus.keepInput).toBe(true);
    expect(last(host)).toEqual({ op: "update", id: "shop#2", props: { open: true } });
    await shop.run(`T:update({ open = false })`);
    expect(client.focused()).toBeNull();
  });

  it("the frame resolves: the waiting script gets the result; the surface is released", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`
      RESULT = 'pending'
      nk.menu({ title = 'Garage', items = { { label = 'Sultan', args = { plate = 'ABC' } } } }, { cb = function(r, reason) RESULT = { r = r, reason = reason } end })
    `);
    expect(await host.call("nuikit:intent:resolve", { id: "shop#1", result: { index: 1, id: "1", args: { plate: "ABC" } } })).toEqual({ ok: true });
    expect(await shop.run(`return RESULT`)).toEqual({ r: { index: 1, id: "1", args: { plate: "ABC" } } });
    expect(client.focused()).toBeNull();
    expect(await host.run(`return #NUI.intents.stack()`)).toBe(0);
    // Resolving twice, or an unknown id, is a no-op.
    expect(await host.call("nuikit:intent:resolve", { id: "shop#1", result: 1 })).toEqual({ ok: false });
  });

  it("the frame cancels with a reason (Escape): nil + reason", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`nk.confirm({ title = 'Sure?' }, function(r, reason) RESULT = { r = r, reason = reason } end)`);
    await host.call("nuikit:intent:resolve", { id: "shop#1", reason: "escape" });
    expect(await shop.run(`return RESULT`)).toEqual({ reason: "escape" });
  });

  it("events reach the caller's on<Event> handlers while the intent is open", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`
      SEEN = {}
      nk.menu({ title = 'List', items = { { label = 'a' }, { label = 'b' } } }, { async = true, onChange = function(d) SEEN[#SEEN + 1] = d.index end })
    `);
    await host.call("nuikit:intent:event", { id: "shop#1", event: "change", data: { index: 2 } });
    await host.call("nuikit:intent:event", { id: "shop#1", event: "change", data: { index: 1 } });
    expect(await shop.run(`return SEEN`)).toEqual([2, 1]);
    expect(await host.call("nuikit:intent:event", { id: "nope", event: "change" })).toEqual({ ok: false });
  });

  it("script-side cancel and update; another resource can't touch it", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    const thief = await startScript("thief");
    await shop.run(`P = nk.progress({ label = 'Fix', duration = 5000 }, function(r, reason) RESULT = { r = r, reason = reason } end)`);
    await thief.run(`TriggerEvent('nuikit:intent:update', 'shop#1', { label = 'Hacked' })`);
    await thief.run(`TriggerEvent('nuikit:intent:cancel', 'shop#1', 'cancel')`);
    expect(frame(host).length).toBe(1);
    await shop.run(`P:update({ value = 50 })`);
    expect(last(host)).toEqual({ op: "update", id: "shop#1", props: { value: 50 } });
    expect(await host.run(`return NUI.intents.stack()[1].props.value`)).toBe(50);
    await shop.run(`P:cancel()`);
    expect(last(host)).toEqual({ op: "cancel", id: "shop#1", reason: "cancel" });
    expect(await shop.run(`return RESULT`)).toEqual({ reason: "cancel" });
    expect(await shop.run(`return P:isOpen()`)).toBe(false);
  });

  it("update rejects a wrong type, but doesn't demand required keys", async () => {
    client = await createClient();
    await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`P = nk.progress({ duration = 100 }, { async = true })`);
    await expect(shop.run(`P:update({ value = 'half' })`)).rejects.toThrow(/nk.progress update: value expected a number/);
    await shop.run(`P:update({ label = 'ok' })`);
  });

  it("a caller-chosen id replaces the open one (de-duped toasts); cancelAll by kind", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`nk.notify({ id = 'fuel', title = 'Fuel 20%' })`);
    await shop.run(`nk.notify({ id = 'fuel', title = 'Fuel 10%' })`);
    expect(frame(host).map((m) => [m.op, m.intent.id, m.intent.props.title])).toEqual([
      ["open", "shop#fuel", "Fuel 20%"],
      ["open", "shop#fuel", "Fuel 10%"],
    ]);
    expect(await host.run(`return #NUI.intents.stack()`)).toBe(1);
    await shop.run(`nk.prompt('[E] One') nk.prompt('[F] Two') nk.hidePrompt()`);
    expect(await host.run(`local n = 0 for _, i in ipairs(NUI.intents.stack()) do if i.kind == 'prompt' then n = n + 1 end end return n`)).toBe(0);
    expect(await host.run(`return #NUI.intents.stack()`)).toBe(1);
    await shop.run(`nk.prompt()`);
  });

  it("the X key cancels the newest cancellable progress only", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`
      A = nk.progress({ label = 'a', duration = 100, cancel = true }, function(r) RA = r end)
      B = nk.progress({ label = 'b', duration = 100 }, function(r) RB = r end)
    `);
    await host.run(`COMMANDS.nuikit_cancel()`);
    expect(last(host)).toEqual({ op: "cancel", id: "shop#1", reason: "cancel" });
    expect(await shop.run(`return A:isOpen(), B:isOpen()`)).toBe(false);
    expect(await shop.run(`return B:isOpen()`)).toBe(true);
  });

  it("page reload: nuikit:intent:sync returns the whole stack in order", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`nk.notify('a') nk.prompt('b') nk.progress(100, { async = true })`);
    expect(await host.call("nuikit:intent:sync")).toEqual({ ok: true, count: 3 });
    const sync = last(host);
    expect(sync.op).toBe("sync");
    expect(sync.intents.map((i: any) => i.kind)).toEqual(["notify", "prompt", "progress"]);
  });

  it("an invalid payload from a raw event is dropped, never drawn", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`TriggerEvent('nuikit:intent:open', 'shop#9', 'menu', { title = 'x' })`);
    expect(frame(host)).toEqual([]);
  });

  it("a stopped resource's intents are cancelled in the frame and focus is released", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`nk.notify('a') nk.menu({ title = 'm', items = { { label = 'x' } } }, { async = true })`);
    expect(client.focused()).toBe("nuikit");
    client.stop("shop");
    expect(frame(host).filter((m) => m.op === "cancel").map((m) => [m.id, m.reason])).toEqual([
      ["shop#1", "stopped"],
      ["shop#2", "stopped"],
    ]);
    expect(client.focused()).toBeNull();
    expect(await host.run(`return #NUI.intents.stack()`)).toBe(0);
  });

  it("when the nuikit resource stops, waiting scripts get nil + 'stopped'", async () => {
    client = await createClient();
    await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`nk.confirm('Sure?', function(r, reason) RESULT = { reason = reason } end)`);
    client.stop("nuikit");
    expect(await shop.run(`return RESULT`)).toEqual({ reason: "stopped" });
  });

  it("without the nuikit resource, a call is dropped with a warning instead of hanging", async () => {
    client = await createClient();
    const shop = await client.start("shop", { runtime: "import", before: "function GetResourceState() return 'missing' end" });
    expect(await shop.run(`local h = nk.notify('x') return h.reason`)).toBe("stopped");
    expect(await shop.run(`local r, reason = nk.confirm('x') return reason`)).toBe("stopped");
  });
});

describe("exports.nuikit:* (other languages)", () => {
  it("opens on behalf of the calling resource and calls back with the result", async () => {
    client = await createClient();
    const host = await startRuntime();
    const js = await client.start("jsscript", { runtime: "none", before: "function RegisterNUICallback() end" });
    const id = await js.run(`ID = exports.nuikit:menu({ title = 'From JS', items = { { label = 'a' } } }, function(r, reason) RESULT = { r = r, reason = reason } end) return ID`);
    expect(id).toBe("jsscript#x1");
    expect(last(host).intent).toMatchObject({ id: "jsscript#x1", kind: "menu", resource: "jsscript" });
    await js.run(`exports.nuikit:intentUpdate(ID, { title = 'Changed' })`);
    expect(last(host)).toEqual({ op: "update", id: "jsscript#x1", props: { title: "Changed" } });
    await host.call("nuikit:intent:resolve", { id: "jsscript#x1", result: { index: 1, id: "1" } });
    expect(await js.run(`return RESULT`)).toEqual({ r: { index: 1, id: "1" } });
    expect(await js.run(`return exports.nuikit:intent('notify', { title = 5 })`)).toBeFalsy();
    await js.run(`local i = exports.nuikit:intent('notify', { title = 'ok' }) exports.nuikit:intentCancel(i)`);
    expect(last(host)).toMatchObject({ op: "cancel", id: "jsscript#x3" });
  });
});
