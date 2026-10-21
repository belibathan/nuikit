// nuikit_qb_notify + nuikit_qb_drawtext: docs/adapters/qb-core-notify.md and qb-drawtext.md "Replay test".
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createClient } from "../harness.mjs";
import { play, recording, startAdapter, startRuntime } from "./qb.mjs";

describe("nuikit_qb_notify and nuikit_qb_drawtext replay qb-core events", () => {
  let client, rt, got, ops;
  before(async () => {
    client = await createClient();
    rt = await startRuntime(client);
    await startAdapter(client, "nuikit_qb_notify");
    await startAdapter(client, "nuikit_qb_drawtext");
    got = await play(client, rt, recording("qb-core"), { caller: "my_script" });
    ops = await rt.intents();
  });
  after(() => client.close());

  it("one notify per event with the mapping; title only for the table form; unknown types keep info + meta.kind; 5000 default", () => {
    assert.deepEqual(got.errors, []);
    const n = ops.filter((o) => o.op === "open" && o.kind === "notify").map((o) => o.props);
    assert.deepEqual(n, [
      { description: "Paid $500", status: "success", duration: 3000, meta: { library: "qb-core" } },
      { description: "Unit 12", title: "Dispatch", status: "info", duration: 5000, meta: { library: "qb-core", kind: "police" } },
      { description: "Plain", status: "info", duration: 5000, meta: { library: "qb-core" } },
    ]);
    // Failure path: an empty notify is dropped, nothing invalid reached the runtime.
    assert.deepEqual(ops.filter((o) => o.op === "invalid"), []);
  });

  it("other listeners of QBCore:Notify still ran (the event is never cancelled)", () => {
    assert.equal(got.events.filter((e) => e.event === "QBCore:Notify").length, 4);
  });

  it("DrawText opened one prompt; ChangeText updated it; KeyPressed set pressed and hid it ~500 ms later; HideText on nothing did nothing", () => {
    const p = ops.filter((o) => o.kind === "prompt" || (o.id && o.id.endsWith("#drawtext")));
    assert.deepEqual(p.map((o) => o.op), ["open", "update", "update", "cancel"]);
    assert.deepEqual(p[0].props, { id: "drawtext", label: "Open garage", keys: ["E"], position: "center-left", pressed: false, meta: { library: "qb-core" } });
    assert.deepEqual(p[1].props, { label: "Close", keys: ["E"], position: "center-right", meta: { library: "qb-core" } });
    assert.deepEqual(p[2].props, { pressed: true });
    assert.equal(p[3].reason, "close");
    assert.equal(ops.filter((o) => o.op === "open" && o.kind === "prompt").length, 1);
  });
});
