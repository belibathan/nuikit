import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

// a clock the test moves
const clock = `NOW = 0 function GetGameTimer() return NOW end`;

async function start() {
  client = await createClient();
  const res = await client.start("hud", { before: clock });
  const sent = (action: string) => res.messages.filter((m) => m.action === action).map((m) => m.data);
  return { res, sent };
}

describe("NUI.stream: live values", () => {
  it("sends a value rounded to its precision, only when the rounded value changed", async () => {
    const { res, sent } = await start();
    await res.run(`S = NUI.stream('hud:rpm', { precision = 0.01 })`);
    expect(await res.run(`return S:push(0.6234)`)).toBe(true);
    await res.run(`NOW = 100 S:push(0.6201) NOW = 200 S:push(0.6249)`); // all 0.62
    await res.run(`NOW = 300 S:push(0.6251)`);
    expect(sent("hud:rpm")).toEqual([0.62, 0.63]);
    expect(await res.run(`return S:value()`)).toBe(0.63);
  });

  it("keeps decimal steps exact (270.5 stays 270.5, not 270.50000000000006)", async () => {
    const { res, sent } = await start();
    await res.run(`S = NUI.stream('a', { precision = 0.1 }) S:push(270.49) NOW = 50 S:push(0.3)`);
    expect(sent("a")).toEqual([270.5, 0.3]);
  });

  it("sends at most `rate` times a second; a held-back value goes out on a later push", async () => {
    const { res, sent } = await start();
    await res.run(`S = NUI.stream('a', { rate = 30, precision = 1 })`);
    await res.run(`NOW = 1000 S:push(1)`);
    expect(await res.run(`NOW = 1020 return S:push(2)`)).toBe(false); // 20 ms later: held back
    expect(sent("a")).toEqual([1]);
    expect(await res.run(`NOW = 1033 return S:push(2)`)).toBe(true); // a Wait(33) loop is never held back
    expect(sent("a")).toEqual([1, 2]);
    // pushing every frame at 200 fps for a second sends about 30
    await res.run(`for i = 1, 200 do NOW = 2000 + i * 5 S:push(i) end`);
    expect(sent("a").length - 2).toBeGreaterThanOrEqual(29);
    expect(sent("a").length - 2).toBeLessThanOrEqual(31);
  });

  it("an angle stream works in 0–360: -0.04 and 359.96 are the same heading as 0", async () => {
    const { res, sent } = await start();
    await res.run(`S = NUI.stream('h', { precision = 0.1, kind = 'angle' })`);
    await res.run(`S:push(-90.04) NOW = 50 S:push(-0.04) NOW = 100 S:push(359.96) NOW = 150 S:push(720.0) NOW = 200 S:push(359.94)`);
    expect(sent("h")).toEqual([270, 0, 359.9]);
  });

  it("reset() forgets the last value, so the next push sends even if it is the same", async () => {
    const { res, sent } = await start();
    await res.run(`S = NUI.stream('a') S:push(0.5) NOW = 10 S:reset() S:push(0.5)`);
    expect(sent("a")).toEqual([0.5, 0.5]);
  });

  it("ignores what is not a number", async () => {
    const { res, sent } = await start();
    await res.run(`S = NUI.stream('a') S:push(nil) S:push('x') S:push(0/0) S:push('0.25')`);
    expect(sent("a")).toEqual([0.25]);
  });

  it("goes through the host while hosted, like NUI.send", async () => {
    client = await createClient();
    const res = await client.start("hud", { before: clock });
    const host: unknown[] = [];
    await res.run(`AddEventHandler('nuikit:host:send', function(a, d) HOSTED_SENT = { a, d } end) NUI.hosted = true`);
    await res.run(`NUI.stream('a'):push(0.5)`);
    host.push(await res.run(`return HOSTED_SENT`));
    expect(host).toEqual([["a", 0.5]]);
    expect(res.messages.filter((m) => m.action === "a")).toEqual([]);
  });
});
