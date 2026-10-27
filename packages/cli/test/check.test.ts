import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { check, checkResource, findResources, KIT_RULES, type CheckResult, type RuleId } from "../src/check";
import { DEFAULT_TOKENS, TOKENS } from "../src/tokens";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => path.join(here, "fixtures", name);
// the Default rules (warnings) have their own tests below; the conformance tests grade the rest
const core = (r: CheckResult) => r.findings.filter((f) => !KIT_RULES.includes(f.rule) && !f.rule.startsWith("arsenal/"));
const rules = (r: CheckResult) => [...new Set(core(r).map((f) => f.rule))].sort();
const at = (r: CheckResult, rule: RuleId) => r.findings.filter((f) => f.rule === rule).map((f) => `${f.file}:${f.line}`);

describe("bad resource", () => {
  const r = checkResource(fixture("bad"));

  it("is level 0 and reports every rule", () => {
    expect(r.level).toBe(0);
    expect(r.kind).toBe("resource");
    expect(rules(r)).toEqual(
      [
        "color/hardcoded",
        "color/palette-class",
        "escape/adhoc",
        "focus/direct",
        "focus/no-release",
        "manifest/protocol",
        "native/components",
        "native/runtime",
        "perf/frame-send",
        "perf/remote-asset",
        "surfaces/none",
        "tokens/none",
      ].sort(),
    );
  });

  it("reports file:line for colours, and nothing from comments or anchors", () => {
    expect(at(r, "color/hardcoded")).toEqual([
      "html/app.js:16",
      "html/app.js:18",
      "html/index.html:12",
      "html/index.html:12",
      "html/style.css:5",
      "html/style.css:7",
      "html/style.css:12",
      "html/style.css:13",
      "html/style.css:17",
    ]);
    // the black box-shadow and `color: white` are allowed
    expect(r.findings.some((f) => /box-shadow/.test(f.message))).toBe(false);
    expect(at(r, "color/palette-class")).toEqual(["html/app.js:17", "html/index.html:10", "html/index.html:10"]);
  });

  it("finds direct focus calls but not those in comments or strings", () => {
    expect(at(r, "focus/direct")).toEqual(["client/main.lua:5", "client/main.lua:11"]);
    expect(at(r, "focus/no-release")).toEqual(["client/main.lua:5"]);
  });

  it("finds ad-hoc Escape, per-frame sends and remote fonts", () => {
    expect(at(r, "escape/adhoc")).toEqual(["html/app.js:9"]);
    expect(at(r, "perf/frame-send")).toEqual(["client/main.lua:18"]);
    expect(at(r, "perf/remote-asset")).toEqual(["html/index.html:5", "html/style.css:2"]);
    expect(r.findings.filter((f) => f.rule.startsWith("perf/")).every((f) => f.severity === "warning" && f.level === 0)).toBe(true);
  });
});

describe("level 1 resource", () => {
  const r = checkResource(fixture("level1"));
  it("is themed: token definitions, fallbacks, neutral shadows and nuikit-ignore are fine", () => {
    expect(r.level).toBe(1);
    expect(r.findings.filter((f) => f.level === 1)).toEqual([]);
    expect(r.protocol).toBe("1");
  });
  it("fails level 2 on focus, but releases it on stop", () => {
    expect(rules(r)).toEqual(["focus/direct", "native/components", "native/runtime", "surfaces/none"]);
  });
  it("doesn't flag sends from a Wait(1000) loop", () => {
    expect(at(r, "perf/frame-send")).toEqual([]);
  });
});

describe("level 2 resource", () => {
  const r = checkResource(fixture("level2"));
  it("is well-behaved: nuikit.lua owns focus, Escape goes through nuikit:escape", () => {
    expect(r.level).toBe(2);
    expect(rules(r)).toEqual(["native/components", "native/runtime"]);
    expect(r.findings.find((f) => f.rule === "native/runtime")!.message).toMatch(/nuikit-core/);
  });
});

describe("level 3 resource (built like nuikit_hud)", () => {
  const r = checkResource(fixture("level3"));
  it("is native with no findings", () => {
    expect(core(r)).toEqual([]);
    expect(r.level).toBe(3);
    expect(r.page).toEqual({ type: "ui_page", path: "web/dist/index.html" });
    expect(r.stats.tokenRefs).toBeGreaterThan(5);
  });
});

