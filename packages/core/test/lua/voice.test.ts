// systems/nuikit_voice: pma-voice's state (player state bags + the talking native) as vitals slots,
// change-only, hidden when there's nothing to show, gone when pma-voice stops.
import { afterEach, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const dir = fileURLToPath(new URL("../../../../systems/nuikit_voice/", import.meta.url));
const last = (r: { messages: { action: string; data: any }[] }) => [...r.messages].reverse().find((m) => m.action === "nuikit:slots")?.data;

// One pass of the resource's loop per tick(): Wait() ends the pass.
const natives = `
  VOICE = 'started'
  TALKING = false
  function PlayerId() return 0 end
  function NetworkIsPlayerTalking() return TALKING end
  function GetResourceState(name) if name == 'pma-voice' then return VOICE end return 'missing' end
  function CreateThread(fn) LOOP = fn end
  function Wait() error('pass', 0) end
  function tick() pcall(LOOP) end
`;

const start = () => client.start("nuikit_voice", { runtime: "import", before: natives, scripts: [dir + "config.lua", dir + "client.lua"] });

describe("nuikit_voice", () => {
  it("joins range, radio and call from pma-voice's state, lights them while talking, hides what's off", async () => {
    client = await createClient();
    const hud = await client.start("hud");
    const voice = await start();

    await voice.run(`LocalPlayer.state:set('proximity', { index = 2, distance = 3.0, mode = 'Normal' }, true) tick()`);
    expect(last(hud).vitals["nuikit_voice:range"]).toMatchObject({ order: 60, icon: "mic", value: "Normal", hue: "neutral" });
    expect(last(hud).vitals["nuikit_voice:radio"]).toBeUndefined(); // never on a channel: never joined

    const before = hud.messages.length;
    await voice.run(`tick()`); // nothing changed
    expect(hud.messages.length).toBe(before);

    await voice.run(`TALKING = true LocalPlayer.state:set('radioChannel', 3, true) tick()`);
    expect(last(hud).vitals["nuikit_voice:range"]).toMatchObject({ hue: "success", hidden: false });
    expect(last(hud).vitals["nuikit_voice:radio"]).toMatchObject({ order: 61, value: "3 MHz", hue: "info" });

    await voice.run(`LocalPlayer.state:set('radioActive', true, true) tick()`);
    expect(last(hud).vitals["nuikit_voice:radio"]).toMatchObject({ hue: "success" });

    await voice.run(`LocalPlayer.state:set('radioChannel', 0, true) LocalPlayer.state:set('callChannel', 12, true) tick()`);
    expect(last(hud).vitals["nuikit_voice:radio"]).toMatchObject({ hidden: true });
    expect(last(hud).vitals["nuikit_voice:call"]).toMatchObject({ order: 62, value: "In call", hue: "success" });
  });

  it("leaves the cluster when pma-voice stops, and respects the config", async () => {
    client = await createClient();
    const hud = await client.start("hud");
    const voice = await start();
    await voice.run(`Config.call.show = false LocalPlayer.state:set('proximity', { mode = 'Whisper' }, true) LocalPlayer.state:set('callChannel', 4, true) tick()`);
    expect(Object.keys(last(hud).vitals)).toEqual(["nuikit_voice:range"]);
    await voice.run(`VOICE = 'stopped' tick()`);
    expect(last(hud)).toEqual({});
  });
});
