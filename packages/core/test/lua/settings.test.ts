// nk.settings (packages/core/lua/settings.lua): rows with defaults, a live-preview draft, save / cancel /
// reset, presets, KVP merged over defaults across a schema version, feature flags, pages through NUI callbacks.
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "./harness";

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

const SCHEMA = (version = 1, extra = "") => `{
  label = 'HUD', version = ${version},
  rows = {
    { key = 'layout', label = 'Layout', options = { { value = 'compact', label = 'Compact' }, { value = 'classic', label = 'Classic' } }, default = 'compact' },
    { key = 'scale', label = 'Size', range = { 0.8, 1.2, 0.05 }, default = 1.0 },
    { key = 'minimap', label = 'Minimap', toggle = true, default = true, flag = 'hud_minimap' },
    ${extra}
  },
  presets = { { id = 'streamer', label = 'Streamer', patch = { minimap = false, layout = 'classic' } } },
}`;

const flags = (off: string[] = []) => `
  local OFF = {} for _, k in ipairs(json.decode('${JSON.stringify(off)}')) do OFF['nuikit_flag_' .. k] = '0' end
  function GetConvar(k, d) return OFF[k] or d end
`;

async function setup(off: string[] = [], kvp?: Map<string, string>) {
  client = await createClient();
  const nuikit = await client.start("nuikit", { before: flags(off), scripts: ["settings.lua"], kvp });
  const hud = await client.start("hud", { before: flags(off), scripts: ["settings.lua"] });
  await hud.run(`CHANGES = {} S = NUI.settings.define(setmetatable(${SCHEMA()}, { __index = { onChange = function(v, changed, draft) CHANGES[#CHANGES + 1] = { changed = changed, draft = draft } end } }))`);
  return { nuikit, hud };
}

