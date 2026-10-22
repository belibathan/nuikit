import { afterEach, describe, expect, it } from "vitest";
import { createClient as create } from "./harness";

let client: Awaited<ReturnType<typeof create>>;
afterEach(() => client?.close());

type Res = Awaited<ReturnType<typeof client.start>>;
const CLEAN = { focus: false, cursor: false, keepInput: false };
// The real NUI focus is one global; the last SetNuiFocus call wins, whichever resource made it.
const state = () => ({ focus: client.nui.focus, cursor: client.nui.cursor, keepInput: client.nui.keepInput });

/** What the page does: Escape reaches the frame that holds the NUI focus. */
async function escape(): Promise<any> {
  const owner = client.nui.owner;
  if (!owner) return { ok: false, noFrame: true };
  return client.resources.get(owner)!.call("nuikit:escape");
}

// Start order decides whose handler runs first, so every cross-resource scenario runs in both orders.
const orders: [string, string][] = [["a", "b"], ["b", "a"]];
async function pair(make: () => Promise<typeof client>, first: string, second: string) {
  client = await make();
  const rs: Record<string, Res> = {};
  rs[first] = await client.start(first);
  rs[second] = await client.start(second);
  return { a: rs.a!, b: rs.b! };
}

describe.each([
  ["queued events", false],
  ["synchronous events", true],
])("escape and focus robustness (%s)", (_l, syncEvents) => {
  const make = () => create({ syncEvents });

  it.each(orders)("1. menu + pause across resources (started %s,%s): one Escape per surface, then clean", async (f, s) => {
    const { a, b } = await pair(make, f, s);
    await a.run(`Menu = NUI.surface('menu', { layer = 'panel' }) Menu:open()`);
    await b.run(`Pause = NUI.surface('pause', { layer = 'modal', input = 'full', exclusive = true, hides = { 'hud' } }) Pause:open()`);
    expect(client.nui.owner).toBe("b");
    expect(state()).toMatchObject({ focus: true, cursor: true });
    expect(await escape()).toMatchObject({ ok: true, closed: "pause" });
    expect(client.nui.owner).toBe("a");
    expect(state()).toMatchObject({ focus: true, cursor: true });
    expect(await escape()).toMatchObject({ ok: true, closed: "menu" });
    expect(state()).toEqual(CLEAN);
    expect(await escape()).toMatchObject({ ok: false });
  });

  it.each(orders)("2. inventory + context menu (%s,%s): Escape closes the menu; inventory keeps its cursor and keepInput", async (f, s) => {
    const { a, b } = await pair(make, f, s);
    await a.run(`Inv = NUI.surface('inventory', { layer = 'panel', input = 'keyboard', keepInput = true }) Inv:open()`);
    expect(state()).toEqual({ focus: true, cursor: false, keepInput: true });
    await b.run(`Ctx = NUI.surface('ctx', { layer = 'modal' }) Ctx:open()`);
    expect(state()).toEqual({ focus: true, cursor: true, keepInput: false });
    expect(await escape()).toMatchObject({ closed: "ctx" });
    expect(client.nui.owner).toBe("a");
    expect(state()).toEqual({ focus: true, cursor: false, keepInput: true });
    expect(await escape()).toMatchObject({ closed: "inventory" });
    expect(state()).toEqual(CLEAN);
  });

  it.each(orders)("3. a resource stops on top, then underneath (%s,%s): no stale focus, no cursor", async (f, s) => {
    const { a, b } = await pair(make, f, s);
    await a.run(`A = NUI.surface('a', { layer = 'panel' }) A:open()`);
    await b.run(`B = NUI.surface('b', { layer = 'modal' }) B:open()`);
    client.stop("b"); // the top one
    expect(client.nui.owner).toBe("a");
    expect(state()).toMatchObject({ focus: true, cursor: true });
    const b2 = await client.start("b");
    await b2.run(`B = NUI.surface('b', { layer = 'modal' }) B:open()`);
    client.stop("a"); // the one underneath
    expect(client.nui.owner).toBe("b");
    expect(state()).toMatchObject({ focus: true, cursor: true });
    client.stop("b");
    expect(state()).toEqual(CLEAN);
  });

  it.each(orders)("4. rapid open/close (%s,%s): final state clean", async (f, s) => {
    const { a, b } = await pair(make, f, s);
    await a.run(`A = NUI.surface('a', { layer = 'panel' })`);
    await b.run(`B = NUI.surface('b', { layer = 'panel' })`);
    await a.run(`A:open()`);
    await b.run(`B:open()`);
    await a.run(`A:close()`);
    expect(client.nui.owner).toBe("b");
    expect(state()).toMatchObject({ focus: true, cursor: true });
    await b.run(`B:close() B:open() B:close()`);
    await a.run(`A:open() A:close() A:open() A:close()`);
    expect(state()).toEqual(CLEAN);
    expect(client.focused()).toBe(null);
  });

  it.each(orders)("5. a hud never holds focus or swallows Escape (%s,%s)", async (f, s) => {
    const { a, b } = await pair(make, f, s);
    await a.run(`P = NUI.surface('p', { layer = 'panel' }) P:open()`);
    await b.run(`H = NUI.surface('hud', { layer = 'hud' }) H:open()`);
    expect(client.nui.owner).toBe("a");
    expect(state()).toMatchObject({ focus: true, cursor: true });
    expect(await escape()).toMatchObject({ closed: "p" });
    expect(await b.run(`return H:isOpen()`)).toBe(true);
    expect(state()).toEqual(CLEAN);
    expect(await escape()).toMatchObject({ ok: false });
    expect(await b.call("nuikit:escape")).toEqual({ ok: false });
  });

  it("6. a state arriving while a blockedBy surface is open leaves nothing stuck", async () => {
    client = await make();
    const core = await client.start("core");
    const inv = await client.start("inventory");
    await inv.run(`I = NUI.surface('inventory', { blockedBy = { 'dead' } }) I:open()`);
    await core.run(`NUI.state('dead', true)`);
    // blockedBy only gates opening: an open surface stays closable by Escape
    expect(client.nui.owner).toBe("inventory");
    expect(await escape()).toMatchObject({ closed: "inventory" });
    expect(state()).toEqual(CLEAN);
    expect(await inv.run(`return I:open()`)).toBe(false);
    expect(state()).toEqual(CLEAN);
    await core.run(`NUI.state('dead', false)`);
    expect(await inv.run(`return I:open()`)).toBe(true);
    await inv.run(`I:close()`);
    expect(state()).toEqual(CLEAN);
  });

  it("7. Escape with nothing open does nothing, in every resource", async () => {
    client = await make();
    const a = await client.start("a");
    const b = await client.start("b");
    await a.run(`H = NUI.surface('hud', { layer = 'hud' }) H:open()`);
    for (const r of [a, b]) expect(await r.call("nuikit:escape")).toEqual({ ok: false });
    expect(state()).toEqual(CLEAN);
  });

  it("8. page reload (nuikit:ready) while surfaces are open: state resent, focus unchanged", async () => {
    client = await make();
    const a = await client.start("a");
    const b = await client.start("b");
    await a.run(`P = NUI.surface('p', { layer = 'panel' }) P:open({ n = 1 })`);
    await b.run(`M = NUI.surface('m', { layer = 'modal' }) M:open({ n = 2 })`);
    for (const r of [a, b]) {
      r.messages.length = 0;
      expect(await r.call("nuikit:ready")).toMatchObject({ ok: true });
      expect(r.messages.map((m) => m.action)).toContain("nuikit:surfaces");
    }
    expect(a.surfaces().p).toMatchObject({ open: true, focused: false, data: { n: 1 } });
    expect(b.surfaces().m).toMatchObject({ open: true, focused: true, data: { n: 2 } });
    expect(client.nui.owner).toBe("b");
    expect(state()).toMatchObject({ focus: true, cursor: true });
  });
});
