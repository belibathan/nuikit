// nuikit doctor (docs/doctor.md): pure detection over hand-made snapshots.
import { describe, expect, it } from "vitest";
import { compareVersions, detectFramework, doctor, formatDoctor, pageHash, type DoctorResource, type DoctorSnapshot } from "../src/doctor";

const OVERRIDE_PAGE = '<!doctype html><html><head><meta name="nuikit-handshake" content="off" /></head><body></body></html>';
const PLAIN_PAGE = "<!doctype html><html><body>stock</body></html>";

function res(name: string, metadata: Record<string, string[]> = {}, extra: Partial<DoctorResource> = {}): DoctorResource {
  return { name, state: "started", metadata, ...extra };
}

const RUNTIME = res("nuikit", { ui_page: ["web/dist/index.html"], nuikit_protocol: ["1"], version: ["0.6.0"] });

function snap(resources: DoctorResource[], extra: Partial<DoctorSnapshot> = {}): DoctorSnapshot {
  return { runtime: { version: "0.6.0", protocol: 1 }, resources: [RUNTIME, ...resources], ...extra };
}

describe("framework detection", () => {
  it("Qbox", () => {
    expect(detectFramework([res("ox_lib"), res("qbx_core"), res("qb-core")])).toEqual({ framework: "qbox", resource: "qbx_core" });
  });
  it("QBCore", () => {
    expect(detectFramework([res("qb-core")])).toEqual({ framework: "qbcore", resource: "qb-core" });
  });
  it("ESX", () => {
    expect(detectFramework([res("es_extended")])).toEqual({ framework: "esx", resource: "es_extended" });
  });
  it("standalone, and a stopped framework doesn't count", () => {
    expect(detectFramework([res("qb-core", {}, { state: "stopped" })])).toEqual({ framework: "standalone", resource: null });
  });
});

describe("adapter packs", () => {
  it("fit by library and framework, and say they're not shipped", () => {
    const r = doctor(snap([res("ox_lib", { ui_page: ["web/build/index.html"] }), res("qbx_core")]));
    const ox = r.packs.find((p) => p.name === "[nuikit-ox]")!;
    const qb = r.packs.find((p) => p.name === "[nuikit-qb]")!;
    const esx = r.packs.find((p) => p.name === "[nuikit-esx]")!;
    expect(ox).toMatchObject({ fits: true, shipped: false, running: false });
    expect(qb.fits).toBe(false); // qb-core itself isn't running on this Qbox server
    expect(esx.fits).toBe(false);
    expect(formatDoctor(r).join("\n")).toContain("[nuikit-ox]    fits, not shipped yet");
  });
  it("a running adapter marks its library adapted", () => {
    const r = doctor(snap([res("ox_lib", { ui_page: ["web/build/index.html"] }), res("nuikit-ox", { nuikit_adapter: ["ox_lib"] })]));
    expect(r.packs.find((p) => p.name === "[nuikit-ox]")!.running).toBe(true);
    expect(r.resources.find((x) => x.name === "ox_lib")).toMatchObject({ status: "adapted", via: "nuikit-ox" });
    expect(r.summary.adapted).toBe(1);
  });
  it("ESX: only the esx pack fits", () => {
    const r = doctor(snap([res("es_extended", { ui_page: ["html/ui.html"] }), res("esx_menu_default", { ui_page: ["html/ui.html"] })]));
    expect(r.framework).toBe("esx");
    expect(r.packs.filter((p) => p.fits).map((p) => p.name)).toEqual(["[nuikit-esx]"]);
    expect(r.resources.find((x) => x.name === "esx_menu_default")!.next).toMatch(/nuikit_protocol/);
  });
});

