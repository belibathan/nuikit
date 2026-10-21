// nuikit_qb_menu: docs/adapters/qb-menu.md "Replay test". Run: node --test bench/adapters/replay/qb/
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createClient } from "../harness.mjs";
import { play, recording, startAdapter, startRuntime } from "./qb.mjs";

describe("nuikit_qb_menu replays qb-menu calls", () => {
  let client, rt, got, opens;
  before(async () => {
    client = await createClient();
    rt = await startRuntime(client);
    await startAdapter(client, "nuikit_qb_menu");
    got = await play(client, rt, recording("qb-menu"), { caller: "my_script" });
    opens = await rt.opens("menu");
  });
  after(() => client.close());

  it("1. every call returned nothing and threw nothing", () => {
    assert.deepEqual(got.errors, []);
    for (const r of got.returns) assert.equal(r.value, undefined);
  });

  it("2. one menu intent per openMenu: title from the first header, headers as kind 'header', hidden absent, disabled kept", () => {
    const first = opens[0];
    assert.equal(first.resource, "nuikit_qb_menu");
    assert.equal(first.props.title, "Garage");
    assert.equal(first.props.description, "Pillbox");
    assert.deepEqual(first.props.meta, { library: "qb-menu" });
    assert.deepEqual(
      first.props.items.map((i) => [i.id, i.label, i.kind ?? "item", i.disabled ?? false]),
      [
        ["2", "Take out", "item", false],
        ["3", "Pay fee", "item", false],
        ["5", "Staff", "header", false],
        ["6", "Close", "item", false],
        ["7", "Locked", "item", true],
      ],
    );
    assert.equal(first.props.items[0].icon, "fas fa-car");
    assert.equal(first.props.items[0].description, "Sultan RS");
    // Nothing of the caller's params or functions went on the wire.
    assert.equal(JSON.stringify(first.props).includes("my_script"), false);
  });

  it("3. picking dispatches exactly as qb-menu documents, args intact", () => {
    assert.deepEqual(got.events.slice(0, 1), [{ event: "my_script:openGarage", args: [{ plate: "ABC123" }] }]);
    assert.deepEqual(
      got.serverEvents.map((e) => [e.event, e.args]),
      [
        ["my_script:payFee", [{ amount: 250 }]],
        ["QBCore:CallCommand", ["duty", { x: 1 }]],
      ],
    );
    assert.deepEqual(got.fnCalls, [
      { label: "closeAction", args: [] },
      { label: "paramsFn", args: ["hello"] },
    ]);
    assert.deepEqual(got.executed.map((e) => e.line), ["repairkit"]);
  });

  it("sort puts rows by header and skipFirst keeps the first one in place", () => {
    const sortedMenu = opens[6];
    assert.deepEqual(sortedMenu.props.items.map((i) => i.label), ["Zulu", "Alpha", "Mike"]);
  });

  it("Escape gives the caller nothing", () => {
    const after = got.events.filter((e) => e.event === "my_script:closed");
    assert.equal(after.length, 0);
  });

  it("4. closeMenu cancels an open menu; with none open it does nothing", async () => {
    const ops = await rt.intents();
    const cancels = ops.filter((o) => o.op === "cancel");
    // one 'replaced' (First → Second), one 'close' (closeMenu), one 'close' (the event form after showHeader)
    assert.deepEqual(cancels.map((c) => c.reason), ["replaced", "close", "close"]);
    assert.equal(Object.keys(await rt.open()).length, 0);
  });

  it("5. openMenu while open replaces the menu: one open at a time", async () => {
    const ops = await rt.intents();
    const i = ops.findIndex((o) => o.op === "open" && o.props.items[0].label === "Second");
    const before = ops.slice(0, i).filter((o) => o.op === "open" && o.props.items[0].label === "First");
    assert.equal(before.length, 1);
    assert.equal(ops[i - 1].op, "cancel"); // First cancelled just before Second opened
  });

  it("6. the event form produced the same as the export form", () => {
    assert.deepEqual(got.events.find((e) => e.event === "my_script:viaEvent"), { event: "my_script:viaEvent", args: [[1, 2]] });
  });

  it("showHeader shows only header rows, and a header-only menu is still drawable", () => {
    const header = opens.at(-1);
    assert.deepEqual(header.props.items, [{ id: "title", kind: "header", label: "Boss menu" }]);
    assert.equal(header.props.title, "");
  });

  it("every intent the adapter opened passed the schema", async () => {
    const bad = (await rt.intents()).filter((o) => o.op === "invalid");
    assert.deepEqual(bad, []);
  });
});
