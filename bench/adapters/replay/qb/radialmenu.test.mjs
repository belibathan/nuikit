// nuikit_qb_radialmenu: docs/adapters/qb-radialmenu.md "Replay test".
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createClient } from "../harness.mjs";
import { play, recording, startAdapter, startRuntime } from "./qb.mjs";

describe("nuikit_qb_radialmenu replays qb-radialmenu use", () => {
  let client, rt, got, opens;
  before(async () => {
    client = await createClient();
    rt = await startRuntime(client);
    await startAdapter(client, "nuikit_qb_radialmenu", {
      files: ["config.lua", "client/main.lua"],
      before: "NUI.player = { get = function() return { job = { name = 'police' } } end }",
    });
    got = await play(client, rt, recording("qb-radialmenu"), { caller: "my_script" });
    opens = await rt.opens("radial");
  });
  after(() => client.close());

  it("the radial at open had the config items, the job items for the player's job, the added option", async () => {
    assert.deepEqual(got.errors, []);
    assert.equal(opens.length, 3);
    const first = opens[0].props;
    assert.equal(first.label, "Actions");
    assert.deepEqual(first.items.map((i) => [i.id, i.label, i.keepOpen ?? false, (i.items ?? []).length]), [
      ["citizen", "Citizen", false, 2], ["emotes", "Emotes", false, 0], ["police-stash", "Stash", false, 0], ["extra", "Added", true, 0],
    ]);
    assert.equal(got.returns[0].value, "extra"); // AddOption returned the id
    assert.deepEqual((await rt.intents()).filter((o) => o.op === "invalid"), []);
  });

  it("selecting dispatches by type; a keepOpen item dispatches and stays open; a submenu entry dispatches nothing", () => {
    assert.deepEqual(got.events.map((e) => [e.event, e.args[0]?.id]), [
      ["my_script:added", "extra"],
      ["qb-idcard:client:showId", "id"],
      ["police:client:openStash", "police-stash"],
    ]);
    assert.deepEqual(got.executed, []);
  });

  it("after RemoveOption the next open lacks the item; RemoveOption of an unknown id does nothing", () => {
    assert.deepEqual(opens[2].props.items.map((i) => i.id), ["citizen", "emotes", "police-stash"]);
  });
});