describe("resource status", () => {
  it("on nuikit with protocol and level, hosted, override, untouched", () => {
    const files: Record<string, string> = { "ox_target/web/build/index.html": OVERRIDE_PAGE, "qb-menu/html/index.html": PLAIN_PAGE };
    const r = doctor(
      snap(
        [
          res("nuikit_pause", { ui_page: ["web/dist/index.html"], nuikit_protocol: ["1"], nuikit_level: ["3"], dependency: ["nuikit"] }),
          res("nuikit_hud", { nuikit_ui: ["web/dist/module.js"], nuikit_protocol: ["1"], dependency: ["nuikit"] }),
          res("ox_target", { ui_page: ["web/build/index.html"] }),
          res("qb-menu", { ui_page: ["html/index.html"] }),
          res("qb-core"),
          res("no_ui_script"),
          res("stopped_ui", { ui_page: ["x.html"] }, { state: "stopped" }),
        ],
        { readFile: (n, p) => files[`${n}/${p}`] ?? null },
      ),
    );
    const by: Record<string, (typeof r.resources)[number]> = Object.fromEntries(r.resources.map((x) => [x.name, x]));
    expect(by.nuikit!.status).toBe("runtime");
    expect(by.nuikit_pause!).toMatchObject({ status: "nuikit", protocol: 1, level: 3 });
    expect(by.nuikit_pause!.next).toBeUndefined();
    expect(by.nuikit_hud!.status).toBe("nuikit");
    expect(by.ox_target!).toMatchObject({ status: "override", page: "web/build/index.html" });
    expect(by["qb-menu"]).toMatchObject({ status: "untouched" });
    expect(by["qb-menu"]!.next).toMatch(/not shipped yet|nuikit_protocol/);
    expect(by.no_ui_script).toBeUndefined();
    expect(by.stopped_ui).toBeUndefined();
    expect(r.summary).toMatchObject({ ui: 4, nuikit: 2, override: 1, untouched: 1, adapted: 0 });
  });
  it("a nuikit UI without nuikit_level gets told to declare it", () => {
    const r = doctor(snap([res("x", { ui_page: ["i.html"], nuikit_protocol: ["1"] })]));
    expect(r.resources.find((x) => x.name === "x")!.next).toMatch(/nuikit_level/);
  });
  it("loadscreen counts as a UI", () => {
    const r = doctor(snap([res("nuikit_loading", { loadscreen: ["web/dist/index.html"], nuikit_protocol: ["1"] })]));
    expect(r.resources.find((x) => x.name === "nuikit_loading")).toMatchObject({ status: "nuikit", page: "web/dist/index.html" });
  });
  it("nuikit_loading (no handshake: it runs before the runtime) is on nuikit, and another loading screen is told so", () => {
    const r = doctor(snap([res("nuikit_loading", { loadscreen: ["web/dist/index.html"] }), res("loadscreen", { loadscreen: ["index.html"] })]));
    const ours = r.resources.find((x) => x.name === "nuikit_loading")!;
    expect(ours).toMatchObject({ status: "nuikit", via: "loadscreen", page: "web/dist/index.html" });
    expect(ours.next).toBeUndefined();
    expect(r.resources.find((x) => x.name === "loadscreen")).toMatchObject({ status: "untouched", next: expect.stringContaining("stop loadscreen") });
    expect(formatDoctor(r).join("\n")).toContain("nuikit_loading           on nuikit (loadscreen)");
    expect(r.summary).toMatchObject({ nuikit: 1, untouched: 1 });
  });
  it("nuikit_chat (a chat_theme, no page) is on nuikit (theme); a second chat theme is told to stop", () => {
    const r = doctor(snap([res("nuikit_chat", { chat_theme: ["nuikit"] }), res("qbx_chat_theme", { chat_theme: ["qbx"] }), res("chat", { ui_page: ["html/index.html"] })]));
    expect(r.resources.find((x) => x.name === "nuikit_chat")).toMatchObject({ status: "nuikit", via: "theme", page: null });
    expect(r.resources.find((x) => x.name === "qbx_chat_theme")!.next).toContain("stop qbx_chat_theme");
    expect(formatDoctor(r).join("\n")).toContain("nuikit_chat              on nuikit (theme)");
    expect(formatDoctor(r).join("\n")).not.toMatch(/nuikit_chat.*v1/);
  });
  it("a changed fxmanifest since start says refresh", () => {
    const r = doctor(snap([res("qbx_hud", { ui_page: ["html/index.html"] }, { manifestChanged: true })]));
    const f = r.findings.find((x) => x.code === "manifest-changed")!;
    expect(f).toMatchObject({ severity: "warn", resource: "qbx_hud" });
    expect(f.next).toBe("`refresh`, then `restart qbx_hud`");
  });
});

