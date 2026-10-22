// Cluster slots (nuikit.lua NUI.slot): another resource joins a cluster; every page gets `nuikit:slots`;
// updates are change-only; a stopped resource leaves every cluster it joined.
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());
const last = (r: { messages: { action: string; data: any }[] }) => [...r.messages].reverse().find((m) => m.action === "nuikit:slots")?.data;

describe("NUI.slot", () => {
  it("a voice resource joins the HUD's vitals cluster; the HUD page sees it, then its updates, then it leaving", async () => {
    client = await createClient();
    const hud = await client.start("hud");
    const voice = await client.start("voice");
    await voice.run(`V = NUI.slot('vitals', 'talk', { order = 50, icon = 'mic', hue = 'info', level = 0 })`);
    expect(last(hud)).toEqual({ vitals: { "voice:talk": { key: "talk", resource: "voice", order: 50, icon: "mic", hue: "info", level: 0 } } });
    const before = hud.messages.length;
    await voice.run(`V.set({ level = 0 })`); // nothing changed: no write
    expect(hud.messages.length).toBe(before);
    await voice.run(`V.set({ level = 0.6, resource = 'evil' })`);
    expect(last(hud).vitals["voice:talk"]).toMatchObject({ level: 0.6, resource: "voice" });
    const radio = await client.start("radio");
    await radio.run(`NUI.slot('vitals', 'signal', { order = 60 })`);
    expect(Object.keys(last(hud).vitals).sort()).toEqual(["radio:signal", "voice:talk"]);
    expect(await hud.run(`local n = 0 for _ in pairs(NUI.slots().vitals) do n = n + 1 end return n`)).toBe(2);
    client.stop("voice");
    expect(Object.keys(last(hud).vitals)).toEqual(["radio:signal"]);
    await radio.run(`NUI.unslot('vitals', 'signal')`);
    expect(last(hud)).toEqual({});
  });

  it("a page that loads later gets the slots on nuikit:ready", async () => {
    client = await createClient();
    const voice = await client.start("voice");
    await voice.run(`NUI.slot('vitals', 'talk', {})`);
    const hud = await client.start("hud");
    hud.messages.length = 0;
    await hud.call("nuikit:ready", { protocol: 1 });
    expect(last(hud)).toMatchObject({ vitals: { "voice:talk": { order: 100 } } });
  });
});
