// systems/nuikit/server/doctor.js: the FXServer glue of `nuikit doctor`, run like FXServer's JS runtime
// does (plain scripts in one context, natives as globals) against a fake resource list.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { pageHash } from "../src/doctor";

const dir = fileURLToPath(new URL("../../../systems/nuikit/", import.meta.url));
const scripts = ["server/compiler.js", "server/main.js", "server/doctor.js"].map((f) => [f, readFileSync(dir + f, "utf8")] as const);
const THEME = readFileSync(dir + "theme.css", "utf8");
const OVERRIDE_PAGE = '<!doctype html><html><head><meta name="nuikit-handshake" content="off" /></head><body></body></html>';

type Fake = { state: string; metadata?: Record<string, string[]>; files?: Record<string, string> };

function boot(resources: Record<string, Fake>, convars: Record<string, string> = {}) {
  const logs: string[] = [];
  const commands = new Map<string, (src: number, args: string[]) => void>();
  const handlers = new Map<string, (...a: unknown[]) => void>();
  const netHandlers = new Map<string, (...a: unknown[]) => void>();
  const exported = new Map<string, () => unknown>();
  const names = Object.keys(resources);
  const ctx: Record<string, unknown> = {
    console: { log: (m: string) => logs.push(m) },
    GetCurrentResourceName: () => "nuikit",
    GetNumResources: () => names.length,
    GetResourceByFindIndex: (i: number) => names[i] ?? null,
    GetResourceState: (n: string) => resources[n]?.state ?? "missing",
    GetNumResourceMetadata: (n: string, k: string) => resources[n]?.metadata?.[k]?.length ?? 0,
    GetResourceMetadata: (n: string, k: string, i: number) => resources[n]?.metadata?.[k]?.[i] ?? null,
    LoadResourceFile: (n: string, f: string) => resources[n]?.files?.[f] ?? null,
    GetConvar: (k: string, d: string) => convars[k] ?? d,
    GlobalState: { set: () => {} },
    RegisterCommand: (name: string, fn: (src: number, args: string[]) => void) => commands.set(name, fn),
    on: (name: string, fn: (...a: unknown[]) => void) => handlers.set(name, fn),
    onNet: (name: string, fn: (...a: unknown[]) => void) => netHandlers.set(name, fn),
    emitNet: () => {},
    IsPlayerAceAllowed: () => false,
    exports: (name: string, fn: () => unknown) => exported.set(name, fn),
  };
  ctx.globalThis = ctx;
  ctx.global = ctx;
  vm.createContext(ctx);
  for (const [name, code] of scripts) vm.runInContext(code, ctx, { filename: name });
  const run = (...args: string[]) => {
    const start = logs.length;
    commands.get("nuikit")!(0, args);
    return logs.slice(start).map((l) => l.replace(/\^\d/g, "").replace(/^\[nuikit\] /, ""));
  };
  return { logs, run, handlers, netHandlers, exported };
}

const QBOX = {
  nuikit: { state: "started", metadata: { version: ["0.6.0"], nuikit_protocol: ["1"], ui_page: ["web/dist/index.html"] }, files: { "theme.css": THEME } },
  qbx_core: { state: "started" },
  ox_lib: { state: "started", metadata: { ui_page: ["web/build/index.html"] }, files: { "web/build/index.html": OVERRIDE_PAGE } },
  nuikit_pause: { state: "started", metadata: { ui_page: ["web/dist/index.html"], nuikit_protocol: ["1"], nuikit_level: ["3"], dependency: ["nuikit"], shared_script: ["@nuikit/init.lua"] } },
  "qb-menu": { state: "stopped", metadata: { ui_page: ["html/index.html"] } },
};

