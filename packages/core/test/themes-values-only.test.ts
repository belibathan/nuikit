// Track D4 (docs/roadmap.md, docs/design/levers.md): a shipped theme sets values only. Every packages/core/themes/*.css
// is custom-property declarations inside a mode block (.dark / :root / @theme / @layer nk.theme), plus @import lines.
// A theme that needs a selector means the kit is missing a lever: add the lever (kit.css + tokens.ts), not the rule.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_TOKEN_NAMES, compileTheme } from "../src/tokens";


const dir = path.resolve(__dirname, "../themes");
const files = readdirSync(dir).filter((f) => f.endsWith(".css")).sort();

/** The block preludes a values-only theme may open. */
const MODE_BLOCK = /^(:root|\.dark|\.light|html|@theme\b.*|@layer\s+nk\.theme|@media\s*\(\s*prefers-color-scheme:[^)]*\))$/;

/** What a theme file is made of: its block preludes, its declarations, and anything else (selectors, bare rules). */
export function themeShape(css: string) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const preludes: string[] = [];
  const declarations: string[] = [];
  const imports: string[] = [];
  const stack: string[] = [];
  let seg = "";
  let paren = 0;
  const flush = () => {
    const t = seg.trim();
    seg = "";
    if (!t) return;
    if (/^@import\b/.test(t)) imports.push(t);
    else declarations.push(t);
  };
  for (const ch of src) {
    if (ch === "(") paren++;
    else if (ch === ")") paren = Math.max(0, paren - 1);
    if (paren > 0) {
      seg += ch;
      continue;
    }
    if (ch === "{") {
      const p = seg.trim();
      preludes.push(p);
      stack.push(p);
      seg = "";
    } else if (ch === "}") {
      flush();
      stack.pop();
    } else if (ch === ";") flush();
    else seg += ch;
  }
  flush();
  return { preludes, declarations, imports };
}

describe("themes set values only (D4)", () => {
  it("ships the two flexibility-proof languages beside Default", () => {
    expect(files).toContain("flat.css");
    expect(files).toContain("square.css");
  });

  for (const f of files) {
    const css = readFileSync(path.join(dir, f), "utf8");
    const shape = themeShape(css);

    it(`${f}: only mode blocks, only custom properties, only @import outside them`, () => {
      for (const p of shape.preludes) expect(p, `${f}: block "${p}"`).toMatch(MODE_BLOCK);
      for (const d of shape.declarations) expect(d, `${f}: "${d.slice(0, 60)}"`).toMatch(/^--[\w-]+\s*:/);
      for (const d of shape.declarations) expect(d, `${f}: !important`).not.toMatch(/!important/);
      for (const i of shape.imports) expect(i, `${f}: ${i}`).toMatch(/^@import url\("https:\/\/cfx-nui-nuikit\/theme\/[\w-]+\.css"\)$/);
    });

    it(`${f}: every value is a token the contract knows`, () => {
      const names = shape.declarations.map((d) => /^--([\w-]+)/.exec(d)![1]!);
      const unknown = names.filter((n) => !ALL_TOKEN_NAMES.includes(n) && !KIT_ONLY.has(n));
      expect(unknown, `${f}: not in tokens.ts or the kit.css lever list`).toEqual([]);
    });

    it(`${f}: compiles with no warnings and passes every contrast check`, () => {
      const t = compileTheme(css);
      expect(t.warnings).toEqual([]);
      for (const c of t.contrast) expect(c.ok, `${c.fg} on ${c.bg}`).toBe(true);
    });
  }
});

/**
 * Component tokens a theme may also set: what kit.css declares on :root (docs/tokens.md#component-tokens-11; they pass
 * through the compiler as-is), plus the HUD's documented ring levers (systems/nuikit_hud hud.css). docs/design/levers.md
 * lists them; promoting one to tokens.ts needs nothing here.
 */
const kit = readFileSync(path.resolve(__dirname, "../../create-nuikit/kit.css"), "utf8");
const KIT_ONLY = new Set([...[...kit.matchAll(/^\s*--(nk-[\w-]+)\s*:/gm)].map((m) => m[1]!), "nk-key-plate", "nk-ring-band", "nk-ring-band-opacity", "nk-ring-stroke"]);
