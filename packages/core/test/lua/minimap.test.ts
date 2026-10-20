import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

const HUD = fileURLToPath(new URL("../../../../systems/nuikit_hud/", import.meta.url));
const scripts = [HUD + "config.lua", HUD + "client/layout.lua", HUD + "client/minimap.lua"];
let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const natives = `
  SCREEN = { 1920, 1080 }
  SAFEZONE = 1.0
  PLACED = {}
  CLIP = nil
  NORTH_ALPHA = nil
  function GetActiveScreenResolution() return SCREEN[1], SCREEN[2] end
  function GetSafeZoneSize() return SAFEZONE end
  function SetMinimapComponentPosition(name, ax, ay, x, y, w, h) PLACED[name] = { x, y, w, h } end
  function SetMinimapClipType(t) CLIP = t end
  function GetNorthRadarBlip() return 9 end
  function SetBlipAlpha(_, a) NORTH_ALPHA = a end
  function SetRadarBigmapEnabled() end
  function RequestScaleformMovie() return 1 end
  function CreateThread() end
  function Wait() end
  function print() end
  PIXELS, REPLACED = 0, nil
  CAMZ = 0.0
  LOADING, ACTIVE, BIG = false, true, false
  function GetIsLoadingScreenActive() return LOADING end
  function NetworkIsPlayerActive() return ACTIVE end
  function PlayerId() return 0 end
  function IsBigmapActive() return BIG end
  function GetGameplayCamRot() return { x = 0.0, y = 0.0, z = CAMZ } end
  -- the compass thread's pace: 33 ms between calls (its stream sends at most 30 a second)
  NOW = 0
  function GetGameTimer() NOW = NOW + 33 return NOW end
  function CreateRuntimeTxd(n) return n end
  function CreateRuntimeTexture(_, n) return n end
  function SetRuntimeTexturePixel() PIXELS = PIXELS + 1 end
  function CommitRuntimeTexture() end
  function RemoveReplaceTexture() REPLACED = nil end
  function AddReplaceTexture(_, from, txd, tex) REPLACED = from .. '>' .. txd .. '/' .. tex end
`;

