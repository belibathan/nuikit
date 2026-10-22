// The theme + prefs path on the client: nuikit.lua (every UI resource) and systems/nuikit/client.lua
// (the nuikit resource: prefs owner, theme callback for override pages), in real Lua 5.4.
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { compileTheme } from "../../src/tokens";
import { createClient } from "./harness";

const NUIKIT_CLIENT = fileURLToPath(new URL("../../../../systems/nuikit/client.lua", import.meta.url));
const started = (names: string[]) => `
  local STARTED = { ${names.map((n) => `['${n}'] = true`).join(", ")} }
  function GetResourceState(r) return STARTED[r] and 'started' or 'missing' end
  function LoadResourceFile(r, f) if r == 'nuikit' and f == 'theme.css' then return '.dark { --primary: #ff0000; }' end end
`;
const publishable = (css: string) => {
  const t = compileTheme(css);
  return { version: t.version, mode: t.mode, hash: t.hash, vars: t.vars, imports: t.imports };
};
const last = (ui: { messages: { action: string; data: any }[] }, action: string) => [...ui.messages].reverse().find((m) => m.action === action)?.data;

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

describe("server theme in nuikit UIs (nuikit.lua)", () => {
  it("nuikit:ready sends the compiled theme from GlobalState", async () => {
    client = await createClient();
    const theme = publishable(".dark { --primary: #00ff00; }");
    client.setGlobal("nuikitTheme", theme);
    const ui = await client.start("ui", { before: started(["nuikit", "ui"]) });
    await ui.call("nuikit:ready");
    expect(last(ui, "nuikit:theme")).toMatchObject({ version: 1, hash: theme.hash, vars: theme.vars });
    expect(await ui.run(`return NUI.theme().hash`)).toBe(theme.hash);
  });

  it("falls back to the raw theme.css from an older nuikit resource", async () => {
    client = await createClient();
    const ui = await client.start("ui", { before: started(["nuikit", "ui"]) });
    await ui.call("nuikit:ready");
    expect(last(ui, "nuikit:theme")).toBe(".dark { --primary: #ff0000; }");
  });

  it("`nuikit theme reload` (a new GlobalState value) repaints every open UI live", async () => {
    client = await createClient();
    client.setGlobal("nuikitTheme", publishable(".dark { --primary: #00ff00; }"));
    const hud = await client.start("hud", { before: started(["nuikit"]) });
    const bank = await client.start("bank", { before: started(["nuikit"]) });
    const next = publishable(".dark { --primary: #0000ff; }");
    client.setGlobal("nuikitTheme", next);
    expect(last(hud, "nuikit:theme")).toMatchObject({ hash: next.hash, vars: next.vars });
    expect(last(bank, "nuikit:theme")).toMatchObject({ hash: next.hash, vars: next.vars });
    client.setGlobal("nuikitTheme", null); // server failed to compile: nothing is pushed
    expect(last(hud, "nuikit:theme").hash).toBe(next.hash);
    // what arrives from Lua (imports: {} for an empty array) compiles as is
    expect(compileTheme(last(hud, "nuikit:theme")).vars).toEqual(next.vars);
  });
});

