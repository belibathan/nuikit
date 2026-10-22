// nuikit_shims: docs/adapters/shims.md. Old export names land in intents by config.
// Run: node --test "bench/adapters/replay/shims/*.test.mjs"
// `nk` is faked here (records the props it was given, answers from a canned result): the mapping is what is
// under test; the real intents are covered by packages/core and the other replay suites.
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { createClient } from "../harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(HERE, "../../../../adapters/[nuikit-shims]/nuikit_shims");

const FAKE_NK = `
  CALLS = {}
  local function rec(kind, result)
    return function(props) CALLS[#CALLS + 1] = { kind = kind, props = props } return result end
  end
  nk = {
    notify = rec('notify'),
    input = rec('input', { values = { 5 }, byId = { amount = 5 } }),
    menu = rec('menu', nil),
  }
`;

const CONFIG = `
  ShimConfig = {
    { resource = 'my_notify', export = 'Notify', intent = 'notify', args = { 'description', 'status', 'duration' },
      map = { status = { inform = 'info' } }, defaults = { title = 'Server', duration = 4000 } },
    { resource = 'my_menu', export = 'Ask', intent = 'input',
      transform = function(title) return { title = title, fields = { { id = 'amount', type = 'number' } } } end },
    { resource = 'my_menu', export = 'AskAmount', intent = 'input',
      transform = function(title) return { title = title, fields = { { id = 'amount', type = 'number' } } } end,
      result = function(r) return r and r.byId.amount or nil end },
    { resource = 'my_menu', export = 'Pick', intent = 'menu', args = { 'title' } },
    { resource = 'my_menu', export = 'Broken', intent = 'notify', transform = function() error('boom') end },
    { resource = 'my_menu', export = 'Nope', intent = 'hologram', args = { 'x' } },
  }
`;

describe("nuikit_shims", () => {
  let client, shims, caller;
  const calls = async () => Object.values(await shims.lua.global.get("CALLS")).map((c) => ({ kind: c.kind, props: c.props }));
  before(async () => {
    client = await createClient();
    shims = await client.start("nuikit_shims", { before: FAKE_NK + CONFIG, files: [path.join(DIR, "shim.lua"), path.join(DIR, "client.lua")] });
    caller = await client.start("some_script");
  });
  after(() => client.close());
  const call = (res, name, args = "") => caller.run(`return exports['${res}']:${name}(${args})`);

  it("positional args become prop names; the value map and defaults apply (args win over defaults)", async () => {
    await call("my_notify", "Notify", `'Saved', 'inform', 2500`);
    await call("my_notify", "Notify", `'Oops', 'error'`);
    const c = await calls();
    assert.deepEqual(c[0], { kind: "notify", props: { description: "Saved", status: "info", duration: 2500, title: "Server" } });
    assert.deepEqual(c[1].props, { description: "Oops", status: "error", duration: 4000, title: "Server" });
  });

  it("a notify export returns nothing, like the old one", async () => {
    assert.equal(await call("my_notify", "Notify", `'x'`), undefined);
  });

  it("transform builds the props from the raw args", async () => {
    await call("my_menu", "Ask", `'How many?'`);
    const c = await calls();
    assert.deepEqual(c.at(-1), { kind: "input", props: { title: "How many?", fields: [{ id: "amount", type: "number" }] } });
  });

  it("a yielding intent returns its result to the caller; `result` reshapes it", async () => {
    const raw = await call("my_menu", "Ask", `'q'`);
    assert.deepEqual(raw, { values: [5], byId: { amount: 5 } });
    assert.equal(await call("my_menu", "AskAmount", `'q'`), 5);
  });

  it("a cancelled yielding intent returns nil", async () => {
    assert.equal(await call("my_menu", "Pick", `'Garage'`), undefined);
  });

  it("an unknown intent prints once at load and registers nothing; a throwing transform prints once and returns nil", async () => {
    assert.ok(shims.prints.some((l) => l.includes("config entry 6 skipped: unknown intent 'hologram'")));
    await assert.rejects(() => call("my_menu", "Nope"), /No such export/);
    assert.equal(await call("my_menu", "Broken"), undefined);
    assert.equal(await call("my_menu", "Broken"), undefined);
    assert.equal(shims.prints.filter((l) => l.includes("my_menu:Broken failed")).length, 1);
  });
});
