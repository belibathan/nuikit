// systems/nuikit/server/install.js: the FXServer glue of `nuikit install`, run like FXServer's JS runtime
// (plain scripts in one context, natives as globals) against a temp directory standing in for resources/.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pageHash } from "../src/doctor";
import { bytesHash } from "../src/install";

const dir = fileURLToPath(new URL("../../../systems/nuikit/", import.meta.url));
const scripts = ["server/compiler.js", "server/main.js", "server/install.js", "server/doctor.js"].map((f) => [f, readFileSync(dir + f, "utf8")] as const);
const THEME = readFileSync(dir + "theme.css", "utf8");
const PAGE = '<!doctype html><html><head><meta name="nuikit-handshake" content="off" /></head><body>ours</body></html>';
const STOCK = "<!doctype html><html><body>stock</body></html>";

let root: string;
const w = (rel: string, text: string) => {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), text);
};
const r = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const has = (rel: string) => existsSync(path.join(root, rel));
const h = (text: string) => bytesHash(Buffer.from(text));

function boot(version = "0.9.0", files: Record<string, string> = { "web/build/index.html": PAGE, "web/build/app.js": "ours();" }) {
  const shipped: Record<string, string> = {};
  for (const [rel, text] of Object.entries(files)) {
    w(`nuikit/overrides/ox_lib/${rel}`, text);
    shipped[rel] = h(text);
  }
  w("nuikit/overrides.json", JSON.stringify({ version, overrides: { ox_lib: { path: "web/build/index.html", hash: pageHash(files["web/build/index.html"] ?? ""), files: shipped } } }));
  const logs: string[] = [];
  const commands = new Map<string, (src: number, args: string[]) => void>();
  const resources: Record<string, { state: string; metadata?: Record<string, string[]> }> = {
    nuikit: { state: "started", metadata: { version: [version], nuikit_protocol: ["1"] } },
    ox_lib: { state: "started", metadata: { ui_page: ["web/build/index.html"] } },
  };
  const names = Object.keys(resources);
  const ctx: Record<string, unknown> = {
    console: { log: (m: string) => logs.push(m) },
    require,
    GetCurrentResourceName: () => "nuikit",
    GetResourcePath: (n: string) => (has(n) ? path.join(root, n) : null),
    GetNumResources: () => names.length,
    GetResourceByFindIndex: (i: number) => names[i] ?? null,
    GetResourceState: (n: string) => resources[n]?.state ?? "missing",
    GetNumResourceMetadata: (n: string, k: string) => resources[n]?.metadata?.[k]?.length ?? 0,
    GetResourceMetadata: (n: string, k: string, i: number) => resources[n]?.metadata?.[k]?.[i] ?? null,
    LoadResourceFile: (n: string, f: string) => (n === "nuikit" && f === "theme.css" ? THEME : has(`${n}/${f}`) ? r(`${n}/${f}`) : null),
    GetConvar: (_k: string, d: string) => d,
    GlobalState: { set: () => {} },
    RegisterCommand: (name: string, fn: (src: number, args: string[]) => void) => commands.set(name, fn),
    on: () => {},
    onNet: () => {},
    emitNet: () => {},
    IsPlayerAceAllowed: () => false,
    exports: () => {},
  };
  ctx.globalThis = ctx;
  ctx.global = ctx;
  vm.createContext(ctx);
  for (const [name, code] of scripts) vm.runInContext(code, ctx, { filename: name });
  return (...args: string[]) => {
    const start = logs.length;
    commands.get("nuikit")!(0, args);
    return logs.slice(start).map((l) => l.replace(/\^\d/g, "").replace(/^\[nuikit\] /, ""));
  };
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "nuikit-install-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("nuikit install (server glue)", () => {
  it("dry run writes nothing; install backs up stock, merges ours, writes the manifest; doctor goes green", () => {
    w("ox_lib/web/build/index.html", STOCK);
    w("ox_lib/web/build/keep.png", "png");
    const run = boot();
    expect(run("install", "--dry-run").join("\n")).toContain("dry run");
    expect(has("ox_lib/.nuikit-backup")).toBe(false);
    const out = run("install").join("\n");
    expect(out).toContain("1 added, 1 replaced (stock backed up)");
    expect(out).toContain("`restart ox_lib`");
    expect(r("ox_lib/web/build/index.html")).toBe(PAGE);
    expect(r("ox_lib/web/build/app.js")).toBe("ours();");
    expect(r("ox_lib/web/build/keep.png")).toBe("png");
    expect(r("ox_lib/.nuikit-backup/0.9.0/web/build/index.html")).toBe(STOCK);
    const manifest = JSON.parse(r("ox_lib/.nuikit-backup/manifest.json"));
    expect(manifest).toMatchObject({ version: "0.9.0", backup: "0.9.0", files: { "web/build/index.html": h(PAGE), "web/build/app.js": h("ours();") } });
    // Second run: nothing to do.
    expect(run("install").join("\n")).toContain("2 unchanged");
    expect(run("doctor").join("\n")).not.toMatch(/override.*isn't|outdated/);
  });

  it("an edited file is kept unless --force, and the doctor says so", () => {
    w("ox_lib/web/build/index.html", STOCK);
    const run = boot();
    run("install");
    w("ox_lib/web/build/app.js", "mine();");
    expect(run("upgrade").join("\n")).toContain("edited: web/build/app.js");
    expect(r("ox_lib/web/build/app.js")).toBe("mine();");
    expect(run("doctor").join("\n")).toContain("INFO  ox_lib: the override was edited");
    expect(run("install", "--force").join("\n")).toContain("1 overwritten");
    expect(r("ox_lib/web/build/app.js")).toBe("ours();");
    expect(r("ox_lib/.nuikit-backup/0.9.0.edited/web/build/app.js")).toBe("mine();");
  });

  it("uninstall restores the stock files and removes what we added", () => {
    w("ox_lib/web/build/index.html", STOCK);
    const run = boot();
    run("install");
    const out = run("uninstall").join("\n");
    expect(out).toContain("1 removed, 1 restored from backup");
    expect(r("ox_lib/web/build/index.html")).toBe(STOCK);
    expect(has("ox_lib/web/build/app.js")).toBe(false);
    expect(has("ox_lib/.nuikit-backup/manifest.json")).toBe(false);
    expect(run("uninstall").join("\n")).toContain("nothing installed by nuikit");
  });

  it("a resource that isn't on the server is skipped, a player can't run it, unknown names are named", () => {
    const run = boot();
    expect(run("install").join("\n")).toContain("ox_lib                   not on this server");
    expect(run("install", "qb-menu").join("\n")).toContain("nuikit ships no override for it");
  });
});
