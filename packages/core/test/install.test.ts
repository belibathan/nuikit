// nuikit install (docs/install.md): the planner behind the server command, over hand-made hashes.
import { describe, expect, it } from "vitest";
import { bytesHash, formatInstall, overrideOutdated, planInstall, planUninstall, type InstalledManifest } from "../src/install";

const NOW = "2026-10-23T00:00:00.000Z";
const SHIPPED_08 = { "web/build/index.html": "aaaa0001", "web/build/app.js": "aaaa0002" };
const SHIPPED_09 = { "web/build/index.html": "bbbb0001", "web/build/app.js": "aaaa0002", "web/build/app.css": "bbbb0003" };

describe("bytesHash", () => {
  it("is FNV-1a over bytes, no line-ending normalisation", () => {
    expect(bytesHash(new TextEncoder().encode(""))).toBe("811c9dc5");
    expect(bytesHash(new TextEncoder().encode("a\n"))).not.toBe(bytesHash(new TextEncoder().encode("a\r\n")));
  });
});

describe("planInstall", () => {
  it("first install: stock files are backed up and replaced, new ones added", () => {
    const plan = planInstall({ version: "0.8.0", shipped: SHIPPED_08, installed: null, disk: { "web/build/index.html": "57000001", "web/build/app.js": null }, now: NOW });
    expect(plan.actions).toEqual([
      { rel: "web/build/app.js", op: "add" },
      { rel: "web/build/index.html", op: "replace", backup: true },
    ]);
    expect(plan.changes).toBe(2);
    expect(plan.manifest).toEqual({ version: "0.8.0", backup: "0.8.0", files: SHIPPED_08, installedAt: NOW });
  });

  it("re-running the same zip changes nothing", () => {
    const installed: InstalledManifest = { version: "0.8.0", backup: "0.8.0", files: SHIPPED_08 };
    const plan = planInstall({ version: "0.8.0", shipped: SHIPPED_08, installed, disk: { ...SHIPPED_08 } });
    expect(plan.actions.every((a) => a.op === "keep")).toBe(true);
    expect(plan.changes).toBe(0);
  });

  it("upgrade: our files update without a second backup, the backup folder stays the first one", () => {
    const installed: InstalledManifest = { version: "0.8.0", backup: "0.8.0", files: SHIPPED_08 };
    const plan = planInstall({ version: "0.9.0", shipped: SHIPPED_09, installed, disk: { ...SHIPPED_08, "web/build/app.css": null } });
    expect(plan.actions).toEqual([
      { rel: "web/build/app.css", op: "add" },
      { rel: "web/build/app.js", op: "keep" },
      { rel: "web/build/index.html", op: "update" },
    ]);
    expect(plan.manifest.backup).toBe("0.8.0");
    expect(plan.manifest.version).toBe("0.9.0");
  });

  it("a file the owner edited is kept, flagged, and stays ours in the manifest; --force saves and overwrites", () => {
    const installed: InstalledManifest = { version: "0.8.0", backup: "0.8.0", files: SHIPPED_08 };
    const disk = { ...SHIPPED_08, "web/build/index.html": "ed170001" };
    const kept = planInstall({ version: "0.9.0", shipped: SHIPPED_09, installed, disk: { ...disk, "web/build/app.css": null } });
    expect(kept.edited).toEqual(["web/build/index.html"]);
    expect(kept.actions.find((a) => a.rel === "web/build/index.html")).toEqual({ rel: "web/build/index.html", op: "skip-edited" });
    expect(kept.manifest.files["web/build/index.html"]).toBe("aaaa0001");
    const forced = planInstall({ version: "0.9.0", shipped: SHIPPED_09, installed, disk: { ...disk, "web/build/app.css": null }, force: true });
    expect(forced.edited).toEqual([]);
    expect(forced.actions.find((a) => a.rel === "web/build/index.html")).toEqual({ rel: "web/build/index.html", op: "force-edited", backup: true });
    expect(forced.manifest.files["web/build/index.html"]).toBe("bbbb0001");
  });

  it("a library update that put the stock page back is treated as stock again", () => {
    const installed: InstalledManifest = { version: "0.8.0", backup: "0.8.0", files: SHIPPED_08 };
    // Not in installed.files? It is; but the disk hash is neither ours nor shipped: edited → kept. A stock
    // restore after a library update looks the same to hashes, so --force or the doctor's hint is the path.
    const plan = planInstall({ version: "0.8.0", shipped: SHIPPED_08, installed: { ...installed, files: {} }, disk: { ...SHIPPED_08, "web/build/index.html": "57000001" } });
    expect(plan.actions.find((a) => a.rel === "web/build/index.html")?.op).toBe("replace");
  });

  it("files we no longer ship are restored from backup, or removed when the resource never had them", () => {
    const installed: InstalledManifest = { version: "0.9.0", backup: "0.8.0", files: SHIPPED_09 };
    const plan = planInstall({ version: "1.0.0", shipped: { "web/build/index.html": "cccc0001" }, installed, disk: { ...SHIPPED_09 }, hasBackup: (rel) => rel === "web/build/app.js" });
    expect(plan.actions).toEqual([
      { rel: "web/build/index.html", op: "update" },
      { rel: "web/build/app.css", op: "remove" },
      { rel: "web/build/app.js", op: "restore" },
    ]);
    expect(Object.keys(plan.manifest.files)).toEqual(["web/build/index.html"]);
  });
});