describe("conflicts", () => {
  it("provide + the real library", () => {
    const r = doctor(snap([res("nuikit-ox", { provide: ["ox_lib"] }), res("ox_lib")]));
    const f = r.findings.find((x) => x.code === "provide-conflict")!;
    expect(f).toMatchObject({ severity: "error", resource: "nuikit-ox" });
    expect(f.next).toContain("ensure ox_lib");
    expect(r.summary.errors).toBe(1);
  });
  it("no provide conflict when the library is stopped", () => {
    const r = doctor(snap([res("nuikit-ox", { provide: ["ox_lib"] }), res("ox_lib", {}, { state: "stopped" })]));
    expect(r.findings.some((x) => x.code === "provide-conflict")).toBe(false);
  });

  it("override drifted: the page isn't the one we shipped", () => {
    const overrides = { version: "0.6.0", overrides: { ox_lib: { path: "web/build/index.html", hash: pageHash(OVERRIDE_PAGE) } } };
    const edited = OVERRIDE_PAGE.replace("</body>", "<script>x</script></body>");
    const r = doctor(snap([res("ox_lib", { ui_page: ["web/build/index.html"] })], { overrides, readFile: () => edited }));
    expect(r.findings.find((x) => x.code === "override-drifted")).toMatchObject({ severity: "warn", resource: "ox_lib" });
    expect(r.resources.find((x) => x.name === "ox_lib")).toMatchObject({ status: "override", via: "override changed" });
  });
  it("override matches: no finding", () => {
    const overrides = { version: "0.6.0", overrides: { ox_lib: { path: "web/build/index.html", hash: pageHash(OVERRIDE_PAGE) } } };
    const r = doctor(snap([res("ox_lib", { ui_page: ["web/build/index.html"] })], { overrides, readFile: () => OVERRIDE_PAGE.replace(/\n/g, "\r\n") }));
    expect(r.findings.filter((x) => x.code.startsWith("override"))).toEqual([]);
  });
  it("override missing: a library update put the stock page back", () => {
    const overrides = { version: "0.6.0", overrides: { ox_lib: { path: "web/build/index.html", hash: pageHash(OVERRIDE_PAGE) } } };
    const r = doctor(snap([res("ox_lib", { ui_page: ["web/build/index.html"] })], { overrides, readFile: () => PLAIN_PAGE }));
    const f = r.findings.find((x) => x.code === "override-missing")!;
    expect(f.severity).toBe("warn");
    expect(f.next).toContain("overrides/ox_lib/");
    expect(r.resources.find((x) => x.name === "ox_lib")).toMatchObject({ status: "untouched", via: "override missing" });
  });
  it("override list entries for resources that aren't running are ignored", () => {
    const overrides = { version: "0.6.0", overrides: { ox_inventory: { path: "web/build/index.html", hash: "00000000" } } };
    const r = doctor(snap([], { overrides, readFile: () => null }));
    expect(r.findings.filter((x) => x.code.startsWith("override"))).toEqual([]);
  });

  it("a resource speaking a newer protocol than the runtime", () => {
    const r = doctor(snap([res("fancy", { ui_page: ["i.html"], nuikit_protocol: ["2"] })]));
    expect(r.findings.find((x) => x.code === "protocol-newer")).toMatchObject({ severity: "error", resource: "fancy" });
    expect(r.findings.some((x) => x.code === "protocol-newer" && x.resource === "nuikit")).toBe(false);
  });

  it("start order: a dependent that started before nuikit", () => {
    const r = doctor(snap([res("nuikit_pause", { ui_page: ["i.html"], nuikit_protocol: ["1"], dependency: ["nuikit"], shared_script: ["@nuikit/init.lua"] }, { startedBeforeRuntime: true })]));
    const f = r.findings.find((x) => x.code === "start-order")!;
    expect(f.severity).toBe("error");
    expect(f.next).toContain("ensure nuikit");
    expect(r.findings.some((x) => x.code === "missing-dependency")).toBe(false);
  });
  it("missing dependency: imports @nuikit without declaring it", () => {
    const r = doctor(snap([res("my_script", { shared_scripts: ["@nuikit/init.lua", "config.lua"] })]));
    expect(r.findings.find((x) => x.code === "missing-dependency")).toMatchObject({ severity: "warn", resource: "my_script" });
    expect(r.findings.some((x) => x.code === "start-order")).toBe(false);
  });
  it("an unrelated resource that started before nuikit is fine", () => {
    const r = doctor(snap([res("qb-core", {}, { startedBeforeRuntime: true })]));
    expect(r.findings.some((x) => x.code === "start-order")).toBe(false);
  });

  it("theme contrast and other warnings", () => {
    const r = doctor(
      snap([], {
        theme: {
          contrast: [
            { fg: "foreground", bg: "background", ratio: 12, min: 4.5, ok: true },
            { fg: "muted-foreground", bg: "muted", ratio: 2.1, min: 4.5, ok: false },
          ],
          warnings: ["low contrast: muted-foreground on muted", "no dark set; using light"],
        },
      }),
    );
    const contrast = r.findings.filter((x) => x.code === "theme-contrast");
    expect(contrast).toHaveLength(1);
    expect(contrast[0]!.message).toContain("2.10:1");
    expect(contrast[0]!.next).toContain("nuikit theme reload");
    expect(r.findings.filter((x) => x.code === "theme-warning").map((x) => x.message)).toEqual(["theme: no dark set; using light"]);
  });

  it("a failed contrast pair prints once, not as a warning and again as the compiler's info line (0.7.0 baseline)", () => {
    const r = doctor(
      snap([], {
        theme: {
          contrast: [{ fg: "primary-foreground", bg: "primary", ratio: 3.54, min: 4.5, ok: false }],
          warnings: ["primary-foreground on primary is 3.5:1 (needs 4.5:1); text on buttons will be hard to read."],
        },
      }),
    );
    const theme = r.findings.filter((x) => x.code.startsWith("theme-"));
    expect(theme).toHaveLength(1);
    expect(theme[0]!.code).toBe("theme-contrast");
  });

  it("identical findings are printed once", () => {
    const r = doctor(snap([res("a", { provide: ["ox_lib", "ox_lib"] }), res("ox_lib")]));
    expect(r.findings.filter((x) => x.code === "provide-conflict")).toHaveLength(1);
  });

  it("update available, only when latest is newer", () => {
    expect(doctor(snap([], { runtime: { version: "0.6.0", protocol: 1, latest: "0.7.0" } })).findings.find((x) => x.code === "update-available")?.next).toContain("v0.7.0");
    expect(doctor(snap([], { runtime: { version: "0.6.0", protocol: 1, latest: "v0.6.0" } })).findings.some((x) => x.code === "update-available")).toBe(false);
    expect(doctor(snap([], { runtime: { version: "0.6.0", protocol: 1, latest: null } })).findings.some((x) => x.code === "update-available")).toBe(false);
  });
});