describe("nk.settings", () => {
  it("starts from the defaults", async () => {
    const { hud } = await setup();
    expect(await hud.run(`return S.values()`)).toEqual({ layout: "compact", scale: 1, minimap: true });
    expect(await hud.run(`return S.get('layout')`)).toBe("compact");
  });

  it("a draft previews (onChange with draft = true, a page message), cancel restores, save persists", async () => {
    const { nuikit, hud } = await setup();
    await hud.run(`S.draft({ layout = 'classic', scale = 1.13, nope = 1 })`);
    expect(await hud.run(`return S.values()`)).toEqual({ layout: "classic", scale: 1.15, minimap: true });
    expect(await hud.run(`return CHANGES[#CHANGES]`)).toEqual({ changed: ["layout", "scale"], draft: true });
    expect(hud.messages.at(-1)).toMatchObject({ action: "nuikit:settings", data: { draft: true } });
    await hud.run(`S.cancel()`);
    expect(await hud.run(`return S.get('layout')`)).toBe("compact");
    expect(nuikit.kvp.size).toBe(0);
    await hud.run(`S.draft({ layout = 'classic' }) S.save()`);
    expect(await hud.run(`return CHANGES[#CHANGES].draft`)).toBe(false);
    // only what differs from the default is stored, under the schema's version
    expect(JSON.parse(nuikit.kvp.get("nuikit:settings:hud")!)).toEqual({ v: 1, values: { layout: "classic" } });
  });

  it("an option whose value is false can be picked, saved and read back (lane B, 86c8875)", async () => {
    const { nuikit, hud } = await setup();
    await hud.run(`B = NUI.settings.define({ label = 'B', rows = { { key = 'ring', options = { { value = true, label = 'On' }, { value = false, label = 'Off' } }, default = true } } })`);
    // a second define in the same resource replaces its section
    await hud.run(`B.draft({ ring = false })`);
    expect(await hud.run(`return B.get('ring')`)).toBe(false);
    await hud.run(`B.save()`);
    expect(JSON.parse(nuikit.kvp.get("nuikit:settings:hud")!).values).toEqual({ ring: false });
    expect(await hud.run(`return NUI.settings.normalize({ options = { { value = false } } }, false)`)).toBe(false);
  });

  it("invalid values are refused; ranges clamp and snap", async () => {
    const { hud } = await setup();
    await hud.run(`S.draft({ layout = 'huge', scale = 9, minimap = 'yes' })`);
    expect(await hud.run(`return S.values()`)).toEqual({ layout: "compact", scale: 1.2, minimap: true });
  });

  it("presets are patch bundles applied as a draft; reset goes back to the defaults and saves", async () => {
    const { nuikit, hud } = await setup();
    await hud.run(`S.preset('streamer')`);
    expect(await hud.run(`return S.values()`)).toMatchObject({ layout: "classic", minimap: false });
    await hud.run(`S.save()`);
    await hud.run(`S.reset({ 'minimap' })`);
    expect(await hud.run(`return S.values()`)).toMatchObject({ layout: "classic", minimap: true });
    await hud.run(`S.reset()`);
    expect(await hud.run(`return S.values()`)).toEqual({ layout: "compact", scale: 1, minimap: true });
    expect(JSON.parse(nuikit.kvp.get("nuikit:settings:hud")!).values).toEqual({});
  });

  it("an update keeps the player's choices: merged over the new defaults, dropped keys gone, migrate runs once", async () => {
    const saved = new Map([["nuikit:settings:hud", JSON.stringify({ v: 1, values: { layout: "classic", scale: 0.9, gone: true } })]]);
    client = await createClient();
    const nuikit = await client.start("nuikit", { scripts: ["settings.lua"], kvp: saved });
    const hud = await client.start("hud", { scripts: ["settings.lua"] });
    const v2 = SCHEMA(2, `{ key = 'compass', label = 'Compass', toggle = true, default = false },`);
    await hud.run(`MIGRATED = nil S = NUI.settings.define(setmetatable(${v2}, { __index = { migrate = function(old, from) MIGRATED = from old.compass = true return old end } }))`);
    expect(await hud.run(`return MIGRATED`)).toBe(1);
    expect(await hud.run(`return S.values()`)).toEqual({ layout: "classic", scale: 0.9, minimap: true, compass: true });
    expect(JSON.parse(nuikit.kvp.get("nuikit:settings:hud")!)).toEqual({ v: 2, values: { layout: "classic", scale: 0.9, compass: true } });
  });

  it("feature flags hide a row from pages but keep its value; nk.settings.flag tells the resource", async () => {
    const { nuikit, hud } = await setup(["hud_minimap"]);
    const { sections } = await nuikit.call("settings", {});
    expect(sections).toHaveLength(1);
    expect(sections[0].rows.map((r: { key: string }) => r.key)).toEqual(["layout", "scale"]);
    expect(sections[0].values.minimap).toBe(true);
    expect(await hud.run(`return NUI.settings.flag('hud_minimap')`)).toBe(false);
    expect(await hud.run(`return NUI.settings.flag('anything_else')`)).toBe(true);
  });

  it("pages draft, save and reset through https://nuikit/settings*; the owner hears every change", async () => {
    const { nuikit, hud } = await setup();
    const { sections } = await nuikit.call("settings", { resource: "hud" });
    expect(sections[0]).toMatchObject({ resource: "hud", label: "HUD", version: 1, draft: false, presets: [{ id: "streamer", label: "Streamer" }] });
    expect((await nuikit.call("settings:draft", { resource: "hud", patch: { scale: 0.85 } })).values.scale).toBe(0.85);
    expect(await hud.run(`return S.get('scale')`)).toBe(0.85);
    expect((await nuikit.call("settings", { resource: "hud" })).sections[0].draft).toBe(true);
    await nuikit.call("settings:save", { resource: "hud" });
    expect(JSON.parse(nuikit.kvp.get("nuikit:settings:hud")!).values).toEqual({ scale: 0.85 });
    expect(await nuikit.call("settings:draft", { resource: "nope", patch: {} })).toEqual({ error: "unknown resource" });
    expect(await nuikit.call("settings:save", {})).toEqual({ error: "resource" });
  });

  it("a resource that imports @nuikit/init.lua gets nk.settings", async () => {
    client = await createClient();
    const nuikit = await client.start("nuikit", { scripts: ["settings.lua"] });
    const job = await client.start("job", { runtime: "import" });
    await job.run(`J = nk.settings.define({ label = 'Job', rows = { { key = 'blips', toggle = true, default = true } } })`);
    expect(await job.run(`return J.get('blips')`)).toBe(true);
    expect((await nuikit.call("settings", {})).sections[0]).toMatchObject({ resource: "job", label: "Job" });
  });

  it("a stopped resource leaves the list; a bad schema row is skipped with a printed reason", async () => {
    const { nuikit } = await setup();
    const other = await client.start("radio", { scripts: ["settings.lua"] });
    await other.run(`R = NUI.settings.define({ rows = { { key = 'vol', range = { 0, 1 }, default = 5 }, { key = 'on', toggle = true, default = true } } })`);
    expect(await other.run(`return R.values()`)).toEqual({ on: true });
    expect((await nuikit.call("settings", {})).sections.map((s: { resource: string }) => s.resource)).toEqual(["hud", "radio"]);
    client.stop("radio");
    expect((await nuikit.call("settings", {})).sections.map((s: { resource: string }) => s.resource)).toEqual(["hud"]);
  });
});
