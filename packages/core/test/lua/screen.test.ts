import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

// nuikit_screen's maths: corners, where a ray meets the screen (u, v), the camera ray.
const SCREEN = fileURLToPath(new URL("../../../../systems/nuikit_screen/client/screen.lua", import.meta.url));
let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

describe("systems/nuikit_screen", () => {
  it("a screen facing south: corners, centre and corner hits, misses and hits from behind", async () => {
    client = await createClient();
    const r = await client.start("nuikit_screen", { scripts: [SCREEN] });
    // centre (0, 0, 1), heading 180: faces south, its viewer stands south (y < 0) looking north
    const s = "{ coords = { x = 0.0, y = 0.0, z = 1.0 }, heading = 180.0, width = 2.0, height = 1.0 }";
    const corners = await r.run<number[][]>(`local a, b, c, d = Screen.corners(${s}) return { a, b, c, d }`);
    // the viewer's left is west (x < 0); top is up
    expect(corners[0]![0]).toBeCloseTo(-1, 6);
    expect(corners[0]![2]).toBeCloseTo(1.5, 6);
    expect(corners[2]![0]).toBeCloseTo(1, 6);
    expect(corners[2]![2]).toBeCloseTo(0.5, 6);
    const hit = (o: string, d: string) => r.run<number[]>(`return { Screen.uvAt(${s}, ${o}, ${d}) }`);
    const miss = (o: string, d: string) => r.run<boolean>(`return Screen.uvAt(${s}, ${o}, ${d}) == nil`);
    let uv = await hit("{ 0, -3, 1 }", "{ 0, 1, 0 }");
    expect(uv[0]).toBeCloseTo(0.5, 6);
    expect(uv[1]).toBeCloseTo(0.5, 6);
    expect(uv[2]).toBeCloseTo(3, 6);
    uv = await hit("{ -0.9, -3, 1.45 }", "{ 0, 1, 0 }"); // near the top left
    expect(uv[0]).toBeCloseTo(0.05, 6);
    expect(uv[1]).toBeCloseTo(0.05, 6);
    expect(await miss("{ 1.5, -3, 1 }", "{ 0, 1, 0 }")).toBe(true); // beside it
    expect(await miss("{ 0, 3, 1 }", "{ 0, -1, 0 }")).toBe(true); // from behind
    expect(await miss("{ 0, -3, 1 }", "{ 0, -1, 0 }")).toBe(true); // looking away
  });

  it("tilted back, the top leans away; the camera ray goes through the cursor", async () => {
    client = await createClient();
    const r = await client.start("nuikit_screen", { scripts: [SCREEN] });
    const tl = await r.run<number[]>(`local a = Screen.corners({ coords = { x = 0.0, y = 0.0, z = 1.0 }, heading = 180.0, tilt = 30.0, width = 2.0, height = 1.0 }) return a`);
    expect(tl[1]).toBeGreaterThan(0); // the top moved north, away from a viewer in the south
    // camera looking north (yaw 0), level: the centre of the screen is straight ahead, right is east
    const mid = await r.run<number[]>(`return Screen.ray({ x = 0.0, y = 0.0, z = 0.0 }, 50.0, 16 / 9, 0.0, 0.0)`);
    expect(mid[0]).toBeCloseTo(0, 6);
    expect(mid[1]).toBeCloseTo(1, 6);
    const right = await r.run<number[]>(`return Screen.ray({ x = 0.0, y = 0.0, z = 0.0 }, 50.0, 16 / 9, 1.0, 0.0)`);
    expect(right[0]).toBeGreaterThan(0);
  });
});

// the runtime's per-frame work, natives counted (the FPS budget)
const MAIN = fileURLToPath(new URL("../../../../systems/nuikit_screen/config.lua", import.meta.url));
const RUNTIME = fileURLToPath(new URL("../../../../systems/nuikit_screen/client/main.lua", import.meta.url));
const stubs = `
  POS = { x = 0.0, y = 0.0, z = 0.0 }
  function CreateThread() end
  vector3 = vector3 or vec3 or function(x, y, z) return { x = x, y = y, z = z } end
  CALLS = {}
  local function count(name, ret) _G[name] = function(...) CALLS[name] = (CALLS[name] or 0) + 1 return ret end end
  for _, n in ipairs({ 'CreateDui', 'GetDuiHandle', 'CreateRuntimeTxd', 'CreateRuntimeTextureFromDuiHandle', 'DrawSpritePoly', 'BeginTextCommandDisplayHelp',
    'AddTextComponentSubstringPlayerName', 'EndTextCommandDisplayHelp', 'IsControlJustPressed', 'DestroyDui', 'SendDuiMessage' }) do count(n, n == 'CreateDui' and 7 or nil) end
  local pid = 0
  function PlayerPedId() CALLS.PlayerPedId = (CALLS.PlayerPedId or 0) + 1 return 1 end
  function GetEntityCoords() CALLS.GetEntityCoords = (CALLS.GetEntityCoords or 0) + 1 return vector3(POS.x, POS.y, POS.z) end
`;

describe("systems/nuikit_screen: per frame", () => {
  it("near a screen: two DrawSpritePoly and two lookups; the help only within reach; nothing far away", async () => {
    client = await createClient();
    const r = await client.start("nuikit_screen", { before: stubs, scripts: [MAIN, SCREEN, RUNTIME] });
    await r.run(`Screens.create({ coords = vector3(0.0, 3.0, 1.0), heading = 180.0, url = 'nui://x/index.html' })`);
    const frame = async (y: number) => r.run<Record<string, number>>(`POS.y = ${y} CALLS = {} local near = Screens.frame() CALLS.near = near and 1 or 0 return CALLS`);
    // 3 m away: drawn, no help
    expect(await frame(0)).toEqual({ near: 1, PlayerPedId: 1, GetEntityCoords: 1, DrawSpritePoly: 2 });
    // within reach: the help text and the E check too
    const close = await frame(2);
    expect(close.DrawSpritePoly).toBe(2);
    expect(close.EndTextCommandDisplayHelp).toBe(1);
    expect(close.IsControlJustPressed).toBe(1);
    // 40 m away: nothing drawn (the loop sleeps 500 ms then)
    expect(await frame(-40)).toEqual({ near: 0, PlayerPedId: 1, GetEntityCoords: 1 });
  });
});