describe("nuikit doctor (server glue)", () => {
  it("builds the snapshot from natives and prints the report", () => {
    const s = boot(QBOX);
    const out = s.run("doctor");
    expect(out[0]).toBe("nuikit 0.6.0 (protocol 1)");
    expect(out[1]).toBe("framework: qbox (qbx_core)");
    expect(out.join("\n")).toContain("ox_lib                   override (override page)");
    expect(out.join("\n")).toContain("nuikit_pause             on nuikit v1 level 3");
    expect(out.join("\n")).not.toContain("qb-menu");
    expect(out.join("\n")).toContain("findings:");
  });

  it("the theme's contrast checks come from main.js", () => {
    const low = readFileSync(fileURLToPath(new URL("./themes/low-contrast.css", import.meta.url)), "utf8");
    const s = boot({ ...QBOX, nuikit: { ...QBOX.nuikit, files: { "theme.css": low } } });
    expect(s.run("doctor").join("\n")).toMatch(/WARN\s+theme: .* on .* is [\d.]+:1/);
  });

  it("resources started before nuikit are flagged only when they depend on it", () => {
    // nuikit_pause is "started" when doctor.js runs, so it started first; qbx_core too but doesn't import nuikit.
    const s = boot(QBOX);
    const out = s.run("doctor").join("\n");
    expect(out).toContain("ERROR nuikit_pause started before nuikit");
    expect(out).not.toContain("qbx_core started before");
    // After a restart it's fine.
    s.handlers.get("onResourceStart")!("nuikit_pause");
    expect(s.run("doctor").join("\n")).not.toContain("started before nuikit");
  });

  it("reads overrides.json and compares hashes", () => {
    const overrides = JSON.stringify({ version: "0.6.0", overrides: { ox_lib: { path: "web/build/index.html", hash: pageHash(OVERRIDE_PAGE) } } });
    const ok = boot({ ...QBOX, nuikit: { ...QBOX.nuikit, files: { ...QBOX.nuikit.files, "overrides.json": overrides } } });
    expect(ok.run("doctor").join("\n")).not.toMatch(/override page .* isn't/);
    const drifted = boot({
      ...QBOX,
      nuikit: { ...QBOX.nuikit, files: { ...QBOX.nuikit.files, "overrides.json": overrides } },
      ox_lib: { ...QBOX.ox_lib, files: { "web/build/index.html": OVERRIDE_PAGE + "<!-- edited -->" } },
    });
    expect(drifted.run("doctor").join("\n")).toContain("WARN  ox_lib: the override page at web/build/index.html isn't the one nuikit 0.6.0 shipped");
    const bad = boot({ ...QBOX, nuikit: { ...QBOX.nuikit, files: { ...QBOX.nuikit.files, "overrides.json": "{nope" } } });
    expect(bad.run("doctor").join("\n")).toContain("overrides.json is not valid JSON");
  });

  it("counts nuikit:intent by source (server and net events)", () => {
    const s = boot(QBOX);
    s.handlers.get("nuikit:intent")!({ source: "ox_lib", intent: "notify" });
    s.handlers.get("nuikit:intent")!({ source: "ox_lib", intent: "notify" });
    s.netHandlers.get("nuikit:intent")!({ source: "qb_shops", intent: "menu" });
    s.handlers.get("nuikit:intent")!(null);
    const out = s.run("doctor").join("\n");
    expect(out).toContain("ox_lib                   2  (notify 2)");
    expect(out).toContain("qb_shops                 1  (menu 1)");
  });

  it("`nuikit doctor json` prints one JSON line; exports doctor()", () => {
    const s = boot(QBOX, { nuikit_latest: "0.7.0" });
    const [line] = s.run("doctor", "json");
    const rep = JSON.parse(line!);
    expect(rep.framework).toBe("qbox");
    expect(rep.runtime).toEqual({ version: "0.6.0", protocol: 1, latest: "0.7.0" });
    expect(rep.findings.some((f: { code: string }) => f.code === "update-available")).toBe(true);
    expect((s.exported.get("doctor")!() as { framework: string }).framework).toBe("qbox");
  });

  it("the online update check is opt-in and honestly not built", () => {
    expect(boot(QBOX, { nuikit_check_updates: "1" }).run("doctor").join("\n")).toContain("online check isn't built yet");
    expect(boot(QBOX).run("doctor").join("\n")).not.toContain("online check");
  });

  it("usage mentions doctor", () => {
    expect(boot(QBOX).run("nope").join("\n")).toContain("nuikit doctor [json]");
  });
});
