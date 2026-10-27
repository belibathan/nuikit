// @vitest-environment jsdom
// The identity tier and the shipped themes: the language's defaults are the premium baseline, and Default,
// Neon Pop are value diffs on top of it; Flat and Square (test/fixtures/themes) prove other languages come from values alone.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { contrastRatio, rgbToOklch, toRgba } from "../src/color";
import { __resetTheme, applyTheme, setPrefs } from "../src/theme";
import { compileTheme, DEFAULT_FONT_DISPLAY, DEFAULT_FONT_SANS, IDENTITY_TOKENS, parseDtcg, themeJsonSchema, toDtcg, TOKEN_NAMES, TOKENS_REVISION, withPrefs } from "../src/tokens";

const root = path.resolve(__dirname, "../../..") + "/";
const read = (p: string) => readFileSync(root + p, "utf8");
const SHIPPED = ["default", "neon-pop"] as const;
const FIXTURES = ["flat", "square"] as const;
const THEMES = [...SHIPPED, ...FIXTURES] as const;
const theme = (n: (typeof THEMES)[number]) => read((SHIPPED as readonly string[]).includes(n) ? `packages/core/themes/${n}.css` : `packages/core/test/fixtures/themes/${n}.css`);

afterEach(() => __resetTheme());

describe("the baseline (compileTheme with no theme)", () => {
  const t = compileTheme(`.dark { --primary: oklch(0.6 0.2 150); }`);

  it("is the premium baseline: keycaps slanted on hard plates, two voices in caps, solid fills, the 180ms ladder", () => {
    expect(TOKENS_REVISION).toBe("2.0");
    expect(t.vars["nk-shape-skew"]).toBe("-12deg");
    expect(t.vars["nk-surface-elevation"]).toBe("hard");
    expect(t.vars["nk-type-case"]).toBe("uppercase");
    expect(t.vars["nk-type-slant"]).toBe("italic");
    expect(t.vars["nk-style-fill"]).toBe("solid");
    expect(t.vars["nk-style-level"]).toBe("liquid");
    expect(t.vars["nk-motion-duration"]).toBe("180ms");
    expect(t.vars["nk-time-slow"]).toBe("280ms");
    expect(t.vars["font-sans"]).toBe(DEFAULT_FONT_SANS);
    expect(t.vars["font-display"]).toBe(DEFAULT_FONT_DISPLAY);
  });

  it("the schema describes identity levers but requires only the palette", () => {
    const schema = themeJsonSchema() as any;
    expect(schema.properties.vars.required).toEqual([...TOKEN_NAMES]);
    for (const l of IDENTITY_TOKENS) expect(schema.properties.vars.properties[l.name], l.name).toBeTruthy();
    expect(schema.properties.vars.properties["nk-surface-elevation"].enum).toEqual(["none", "soft", "deep", "hard"]);
  });

  it("brand is the primary when it has colour, else chart-1", () => {
    expect(t.vars.brand).toBe(t.vars.primary);
    const grey = compileTheme(`.dark { --primary: oklch(0.9 0 0); --chart-1: oklch(0.7 0.18 250); }`);
    expect(grey.vars.brand).toBe(grey.vars["chart-1"]);
    expect(contrastRatio(toRgba(t.vars["brand-foreground"]!)!, toRgba(t.vars.brand!)!)).toBeGreaterThanOrEqual(4.5);
  });

  it("derives what CSS can't branch on: shadows and clips", () => {
    expect(t.vars["nk-depth-elevation"]).toBe("0 0.25rem 0 0 rgba(0, 0, 0, 0.5)");
    expect(t.vars["nk-depth-text"]).toBe("0 1px 2px rgba(0, 0, 0, 0.6)");
    expect(t.vars["nk-line-clip"]).toBe("none");
  });

  it("display and number faces follow a theme's own body face", () => {
    const outfit = compileTheme(`.dark { --font-sans: Outfit, sans-serif; }`);
    expect(outfit.vars["font-display"]).toBe("Outfit, sans-serif");
    expect(outfit.vars["font-numeric"]).toBe("Outfit, sans-serif");
  });
});