describe("override and no-UI folders", () => {
  it("grades an override on page rules; its Escape is advisory", () => {
    const r = checkResource(fixture("override"));
    expect(r.kind).toBe("override");
    expect(r.level).toBe(3);
    expect(r.skipped).toContain("focus/direct");
    const esc = r.findings.find((f) => f.rule === "escape/adhoc")!;
    expect(esc.severity).toBe("warning");
    expect(esc.level).toBe(0);
  });

  it("doesn't grade a resource without UI, and ignores Wait(0) loops that send nothing", () => {
    const r = checkResource(fixture("no-ui"));
    expect(r.level).toBeNull();
    expect(core(r)).toEqual([]);
  });
});

describe("discovery", () => {
  it("checks every resource under a folder", () => {
    const names = findResources(path.join(here, "fixtures")).map((p) => path.basename(p));
    expect(names).toEqual(["bad", "level1", "level2", "level3", "no-ui", "override"]);
    expect(check(path.join(here, "fixtures")).map((r) => r.level)).toEqual([0, 1, 2, 3, null, 3]);
  });

  it("marks findings in a synced index.css as inherited", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nuikit-check-"));
    fs.mkdirSync(path.join(dir, "web/src"), { recursive: true });
    fs.writeFileSync(path.join(dir, "web/index.html"), "<html></html>");
    fs.writeFileSync(path.join(dir, "web/src/index.css"), "/* nuikit kit layer */\n@utility nk-chip { color: #fff; background: var(--hud); }\n");
    const r = checkResource(dir);
    expect(r.findings.filter((f) => f.rule === "color/hardcoded").every((f) => f.inherited)).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });
});

describe("tokens", () => {
  it("has the tokens v1 names", () => {
    const names = TOKENS.map((t) => t.name);
    for (const n of ["primary", "success-foreground", "warning", "info", "hud", "hud-foreground", "vital-health", "vital-stress", "nk-scale", "nk-motion", "chart-5", "radius"]) expect(names).toContain(n);
    expect(new Set(names).size).toBe(names.length);
    expect(DEFAULT_TOKENS.length).toBeGreaterThan(40);
  });
});

describe("cli", () => {
  const cli = path.join(here, "../dist/cli.js");
  const built = fs.existsSync(cli);

  it.skipIf(!built)("exits non-zero below --level and prints JSON", () => {
    const fail = spawnSync(process.execPath, [cli, "check", fixture("level1"), "--level", "2", "--json"], { encoding: "utf8" });
    expect(fail.status).toBe(1);
    const json = JSON.parse(fail.stdout);
    expect(json.pass).toBe(false);
    expect(json.results[0].level).toBe(1);
    const pass = spawnSync(process.execPath, [cli, "check", fixture("level3"), "--level", "3"], { encoding: "utf8" });
    expect(pass.status).toBe(0);
    expect(pass.stdout).toMatch(/level 3/);
  });

  it.skipIf(!built)("prints tokens", () => {
    const out = execFileSync(process.execPath, [cli, "tokens", "--css"], { encoding: "utf8" });
    expect(out.split("\n")).toContain("--vital-health");
  });

  it.skipIf(!built)("exits 2 for a missing path", () => {
    expect(spawnSync(process.execPath, [cli, "check", fixture("nope")]).status).toBe(2);
  });
});

