import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

const HUD = fileURLToPath(new URL("../../../../systems/nuikit_hud/", import.meta.url));
const scripts = [HUD + "config.lua", HUD + "client/minimap.lua"];
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
`;

describe("systems/nuikit_hud: the minimap", () => {
  it("puts a 15rem frame 1.5rem from the bottom-left of the screen at 1080p, the radar inside its band", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
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

    await hud.run(`Config.minimap.shape = 'circle' Minimap.apply()`);
    expect(await hud.run(`return CLIP`)).toBe(1);
  });
});
