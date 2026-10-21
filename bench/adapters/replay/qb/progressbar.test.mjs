// nuikit_qb_progressbar: docs/adapters/qb-progressbar.md "Replay test" (main call, cancel, tick, the busy failure path).
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createClient } from "../harness.mjs";
import { play, recording, startAdapter, startRuntime } from "./qb.mjs";

describe("nuikit_qb_progressbar replays progressbar calls", () => {
  let client, rt, got, opens, adapter;
  before(async () => {
    client = await createClient();
    rt = await startRuntime(client);
    adapter = await startAdapter(client, "nuikit_qb_progressbar", { files: ["client/effects.lua", "client/main.lua"] });
    got = await play(client, rt, recording("qb-progressbar"), { caller: "my_script" });
    opens = await rt.opens("progress");
  });
  after(() => client.close());

  it("handler(false) when it ran out, handler(true) on cancel, never both; a second bar while one runs gets finish(true) at once", () => {
    assert.deepEqual(got.errors, []);
    const calls = got.fnCalls.filter((f) => f.label.endsWith("Done")).map((f) => [f.label, f.args[0]]);
    assert.deepEqual(calls, [["secondDone", true], ["repairDone", false], ["lockpickDone", true], ["tickDone", false]]);
    assert.deepEqual(got.returns.filter((r) => r.call.endsWith("isDoingSomething")).map((r) => r.value), [true, false]);
  });

  it("the intent carried id, label, duration, cancel, style bar; animation, prop and controls never reached it", () => {
    assert.equal(opens.length, 3);
    assert.deepEqual(opens[0].props, { id: "repair", label: "Repairing", duration: 5000, cancel: true, style: "bar", meta: { library: "progressbar", useWhileDead: false } });
    assert.equal(JSON.stringify(opens).includes("animDict"), false);
  });

  it("start once at open; tick while open and not after; effects applied through the natives", async () => {
    const seq = got.fnCalls.filter((f) => f.label === "start" || f.label === "tick").map((f) => f.label);
    assert.deepEqual(seq, ["start", "tick", "tick", "tick", "tick"]); // one on CreateThread, then 3 frames; none in the 2 frames after
    const natives = await adapter.natives();
    for (const n of ["RequestAnimDict", "TaskPlayAnim", "CreateObject", "AttachEntityToEntity", "StopAnimTask", "DeleteObject"]) assert.ok(natives.includes(n), n);
  });
});