describe("exemptions", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nuikit-check-"));
  const res = path.join(tmp, "res");
  const put = (rel: string, src: string) => {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, rel), src);
  };
  put("res/web/index.html", "<!doctype html><div class=\"bg-primary\"></div>");
  put(
    "res/web/data.ts",
    [
      "// nuikit-ignore-start color/hardcoded: palette the upstream protocol sends",
      'export const HUES = { red: "#fa5252",',
      '  blue: "#228be6" };',
      "// nuikit-ignore-end",
      'export const after = "#123456";',
    ].join("\n"),
  );
  put("res/web/theme.css", ":root { --nk-primary: rgb(229, 229, 229); --nk-primary-rgb: 229, 229, 229; }");
  put("res/server/main.js", 'const fallback = "rgba(0, 0, 0, 0.45)";');
  put("out/res/web/index.html", "<div style=\"color:#fff\"></div>");
  const r = checkResource(res);

  it("honours ignore blocks only up to nuikit-ignore-end", () => {
    expect(at(r, "color/hardcoded")).toEqual(["web/data.ts:5"]);
  });
  it("treats --nk-<token> as a token definition and skips server scripts", () => {
    expect(r.findings.some((f) => f.file === "web/theme.css" || f.file.startsWith("server/"))).toBe(false);
  });
  it("doesn't descend into build output", () => {
    expect(findResources(tmp).map((p) => path.relative(tmp, p))).toEqual(["res"]);
  });
});

describe("a resource importing the runtime (@nuikit/init.lua)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nuikit-import-"));
  fs.cpSync(fixture("level3"), tmp, { recursive: true });
  fs.rmSync(path.join(tmp, "client/nuikit.lua"));
  fs.rmSync(path.join(tmp, "client/bridge.lua"));
  const manifest = path.join(tmp, "fxmanifest.lua");
  fs.writeFileSync(
    manifest,
    fs
      .readFileSync(manifest, "utf8")
      .replace("  'client/nuikit.lua',\n  'client/bridge.lua',\n", "")
      .replace("client_scripts {", "dependency 'nuikit'\nshared_script '@nuikit/init.lua'\n\nclient_scripts {"),
  );
  it("is native: the import counts as the nuikit runtime", () => {
    const r = checkResource(tmp);
    expect(r.findings.filter((f) => f.rule === "native/runtime")).toEqual([]);
    expect(r.level).toBe(3);
  });
});

describe("surfaces declared with nk.*", () => {
  it("counts nk.surface as a surface", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nuikit-nk-"));
    fs.cpSync(fixture("level3"), tmp, { recursive: true });
    const main = path.join(tmp, "client/main.lua");
    fs.writeFileSync(main, fs.readFileSync(main, "utf8").replace(/\bNUI\./g, "nk."));
    expect(fs.readFileSync(main, "utf8")).toMatch(/nk\.surface|nk\.open/);
    expect(checkResource(tmp).findings.filter((f) => f.rule === "surfaces/none")).toEqual([]);
  });
});