describe.each([
  ["queued events", false],
  ["synchronous events", true],
])("player preferences (%s)", (_label, syncEvents) => {
  it("the nuikit resource owns them: saved in its KVP, sent to every UI", async () => {
    client = await createClient({ syncEvents });
    const hud = await client.start("hud", { before: started(["nuikit", "hud"]) });
    const nuikit = await client.start("nuikit", { before: started(["nuikit", "hud"]), scripts: [NUIKIT_CLIENT] });
    expect(last(hud, "nuikit:prefs")).toEqual({ scale: 1, reducedMotion: false, highContrast: false });

    await hud.run(`NUI.prefs.set({ scale = 1.1, reducedMotion = true })`);
    expect(last(hud, "nuikit:prefs")).toEqual({ scale: 1.1, reducedMotion: true, highContrast: false });
    expect(JSON.parse(nuikit.kvp.get("nuikit:prefs")!)).toEqual({ scale: 1.1, reducedMotion: true, highContrast: false });
    expect(await hud.run(`return NUI.prefs.get().scale`)).toBe(1.1);

    // a resource that starts later asks and gets them
    const late = await client.start("late", { before: started(["nuikit", "hud", "late"]) });
    expect(last(late, "nuikit:prefs")).toEqual({ scale: 1.1, reducedMotion: true, highContrast: false });
    late.messages.length = 0;
    await late.call("nuikit:ready");
    expect(last(late, "nuikit:prefs")).toMatchObject({ scale: 1.1 });
  });

  it("clamps scale to 0.85–1.25 and loads saved prefs on start", async () => {
    client = await createClient({ syncEvents });
    const nuikit = await client.start("nuikit", {
      before: `${started(["nuikit"])}
        function GetResourceKvpString(k) if k == 'nuikit:prefs' then return '{"scale":1.2,"highContrast":true}' end end`,
      scripts: [NUIKIT_CLIENT],
    });
    const hud = await client.start("hud", { before: started(["nuikit", "hud"]) });
    expect(last(hud, "nuikit:prefs")).toEqual({ scale: 1.2, reducedMotion: false, highContrast: true });
    await hud.run(`NUI.prefs.set({ scale = 4 })`);
    expect(last(hud, "nuikit:prefs").scale).toBe(1.25);
    await hud.run(`NUI.prefs.set({ scale = 0.1 })`);
    expect(last(hud, "nuikit:prefs").scale).toBe(0.85);
  });

  it("without the nuikit resource, prefs stay local to the resource", async () => {
    client = await createClient({ syncEvents });
    const ui = await client.start("ui", { before: started(["ui"]) });
    await ui.run(`NUI.prefs.set({ highContrast = true })`);
    expect(last(ui, "nuikit:prefs")).toEqual({ scale: 1, reducedMotion: false, highContrast: true });
    expect(JSON.parse(ui.kvp.get("nuikit:prefs")!)).toMatchObject({ highContrast: true });
  });

  it("/nuikit sets prefs for the player and forwards theme commands to the server", async () => {
    client = await createClient({ syncEvents });
    const hud = await client.start("hud", { before: started(["nuikit", "hud"]) });
    const nuikit = await client.start("nuikit", { before: started(["nuikit", "hud"]), scripts: [NUIKIT_CLIENT] });
    const cmd = nuikit.commands.get("nuikit")!;
    cmd(0, ["scale", "1.15"]);
    cmd(0, ["motion", "off"]);
    cmd(0, ["contrast", "on"]);
    await nuikit.run(`return 1`); // flush queued events
    expect(last(hud, "nuikit:prefs")).toEqual({ scale: 1.15, reducedMotion: true, highContrast: true });
    cmd(0, ["reset"]);
    await nuikit.run(`return 1`);
    expect(last(hud, "nuikit:prefs")).toEqual({ scale: 1, reducedMotion: false, highContrast: false });
    cmd(0, ["theme", "reload"]);
    expect(nuikit.serverEvents).toEqual([{ event: "nuikit:command", args: [["theme", "reload"]] }]);
  });
});

