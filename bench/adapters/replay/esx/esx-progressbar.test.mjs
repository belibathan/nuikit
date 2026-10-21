// esx_progressbar → nuikit_esx_progressbar: docs/adapters/esx-progressbar.md "Replay test".
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, it } from "node:test";
import { createClient, replay } from "../harness.mjs";
import { intents, recording, startAdapter, startNk } from "./_nk.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// The gameplay natives the adapter touches, logged.
const natives = `
  NATIVES = {}
  local function log(name) return function(...) NATIVES[#NATIVES + 1] = name .. ' ' .. table.concat({ tostring(select(2, ...)) }, ' ') end end
  PlayerPedId = function() return 1 end
  FreezeEntityPosition = log('freeze')
  RequestAnimDict = function() end
  HasAnimDictLoaded = function() return true end
  TaskPlayAnim = log('anim')
  StopAnimTask = log('stopAnim')
  ClearPedTasks = log('clearTasks')
  TaskStartScenarioInPlace = log('scenario')
`;

describe("nuikit_esx_progressbar", () => {
  let client, nk, adapter, got;
  before(async () => {
    client = await createClient();
    nk = await startNk(client);
    adapter = await startAdapter(client, "[nuikit-esx]", "nuikit_esx_progressbar", { before: natives, runThreads: true });
    got = await replay(client, recording(HERE, "esx-progressbar"), { caller: "esx_mechanic" });
  });
  after(() => client.close());

  it("one bar per call; onFinish after the duration, onCancel on CancelProgressbar, never both", () => {
    assert.deepEqual(got.errors, []);
    const opens = intents(nk, "progress").filter((m) => m.op === "open");
    assert.deepEqual(opens.map((m) => m.props), [
      { label: "Repairing", duration: 5000, cancel: false, style: "bar" },
      { label: "Searching", duration: 3000, cancel: false, style: "bar" },
    ]);
    assert.deepEqual(got.fnCalls.map((f) => f.label), ["cancel3", "finish1", "cancel2"]);
  });

  it("failure path: a second bar while one runs is refused (its onCancel ran, no intent); freeze and anim last the bar's lifetime", async () => {
    const natives = await adapter.lua.global.get("NATIVES");
    assert.deepEqual(Object.values(natives), ["freeze true", "anim mini@repair", "freeze false", "stopAnim mini@repair"]);
  });
});