describe("attention/glow (tokens 1.4 glow budget)", () => {
  it("warns once on a second data-nk-glow mark; the level stays", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nk-glow-"));
    fs.cpSync(fixture("level3"), dir, { recursive: true });
    const base = checkResource(dir);
    const app = path.join(dir, "web/src/glow.tsx");
    fs.writeFileSync(app, `export const A = () => <div data-nk-glow className="bg-primary" />;\nexport const B = () => <div data-nk-glow="2" />;\nexport const C = () => <div data-nk-glow-on />;\n`);
    const r = checkResource(dir);
    expect(at(r, "attention/glow")).toEqual(["web/src/glow.tsx:2"]);
    expect(r.findings.find((f) => f.rule === "attention/glow")).toMatchObject({ severity: "warning", level: 0 });
    expect(r.level).toBe(base.level);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("cef/* (old-CEF profile, advisory)", () => {
  const run = (files: Record<string, string>) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nk-cef-"));
    fs.cpSync(fixture("level3"), dir, { recursive: true });
    const base = checkResource(dir);
    for (const [rel, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, rel), text);
    const r = checkResource(dir);
    fs.rmSync(dir, { recursive: true, force: true });
    return { r, base };
  };
  const cef = (r: ReturnType<typeof checkResource>) => r.findings.filter((f) => f.rule.startsWith("cef/")).map((f) => `${f.rule}@${f.file}:${f.line}`);

  it("fires on each bad CSS sample, as warnings that keep the level", () => {
    const { r, base } = run({
      "web/src/bad.css": `.a { backdrop-filter: blur(4px); }\n.b:has(> img) { color: var(--primary); }\n@container (min-width: 10px) { .c { color: var(--primary); } }\n.d { container-type: inline-size; scale: 1.1; translate: 0 4px; rotate: 3deg; }\n.ok { --nk-panel-backdrop: blur(4px); }\n`,
    });
    expect(cef(r)).toEqual([
      "cef/backdrop-filter@web/src/bad.css:1",
      "cef/has@web/src/bad.css:2",
      "cef/container@web/src/bad.css:3",
      "cef/container@web/src/bad.css:4",
      "cef/individual-transform@web/src/bad.css:4",
      "cef/individual-transform@web/src/bad.css:4",
      "cef/individual-transform@web/src/bad.css:4",
    ]);
    expect(r.findings.filter((f) => f.rule.startsWith("cef/")).every((f) => f.severity === "warning" && f.level === 0)).toBe(true);
    expect(r.level).toBe(base.level);
  });

  it("flags inline color-mix/oklch and backdropFilter, not class strings or stylesheets", () => {
    const { r } = run({
      "web/src/bad.tsx": `export const A = () => <div style={{ background: "color-mix(in oklab, var(--primary) 50%, transparent)", backdropFilter: "blur(2px)" }} className="bg-[color-mix(in_oklab,red,blue)]" />;\n`,
      "web/src/ok.css": `.x { background: color-mix(in oklab, var(--primary) 50%, transparent); background: oklch(0.5 0.1 20); transform: scale(1.1); }\n`,
      "web/inline.html": `<div style="background: oklch(0.5 0.1 20)"></div>\n`,
    });
    expect(cef(r).sort()).toEqual(["cef/backdrop-filter@web/src/bad.tsx:1", "cef/color-mix-inline@web/inline.html:1", "cef/color-mix-inline@web/src/bad.tsx:1"]);
  });

  it("stays quiet on good samples and respects nuikit-ignore", () => {
    const { r } = run({
      "web/src/good.css": `.a { transform: scale(1.1) translate(0, 4px); color: var(--primary); }\n@media (min-width: 10px) { .b { color: var(--primary); } }\n.c { --my-scale: 2; }\n`,
      "web/src/ignored.css": `/* nuikit-ignore cef/backdrop-filter: deliberate blur */\n.a { backdrop-filter: blur(4px); }\n.b { backdrop-filter: blur(4px); /* nuikit-ignore cef/backdrop-filter */ }\n`,
    });
    expect(cef(r)).toEqual([]);
  });
});

// The Default conventions (docs/design.md §4): warnings until each directory's wave lands.
describe("ink rules", () => {
  const run = (files: Record<string, string>) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nk-ink-"));
    fs.cpSync(fixture("level3"), dir, { recursive: true });
    const base = checkResource(dir);
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    }
    const r = checkResource(dir);
    fs.rmSync(dir, { recursive: true, force: true });
    const seen = new Set(base.findings.map((f) => `${f.rule}@${f.file}:${f.line}`));
    return { r, base, ink: r.findings.filter((f) => KIT_RULES.includes(f.rule) && !seen.has(`${f.rule}@${f.file}:${f.line}`)).map((f) => `${f.rule}@${f.file}:${f.line}`) };
  };

  it("flags each CSS sample, as warnings that keep the level", () => {
    const { r, base, ink } = run({
      "web/src/ink.css": [
        ".a { border-radius: 6px; }",
        ".b { border-radius: 9999px; }",
        ".c { filter: drop-shadow(0 1px 2px black); }",
        ".d { background: color-mix(in oklab, var(--primary) 50%, transparent); }",
        ".e { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5); }",
        ".f { transition: transform 150ms ease-out; }",
        ".g { transition: color var(--nk-time-base) var(--nk-ease-enter); }",
        ".h { font-size: 13px; font-weight: 600; }",
        ".i[class*=\"ring-\"] { color: var(--primary); }",
        ".j[data-critical] { color: var(--destructive); }",
        ".k { gap: 0.375rem; }",
      ].join("\n") + "\n",
    });
    expect(ink.sort()).toEqual(
      [
        "radius/raw@web/src/ink.css:1",
        "radius/pill@web/src/ink.css:2",
        "effect/blur@web/src/ink.css:3",
        "color/mix@web/src/ink.css:4",
        "shadow/soft@web/src/ink.css:5",
        "motion/duration@web/src/ink.css:6",
        "motion/ease@web/src/ink.css:6",
        "motion/property@web/src/ink.css:7",
        "type/raw@web/src/ink.css:8",
        "type/raw@web/src/ink.css:8",
        "selector/class-substring@web/src/ink.css:9",
        "state/alert@web/src/ink.css:10",
        "space/off-scale@web/src/ink.css:11",
      ].sort(),
    );
    expect(r.findings.filter((f) => KIT_RULES.includes(f.rule)).every((f) => f.severity === "warning" && f.level === 0)).toBe(true);
    expect(r.level).toBe(base.level);
  });

  it("flags class names and alert attributes in script", () => {
    const { ink } = run({
      "web/src/ink.tsx": `export const A = () => <div data-low className="rounded-full rounded-md shadow-lg backdrop-blur-md duration-300 ease-out transition-all text-xs font-semibold gap-1.5" style={{ animationDelay: 40 }} />;\n`,
    });
    const rulesHit = [...new Set(ink.map((s) => s.split("@")[0]))].sort();
    expect(rulesHit).toEqual(["effect/blur", "motion/duration", "motion/ease", "motion/property", "radius/pill", "radius/raw", "shadow/soft", "space/off-scale", "state/alert", "type/raw"].sort());
  });

  it("stays quiet on the token way, and on synced copies", () => {
    const { ink } = run({
      "web/src/good.css": [
        ".a { border-radius: var(--nk-radius-chip); box-shadow: 0 0.125rem 0 rgba(0, 0, 0, 0.6), inset 0 0 0 1px var(--border); }",
        ".b { transition: transform var(--nk-time-base) var(--nk-ease-move), opacity var(--nk-time-fast) var(--nk-ease-enter); }",
        ".c { gap: var(--nk-gap-cluster); padding: 0.5rem 0.75rem; font-size: var(--nk-text-key); }",
        ".d[data-state=\"alert\"] { color: var(--destructive); }",
      ].join("\n") + "\n",
      "web/src/good.tsx": `export const A = () => <div className="rounded-(--nk-radius-chip) gap-(--nk-gap-cluster) transition-transform duration-(--nk-time-fast) ease-(--nk-ease-enter) nk-label" />;\n`,
      "web/src/components/ui/vendored.tsx": `export const B = () => <div className="rounded-md shadow-lg text-sm" />;\n`,
    });
    expect(ink).toEqual([]);
  });

  it("asks a theme to stay in @layer nk.theme", () => {
    const { ink } = run({
      "theme.css": [":root { --nk-tile-face-skew: -12deg; }", "@layer nk.theme {", "  [data-slot=\"tile\"][data-state=\"alert\"] { opacity: 0.8; }", "}", ".inv-key { color: var(--primary) !important; }"].join("\n") + "\n",
    });
    expect(ink).toEqual(["theme/values-only@theme.css:3", "theme/unlayered@theme.css:5", "theme/unlayered@theme.css:5"]);
  });

  it("asks a theme file to set values only (D4), and leaves the rule sheet in theme/ alone", () => {
    const { ink } = run({
      "themes/mine.css": ["@import url(\"https://cfx-nui-nuikit/theme/default.css\");", ".dark { --nk-tile-face-skew: 0deg; --radius: 0rem; color: red; }", "@layer nk.theme {", "  [data-slot=\"tile\"] { border-radius: 0; }", "}"].join("\n") + "\n",
      "theme/mine.css": "@layer nk.theme {\n  [data-slot=\"tile\"][data-state=\"alert\"] { opacity: 0.8; }\n}\n",
    });
    expect(ink).toEqual(["theme/unlayered@themes/mine.css:2", "theme/values-only@themes/mine.css:4"]);
  });
});