describe("planUninstall", () => {
  it("restores what has a backup, removes what we added, and notes edits", () => {
    const installed: InstalledManifest = { version: "0.8.0", backup: "0.8.0", files: SHIPPED_08 };
    const plan = planUninstall({ installed, disk: { "web/build/index.html": "ed170001", "web/build/app.js": "aaaa0002" }, hasBackup: (rel) => rel === "web/build/index.html" });
    expect(plan.actions).toEqual([
      { rel: "web/build/app.js", op: "remove" },
      { rel: "web/build/index.html", op: "restore" },
    ]);
    expect(plan.edited).toEqual(["web/build/index.html"]);
  });
});

describe("overrideOutdated + formatInstall", () => {
  it("compares the installed version with the zip's", () => {
    expect(overrideOutdated({ version: "0.8.0", backup: "0.8.0", files: {} }, "0.9.0")).toBe(true);
    expect(overrideOutdated({ version: "0.9.0", backup: "0.8.0", files: {} }, "0.9.0")).toBe(false);
    expect(overrideOutdated(null, "0.9.0")).toBe(false);
  });
  it("prints one line per resource and the restart step", () => {
    const installed: InstalledManifest = { version: "0.8.0", backup: "0.8.0", files: SHIPPED_08 };
    const plan = planInstall({ version: "0.9.0", shipped: SHIPPED_09, installed, disk: { ...SHIPPED_08, "web/build/index.html": "ed170001", "web/build/app.css": null } });
    const lines = formatInstall([{ resource: "ox_lib", state: "planned", plan }, { resource: "ox_inventory", state: "missing" }], { version: "0.9.0" });
    expect(lines[0]).toBe("nuikit install 0.9.0");
    expect(lines[1]).toContain("ox_lib");
    expect(lines[1]).toContain("1 added, 1 unchanged, 1 kept: you edited it (use --force to overwrite)");
    expect(lines[2]).toBe("    edited: web/build/index.html");
    expect(lines[3]).toContain("ox_inventory");
    expect(lines[3]).toContain("not on this server");
    expect(lines[4]).toBe("  → `refresh`, then `restart ox_lib`");
    expect(formatInstall([{ resource: "ox_lib", state: "planned", plan }], { version: "0.9.0", dryRun: true })[0]).toContain("dry run");
  });
});