describe("intents", () => {
  it("counts by source, biggest first, and formats", () => {
    const r = doctor(snap([], { intents: { qb_shops: { menu: 3 }, ox_lib: { notify: 10, menu: 2 } } }));
    expect(r.intents.map((i) => [i.source, i.total])).toEqual([
      ["ox_lib", 12],
      ["qb_shops", 3],
    ]);
    const text = formatDoctor(r).join("\n");
    expect(text).toContain("ox_lib                   12  (notify 10, menu 2)");
  });
  it("says when none were counted", () => {
    expect(formatDoctor(doctor(snap([]))).join("\n")).toContain("intents: none counted yet");
  });
});

describe("output", () => {
  it("prints a full report with next steps", () => {
    const files: Record<string, string> = { "ox_target/web/build/index.html": OVERRIDE_PAGE };
    const r = doctor(
      snap(
        [
          res("qbx_core"),
          res("ox_lib", { ui_page: ["web/build/index.html"] }),
          res("ox_target", { ui_page: ["web/build/index.html"] }),
          res("nuikit_pause", { ui_page: ["web/dist/index.html"], nuikit_protocol: ["1"], nuikit_level: ["3"], dependency: ["nuikit"] }),
          res("nuikit-ox", { provide: ["ox_lib"] }),
        ],
        { readFile: (n, p) => files[`${n}/${p}`] ?? null },
      ),
    );
    const lines = formatDoctor(r);
    expect(lines[0]).toBe("nuikit 0.6.0 (protocol 1)");
    expect(lines[1]).toBe("framework: qbox (qbx_core)");
    expect(lines).toContain("resources with a UI (3): 1 on nuikit, 0 adapted, 1 override, 1 untouched");
    expect(lines.join("\n")).toContain("ERROR nuikit-ox provides ox_lib, and ox_lib itself is running");
    expect(lines.join("\n")).toContain("→ stop one of them");
    expect(lines.join("\n")).toContain("→ adapter packs that fit: [nuikit-ox] (not shipped yet)");
    expect(lines.every((l) => !/\^\d/.test(l))).toBe(true); // no colour codes in core
  });
});

describe("helpers", () => {
  it("compareVersions", () => {
    expect(compareVersions("0.7.0", "0.6.0")).toBeGreaterThan(0);
    expect(compareVersions("v0.6.0", "0.6.0")).toBe(0);
    expect(compareVersions("0.6.0", "0.6.1")).toBeLessThan(0);
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersions("0.7.0-next", "0.7.0")).toBeGreaterThan(0);
  });
  it("pageHash ignores line endings", () => {
    expect(pageHash("a\r\nb")).toBe(pageHash("a\nb"));
    expect(pageHash("a")).not.toBe(pageHash("b"));
    expect(pageHash("")).toBe("811c9dc5");
  });
});