// The invariants (docs/design.md "Invariants" 2 and 3): a page draws no selection or plate of its own.
describe("invariant rules: selection/local and kit/local-concept", () => {
  const run = (files: Record<string, string>, rule: RuleId[]) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nk-inv-"));
    fs.cpSync(fixture("level3"), dir, { recursive: true });
    const base = new Set(checkResource(dir).findings.map((f) => `${f.rule}@${f.file}:${f.line}`));
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    }
    const r = checkResource(dir);
    fs.rmSync(dir, { recursive: true, force: true });
    return { r, hits: r.findings.filter((f) => rule.includes(f.rule) && !base.has(`${f.rule}@${f.file}:${f.line}`)).map((f) => `${f.rule}@${f.file}:${f.line}`) };
  };

  it("selection/local flags a page's own selected and hover state, as warnings", () => {
    const { r, hits } = run(
      {
        "web/src/sel.tsx": [
          `export const A = () => <div className="hover:bg-accent p-1" />;`,
          `export const B = () => <div className="data-[state=active]:bg-primary" />;`,
          `export const C = () => <div className="aria-selected:bg-muted" />;`,
          `export const D = () => <div className="bg-accent text-accent-foreground" />;`,
          `export const E = () => <div className="hover:bg-transparent text-accent-foreground bg-background" />;`,
        ].join("\n"),
        "web/src/sel.css": [".row.selected { background: var(--accent); }", ".row.active { color: red; }", ".row { background: var(--card); }"].join("\n"),
      },
      ["selection/local"],
    );
    expect(hits.sort()).toEqual(["selection/local@web/src/sel.css:1", "selection/local@web/src/sel.tsx:1", "selection/local@web/src/sel.tsx:2", "selection/local@web/src/sel.tsx:3", "selection/local@web/src/sel.tsx:4"]);
    expect(r.findings.filter((f) => f.rule === "selection/local").every((f) => f.severity === "warning" && f.level === 0)).toBe(true);
  });

  it("kit/local-concept flags a hand-drawn wall, skew, underline and level fill", () => {
    const { hits } = run(
      {
        "web/src/plate.css": [
          ".a { transform: skew(-8deg); }",
          ".b { box-shadow: 0 0.25rem 0 var(--primary); }",
          ".c { border-bottom: 3px solid var(--primary); }",
          ".d { background: linear-gradient(to right, var(--primary) var(--level), transparent 0); }",
          ".e { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5); border-bottom: 1px solid var(--border); transform: scale(1.1); }",
          ".f { background: linear-gradient(to bottom, var(--card), var(--background)); }",
        ].join("\n"),
        "web/src/plate.tsx": `export const A = () => <div className="skew-x-6 shadow-[0_4px_0_var(--primary)] border-b-4" />;\n`,
      },
      ["kit/local-concept"],
    );
    expect(hits.sort()).toEqual(
      ["kit/local-concept@web/src/plate.css:1", "kit/local-concept@web/src/plate.css:2", "kit/local-concept@web/src/plate.css:3", "kit/local-concept@web/src/plate.css:4", "kit/local-concept@web/src/plate.tsx:1", "kit/local-concept@web/src/plate.tsx:1", "kit/local-concept@web/src/plate.tsx:1"].sort(),
    );
  });
});

