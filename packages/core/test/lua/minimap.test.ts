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
  STARTED = {}
  function GetResourceState(r) return STARTED[r] and 'started' or 'missing' end
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
  HIDDEN = false
  function IsRadarHidden() return HIDDEN end
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

    // nuikit's own mask over GTA's: GTA's 1.41 box by default (routeClip = 'mask', decision 56); the txd has a
    // new name on every start (a restart could hit the stopped one's: F2)
    expect(await hud.run(`return REPLACED`)).toMatch(/^radarmasksm>nuikit_minimap_\d+\/square_1412$/);

    await hud.run(`Config.minimap.shape = 'circle' Minimap.apply()`);
    expect(await hud.run(`return CLIP`)).toBe(1);
    expect(await hud.run(`return REPLACED`)).toMatch(/\/circle_1412$/);
    // each mask is drawn once, as wide as GTA's box (32 high square + 128 high circle, ×1.412 across)
    await hud.run(`Minimap.apply()`);
    expect(await hud.run(`return PIXELS`)).toBe(45 * 32 + 181 * 128);
  });

  it("draws the mask for GTA's 1.41:1 box: the disc or square in the middle, transparent sides (design note A)", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    expect(await hud.run(`return Minimap.ASPECT`)).toBeCloseTo((0.15 * 16) / 9 / 0.188888, 6);
    // a square texture over a square box (aspect 1): the 0.7.0-next disc
    const sq = (shape: string, x: number, y: number) => hud.run<number>(`return Minimap.maskPixel('${shape}', 128, 128, ${x}, ${y}, 1.0)`);
    expect(await sq("square", 0, 0)).toBe(255);
    expect(await sq("circle", 64, 64)).toBe(255); // middle
    expect(await sq("circle", 0, 0)).toBe(0); // corner
    const rim = await sq("circle", 0, 64); // the leftmost pixel, mid-height: on the rim
    expect(rim).toBeGreaterThan(0);
    expect(rim).toBeLessThan(255);
    expect(await sq("circle", 2, 64)).toBe(255); // two in: inside
    // GTA's box: 181x128, stretched over a box 1.41 times wider than high
    const px = (shape: string, x: number, y: number) => hud.run<number>(`return Minimap.maskPixel('${shape}', 181, 128, ${x}, ${y})`);
    expect(await px("circle", 90, 64)).toBe(255);
    expect(await px("circle", 10, 64)).toBe(0); // the side: outside the hole
    expect(await px("square", 10, 0)).toBe(0);
    expect(await px("square", 45, 0)).toBe(255); // inside the middle square
    // on screen the disc is round: as far across (in hole pixels) as it is high
    const across = await hud.run<number>(`local n = 0 for x = 0, 180 do n = n + Minimap.maskPixel('circle', 181, 128, x, 64) / 255 end return n * 128 * Minimap.ASPECT / 181`);
    expect(across).toBeCloseTo(128, 0);
  });

  it("puts the box at GTA's aspect over the hole, and minimap_mask over the hole in absolute units (7b)", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    // GTA's aspect: the default (routeClip = 'mask'; 'box' squares it)
    const [, , hole, box] = await hud.run<[any, number, any, any]>(`return { Minimap.layout(1920, 1080, 1.0) }`);
    expect(box.h).toBeCloseTo(hole.h, 6);
    expect(box.w / box.h).toBeCloseTo((0.15 * 16) / 9 / 0.188888, 6);
    expect(box.x + box.w / 2).toBeCloseTo(hole.x + hole.w / 2, 6); // centred
    await hud.run(`Layout.update() Minimap.apply()`);
    const map = await hud.run<number[]>(`return PLACED.minimap`);
    const mask = await hud.run<number[]>(`return PLACED.minimap_mask`);
    const unit = (1080 * 16) / 9;
    expect(map[2]! * unit).toBeCloseTo(box.w, 3);
    // the mask is the hole, where the radar is (top right), not at the area's corner
    expect(mask[0]! * unit).toBeCloseTo(hole.x, 3);
    expect(mask[2]! * unit).toBeCloseTo(hole.w, 3);
    expect(mask[1]!).toBeCloseTo(map[1]!, 6);
    // Config.minimap.aspect = 1: the square box of 0.7.0-next
    await hud.run(`Config.minimap.aspect = 1`);
    const [, , h1, b1] = await hud.run<[any, number, any, any]>(`return { Minimap.layout(1920, 1080, 1.0) }`);
    expect(b1.w).toBeCloseTo(h1.w, 6);
  });

  it("routeClip (A4, unproven): 'inset' puts minimap_mask on the disc's inner square, 'stock' leaves it, 'box' squares the box, 'texture' masks radarmask1g", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives + ` ROUTE = nil function AddReplaceTexture(_, from, txd, tex) if from == 'radarmask1g' then ROUTE = txd .. '/' .. tex else REPLACED = from .. '>' .. txd .. '/' .. tex end end function RemoveReplaceTexture(_, from) if from == 'radarmask1g' then ROUTE = nil else REPLACED = nil end end`, scripts });
    expect(await hud.run(`return Minimap.routeClip()`)).toBe("mask"); // the default: GTA's aspect, the map unsqueezed (decision 56)
    const [, , hole] = await hud.run<[any, number, any]>(`return { Minimap.layout(1920, 1080, 1.0) }`);
    await hud.run(`Layout.update() Minimap.apply()`);
    const over = await hud.run<number[]>(`return PLACED.minimap_mask`);
    await hud.run(`Config.minimap.routeClip = 'inset' Minimap.apply()`);
    const inset = await hud.run<number[]>(`return PLACED.minimap_mask`);
    const unit = (1080 * 16) / 9;
    expect(inset[2]! * unit).toBeCloseTo(hole.w / Math.SQRT2, 3); // the square inside the disc
    expect(inset[0]! + inset[2]! / 2).toBeCloseTo(over[0]! + over[2]! / 2, 6); // centred on the hole
    expect(inset[1]! + inset[3]! / 2).toBeCloseTo(over[1]! + over[3]! / 2, 6);
    expect(await hud.run(`return ROUTE`)).toBeNull();
    await hud.run(`Config.minimap.routeClip = 'stock' Minimap.apply()`);
    expect(await hud.run<number[]>(`return PLACED.minimap_mask`)).toEqual([0.02, 0.032, 0.111, 0.159]);
    await hud.run(`Config.minimap.routeClip = 'box'`);
    expect(await hud.run(`return Minimap.aspect()`)).toBe(1);
    await hud.run(`Config.minimap.routeClip = 'texture' Minimap.apply()`);
    expect(await hud.run(`return ROUTE`)).toMatch(/\/circle_/);
    await hud.run(`Config.minimap.routeClip = 'mask' Minimap.apply()`);
    expect(await hud.run(`return ROUTE`)).toBeNull(); // put back on any other candidate
    expect(await hud.run<number[]>(`return PLACED.minimap_mask`)).toEqual(over);
    await hud.run(`Config.minimap.routeClip = 'nope'`);
    expect(await hud.run(`return Minimap.routeClip()`)).toBe("mask");
  });

  it("slide (a spike, off by default): the radar steps toward its edge and back without a big-map flick", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    await hud.run(`Layout.update() Minimap.apply()`);
    expect(await hud.run(`return Minimap.slide(false)`)).toBe(false); // Config.minimap.slide = false
    const rest = await hud.run<number[]>(`return PLACED.minimap`);
    await hud.run(`Config.minimap.slide = true XS = {} FLICKS = 0
      SetRadarBigmapEnabled = function() FLICKS = FLICKS + 1 end
      local set = SetMinimapComponentPosition
      SetMinimapComponentPosition = function(name, ...) if name == 'minimap' then XS[#XS + 1] = select(3, ...) end set(name, ...) end
      DisplayRadar = function(on) HIDDEN_AT = not on and #XS or HIDDEN_AT end
      CreateThread = function(f) f() end`);
    expect(await hud.run(`return Minimap.slide(false)`)).toBe(true);
    const out = await hud.run<number[]>(`return XS`);
    // compact: top right, so it moves right, further each frame, then back in place while hidden
    expect(out.length).toBeGreaterThan(3);
    for (let i = 1; i < out.length - 1; i++) expect(out[i]!).toBeGreaterThanOrEqual(out[i - 1]!);
    expect(out.at(-2)! - rest[0]!).toBeCloseTo((2.5 * 1080 * 0.014815) / ((1080 * 16) / 9), 4); // 2.5rem
    expect(out.at(-1)).toBeCloseTo(rest[0]!, 6);
    expect(await hud.run(`return HIDDEN_AT`)).toBe(out.length - 1); // hidden before it goes back, so it never jumps home on screen
    expect(await hud.run(`return Minimap.sliding`)).toBe(false);
    // in: starts 2.5rem out, ends in place
    await hud.run(`XS = {}`);
    await hud.run(`Minimap.slide(true)`);
    const back = await hud.run<number[]>(`return XS`);
    expect(back[0]! - rest[0]!).toBeCloseTo((2.5 * 1080 * 0.014815) / ((1080 * 16) / 9), 4);
    expect(back.at(-1)).toBeCloseTo(rest[0]!, 6);
    expect(await hud.run(`return FLICKS`)).toBe(0);
  });

  it("asks the nuikit resource to put the radar back when it stops; a hidden radar re-reads when it shows", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    await hud.run(`EVENTS = {} AddEventHandler('nuikit:minimap:placed', function() EVENTS[#EVENTS + 1] = 'placed' end)
      AddEventHandler('nuikit:minimap:released', function() EVENTS[#EVENTS + 1] = 'released' end)`);
    await hud.run(`HIDDEN = true Layout.update() Minimap.apply()`);
    await hud.run(`Config.minimap.style = 'stock' Minimap.applyStock()`);
    expect(await hud.run(`return table.concat(EVENTS, ',')`)).toBe("placed,released");
    // placed while hidden: one more flick the first time the radar shows
    await hud.run(`Config.minimap.style = 'ring' Minimap.apply() CALLS = 0 SetRadarBigmapEnabled = function() CALLS = CALLS + 1 end CreateThread = function(f) f() end`);
    await hud.run(`Minimap.tick(false) HIDDEN = false Minimap.tick(true) Minimap.tick(false) Minimap.tick(true)`);
    expect(await hud.run(`return CALLS`)).toBe(2);
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

  it("compact (the default): a 15rem circle top right, under the safe area, with room above for the heading", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    expect(await hud.run(`return Layout.preset()`)).toBe("compact");
    const [frame, band, radar] = await hud.run<[any, number, any]>(`return { Minimap.layout(1920, 1080, 1.0) }`);
    const rem = 1080 * 0.014815;
    expect(frame.w).toBeCloseTo(15 * rem, 6);
    expect(frame.x + frame.w).toBeCloseTo(1920 - 1.5 * rem, 6);
    expect(frame.y).toBeCloseTo(1.5 * rem + 1.75 * rem, 6);
    expect(band).toBeCloseTo(0.125 * rem, 6);
    // the radar fills the ring, its edge under the middle of the line
    expect(radar.x).toBeCloseTo(frame.x + band / 2, 6);
    await hud.run(`Minimap.apply()`);
    expect(await hud.run(`return CLIP`)).toBe(1);
    expect(await hud.run(`return REPLACED`)).toMatch(/^radarmasksm>nuikit_minimap_\d+\/circle_1412$/); // GTA's box (routeClip = 'mask', decision 56)
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

  it("sizes the radar in 16:9 units at every aspect, so it fills its frame (1.78, 1.88, 2.33, 3.56)", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    // the game's HUD area spans the screen (GetScriptGfxPosition), but the components don't
    for (const [w, h] of [[1920, 1080], [2418, 1286], [2560, 1097], [5120, 1440]] as const) {
      const area = `Layout.fromGfx(${w}, ${h}, 0.0, 1.0, 1.0, 2.0) or Layout.stage(${w}, ${h}, 1.0)`;
      const [frame, , radar] = await hud.run<[any, number, any]>(`local a = ${area} return { Minimap.layout(${w}, ${h}, 1.0, a) }`);
      const c = await hud.run<number[]>(`local a = ${area} local _, _, r = Minimap.layout(${w}, ${h}, 1.0, a) return { Minimap.component(r, ${w}, ${h}, 1.0, a) }`);
      const unit = (h * 16) / 9;
      expect(c[2]! * unit).toBeCloseTo(radar.w, 3); // on screen the radar is exactly the hole
      expect(c[3]! * h).toBeCloseTo(radar.h, 3);
      expect(radar.w).toBeCloseTo(radar.h, 3); // the hole is round
      expect(frame.x + frame.w).toBeLessThanOrEqual(w);
    }
    // the stock rectangle uses the same unit: 0.150 of a 16:9 width
    const stock = await hud.run<any>(`local a = Layout.fromGfx(2418, 1286, 0.0, 1.0, 1.0, 2.0) a.height = 1286 return Layout.stockMinimap(a)`);
    expect(stock.w).toBeCloseTo(0.15 * ((1286 * 16) / 9), 3);
  });

  it("style 'stock' and a live stop put GTA's radar back; a started minimap resource makes nuikit yield", async () => {
    client = await createClient();
    const hud = await client.start("nuikit_hud", { before: natives, scripts });
    expect(await hud.run(`return Minimap.style()`)).toBe("ring");
    await hud.run(`Layout.update() Minimap.apply()`);
    await hud.run(`Config.minimap.style = 'stock' Minimap.applyStock()`);
    expect(await hud.run(`return PLACED.minimap`)).toEqual([-0.0045, 0.002, 0.15, 0.188888]);
    expect(await hud.run(`return PLACED.minimap_mask`)).toEqual([0.02, 0.032, 0.111, 0.159]);
    expect(await hud.run(`return PLACED.minimap_blur`)).toEqual([-0.03, 0.022, 0.266, 0.237]);
    expect(await hud.run(`return CLIP`)).toBe(0);
    expect(await hud.run(`return NORTH_ALPHA`)).toBe(255);
    expect(await hud.run(`return REPLACED`)).toBe(null);
    const sent = hud.messages.filter((m) => m.action === "hud:minimap:frame").at(-1)!.data;
    expect(sent.framed).toBe(false);

    // a live restart after placing it
    await hud.run(`Config.minimap.style = 'ring' PLACED = {} Minimap.apply() TriggerEvent('onClientResourceStop', GetCurrentResourceName())`);
    expect(await hud.run(`return PLACED.minimap`)).toEqual([-0.0045, 0.002, 0.15, 0.188888]);

    // another minimap resource: yield, and never write over its placement
    await hud.run(`STARTED['circleminimap'] = true TriggerEvent('onClientResourceStart', 'circleminimap')`);
    expect(await hud.run(`return Minimap.style()`)).toBe("stock");
    expect(await hud.run(`PLACED = {} Minimap.applyStock() return PLACED.minimap`)).toBe(null);
    // the list is configurable: {} never yields
    await hud.run(`Config.minimap.yieldTo = {} TriggerEvent('onClientResourceStart', 'x')`); // delivered after the call
    expect(await hud.run(`return Minimap.style()`)).toBe("ring");
  });
});
