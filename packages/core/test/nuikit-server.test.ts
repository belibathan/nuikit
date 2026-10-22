// systems/nuikit/server: compiler.js (nuikit-core's compiler, synced) + main.js, run like FXServer's
// JS runtime does: plain scripts in one context, natives as globals.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { compileTheme } from "../src/tokens";

const dir = fileURLToPath(new URL("../../../systems/nuikit/", import.meta.url));
const scripts = ["server/compiler.js", "server/main.js"].map((f) => [f, readFileSync(dir + f, "utf8")] as const);

function boot(files: Record<string, string>, aces: Record<string, boolean> = {}, convars: Record<string, string> = {}) {
  const state: Record<string, unknown> = {};
  const logs: string[] = [];
  const net: { event: string; target: number; data: unknown }[] = [];
  const commands = new Map<string, { fn: (src: number, args: string[]) => void; restricted: boolean }>();
  const netHandlers = new Map<string, (...a: unknown[]) => void>();
  const exported = new Map<string, () => unknown>();
  const ctx: Record<string, unknown> = {
    console: { log: (m: string) => logs.push(m.replace(/\^\d/g, "")) },
    GetCurrentResourceName: () => "nuikit",
    GetConvar: (name: string, fallback: string) => convars[name] ?? fallback,
    LoadResourceFile: (_r: string, f: string) => files[f] ?? null,
    GlobalState: { set: (k: string, v: unknown) => (state[k] = v) },
    RegisterCommand: (name: string, fn: (src: number, args: string[]) => void, restricted: boolean) => commands.set(name, { fn, restricted }),
    onNet: (name: string, fn: (...a: unknown[]) => void) => netHandlers.set(name, fn),
    emitNet: (event: string, target: number, data: unknown) => net.push({ event, target, data }),
    IsPlayerAceAllowed: (src: string, ace: string) => aces[`${src}:${ace}`] === true,
    exports: (name: string, fn: () => unknown) => exported.set(name, fn),
  };
  ctx.globalThis = ctx;
  ctx.global = ctx;
  vm.createContext(ctx);
  for (const [name, code] of scripts) vm.runInContext(code, ctx, { filename: name });
  const asPlayer = (src: number, event: string, ...args: unknown[]) => {
    ctx.source = src;
    netHandlers.get(event)!(...args);
  };
  return { state, logs, net, commands, exported, files, asPlayer };
}

const THEME = readFileSync(dir + "theme.css", "utf8");
const LOW = readFileSync(fileURLToPath(new URL("./themes/low-contrast.css", import.meta.url)), "utf8");

