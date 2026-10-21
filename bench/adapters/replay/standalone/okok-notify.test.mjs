// okokNotify → nuikit_okok_notify: docs/adapters/okok-notify.md "Replay test". Run: node --test "bench/adapters/replay/standalone/*.test.mjs"
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { createClient, replay } from "../harness.mjs";
import { intents, recording, startAdapter, startNk } from "../esx/_nk.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

describe("nuikit_okok_notify", () => {
  let client, nk, got;
  before(async () => {
    client = await createClient();
    nk = await startNk(client);
    await startAdapter(client, "[nuikit-standalone]", "nuikit_okok_notify");
    got = await replay(client, recording(HERE, "okok-notify"), { caller: "okok_bank" });
  });
  after(() => client.close());

  it("the export and the server event each draw one toast; sound is carried; unknown types are info + meta.kind", () => {
    assert.deepEqual(got.errors, []);
    const opens = intents(nk, "notify").filter((m) => m.op === "open");
    assert.deepEqual(opens[0].props, { title: "Bank", description: "Paid $500", status: "success", duration: 5000, sound: true });
    assert.deepEqual(opens[1].props, { title: "Phone", description: "New message", status: "info", duration: 3000, meta: { kind: "phone" } });
  });

  it("failure path: an empty alert draws nothing", () => {
    assert.equal(intents(nk, "notify").filter((m) => m.op === "open").length, 2);
  });
});
