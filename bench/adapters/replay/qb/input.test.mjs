// nuikit_qb_input: docs/adapters/qb-input.md "Replay test" (main call + the CloseMenu failure path).
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createClient } from "../harness.mjs";
import { play, recording, startAdapter, startRuntime } from "./qb.mjs";

describe("nuikit_qb_input replays qb-input calls", () => {
  let client, rt, got, opens;
  before(async () => {
    client = await createClient();
    rt = await startRuntime(client);
    const input = await startAdapter(client, "nuikit_qb_input");
    got = await play(client, rt, recording("qb-input"), { adapters: { nuikit_qb_input: input } });
    opens = await rt.opens("input");
  });
  after(() => client.close());

  it("ShowInput blocked and returned a table keyed by input name, typed", () => {
    assert.deepEqual(got.errors, []);
    assert.deepEqual(got.threads.first, { reason: "late", pin: "1234", amount: 250, kind: "bank", account: "a", perms: ["read", "write"], tint: "#00ff00" });
  });

  it("one input intent per call, fields in order, defaults and options intact, the checkbox group as a group", async () => {
    assert.equal(opens.length, 2);
    const p = opens[0].props;
    assert.equal(p.title, "Bill");
    assert.equal(p.submitLabel, "Send");
    assert.deepEqual(p.fields.map((f) => [f.id, f.type, f.required ?? false]), [
      ["reason", "text", true], ["pin", "password", false], ["amount", "number", false], ["kind", "radio", false],
      ["account", "select", false], ["perms", "checkbox-group", false], ["tint", "color", false],
    ]);
    assert.equal(p.fields[2].default, 100);
    assert.equal(p.fields[3].default, "cash");
    assert.deepEqual(p.fields[5].options, [{ value: "read", label: "Read" }, { value: "write", label: "Write" }]);
    assert.deepEqual(p.fields[5].default, ["read"]);
    assert.deepEqual((await rt.intents()).filter((o) => o.op === "invalid"), []);
  });

  it("CloseMenu makes the pending ShowInput return nil; with nothing open it does nothing", async () => {
    assert.equal(got.threads.closed, null);
    assert.equal(Object.keys(await rt.open()).length, 0);
    assert.equal((await rt.intents()).filter((o) => o.op === "cancel").length, 1);
  });
});