describe("arsenal rule (packages/core/arsenal.json)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nk-arsenal-"));
  fs.mkdirSync(path.join(dir, "client"));
  fs.writeFileSync(path.join(dir, "fxmanifest.lua"), "fx_version 'cerulean'\ngame 'gta5'\nshared_script '@nuikit/init.lua'\nclient_script 'client/*.lua'\n");
  fs.writeFileSync(
    path.join(dir, "client/main.lua"),
    [
      "local s = nk.surface.define('shop')",
      "nk.intent.notify({ title = 'ok' })",
      "nk.notify('old')",
      "nk.camera.secret()",
      "NUI._private()",
      "TriggerEvent('nuikit:made:up')",
      "TriggerEvent('nuikit:minimap:placed')",
      "-- 'nuikit:in:a:comment'",
    ].join("\n"),
  );
  const r = checkResource(dir);
  const of = (rule: string) => r.findings.filter((f) => f.rule === rule).map((f) => f.line);
  it("passes published names, warns old names with their replacement", () => {
    expect(of("arsenal/legacy")).toEqual([3]);
    expect(r.findings.find((f) => f.rule === "arsenal/legacy")!.message).toMatch(/nk\.intent\.notify/);
  });
  it("warns private paths and undeclared events (wire names count as declared)", () => {
    expect(of("arsenal/unknown")).toEqual([4, 5, 6]);
    expect(r.findings.filter((f) => f.rule.startsWith("arsenal/")).every((f) => f.severity === "warning")).toBe(true);
  });
});