describe("theme callback for override pages (systems/nuikit/client.lua)", () => {
  const start = async () => {
    client = await createClient();
    client.setGlobal("nuikitTheme", publishable(".dark { --primary: #00ff00; }"));
    return client.start("nuikit", { before: started(["nuikit"]), scripts: [NUIKIT_CLIENT] });
  };

  it("answers right away with the compiled theme and prefs", async () => {
    const nuikit = await start();
    const r = await nuikit.call("theme", {});
    expect(r.theme.vars.primary).toBe("rgb(0, 255, 0)");
    expect(r.prefs).toEqual({ scale: 1, reducedMotion: false, highContrast: false });
    expect(r.themeHash).toMatch(/^[0-9a-f]{8}:1(\.0)?:0:0$/);
    expect(r.hash).toBe(`${r.themeHash}:z0`);
    expect(r.css).toBeUndefined();
  });

  it("long-poll: holds the request until `nuikit theme reload`, then answers every waiting page", async () => {
    const nuikit = await start();
    const { hash } = await nuikit.call("theme", {});
    const a = nuikit.callLater("theme", { hash, wait: true });
    const b = nuikit.callLater("theme", { hash, wait: true });
    let answered = false;
    void a.then(() => (answered = true));
    await Promise.resolve();
    expect(answered).toBe(false);
    client.setGlobal("nuikitTheme", publishable(".dark { --primary: #0000ff; }"));
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra.theme.vars.primary).toBe("rgb(0, 0, 255)");
    expect(rb.hash).toBe(ra.hash);
    expect(ra.hash).not.toBe(hash);
  });

  it("a stale hash answers at once; a pref change answers waiting pages; a quiet poll times out unchanged", async () => {
    const nuikit = await start();
    const { hash } = await nuikit.call("theme", {});
    expect((await nuikit.call("theme", { hash: "old", wait: true })).theme).toBeDefined();

    const waiting = nuikit.callLater("theme", { hash, wait: true });
    await nuikit.run(`TriggerEvent('nuikit:prefs:set', { scale = 1.2 })`);
    expect((await waiting).prefs.scale).toBe(1.2);

    const { hash: h2 } = await nuikit.call("theme", {});
    const quiet = nuikit.callLater("theme", { hash: h2, wait: true });
    client.runTimers();
    expect(await quiet).toEqual({ hash: h2, unchanged: true });
  });

  it("carries every UI's screen zones; a zone change answers waiting pages with the same themeHash", async () => {
    const nuikit = await start();
    const hud = await client.start("hud", { before: started(["nuikit", "hud"]) });
    const first = await nuikit.call("theme", {});
    expect(Object.keys(first.zones)).toEqual([]); // an empty Lua table ({} or [])
    const waiting = nuikit.callLater("theme", { hash: first.hash, wait: true });
    await hud.run(`NUI.zone('map', { { x = 0.8, y = 0.02, w = 0.18, h = 0.3 } })`);
    const next = await waiting;
    expect(next.zones).toEqual({ "hud:map": [{ x: 0.8, y: 0.02, w: 0.18, h: 0.3 }] });
    expect(next.themeHash).toBe(first.themeHash);
    expect(next.hash).not.toBe(first.hash);
    // a UI that stops drops its zones
    const again = nuikit.callLater("theme", { hash: next.hash, wait: true });
    client.stop("hud");
    expect(Object.keys((await again).zones)).toEqual([]);
  });

  it("a page asking after a zone was published gets it at once", async () => {
    const nuikit = await start();
    const hud = await client.start("hud", { before: started(["nuikit", "hud"]) });
    await hud.run(`NUI.zone('cluster', { { x = 0.7, y = 0.8, w = 0.28, h = 0.18 } })`);
    expect((await nuikit.call("theme", {})).zones).toEqual({ "hud:cluster": [{ x: 0.7, y: 0.8, w: 0.28, h: 0.18 }] });
  });

  it("sends theme.css when the server couldn't compile", async () => {
    client = await createClient();
    const nuikit = await client.start("nuikit", { before: started(["nuikit"]), scripts: [NUIKIT_CLIENT] });
    const r = await nuikit.call("theme", {});
    expect(r.theme).toBeUndefined();
    expect(r.css).toBe(".dark { --primary: #ff0000; }");
  });
});

