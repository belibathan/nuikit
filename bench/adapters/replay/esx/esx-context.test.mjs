// esx_context → nuikit_esx_context: docs/adapters/esx-context.md "Replay test".
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { createClient, replay } from "../harness.mjs";
import { intents, recording, startAdapter, startNk } from "./_nk.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

describe("nuikit_esx_context", () => {
  let client, nk, got;
  before(async () => {
    client = await createClient();
    nk = await startNk(client);
    await startAdapter(client, "[nuikit-esx]", "nuikit_esx_context");
    got = await replay(client, recording(HERE, "esx-context"), { caller: "esx_garage" });
  });
  after(() => client.close());

  it("Open draws one cursor menu (header as title, inputs as fields); onSelect gets menu.eles with the typed values; Refresh updates in place; Close runs onClose once", () => {
    assert.deepEqual(got.errors, []);
    const ops = intents(nk, "menu");
    assert.equal(ops[0].op, "open");
    const p = ops[0].props;
    assert.equal(p.title, "Garage");
    assert.deepEqual([p.position, p.input, p.focus, p.canClose, p.dismissable], ["center-right", "cursor", true, true, true]);
    assert.deepEqual(p.items.map((i) => [i.id, i.field?.type, i.field?.default, i.close]), [["plate", "text", undefined, false], ["count", "number", 2, false], ["confirm", undefined, undefined, false]]);
    assert.deepEqual(p.items[1].field, { type: "number", min: 1, max: 10, default: 2 });

    const select = got.fnCalls.find((f) => f.label === "onSelect");
    const [menu, element] = select.args;
    assert.equal(menu.position, "right");
    assert.deepEqual(menu.eles.map((e) => e.inputValue), [undefined, "ABC123", 5, undefined]);
    assert.equal(element.name, "confirm");
    assert.equal(element.value, 7); // undocumented fields round-trip untouched

    assert.equal(ops[1].op, "update");
    assert.equal(ops[1].props.items.length, 2);
    assert.equal(ops[2].op, "cancel");
    assert.equal(got.fnCalls.filter((f) => f.label === "onClose").length, 1);
  });

  it("failure paths: Preview takes no focus; a canClose = false menu ignores Escape (no onClose, still open)", async () => {
    const opens = intents(nk, "menu").filter((m) => m.op === "open");
    assert.equal(opens[1].props.focus, false);
    assert.equal(opens[2].props.canClose, false);
    assert.equal(got.fnCalls.filter((f) => f.label === "onClose3").length, 0);
    assert.equal(got.returns.at(-1).value, 1); // count('menu')
  });
});
