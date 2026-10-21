// mythic_notify → nuikit_mythic_notify: docs/adapters/mythic-notify.md "Replay test".
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { createClient, replay } from "../harness.mjs";
import { intents, recording, startAdapter, startNk } from "../esx/_nk.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

describe("nuikit_mythic_notify", () => {
  let client, nk, got;
  before(async () => {
    client = await createClient();
    nk = await startNk(client);
    await startAdapter(client, "[nuikit-standalone]", "nuikit_mythic_notify");
    got = await replay(client, recording(HERE, "mythic-notify"), { caller: "mythic_fuel" });
  });
  after(() => client.close());

  it("one toast per export and event, 2500 ms when no length, style in meta; a persistent alert stays until its end", () => {
    assert.deepEqual(got.errors, []);
    const ops = intents(nk, "notify");
    const opens = ops.filter((m) => m.op === "open").map((m) => m.props);
    assert.deepEqual(opens[0], { description: "Hello", status: "info", duration: 2500 });
    assert.deepEqual(opens[1], { description: "Long", status: "error", duration: 6000 });
    assert.deepEqual(opens[2], { description: "Styled", status: "success", duration: 1500, meta: { style: { "background-color": "#333", color: "#fff" } } });
    assert.deepEqual(opens[3], { description: "Alert", status: "info", duration: 2500 });
    assert.deepEqual(opens[4], { description: "From server", status: "error", duration: 1000 });
    assert.deepEqual(opens[5], { id: "persistent:fuel", description: "Refuelling", status: "info", duration: 0 });
    const cancels = ops.filter((m) => m.op === "cancel");
    assert.equal(cancels.length, 1); // the end; the second end and the 10 s wait did nothing to it
    assert.equal(cancels[0].id, "nuikit_mythic_notify#persistent:fuel");
  });

  it("failure path: a non-table SendAlert draws nothing", () => {
    assert.equal(intents(nk, "notify").filter((m) => m.op === "open").length, 6);
  });
});
