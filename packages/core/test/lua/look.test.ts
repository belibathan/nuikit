// A player's own look (systems/nuikit/client.lua + nuikit.lua): prefs.identity picks a compiled theme
// from GlobalState.nuikitLooks when the server allows it, live in every UI and on override pages; the Look
// settings section previews and saves through the prefs.
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { compileTheme } from "../../src/tokens";
import { createClient } from "./harness";

const NUIKIT_CLIENT = fileURLToPath(new URL("../../../../systems/nuikit/client.lua", import.meta.url));
const started = (names: string[]) => `
  local STARTED = { ${names.map((n) => `['${n}'] = true`).join(", ")} }
  function GetResourceState(r) return STARTED[r] and 'started' or 'missing' end
`;
const pub = (css: string) => {
  const t = compileTheme(css);
  return { version: t.version, mode: t.mode, hash: t.hash, vars: t.vars, imports: t.imports };
};
const SERVER = pub(".dark { --primary: #ff0000; }");
const STUDIO = pub(".dark { --primary: #00ff00; }");
const LOOKS = { identities: ["flat"], themes: { flat: STUDIO } };
const last = (ui: { messages: { action: string; data: any }[] }, action: string) => [...ui.messages].reverse().find((m) => m.action === action)?.data;

let client: Awaited<ReturnType<typeof createClient>>;
afterEach(() => client?.close());

async function setup() {
  client = await createClient();
  client.setGlobal("nuikitTheme", SERVER);
  client.setGlobal("nuikitLooks", LOOKS);
  const nuikit = await client.start("nuikit", { before: started(["nuikit", "hud"]), scripts: ["settings.lua", NUIKIT_CLIENT] });
  client.runTimers();
  const hud = await client.start("hud", { before: started(["nuikit", "hud"]) });
  return { nuikit, hud };
}

describe("player look", () => {
  it("an allowed identity repaints every UI live; a disallowed one keeps the server theme", async () => {
    const { nuikit, hud } = await setup();
    await nuikit.run(`TriggerEvent('nuikit:prefs:set', { identity = 'flat' })`);
    expect(last(hud, "nuikit:theme").hash).toBe(STUDIO.hash);
    expect(last(hud, "nuikit:prefs")).toMatchObject({ identity: "flat" });
    await nuikit.run(`TriggerEvent('nuikit:prefs:set', { identity = 'velvet' })`);
    expect(last(hud, "nuikit:theme").hash).toBe(SERVER.hash);
    await nuikit.run(`TriggerEvent('nuikit:prefs:set', { identity = false })`);
    expect(last(hud, "nuikit:theme").hash).toBe(SERVER.hash);
    // a pref that isn't a look doesn't repaint the theme
    const before = hud.messages.filter((m) => m.action === "nuikit:theme").length;
    await nuikit.run(`TriggerEvent('nuikit:prefs:set', { scale = 1.1 })`);
    expect(hud.messages.filter((m) => m.action === "nuikit:theme").length).toBe(before);
  });

  it("override pages get the look through https://nuikit/theme, and density in the hash", async () => {
    const { nuikit } = await setup();
    await nuikit.run(`TriggerEvent('nuikit:prefs:set', { identity = 'flat', density = 1.1 })`);
    const r = await nuikit.call("theme", {});
    expect(r.theme.hash).toBe(STUDIO.hash);
    expect(r.themeHash).toMatch(/:d1\.1$/);
    expect(r.prefs).toMatchObject({ identity: "flat", density: 1.1 });
  });

  it("the Look settings section lists the allowed looks; a draft previews without saving; save writes the prefs", async () => {
    const { nuikit, hud } = await setup();
    const { sections } = await nuikit.call("settings", { resource: "nuikit" });
    expect(sections[0].label).toBe("Look");
    expect(sections[0].rows.map((r: { key: string }) => r.key)).toEqual(["identity", "scale", "density", "reducedMotion", "highContrast"]);
    expect(sections[0].rows[0].options.map((o: { value: string }) => o.value)).toEqual(["", "flat"]);
    await nuikit.call("settings:draft", { resource: "nuikit", patch: { identity: "flat", scale: 1.1 } });
    expect(last(hud, "nuikit:theme").hash).toBe(STUDIO.hash);
    expect(nuikit.kvp.get("nuikit:prefs")).toBeUndefined();
    await nuikit.call("settings:cancel", { resource: "nuikit" });
    expect(last(hud, "nuikit:theme").hash).toBe(SERVER.hash);
    await nuikit.call("settings:draft", { resource: "nuikit", patch: { identity: "flat" } });
    await nuikit.call("settings:save", { resource: "nuikit" });
    expect(JSON.parse(nuikit.kvp.get("nuikit:prefs")!)).toMatchObject({ identity: "flat" });
    // /nuikit scale elsewhere: the section follows the prefs
    await nuikit.run(`TriggerEvent('nuikit:prefs:set', { scale = 0.9 })`);
    expect((await nuikit.call("settings", { resource: "nuikit" })).sections[0].values).toMatchObject({ identity: "flat", scale: 0.9 });
  });

  it("without allowed looks the section has only the comfort rows", async () => {
    client = await createClient();
    client.setGlobal("nuikitTheme", SERVER);
    const nuikit = await client.start("nuikit", { before: started(["nuikit"]), scripts: ["settings.lua", NUIKIT_CLIENT] });
    client.runTimers();
    const { sections } = await nuikit.call("settings", { resource: "nuikit" });
    expect(sections[0].rows.map((r: { key: string }) => r.key)).toEqual(["scale", "density", "reducedMotion", "highContrast"]);
  });
});
