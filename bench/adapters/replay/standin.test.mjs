// Worked example: replay a recorded qb-menu call log against the stand-in spike and assert what
// the calling script got back. Run: node --test bench/adapters/replay/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { createClient, replay } from "./harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STANDIN = path.resolve(HERE, "../spike/nuikit_spike_standin/client.lua");
const recording = JSON.parse(readFileSync(path.join(HERE, "recordings/qb-menu-sample.json"), "utf8"));

describe("nuikit_spike_standin replays qb-menu calls", () => {
  let client, got, standin;
  before(async () => {
    client = await createClient();
    standin = await client.start("nuikit_spike_standin", { files: [STANDIN] });
    got = await replay(client, recording, { caller: "my_script" });
  });
  after(() => client.close());

  it("answers every recorded call without error", () => {
    assert.deepEqual(got.errors, []);
    assert.equal(got.returns.length, 5); // 4 openMenu + 1 closeMenu
    for (const r of got.returns) assert.equal(r.value, undefined); // qb-menu's exports return nothing
  });

  it("the export landed under qb-menu's name (the __cfx_export_qb-menu_* path)", () => {
    const log = standin.prints.filter((l) => l.includes('"kind":"export"') && l.includes('"name":"openMenu"'));
    assert.equal(log.length, 5); // 4 by export + 1 by event (the event handler calls openMenu)
    assert.ok(log[0].includes('"from":"my_script"'), "GetInvokingResource is the calling script");
    assert.ok(standin.prints.some((l) => l.includes('"kind":"export-bind"')), "the setter ran once per call site");
  });

  it("pick 2 fires the item's client event with its args (what the script gets back)", () => {
    assert.deepEqual(got.events[0], { event: "my_script:openGarage", args: [{ plate: "ABC123" }] });
  });

  it("isServer items go to the server with args", () => {
    assert.deepEqual(got.serverEvents.map((e) => [e.event, e.args]), [["my_script:payFee", [{ amount: 250 }]]]);
  });

  it("action() items call the script's function", () => {
    assert.deepEqual(got.fnCalls.map((f) => f.label), ["closeAction"]);
  });

  it("disabled items are refused", () => {
    assert.ok(standin.prints.some((l) => l.includes("item 1 is not selectable")));
  });

  it("the event form works like the export form", () => {
    assert.equal(got.events[1].event, "my_script:closed");
    assert.equal(got.events[1].args[0], undefined); // no params.args → the handler gets nil, as in FiveM
  });

  it("draws nothing and never takes focus", () => {
    assert.deepEqual(got.messages, []);
  });
});