describe("the nuikit resource's server script", () => {
  it("ships the current compiler (run pnpm build + pnpm sync after changing tokens.ts)", () => {
    const fresh = readFileSync(fileURLToPath(new URL("../dist/fxserver-compiler.js", import.meta.url)), "utf8");
    // line endings aside: a Windows checkout may turn the committed copy into CRLF
    const lf = (t: string) => t.replace(/\r\n/g, "\n");
    expect(lf(scripts[0]![1])).toBe(lf(fresh));
  });

  it("compiles theme.css at start and publishes GlobalState.nuikitTheme", () => {
    const s = boot({ "theme.css": THEME });
    const t = compileTheme(THEME);
    expect(s.state.nuikitTheme).toEqual({ version: 1, mode: "dark", hash: t.hash, vars: t.vars, imports: [] });
    expect(s.logs[0]).toMatch(/theme compiled: tokens v1, \d+ values, dark set, 9\/9 contrast checks pass/);
  });

  it("logs contrast warnings in the server console", () => {
    const s = boot({ "theme.css": LOW });
    expect(s.logs.some((l) => /primary-foreground on primary is .*text on buttons will be hard to read/.test(l))).toBe(true);
  });

  it("`nuikit theme reload` re-reads the file and republishes; ace-restricted", () => {
    const s = boot({ "theme.css": THEME });
    const first = (s.state.nuikitTheme as { hash: string }).hash;
    const cmd = s.commands.get("nuikit")!;
    expect(cmd.restricted).toBe(true);
    s.files["theme.css"] = ".dark { --primary: #22c55e; }";
    cmd.fn(0, ["theme", "reload"]);
    const next = s.state.nuikitTheme as { hash: string; vars: Record<string, string> };
    expect(next.hash).not.toBe(first);
    expect(next.vars.primary).toBe("rgb(34, 197, 94)");
    expect(s.logs.at(-1)).toMatch(/theme reloaded \(\d+ warnings?\)/);
  });

  it("players reach it through /nuikit only with command.nuikit", () => {
    const s = boot({ "theme.css": THEME }, { "7:command.nuikit": true });
    s.files["theme.css"] = ".dark { --primary: #22c55e; }";
    s.asPlayer(3, "nuikit:command", ["theme", "reload"]);
    expect(s.net.at(-1)).toMatchObject({ event: "chat:addMessage", target: 3, data: { args: ["nuikit", expect.stringMatching(/permission/)] } });
    expect((s.state.nuikitTheme as { vars: Record<string, string> }).vars.primary).not.toBe("rgb(34, 197, 94)");
    s.asPlayer(7, "nuikit:command", ["theme", "reload"]);
    expect((s.state.nuikitTheme as { vars: Record<string, string> }).vars.primary).toBe("rgb(34, 197, 94)");
    expect(s.net.at(-1)).toMatchObject({ target: 7, data: { args: ["nuikit", expect.stringMatching(/^theme reloaded/)] } });
  });

  it("without theme.css: warns and publishes the stock theme", () => {
    const s = boot({});
    expect(s.logs[0]).toMatch(/theme\.css is missing/);
    expect((s.state.nuikitTheme as { vars: Record<string, string> }).vars.background).toBe("rgb(10, 10, 10)");
  });

  it("exports getTheme / reloadTheme for other server scripts", () => {
    const s = boot({ "theme.css": THEME });
    expect((s.exported.get("getTheme")!() as { version: number }).version).toBe(1);
    expect(s.exported.get("reloadTheme")!()).toBe(true);
  });

  it("publishes the server context (nuikit_currency, nuikit_locale) next to the theme", () => {
    const s = boot({ "theme.css": THEME });
    expect(s.state.nuikitContext).toEqual({ currency: "USD", locale: "en-US" });
    expect(s.logs.some((l) => /context: currency USD, locale en-US$/.test(l))).toBe(true);

    const de = boot({ "theme.css": THEME }, {}, { nuikit_currency: "eur", nuikit_locale: "de_de" });
    expect(de.state.nuikitContext).toEqual({ currency: "EUR", locale: "de-DE" }); // canonical forms
    expect(de.exported.get("getContext")!()).toEqual({ currency: "EUR", locale: "de-DE" });

    const bad = boot({ "theme.css": THEME }, {}, { nuikit_currency: "dollars", nuikit_locale: "not a tag" });
    expect(bad.state.nuikitContext).toEqual({ currency: "USD", locale: "en-US" });
    expect(bad.logs.some((l) => /nuikit_currency "DOLLARS" is not an ISO 4217 code/.test(l))).toBe(true);
    expect(bad.logs.some((l) => /nuikit_locale "not a tag" is not a BCP 47 tag/.test(l))).toBe(true);
  });
});

describe("player looks (server/main.js publishLooks)", () => {
  const ARCADE = readFileSync(dir + "themes/arcade.css", "utf8");
  it("compiles every allowed identity and treatment combination; unknown names are left out with a line", () => {
    const s = boot({ "theme.css": THEME, "themes/arcade.css": ARCADE }, {}, { nuikit_identities: "arcade, nope", nuikit_treatments: "slab,chrome" });
    const looks = s.state.nuikitLooks as { identities: string[]; treatments: string[]; themes: Record<string, { hash: string; vars: Record<string, string> }> };
    expect(looks.identities).toEqual(["arcade"]);
    expect(looks.treatments).toEqual(["slab"]);
    expect(Object.keys(looks.themes).sort()).toEqual(["arcade|", "arcade|slab", "server|slab"]);
    expect(looks.themes["arcade|"]!.hash).toBe(compileTheme(ARCADE).hash);
    expect(looks.themes["server|slab"]!.vars["nk-treatment"]).toBe("slab");
    expect(s.logs.some((l) => /no themes\/nope\.css/.test(l))).toBe(true);
    expect(s.logs.some((l) => /chrome isn't a treatment/.test(l))).toBe(true);
  });
  it("publishes empty lists by default (the server theme only)", () => {
    const s = boot({ "theme.css": THEME });
    expect(s.state.nuikitLooks).toEqual({ identities: [], treatments: [], themes: {} });
  });
});
