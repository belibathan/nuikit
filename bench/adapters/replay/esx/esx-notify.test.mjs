// esx_notify → nuikit_esx_notify: docs/adapters/esx-notify.md "Replay test".
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { createClient, replay } from "../harness.mjs";
import { intents, recording, startAdapter, startNk } from "./_nk.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

describe("nuikit_esx_notify", () => {
  let client, nk, got;
  before(async () => {
    client = await createClient();
    nk = await startNk(client);
    await startAdapter(client, "[nuikit-esx]", "nuikit_esx_notify");
    got = await replay(client, recording(HERE, "esx-notify"), { caller: "esx_bank" });
  });
  after(() => client.close());

  it("the export and the server event each draw one toast with the mapping, and a double arrival is one toast", () => {
    assert.deepEqual(got.errors, []);
    const opens = intents(nk, "notify").filter((m) => m.op === "open");
    assert.equal(opens[0].resource, "nuikit_esx_notify");
    assert.deepEqual(opens[0].props, { id: "esx:1", title: "Bank", description: "Paid $500", status: "success", duration: 3000, position: "top" });
    assert.deepEqual(opens[1].props, { id: "esx:2", description: "You are wanted", status: "error", duration: 4000, position: "center-left" });
    // The same text again within the window reuses the id: the runtime updates in place, no third toast.
    assert.equal(opens[2].props.id, "esx:2");
    assert.equal(opens[2].props.description, "You are wanted");
  });

  it("failure paths: a swapped (type, length, message) order is put back; an empty message draws nothing", () => {
    const opens = intents(nk, "notify").filter((m) => m.op === "open");
    assert.deepEqual(opens[3].props, { id: "esx:3", description: "Swapped order", status: "info", duration: 2500 });
    assert.equal(opens.length, 4);
    assert.ok(got.prints.every((p) => !p.line.includes("invalid")), "nothing invalid reached the runtime");
  });
});
