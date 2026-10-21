// esx_textui → nuikit_esx_textui: docs/adapters/esx-textui.md "Replay test".
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { createClient, replay } from "../harness.mjs";
import { intents, recording, startAdapter, startNk } from "./_nk.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

describe("nuikit_esx_textui", () => {
  let client, nk, got;
  before(async () => {
    client = await createClient();
    nk = await startNk(client);
    await startAdapter(client, "[nuikit-esx]", "nuikit_esx_textui");
    got = await replay(client, recording(HERE, "esx-textui"), { caller: "esx_garage" });
  });
  after(() => client.close());

  it("one prompt for the polled TextUI, one update for the change, one cancel for HideUI", () => {
    assert.deepEqual(got.errors, []);
    const ops = intents(nk, "prompt").map((m) => [m.op, m.props ?? m.reason]);
    assert.deepEqual(ops, [
      ["open", { id: "textui", label: "Open", keys: ["E"], status: "info" }],
      ["update", { label: "Close", keys: ["E"], status: "error" }],
      ["cancel", "cancel"],
    ]);
  });

  it("failure paths: a second HideUI and an empty TextUI do nothing", () => {
    assert.equal(intents(nk).length, 3);
  });
});
