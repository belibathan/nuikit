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
