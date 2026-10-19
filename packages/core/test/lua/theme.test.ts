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
    expect(r.hash).toMatch(/^[0-9a-f]{8}:1(\.0)?:0:0$/);
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

  it("sends theme.css when the server couldn't compile", async () => {
    client = await createClient();
    const nuikit = await client.start("nuikit", { before: started(["nuikit"]), scripts: [NUIKIT_CLIENT] });
    const r = await nuikit.call("theme", {});
    expect(r.theme).toBeUndefined();
    expect(r.css).toBe(".dark { --primary: #ff0000; }");
  });
});