describe("validation and floors", () => {
  it("normalises valid values", () => {
    const t = compileTheme(`.dark { --nk-shape-cut: 0; --nk-motion-duration: .2s; --nk-motion-ease: ease-out; --nk-density: 0.900; --nk-shape-skew: 0; }`);
    expect(t.vars["nk-shape-cut"]).toBe("0px");
    expect(t.vars["nk-motion-duration"]).toBe("200ms");
    expect(t.vars["nk-motion-ease"]).toBe("cubic-bezier(0, 0, 0.58, 1)");
    expect(t.vars["nk-density"]).toBe("0.9");
    expect(t.vars["nk-shape-skew"]).toBe("0deg");
  });

  it("replaces invalid values with the default, saying what's allowed", () => {
    const t = compileTheme(`.dark { --nk-surface-elevation: huge; --nk-density: 3; --nk-shape-skew: 40deg; --nk-motion-ease: linear(0, 1); }`);
    expect(t.vars["nk-surface-elevation"]).toBe("hard");
    expect(t.vars["nk-density"]).toBe("1");
    expect(t.vars["nk-shape-skew"]).toBe("-12deg");
    expect(t.vars["nk-motion-ease"]).toBe("cubic-bezier(0.2, 0, 0, 1)");
    const w = t.warnings.join("\n");
    expect(w).toMatch(/--nk-surface-elevation must be none, soft, deep, hard \(got huge\)/);
    expect(w).toMatch(/--nk-density must be a number from 0.75 to 1.3/);
    expect(w).toMatch(/--nk-motion-ease must be cubic-bezier/);
  });

  it("validates component levers a theme sets, and drops an invalid one back to the kit default", () => {
    const t = compileTheme(`.dark { --nk-tile-wall-shade: 3; --nk-tile-key-inset: 0.5rem; }`);
    expect(t.vars["nk-tile-wall-shade"]).toBeUndefined();
    expect(t.vars["nk-tile-key-inset"]).toBe("0.5rem");
    expect(t.warnings.join("\n")).toMatch(/--nk-tile-wall-shade must be a number from 0 to 1/);
  });

  it("warns when menus go below the 0.92 opacity floor", () => {
    const t = compileTheme(`.dark { --nk-material-menu-opacity: 0.8; }`);
    expect(t.warnings.some((w) => /nk-material-menu-opacity is 0.8 \(floor 0.92\)/.test(w))).toBe(true);
  });

  it("warns when text on the game is set dark or too close to a mid-grey frame", () => {
    const dark = compileTheme(`.dark { --world-foreground: oklch(0.3 0.02 260); }`);
    expect(dark.warnings.join("\n")).toMatch(/--world-foreground is darker than a mid-grey frame/);
    const cream = compileTheme(`.dark { --world-foreground: #fff8e8; }`);
    expect(cream.warnings.join("\n")).not.toMatch(/world-foreground/);
    expect(cream.vars["world-foreground-muted"]).toBe("rgba(255, 248, 232, 0.8)");
  });

  it("warns when HUD text won't read over a white sky", () => {
    expect(compileTheme(`.dark { --hud: rgba(0, 0, 0, 0.2); --nk-material-hud-opacity: 0.3; }`).warnings.some((w) => /white sky/.test(w))).toBe(true);
    expect(compileTheme(`.dark { --nk-material-hud-opacity: 0.6; }`).warnings.some((w) => /white sky/.test(w))).toBe(false);
  });

  it("cut corners get a clip-path", () => {
    const t = compileTheme(`.dark { --nk-shape-cut: 0.5rem; }`);
    expect(t.vars["nk-line-clip"]).toMatch(/^polygon\(var\(--nk-shape-cut\) 0, 100% 0/);
    expect(t.vars["nk-line-clip-sm"]).toMatch(/calc\(var\(--nk-shape-cut\) \/ 2\)/);
  });

  it("high contrast (player pref) makes menus and the HUD plate opaque", () => {
    const v = withPrefs(compileTheme("").vars, { highContrast: true });
    expect(v["nk-material-menu-opacity"]).toBe("1");
    expect(v["nk-material-hud-opacity"]).toBe("0.72");
  });
});

describe("the shipped themes", () => {
  for (const n of THEMES) {
    it(`${n} compiles with no warnings, sets only known levers, and passes every contrast check`, () => {
      const t = compileTheme(theme(n));
      expect(t.warnings).toEqual([]);
      for (const c of t.contrast) expect(c.ok, `${c.fg} on ${c.bg}`).toBe(true);
      const known = new Set(Object.keys(compileTheme("").vars).concat(IDENTITY_TOKENS.map((l) => l.name)));
      for (const [, name] of theme(n).matchAll(/^\s*--([\w-]+):/gm)) expect(known.has(name!) || name!.startsWith("nk-") || name!.startsWith("role-"), name).toBe(true);
    });
  }

  it("are value diffs on the baseline: Default sets a palette and a handful of tunes", () => {
    const levers = [...theme("default").matchAll(/^\s*--(nk-[\w-]+):/gm)].map((m) => m[1]);
    expect(levers.length).toBeLessThanOrEqual(12);
  });

  it("Neon Pop is Default's structure with another palette", () => {
    const [d, n] = [compileTheme(theme("default")).vars, compileTheme(theme("neon-pop")).vars];
    for (const k of ["nk-shape-skew", "nk-surface-elevation", "nk-type-case", "nk-style-fill", "font-display", "radius"]) expect(n[k], k).toBe(d[k]);
    expect(n.brand).not.toBe(d.brand);
    expect(n["role-health"]).not.toBe(d["role-health"]);
  });

  it("Flat and Square are other languages from values alone", () => {
    const f = compileTheme(theme("flat")).vars;
    const s = compileTheme(theme("square")).vars;
    expect([f["nk-shape-skew"], f["nk-style-fill"], f["nk-type-case"], f["nk-surface-elevation"]]).toEqual(["0deg", "soft", "none", "none"]);
    expect([s["nk-shape-skew"], s["nk-motion-feel"], s.radius]).toEqual(["0deg", "snap", "0rem"]);
  });

  it("round-trip through DTCG", () => {
    for (const n of THEMES) {
      const t = compileTheme(theme(n));
      expect(compileTheme(toDtcg(t)).vars, n).toEqual(t.vars);
    }
    const doc = toDtcg(compileTheme(theme("square"))) as any;
    expect(doc.nk["motion-duration"]).toMatchObject({ $type: "duration", $value: { value: 100, unit: "ms" } });
    expect(parseDtcg(doc)["nk-motion-feel"]).toBe("snap");
  });
});

describe("applyTheme and identity keywords", () => {
  it("paints keywords CSS can't branch on as data-nk-* attributes", () => {
    applyTheme(theme("flat"));
    const html = document.documentElement;
    expect(html.getAttribute("data-nk-fill")).toBe("soft");
    expect(html.getAttribute("data-nk-gauge")).toBe("bar");
    expect(html.getAttribute("data-nk-case")).toBe("none");
    expect(html.style.getPropertyValue("--brand-rgb")).toMatch(/^\d+, \d+, \d+$/);
  });

  it("a patch re-derives what depends on it", () => {
    applyTheme(theme("default"));
    applyTheme({ "nk-surface-elevation": "deep", "nk-shape-cut": "0.25rem" });
    const s = document.documentElement.style;
    expect(s.getPropertyValue("--nk-depth-elevation")).toMatch(/0 44px 96px/);
    expect(s.getPropertyValue("--nk-line-clip")).toMatch(/^polygon/);
    expect(document.documentElement.getAttribute("data-nk-elevation")).toBe("deep");
  });

  it("reduced motion zeroes --nk-motion and keeps the identity's duration", () => {
    applyTheme(theme("flat"));
    setPrefs({ reducedMotion: true });
    expect(document.documentElement.style.getPropertyValue("--nk-motion")).toBe("0");
    expect(document.documentElement.style.getPropertyValue("--nk-motion-duration")).toBe("160ms");
  });
});

describe("text on the game", () => {
  it("stays light in a light theme; gains and losses read on the HUD plate", () => {
    const light = compileTheme({ success: "rgb(22, 101, 52)", destructive: "rgb(153, 27, 27)" }, { mode: "light" });
    expect(light.vars["world-foreground"]).toBe("rgb(255, 255, 255)");
    expect(light.vars["hud-foreground"]).toBe(light.vars["world-foreground"]);
    for (const [world, status] of [["world-success", "success"], ["world-destructive", "destructive"]] as const) {
      const w = rgbToOklch(toRgba(light.vars[world]!)!);
      const s = rgbToOklch(toRgba(light.vars[status]!)!);
      expect(w.l, world).toBeGreaterThanOrEqual(0.69);
      expect(Math.abs(w.h - s.h), world).toBeLessThan(3);
    }
  });

  it("the kit wires it: nk-on-game re-scopes foreground to the world, panels inside restore the theme", () => {
    const kit = read("packages/create-nuikit/kit.css");
    const util = kit.slice(kit.indexOf("@utility nk-on-game"));
    expect(util).toMatch(/--foreground: var\(--world-foreground\)/);
    expect(util).toMatch(/& \.nk-panel \{\s*--foreground: var\(--popover-foreground\)/);
    expect(util).toMatch(/--muted-foreground: var\(--nk-restore-muted-foreground\)/);
  });
});

describe("kit variants re-derive what depends on density and radius", () => {
  const kit = read("packages/create-nuikit/kit.css");
  const gen = kit.slice(kit.indexOf("@generated levers"), kit.indexOf("@end generated levers"));
  const rootBlock = gen.slice(gen.indexOf(":root,"), gen.indexOf("\n  }\n"));
  const decls = [...rootBlock.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1]!, m[2]!] as const);
  const reaching = (seed: string) => {
    const set = new Set([seed]);
    for (let changed = true; changed; ) {
      changed = false;
      for (const [n, v] of decls) if (!set.has(n) && [...set].some((x) => v.includes(`var(${x})`) || v.includes(`var(${x},`))) (set.add(n), (changed = true));
    }
    set.delete(seed);
    return [...set];
  };
  const block = (selector: string) => {
    const at = gen.indexOf(`  ${selector} {`);
    return at < 0 ? "" : gen.slice(at, gen.indexOf("\n  }", at + 1));
  };
  it.each([
    ["[data-nk-density]", "--nk-density"],
    ["[data-nk-shape]", "--radius"],
  ])("%s declares every lever that depends on %s", (selector, seed) => {
    const body = block(selector);
    expect(body.length).toBeGreaterThan(0);
    expect(reaching(seed).filter((n) => !body.includes(`${n}:`))).toEqual([]);
  });
});