describe("systems/nuikit_hud: the minimap", () => {
  it("puts a 15rem frame 1.5rem from the bottom-left of the screen at 1080p, the radar inside its band", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    await hud.run(`Config.layout = 'classic'`); // these pin the classic geometry; compact is below
    const [frame, band, radar] = await hud.run<[any, number, any]>(`return { Minimap.layout(1920, 1080, 1.0) }`);
    const rem = 1080 * 0.014815; // the kit's 1.4815vh: 16 px at 1080p
    expect(frame.x).toBeCloseTo(1.5 * rem, 6);
    expect(frame.w).toBeCloseTo(15 * rem, 6);
    expect(frame.y + frame.h).toBeCloseTo(1080 - 1.5 * rem, 6);
    expect(band).toBeCloseTo(0.375 * rem, 6);
    // square: the radar fills the hole, half a pixel under the band
    expect(radar.x).toBeCloseTo(frame.x + band - 0.5, 6);
    expect(radar.w).toBeCloseTo(frame.w - 2 * (band - 0.5), 6);
  });

  it("keeps the map on the 16:9 stage on an ultrawide, and steps in for GTA's safe zone", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    await hud.run(`Config.layout = 'classic'`); // these pin the classic geometry; compact is below
    // 3440x1440: the stage is 2560 wide, centred (440 px either side); 1rem = 21.33 px
    const [wide] = await hud.run<[any]>(`return { Minimap.layout(3440, 1440, 1.0) }`);
    expect(wide.x).toBeCloseTo(440 + 1.5 * 1440 * 0.014815, 3);
    // a 0.9 safe zone moves it in by 5% of the stage width and up by 5% of the height
    const [safe] = await hud.run<[any]>(`return { Minimap.layout(1920, 1080, 0.9) }`);
    const rem = 1080 * 0.014815;
    expect(safe.x).toBeCloseTo(1.5 * rem + 1920 * 0.05, 3);
    expect(safe.y + safe.h).toBeCloseTo(1080 - 1.5 * rem - 1080 * 0.05, 3);
  });

  it("converts a box to GTA's component units: a 16:9 width from the safe zone's left, the height from its bottom", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    await hud.run(`Config.layout = 'classic'`); // these pin the classic geometry; compact is below
    const at1080 = await hud.run<number[]>(`return { Minimap.component({ x = 24, y = 816, w = 240, h = 240 }, 1920, 1080, 1.0) }`);
    expect(at1080[0]).toBeCloseTo(24 / 1920, 6);
    expect(at1080[1]).toBeCloseTo(0 - 24 / 1080, 6); // bottom edge 24 px above the screen's bottom
    expect(at1080[2]).toBeCloseTo(240 / 1920, 6);
    expect(at1080[3]).toBeCloseTo(240 / 1080, 6);
    // on 32:9 the same box on the stage gives the same numbers: GTA measures from the centred 16:9 area
    const stageX = (5120 - 2560) / 2;
    const wide = await hud.run<number[]>(`return { Minimap.component({ x = ${stageX} + 32, y = 1440 - 32 - 320, w = 320, h = 320 }, 5120, 1440, 1.0) }`);
    expect(wide[0]).toBeCloseTo(32 / 2560, 6);
    expect(wide[2]).toBeCloseTo(320 / 2560, 6);
  });

  it("places all three radar parts, picks the clip for the shape and tells the page where the frame is", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    await hud.run(`Config.layout = 'classic'`); // these pin the classic geometry; compact is below
    await hud.run(`Minimap.apply()`);
    expect(await hud.run(`return CLIP`)).toBe(0); // square
    expect(await hud.run(`return NORTH_ALPHA`)).toBe(0); // the frame draws north
    for (const part of ["minimap", "minimap_mask", "minimap_blur"]) {
      expect(await hud.run(`return PLACED['${part}'] ~= nil`)).toBe(true);
    }
    const sent = hud.messages.filter((m) => m.action === "hud:minimap:frame").at(-1)!.data;
    expect(sent.shape).toBe("square");
    expect(sent.x).toBeCloseTo((1.5 * 1080 * 0.014815) / 1920, 6);
    expect(sent.w).toBeCloseTo((15 * 1080 * 0.014815) / 1920, 6);

    // nuikit's own mask over GTA's: opaque for the square, so the radar fills its box
    expect(await hud.run(`return REPLACED`)).toBe("radarmasksm>nuikit_minimap/square");

    await hud.run(`Config.minimap.shape = 'circle' Minimap.apply()`);
    expect(await hud.run(`return CLIP`)).toBe(1);
    expect(await hud.run(`return REPLACED`)).toBe("radarmasksm>nuikit_minimap/circle");
    // each mask is drawn once (8x8 square + 128x128 circle)
    await hud.run(`Minimap.apply()`);
    expect(await hud.run(`return PIXELS`)).toBe(64 + 128 * 128);
  });

  it("draws the circle mask as a disc with a soft one-pixel edge, and the square fully opaque", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    await hud.run(`Config.layout = 'classic'`); // these pin the classic geometry; compact is below
    const px = (shape: string, x: number, y: number) => hud.run<number>(`return Minimap.maskPixel('${shape}', 128, ${x}, ${y})`);
    expect(await px("square", 0, 0)).toBe(255);
    expect(await px("circle", 64, 64)).toBe(255); // middle
    expect(await px("circle", 0, 0)).toBe(0); // corner
    expect(await px("circle", 0, 64)).toBe(127); // the leftmost pixel, mid-height: half on the rim
    expect(await px("circle", 1, 64)).toBe(255); // one in: inside
    const edge = await px("circle", 108, 109); // 63.6 px from the centre: on the rim
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(255);
  });

  it("sends the compass heading on its own channel, to 0.1°, only when that changed", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    await hud.run(`Config.layout = 'classic'`); // these pin the classic geometry; compact is below
    const sent = () => hud.messages.filter((m) => m.action === "hud:minimap:heading").map((m) => m.data);
    await hud.run(`CAMZ = -90.04 Minimap.compass()`); // GTA gives -180..180
    expect(sent()).toEqual([90]);
    await hud.run(`CAMZ = -90.02 Minimap.compass()`); // the same tenth: nothing
    expect(sent()).toEqual([90]);
    await hud.run(`CAMZ = -89.5 Minimap.compass() CAMZ = 179.96 Minimap.compass() CAMZ = -179.96 Minimap.compass()`);
    expect(sent()).toEqual([90, 89.5, 180]); // a bearing (GTA yaw negated); 179.96 and -179.96 are the same heading: sent once
    // the page reloads: the heading goes out again even though it didn't change
    await hud.call("hud:minimap:ready");
    await hud.run(`Minimap.compass()`);
    expect(sent()).toEqual([90, 89.5, 180, 180]);
  });

  it("places the radar only once the player is in the world (joining left GTA's big map stuck on)", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    await hud.run(`Config.layout = 'classic'`); // these pin the classic geometry; compact is below
    expect(await hud.run(`LOADING = true return Minimap.inGame()`)).toBe(false);
    expect(await hud.run(`LOADING, ACTIVE = false, false return Minimap.inGame()`)).toBe(false);
    expect(await hud.run(`ACTIVE = true return Minimap.inGame()`)).toBe(true);
    // a big map still on after the flick is switched off again
    await hud.run(`CALLS = {} SetRadarBigmapEnabled = function(on) CALLS[#CALLS + 1] = tostring(on) end BIG = true Minimap.apply()`);
    expect(await hud.run(`return table.concat(CALLS, ",")`)).toBe("true,false,false");
  });

  it("compact (the default): a 12rem circle top right, under the safe area, with room above for the heading", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    expect(await hud.run(`return Layout.preset()`)).toBe("compact");
    const [frame, band, radar] = await hud.run<[any, number, any]>(`return { Minimap.layout(1920, 1080, 1.0) }`);
    const rem = 1080 * 0.014815;
    expect(frame.w).toBeCloseTo(12 * rem, 6);
    expect(frame.x + frame.w).toBeCloseTo(1920 - 1.5 * rem, 6);
    expect(frame.y).toBeCloseTo(1.5 * rem + 1.75 * rem, 6);
    expect(band).toBeCloseTo(0.125 * rem, 6);
    // the radar fills the ring, its edge under the middle of the line
    expect(radar.x).toBeCloseTo(frame.x + band / 2, 6);
    await hud.run(`Minimap.apply()`);
    expect(await hud.run(`return CLIP`)).toBe(1);
    expect(await hud.run(`return REPLACED`)).toBe("radarmasksm>nuikit_minimap/circle");
    const sent = hud.messages.filter((m) => m.action === "hud:minimap:frame").at(-1)!.data;
    expect(sent).toMatchObject({ shape: "circle", preset: "compact", framed: true });
    // a server's own values win over the preset; a square map needs no heading room
    await hud.run(`Config.minimap.anchor = 'bottom-right' Config.minimap.size = 14.0`);
    const [moved] = await hud.run<[any]>(`return { Minimap.layout(1920, 1080, 1.0) }`);
    expect(moved.y + moved.h).toBeCloseTo(1080 - 1.5 * rem, 6);
    expect(moved.w).toBeCloseTo(14 * rem, 6);
    await hud.run(`Config.minimap.anchor = 'top-left' Config.minimap.shape = 'square'`);
    const [sq] = await hud.run<[any]>(`return { Minimap.layout(1920, 1080, 1.0) }`);
    expect(sq.y).toBeCloseTo(1.5 * rem, 6);
  });

  it("keeps a 0.6 config (layout = { source = ... }) on the classic layout", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    expect(await hud.run(`Config.layout = { source = 'stage' } return Layout.preset()`)).toBe("classic");
    expect(await hud.run(`return Layout.source()`)).toBe("stage");
    expect(await hud.run(`Config.layout = 'compact' Config.area = nil return Layout.source()`)).toBe("game");
  });
});
