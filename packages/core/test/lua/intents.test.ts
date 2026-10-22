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
  function RegisterKeyMapping(cmd, _, _, key) KEYMAPS = KEYMAPS or {} KEYMAPS[cmd] = key end
`;

const startRuntime = () => client.start("nuikit", { before: natives, scripts: ["keys.lua", "intents.lua", RUNTIME] });
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
    expect(last(host).intent.props).toEqual({ title: "No", status: "error", duration: 0 });
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

  it("binds nuikit_cancel to X, or to the key in convar nuikit_cancel_key (empty: none)", async () => {
    client = await createClient();
    expect(await (await startRuntime()).run(`return KEYMAPS.nuikit_cancel`)).toBe("x");
    client.close();
    client = await createClient();
    const unbound = `GetConvar = function(k, d) if k == 'nuikit_cancel_key' then return '' end return d end`;
    const host = await client.start("nuikit", { before: natives + unbound, scripts: ["keys.lua", "intents.lua", RUNTIME] });
    expect(await host.run(`return KEYMAPS.nuikit_cancel`)).toBe("");
  });

  it("the X key cancels a cancellable progress only", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`B = nk.progress({ label = 'b', duration = 100 }, function(r) RB = r end)`);
    await host.run(`COMMANDS.nuikit_cancel()`);
    expect(await shop.run(`return B:isOpen()`)).toBe(true);
    await shop.run(`B:cancel() A = nk.progress({ label = 'a', duration = 100, cancel = true }, function(r) RA = r end)`);
    await host.run(`COMMANDS.nuikit_cancel()`);
    expect(last(host)).toEqual({ op: "cancel", id: "shop#2", reason: "cancel" });
    expect(await shop.run(`return A:isOpen()`)).toBe(false);
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

describe("adapter supersets", () => {
  it("one progress at a time: a second is refused with 'busy'", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`
      A = nk.progress({ label = 'a', duration = 100 }, function(r, reason) RA = reason end)
      B = nk.progress({ label = 'b', duration = 100 }, function(r, reason) RB = reason end)
    `);
    expect(await shop.run(`return RB`)).toBe("busy");
    expect(await shop.run(`return A:isOpen()`)).toBe(true);
    expect(frame(host).filter((m) => m.op === "open").length).toBe(1);
    expect(await host.run(`local b = exports.nuikit:progress({ duration = 5 }) return b`)).toBeFalsy();
  });

  it("emits nuikit:intent { source, intent } once per drawn intent, for the doctor", async () => {
    client = await createClient();
    const host = await startRuntime();
    await host.run(`COUNTS = {} AddEventHandler('nuikit:intent', function(e) COUNTS[#COUNTS + 1] = e.source .. ':' .. e.intent end)`);
    const shop = await startScript("shop");
    await shop.run(`nk.notify('a') nk.prompt('b')`);
    await shop.run(`TriggerEvent('nuikit:intent:open', 'shop#9', 'menu', { title = 'x' })`); // invalid: not counted
    expect(await host.run(`return COUNTS`)).toEqual(["shop:notify", "shop:prompt"]);
  });

  it("a menu with focus = false is drawn without a surface; notify duration 0 is kept", async () => {
    client = await createClient();
    const host = await startRuntime();
    const shop = await startScript("shop");
    await shop.run(`nk.menu({ title = 'Preview', focus = false, items = { { label = 'a' } } }, { async = true })`);
    expect(client.focused()).toBeNull();
    await shop.run(`nk.notify({ id = 'p', title = 'Persistent', duration = 0 })`);
    expect(last(host).intent.props.duration).toBe(0);
  });

  it("https://nuikit/intent: an override page opens an intent and is answered when it ends", async () => {
    client = await createClient();
    const host = await startRuntime();
    // fire-and-forget: answered at once
    expect(await host.call("intent", { source: "ox_lib", intent: "notify", props: { title: "hi" } })).toEqual({ id: "page:ox_lib#p1" });
    expect(last(host).intent).toMatchObject({ id: "page:ox_lib#p1", resource: "page:ox_lib", kind: "notify" });
    // yielding: answered on resolve
    const pending = host.callPending("intent", { source: "ox_lib", intent: "confirm", props: { title: "Sure?" }, id: "alert" });
    expect(pending.done).toBe(false);
    expect(client.focused()).toBe("nuikit");
    await host.call("nuikit:intent:resolve", { id: "page:ox_lib#alert", result: "confirm" });
    expect(pending.done).toBe(true);
    expect(pending.result).toEqual({ id: "page:ox_lib#alert", result: "confirm" });
    expect(client.focused()).toBeNull();
    // update and cancel by id; a bad payload is an error
    await host.call("intent", { update: "page:ox_lib#p1", props: { title: "changed" } });
    expect(last(host)).toEqual({ op: "update", id: "page:ox_lib#p1", props: { title: "changed" } });
    await host.call("intent", { cancel: "page:ox_lib#p1" });
    expect(last(host)).toMatchObject({ op: "cancel", id: "page:ox_lib#p1" });
    expect(await host.call("intent", { source: "ox_lib", intent: "menu", props: {} })).toEqual({ error: "invalid" });
  });

  // ox routing (docs/adapters/ox-lib.md): the door's probe, event long-poll, replace and stop paths.
  it("https://nuikit/intent probe: answers whether routing is on (convar nuikit_ox_route, default on)", async () => {
    client = await createClient();
    const host = await startRuntime();
    expect(await host.call("intent", { probe: true, source: "ox_lib" })).toEqual({ ok: true, route: true });
    // the convar off → the page draws locally
    await host.run(`GetConvarInt = function(k, d) if k == 'nuikit_ox_route' then return 0 end return d end`);
    expect(await host.call("intent", { probe: true, source: "ox_lib" })).toEqual({ ok: true, route: false });
  });

  it("https://nuikit/intent listen: a long-poll per intent carries its events, then `ended`", async () => {
    client = await createClient();
    const host = await startRuntime();
    const menu = host.callPending("intent", { source: "ox_lib", intent: "menu", props: { title: "List", input: "keyboard", items: [{ label: "a", values: ["x", "y"] }] }, id: "menu" });
    const id = "page:ox_lib#menu";
    // nothing queued: held until an event arrives
    const l1 = host.callPending("intent", { listen: id });
    expect(l1.done).toBe(false);
    await host.call("nuikit:intent:event", { id, event: "change", data: { index: 1, value: 1 } });
    expect(l1.done).toBe(true);
    expect(l1.result).toEqual({ id, events: [{ event: "change", data: { index: 1, value: 1 } }] });
    // events that arrived between polls are queued and answered at once, in order
    await host.call("nuikit:intent:event", { id, event: "scroll", data: { index: 1, value: 2 } });
    await host.call("nuikit:intent:event", { id, event: "check", data: { index: 1, checked: true } });
    expect(await host.call("intent", { listen: id })).toEqual({ id, events: [{ event: "scroll", data: { index: 1, value: 2 } }, { event: "check", data: { index: 1, checked: true } }] });
    // a quiet poll is answered empty after the timeout so the page asks again
    const l2 = host.callPending("intent", { listen: id });
    client.runTimers();
    expect(l2.result.id).toBe(id);
    expect(Object.keys(l2.result.events)).toHaveLength(0); // an empty Lua table: {} or [] on the wire, the page accepts both
    // the intent ends: the open fetch gets the result, a waiting listener hears `ended`, a late one too
    const l3 = host.callPending("intent", { listen: id });
    await host.call("nuikit:intent:resolve", { id, result: { index: 1, value: 2 } });
    expect(menu.result).toEqual({ id, result: { index: 1, value: 2 } });
    expect(l3.result).toEqual({ id, ended: true });
    expect(await host.call("intent", { listen: id })).toEqual({ id, ended: true });
    // a script's intent is never listened to
    expect(await host.call("intent", { listen: "shop#1" })).toEqual({ id: "shop#1", ended: true });
  });

  it("https://nuikit/intent: the same page id opened again answers the first fetch `replaced`; nuikit stopping answers `stopped`", async () => {
    client = await createClient();
    const host = await startRuntime();
    const first = host.callPending("intent", { source: "ox_lib", intent: "menu", props: { title: "A", items: [{ label: "a" }] }, id: "context" });
    const second = host.callPending("intent", { source: "ox_lib", intent: "menu", props: { title: "B", items: [{ label: "b" }] }, id: "context" });
    expect(first.result).toEqual({ id: "page:ox_lib#context", reason: "replaced" });
    expect(second.done).toBe(false);
    expect(last(host).intent.props.title).toBe("B");
    expect(client.focused()).toBe("nuikit");
    client.stop("nuikit");
    expect(second.result).toEqual({ id: "page:ox_lib#context", reason: "stopped" });
    expect(client.focused()).toBeNull();
  });
});