describe("GTA's radar after the HUD that placed it stops (systems/nuikit/client.lua, 0.7.0 F3)", () => {
  const radar = `
    PLACED, CLIP, REPLACED, FLICKS = {}, nil, true, 0
    function SetMinimapComponentPosition(name, _, _, x, y, w, h) PLACED[name] = { x, y, w, h } end
    function SetMinimapClipType(t) CLIP = t end
    function RemoveReplaceTexture() REPLACED = nil end
    function GetNorthRadarBlip() return 1 end
    function SetBlipAlpha() end
    -- nuikit holds the minimap scaleform and builds the radar mask (systems/nuikit/client.lua)
    function RequestScaleformMovie() return 1 end
    function HasScaleformMovieLoaded() return true end
    function BeginScaleformMovieMethod() end
    function ScaleformMovieMethodAddParamInt() end
    function EndScaleformMovieMethod() end
    function CreateRuntimeTxd(n) return n end
    function CreateRuntimeTexture(_, n) return n end
    function SetRuntimeTexturePixel() end
    function CommitRuntimeTexture() end
    function AddReplaceTexture() end
    function SetRadarBigmapEnabled() FLICKS = FLICKS + 1 end
    function IsBigmapActive() return false end
    function CreateThread(f) f() end
    function Wait() end
  `;

  it("puts the stock radar back (with the re-read flick) when the placing resource stops, and only then", async () => {
    client = await createClient();
    const nuikit = await client.start("nuikit", { before: started(["nuikit"]) + radar, scripts: [NUIKIT_CLIENT] });
    const hud = await client.start("nuikit_hud", { before: started(["nuikit"]) });
    const other = await client.start("other", { before: started(["nuikit"]) });
    await hud.run(`TriggerEvent('nuikit:minimap:placed')`);
    client.stop("other");
    expect(await nuikit.run(`return PLACED.minimap`)).toBe(null);
    client.stop("nuikit_hud");
    expect(await nuikit.run(`return PLACED.minimap`)).toEqual([-0.0045, 0.002, 0.15, 0.188888]);
    expect(await nuikit.run(`return CLIP`)).toBe(0);
    expect(await nuikit.run(`return REPLACED`)).toBe(null);
    expect(await nuikit.run(`return FLICKS`)).toBe(2);
    void other;
  });

  it("with the real HUD minimap: its own stop handler doesn't cancel the restore", async () => {
    const HUD = fileURLToPath(new URL("../../../../systems/nuikit_hud/", import.meta.url));
    client = await createClient({ syncEvents: true });
    // the HUD's own stop handler runs first (the order FiveM uses across resources isn't specified)
    const hud = await client.start("nuikit_hud", {
      before: started(["nuikit"]) + radar + `
        function GetActiveScreenResolution() return 1920, 1080 end
        function GetSafeZoneSize() return 1.0 end
        function RequestScaleformMovie() return 1 end
        function IsRadarHidden() return false end
        function GetGameTimer() return 1 end
        function CreateRuntimeTxd(n) return n end
        function CreateRuntimeTexture(_, n) return n end
        function SetRuntimeTexturePixel() end
        function CommitRuntimeTexture() end
        function AddReplaceTexture() end
        CreateThread = function() end
      `,
      scripts: [HUD + "config.lua", HUD + "client/layout.lua", HUD + "client/minimap.lua"],
    });
    const nuikit = await client.start("nuikit", { before: started(["nuikit"]) + radar, scripts: [NUIKIT_CLIENT] });
    await hud.run(`Layout.update() Minimap.apply()`);
    await nuikit.run(`PLACED, FLICKS = {}, 0`);
    // what FiveM does on a stop: every handler, the stopping resource's own included
    await hud.run(`TriggerEvent('onClientResourceStop', 'nuikit_hud')`);
    expect(await nuikit.run(`return PLACED.minimap`)).toEqual([-0.0045, 0.002, 0.15, 0.188888]);
    expect(await nuikit.run(`return FLICKS`)).toBe(2);
  });

  it("hides GTA's satnav distance every frame while the asking HUD runs (Config.minimap.gameDistance)", async () => {
    client = await createClient();
    const nuikit = await client.start("nuikit", {
      before:
        started(["nuikit", "nuikit_hud"]) +
        radar +
        ` HIDES = 0 CO = nil
          function BeginScaleformMovieMethod(_, m) if m == 'HIDE_SATNAV' then HIDES = HIDES + 1 end end
          function CreateThread(f) CO = coroutine.create(f) coroutine.resume(CO) end
          function Wait() coroutine.yield() end
          function FRAME() if CO and coroutine.status(CO) == 'suspended' then coroutine.resume(CO) end end`,
      scripts: [NUIKIT_CLIENT],
    });
    const hud = await client.start("nuikit_hud", { before: started(["nuikit"]) });
    await hud.run(`TriggerEvent('nuikit:minimap:satnav', false)`);
    await hud.run(`TriggerEvent('nuikit:minimap:satnav', false)`); // a repeat starts no second loop
    await nuikit.run(`FRAME() FRAME()`);
    expect(await nuikit.run(`return HIDES`)).toBe(3);
    await hud.run(`TriggerEvent('nuikit:minimap:satnav', true)`); // shown again: the loop ends
    await nuikit.run(`FRAME() FRAME()`);
    expect(await nuikit.run(`return HIDES`)).toBe(3);
    expect(await nuikit.run(`return coroutine.status(CO)`)).toBe("dead");
  });

  it("does nothing when the HUD released the radar itself (style 'stock')", async () => {
    client = await createClient();
    const nuikit = await client.start("nuikit", { before: started(["nuikit"]) + radar, scripts: [NUIKIT_CLIENT] });
    const hud = await client.start("nuikit_hud", { before: started(["nuikit"]) });
    await hud.run(`TriggerEvent('nuikit:minimap:placed') TriggerEvent('nuikit:minimap:released')`);
    client.stop("nuikit_hud");
    expect(await nuikit.run(`return FLICKS`)).toBe(0);
  });
});
