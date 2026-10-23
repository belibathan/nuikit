// D5: `nuikit theme new` writes a values-only theme that compiles to the same tokens as the theme it starts from,
// and lists every lever the theme leaves out (from nuikit-core's token tables, never a copied list).
import fs from "node:fs";
import path from "node:path";
import { compileTheme } from "nuikit-core";
import { describe, expect, it } from "vitest";
import { conceptOf, CONCEPTS, levers, problems, rangeOf, renderTheme, shippedThemes, THEMES_DIR } from "../src/theme";

const source = (name: string) => fs.readFileSync(path.join(THEMES_DIR, `${name}.css`), "utf8");
const names = shippedThemes();

describe("shipped themes", () => {
  it("lists the themes in nuikit-core/themes", () => {
    expect(names).toEqual(fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".css")).map((f) => f.slice(0, -4)).sort());
    expect(names).toEqual(expect.arrayContaining(["default", "flat", "graphite", "square"]));
  });
});

describe("theme new, for every shipped theme", () => {
  for (const name of names) {
    it(`${name}: values only, no warnings, and compiles to the same tokens as ${name}`, () => {
      const css = source(name);
      const { text } = renderTheme({ name: "test-theme", from: name, css });
      expect(problems(text)).toEqual([]);
      expect(compileTheme(text).vars).toEqual(compileTheme(css).vars);
    });

    it(`${name}: every lever is set once or commented once`, () => {
      const { text } = renderTheme({ name: "test-theme", from: name, css: source(name) });
      const set = [...text.matchAll(/^\s{4}--([\w-]+):/gm)].map((m) => m[1]!);
      const commented = [...text.matchAll(/\/\* --([\w-]+):/g)].map((m) => m[1]!);
      const catalog = levers().map((t) => t.name);
      expect(new Set(commented).size).toBe(commented.length);
      expect(commented.filter((n) => set.includes(n))).toEqual([]);
      expect([...set, ...commented].filter((n) => catalog.includes(n)).sort()).toEqual([...catalog].sort());
    });
  }
});

describe("the lever catalog", () => {
  it("classifies every lever into a levers.md concept (none left in other)", () => {
    const other = levers().filter((t) => conceptOf(t) === "other").map((t) => t.name);
    expect(other).toEqual([]);
    expect(CONCEPTS.map((c) => c.id)).toEqual(expect.arrayContaining(["geometry", "motion", "type"]));
  });

  it("writes each dimension's range from its description, numbers and keywords from the table", () => {
    const skew = levers().find((t) => t.name === "nk-tile-skew")!;
    expect(rangeOf(skew)).toBe("(-20deg..20deg)");
    const fill = levers().find((t) => t.name === "nk-fill-style")!;
    expect(rangeOf(fill)).toBe("(solid | soft)");
    const dur = levers().find((t) => t.name === "nk-duration")!;
    expect(rangeOf(dur)).toMatch(/^\(/);
  });

  it("names the starting theme in the header", () => {
    const { text } = renderTheme({ name: "x", from: "graphite", css: source("graphite") });
    expect(text.startsWith("/*\n * x: a theme started from graphite")).toBe(true);
    expect(text).toContain("@layer nk.theme {");
  });
});
