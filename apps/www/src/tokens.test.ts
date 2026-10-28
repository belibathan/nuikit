// The site's nuikit token defaults (src/index.css) must be what compileTheme() derives from the stock
// shadcn theme, exactly as scripts/sync-template.mjs writes them into every UI's index.css.
import fs from "node:fs";
import path from "node:path";
import { compileTheme, TOKENS } from "nuikit-core";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../..");
const css = fs.readFileSync(path.resolve(__dirname, "index.css"), "utf8");
const { cssVars } = JSON.parse(fs.readFileSync(path.join(root, "vendor/shadcn/colors/neutral.json"), "utf8"));

/** The variables of every `sel { … }` block in index.css, later blocks winning. */
function block(sel: string) {
  const out: Record<string, string> = {};
  const re = new RegExp(`^${sel.replace(".", "\\.")} \\{([^}]*)\\}`, "gm");
  for (const m of css.matchAll(re)) {
    for (const d of m[1]!.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[d[1]!] = d[2]!.trim();
  }
  return out;
}

describe("site tokens", () => {
  for (const [mode, sel] of [["light", ":root"], ["dark", ".dark"]] as const) {
    it(`${sel} carries the ${mode} nuikit token defaults`, () => {
      const { vars } = compileTheme({ ...cssVars[mode] }, { mode });
      const site = block(sel);
      for (const t of TOKENS) {
        // the game layer the kit's components read before a theme is applied: status, HUD, scrim, vitals
        if (!/^(destructive-foreground|success|success-foreground|warning|warning-foreground|info|info-foreground|hud|hud-foreground|scrim|vital-[a-z]+)$/.test(t.name)) continue;
        const want = t.name === "info" ? "var(--primary)" : t.name === "info-foreground" ? "var(--primary-foreground)" : vars[t.name];
        expect(site[t.name], `--${t.name}`).toBe(want);
      }
    });
  }

  it("exposes every nuikit colour token to Tailwind (bg-scrim/35, text-vital-health…)", () => {
    for (const t of TOKENS) {
      if (!/^(success|warning|info|hud|scrim|vital-[a-z]+)(-foreground)?$/.test(t.name)) continue;
      expect(css, `--color-${t.name}`).toContain(`--color-${t.name}: var(--${t.name});`);
    }
  });
});

describe("in-repo UIs see the registry (scripts/sync-template.mjs)", () => {
  it("every system and addon index.css names registry/nuikit and vendor/shadcn as Tailwind sources", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = path.resolve(__dirname, "../../..");
    let n = 0;
    for (const group of ["systems", "addons"])
      for (const name of fs.readdirSync(path.join(root, group))) {
        const f = path.join(root, group, name, "web/src/index.css");
        if (!fs.existsSync(f)) continue;
        const css = fs.readFileSync(f, "utf8");
        for (const src of ["registry/nuikit/ui", "registry/nuikit/blocks", "vendor/shadcn/ui"]) expect(css, `${group}/${name}`).toContain(`${src}";`);
        n++;
      }
    expect(n).toBeGreaterThan(10);
  });
});

describe("slant lives only in the text styles (packages/core/src/spec/text-styles.ts)", () => {
  it("no component, block, screen or override sets italic or a font-style of its own", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = path.resolve(__dirname, "../../..");
    const dirs = ["registry/nuikit/ui", "registry/nuikit/blocks", ...["systems", "addons"].flatMap((g) => fs.readdirSync(path.join(root, g)).map((n) => `${g}/${n}/web/src`))];
    const hits: string[] = [];
    const walk = (d: string) => {
      if (!fs.existsSync(d)) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f);
        else if (/\.(tsx?|css)$/.test(e.name) && e.name !== "index.css" && !f.endsWith(path.join("lib", "utils.ts"))) {
          const code = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
          for (const m of code.matchAll(/italic|font-style:(?!\s*var\(--nk-type-)[^;]+|\[font-style:(?!var\(--nk-type-)/g)) hits.push(`${path.relative(root, f)}: ${m[0]}`);
        }
      }
    };
    for (const d of dirs) walk(path.join(root, d));
    expect(hits).toEqual([]);
  });
});
