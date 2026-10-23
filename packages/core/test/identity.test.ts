// @vitest-environment jsdom
// Tokens 1.1: the identity tokens (docs/tokens.md#identity-tokens, docs/design/v2.md).
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { contrastRatio, rgbToOklch, toRgba } from "../src/color";
import { __resetTheme, applyTheme, setPrefs } from "../src/theme";
import {
  ALL_TOKEN_NAMES,
  compileTheme,
  DEFAULT_FONT_DISPLAY,
  DEFAULT_FONT_SANS,
  IDENTITY_TOKENS,
  parseDtcg,
  themeJsonSchema,
  toDtcg,
  TOKEN_NAMES,
  TOKENS_REVISION,
  withPrefs,
} from "../src/tokens";

const root = path.resolve(__dirname, "../../..") + "/";
const read = (p: string) => readFileSync(root + p, "utf8");
const IDENTITIES = ["default", "neon-pop", "graphite", "signal", "velvet", "vector", "arcade", "street", "studio"] as const;
// Neon Pop is Default's structure with a palette, so it is left out of the structural-distinctness check.
const STRUCTURES = IDENTITIES.filter((n) => n !== "neon-pop");
const identity = (n: (typeof IDENTITIES)[number]) => read(`packages/core/themes/${n}.css`);
const GRAPHITE = {
  "nk-type-ratio": "1.2",
  "nk-weight-body": "400",
  "nk-weight-strong": "600",
  "nk-weight-display": "700",
  "nk-tracking-display": "-0.02em",
  "nk-label-case": "uppercase",
  "nk-tracking-label": "0.06em",
  "nk-border-width": "1px",
  "nk-cut": "0px",
  "nk-surface-opacity": "0.96",
  "nk-surface-tint": "0.02",
  "nk-surface-gradient": "0",
  "nk-surface-edge": "0.06",
  "nk-elevation": "soft",
  "nk-glow": "0",
  "nk-density": "0.875",
  "nk-ease": "cubic-bezier(0.2, 0.8, 0.2, 1)",
  "nk-duration": "140ms",
  "nk-hud-opacity": "0.55",
  "nk-hud-text-shadow": "soft",
  "nk-gauge-style": "arc",
  "nk-gauge-track": "0.25rem",
  "nk-gauge-ticks": "1",
  "nk-row-indicator": "bar",
};

afterEach(() => __resetTheme());

describe("tokens 1.1", () => {
  it("is additive: the v1 names are unchanged and come first", () => {
    expect(TOKENS_REVISION).toBe("1.6");
    expect(ALL_TOKEN_NAMES.slice(0, TOKEN_NAMES.length)).toEqual([...TOKEN_NAMES]);
    for (const t of IDENTITY_TOKENS) expect(TOKEN_NAMES, t.name).not.toContain(t.name);
  });

  it("the schema describes identity tokens but doesn't require them (themes compiled by nuikit ≤ 0.6 stay valid)", () => {
    const schema = themeJsonSchema() as any;
    expect(schema.properties.vars.required).toEqual([...TOKEN_NAMES]);
    for (const t of IDENTITY_TOKENS) expect(schema.properties.vars.properties[t.name], t.name).toBeTruthy();
    expect(schema.properties.vars.properties["nk-elevation"].enum).toEqual(["none", "soft", "deep", "hard"]);
  });
});

describe("a plain TweakCN paste is Graphite", () => {
  const t = compileTheme(`.dark { --primary: oklch(0.6 0.2 150); --radius: 0.5rem; }`);

  it("fills every identity token with the Graphite default", () => {
    for (const [k, v] of Object.entries(GRAPHITE)) expect(t.vars[k], k).toBe(v);
    expect(t.vars["font-sans"]).toBe(DEFAULT_FONT_SANS);
    expect(t.vars["font-display"]).toBe(DEFAULT_FONT_DISPLAY);
    expect(t.vars["font-numeric"]).toBe(DEFAULT_FONT_SANS);
    expect(t.revision).toBe("1.6");
  });

  it("brand is the primary when it has colour, else chart-1", () => {
    expect(t.vars.brand).toBe(t.vars.primary);
    const grey = compileTheme(`.dark { --primary: oklch(0.9 0 0); --chart-1: oklch(0.7 0.18 250); }`);
    expect(grey.vars.brand).toBe(grey.vars["chart-1"]);
    expect(contrastRatio(toRgba(t.vars["brand-foreground"]!)!, toRgba(t.vars.brand!)!)).toBeGreaterThanOrEqual(4.5);
  });

  it("derives what CSS can't branch on: shadows, clip, row flags", () => {
    expect(t.vars["nk-elevation-shadow"]).toBe("0 0 0 1px rgba(0, 0, 0, 0.25), 0 12px 32px -16px rgba(0, 0, 0, 0.6)");
    expect(t.vars["nk-hud-shadow"]).toBe("0 1px 2px rgba(0, 0, 0, 0.6)");
    expect(t.vars["nk-clip"]).toBe("none");
    expect([t.vars["nk-row-bar"], t.vars["nk-row-fill"], t.vars["nk-row-outline"]]).toEqual(["1", "0", "0"]);
  });

  it("tints the surface toward the brand by nk-surface-tint", () => {
    const flat = compileTheme(`.dark { --primary: oklch(0.6 0.2 150); --nk-surface-tint: 0; }`);
    expect(flat.vars.surface).toBe(flat.vars.popover);
    expect(t.vars.surface).not.toBe(t.vars.popover);
  });

  it("display and number fonts follow a theme's own body font", () => {
    const outfit = compileTheme(`.dark { --font-sans: Outfit, sans-serif; }`);
    expect(outfit.vars["font-display"]).toBe("Outfit, sans-serif");
    expect(outfit.vars["font-numeric"]).toBe("Outfit, sans-serif");
  });
});

describe("validation and floors", () => {
  it("normalises valid values", () => {
    const t = compileTheme(`.dark { --nk-cut: 0; --nk-duration: .2s; --nk-ease: ease-out; --nk-density: 0.900; }`);
    expect(t.vars["nk-cut"]).toBe("0px");
    expect(t.vars["nk-duration"]).toBe("200ms");
    expect(t.vars["nk-ease"]).toBe("cubic-bezier(0, 0, 0.58, 1)");
    expect(t.vars["nk-density"]).toBe("0.9");
  });

  it("replaces invalid values with the default, saying what's allowed", () => {
    const t = compileTheme(`.dark { --nk-elevation: huge; --nk-density: 3; --nk-cut: big; --nk-ease: linear(0, 1); }`);
    expect(t.vars["nk-elevation"]).toBe("soft");
    expect(t.vars["nk-density"]).toBe("0.875");
    expect(t.vars["nk-cut"]).toBe("0px");
    expect(t.vars["nk-ease"]).toBe("cubic-bezier(0.2, 0.8, 0.2, 1)");
    expect(t.warnings.join("\n")).toMatch(/--nk-elevation must be none, soft, deep, hard \(got huge\)/);
    expect(t.warnings.join("\n")).toMatch(/--nk-density must be a number from 0.75 to 1.3/);
    expect(t.warnings.join("\n")).toMatch(/--nk-ease must be cubic-bezier/);
  });

  it("warns when panels go below the 0.92 opacity floor", () => {
    const t = compileTheme(`.dark { --nk-surface-opacity: 0.8; }`);
    expect(t.vars["nk-surface-opacity"]).toBe("0.8");
    expect(t.warnings.some((w) => /nk-surface-opacity is 0.8 \(floor 0.92\)/.test(w))).toBe(true);
  });

  it("warns when text on the game is set dark or too close to a mid-grey frame", () => {
    const dark = compileTheme(`.dark { --world-foreground: oklch(0.3 0.02 260); }`);
    expect(dark.warnings.join("\n")).toMatch(/--world-foreground is darker than a mid-grey frame/);
    expect(dark.vars["hud-foreground"]).toBe(dark.vars["world-foreground"]);
    const grey = compileTheme(`.dark { --world-foreground: #b0b0b0; }`);
    expect(grey.warnings.join("\n")).toMatch(/--world-foreground is 1\.\d:1 against a mid-grey frame \(needs 3:1\)/);
    const cream = compileTheme(`.dark { --world-foreground: #fff8e8; }`);
    expect(cream.warnings.join("\n")).not.toMatch(/world-foreground/);
    expect(cream.vars["world-foreground-muted"]).toBe("rgba(255, 248, 232, 0.8)");
  });

  it("warns when HUD text won't read over a white sky", () => {
    const t = compileTheme(`.dark { --hud: rgba(0, 0, 0, 0.2); --nk-hud-opacity: 0.3; }`);
    expect(t.warnings.some((w) => /HUD backplate over a white sky/.test(w))).toBe(true);
    const ok = compileTheme(`.dark { --nk-hud-opacity: 0.6; }`);
    expect(ok.warnings.some((w) => /white sky/.test(w))).toBe(false);
  });

  it("cut corners get a clip-path; no cut, none (a clip-path would also clip the shadow)", () => {
    const t = compileTheme(`.dark { --nk-cut: 0.5rem; }`);
    expect(t.vars["nk-clip"]).toMatch(/^polygon\(var\(--nk-cut\) 0, 100% 0/);
    expect(t.vars["nk-clip-sm"]).toMatch(/calc\(var\(--nk-cut\) \/ 2\)/);
  });

  it("high contrast (player pref) makes panels and the HUD plate opaque", () => {
    const t = compileTheme(`.dark { --nk-surface-opacity: 0.94; }`);
    const v = withPrefs(t.vars, { highContrast: true });
    expect(v["nk-surface-opacity"]).toBe("1");
    expect(v["nk-hud-opacity"]).toBe("0.72");
  });
});

describe("the identities", () => {
  for (const n of IDENTITIES) {
    it(`${n} compiles with no warnings and passes every contrast check`, () => {
      const t = compileTheme(identity(n));
      expect(t.warnings).toEqual([]);
      for (const c of t.contrast) expect(c.ok, `${c.fg} on ${c.bg}`).toBe(true);
    });
  }

  const sig = (n: (typeof IDENTITIES)[number]) => {
    const v = compileTheme(identity(n)).vars;
    return [v["font-display"], v["nk-row-indicator"], v["nk-elevation"], v["nk-cut"], v["nk-gauge-style"], v.radius].join("|");
  };

  it("are distinct in more than colour", () => {
    expect(new Set(STRUCTURES.map(sig)).size).toBe(STRUCTURES.length);
  });

  it("Neon Pop is Default's structure with another palette", () => {
    expect(sig("neon-pop")).toBe(sig("default"));
    const [d, n] = [compileTheme(identity("default")).vars, compileTheme(identity("neon-pop")).vars];
    expect(n["nk-treatment"]).toBe("tile");
    expect(n.brand).not.toBe(d.brand);
    expect(n["role-health"]).not.toBe(d["role-health"]);
  });

  it("Graphite is exactly the default: stock neutral plus every identity default", () => {
    const g = compileTheme(identity("graphite"));
    // the kit default (stock neutral, every identity default), not a server's local nuikit/theme.css
    const stock = compileTheme("");
    expect(g.vars).toEqual(stock.vars);
  });

  it("round-trip through DTCG", () => {
    for (const n of IDENTITIES) {
      const t = compileTheme(identity(n));
      expect(compileTheme(toDtcg(t)).vars, n).toEqual(t.vars);
    }
    const doc = toDtcg(compileTheme(identity("signal"))) as any;
    expect(doc.nk.cut).toMatchObject({ $type: "dimension", $value: { value: 0.75, unit: "rem" } });
    expect(doc.nk.ease).toMatchObject({ $type: "cubicBezier", $value: [0.3, 0, 0, 1] });
    expect(doc.nk.duration).toMatchObject({ $type: "duration", $value: { value: 120, unit: "ms" } });
    expect(doc.nk["row-indicator"].$value).toBe("fill");
    expect(parseDtcg(doc)["nk-row-indicator"]).toBe("fill");
  });

  it("round-trip keeps a derived token the theme set and the treatment's unresolved values", () => {
    const t = compileTheme(identity("default"));
    const back = compileTheme(toDtcg(t)).vars;
    expect(back["nk-ease-expand"]).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
    expect(back["nk-ease-breathe"]).toBe("cubic-bezier(0.45, 0, 0.55, 1)");
    expect(back["nk-type-scan-family"]).toBe("var(--font-display)");
    // a token left to its derivation stays out of the file
    expect((toDtcg(compileTheme(identity("graphite"))) as any).nk?.["ease-expand"]).toBeUndefined();
  });
});

describe("applyTheme and identity keywords", () => {
  it("paints keywords CSS can't branch on as attributes", () => {
    applyTheme(identity("signal"));
    const html = document.documentElement;
    expect(html.getAttribute("data-nk-row")).toBe("fill");
    expect(html.getAttribute("data-nk-gauge")).toBe("bar");
    expect(html.getAttribute("data-nk-label-case")).toBe("uppercase");
    expect(html.style.getPropertyValue("--nk-cut")).toBe("0.75rem");
    expect(html.style.getPropertyValue("--brand-rgb")).toMatch(/^\d+, \d+, \d+$/);
  });

  it("a patch re-derives what depends on it", () => {
    applyTheme(identity("graphite"));
    applyTheme({ "nk-elevation": "deep", "nk-cut": "0.25rem" });
    const s = document.documentElement.style;
    expect(s.getPropertyValue("--nk-elevation-shadow")).toMatch(/0 44px 96px/);
    expect(s.getPropertyValue("--nk-clip")).toMatch(/^polygon/);
    expect(document.documentElement.getAttribute("data-nk-elevation")).toBe("deep");
  });

  it("reduced motion still zeroes every duration through --nk-motion", () => {
    applyTheme(identity("velvet"));
    setPrefs({ reducedMotion: true });
    expect(document.documentElement.style.getPropertyValue("--nk-motion")).toBe("0");
    expect(document.documentElement.style.getPropertyValue("--nk-duration")).toBe("240ms");
  });
});

// docs/tokens.md#flexibility: tokens encode qualities, never one look. One theme.css (test/themes/daylight.css)
// turns the compact, dark Graphite baseline into something light, roomy and round, with no kit code changes.
describe("flexibility", () => {
  const kit = read("packages/create-nuikit/kit.css");
  const daylight = compileTheme(read("packages/core/test/themes/daylight.css"), { mode: "light" });
  const graphite = compileTheme(identity("graphite"));

  it("one theme.css moves every quality away from Graphite, with no warnings", () => {
    expect(daylight.warnings).toEqual([]);
    expect(daylight.mode).toBe("light");
    const qualities = [
      "background", // light
      "nk-density", // roomy
      "radius", // round
      "nk-elevation",
      "nk-surface-edge",
      "nk-label-case",
      "nk-type-ratio",
      "nk-weight-strong",
      "font-sans",
      "nk-duration",
      "nk-ease",
      "nk-gauge-style",
      "nk-gauge-track",
      "nk-row-indicator",
    ];
    for (const k of qualities) expect(daylight.vars[k], k).not.toBe(graphite.vars[k]);
    // component tokens a theme sets pass through (the detail tier; references to theme vars resolved)
    expect(daylight.vars["nk-chip-radius"]).toBe("9999px");
    expect(daylight.vars["nk-panel-radius"]).toBe("calc(1.25rem + 0.25rem)");
  });

  it("text on the game stays light in a light theme: world-foreground, and hud-foreground with it", () => {
    expect(daylight.vars["world-foreground"]).toBe("rgb(255, 255, 255)");
    expect(daylight.vars["world-foreground-muted"]).toBe("rgba(255, 255, 255, 0.8)");
    expect(daylight.vars["world-shadow"]).toMatch(/^0 1px 2px rgba\(0, 0, 0/);
    expect(daylight.vars["hud-foreground"]).toBe(daylight.vars["world-foreground"]);
    expect(daylight.vars.foreground).not.toBe(daylight.vars["world-foreground"]); // the theme's own text is dark
  });

  it("gains and losses on the game read on the HUD plate in a light theme: world-success, world-destructive", () => {
    const light = compileTheme({ success: "rgb(22, 101, 52)", destructive: "rgb(153, 27, 27)" }, { mode: "light" });
    for (const [world, status] of [["world-success", "success"], ["world-destructive", "destructive"]] as const) {
      const w = rgbToOklch(toRgba(light.vars[world]!)!);
      const s = rgbToOklch(toRgba(light.vars[status]!)!);
      expect(w.l, world).toBeGreaterThanOrEqual(0.69);
      expect(Math.abs(w.h - s.h), world).toBeLessThan(3); // same hue
    }
    expect(compileTheme({ "world-success": "rgb(0, 255, 0)" }).vars["world-success"]).toBe("rgb(0, 255, 0)");
    expect(kit).toContain("--nk-slab-delta-up: var(--world-success, var(--success));");
  });

  it("the kit wires it: nk-on-game re-scopes foreground to the world, panels inside restore the theme", () => {
    const util = kit.slice(kit.indexOf("@utility nk-on-game"));
    expect(util).toMatch(/--foreground: var\(--world-foreground\)/);
    expect(util).toMatch(/--foreground-rgb: var\(--world-foreground-rgb\)/);
    expect(util).toMatch(/text-shadow: var\(--world-shadow\)/);
    expect(util).toMatch(/& \.nk-panel \{\s*--foreground: var\(--popover-foreground\)/);
    for (const s of ["nuikit_death", "nuikit_hud"]) expect(JSON.parse(read(`systems/${s}/nuikit.json`)).surface, s).toBe("world");
    expect(read("systems/nuikit_death/web/src/index.css")).toMatch(/body \{\s*@apply nk-on-game;/);
  });

  it("the kit reads identity tokens only through var(), each with the Graphite default as its fallback", () => {
    let checked = 0;
    for (const [, name, fallback] of kit.matchAll(/var\(--(nk-[a-z-]+), ([^()]+?)\)/g)) {
      const spec = IDENTITY_TOKENS.find((t) => t.name === name && t.group !== "derived");
      if (!spec) continue;
      expect(fallback!.trim(), `--${name} fallback`).toBe(graphite.vars[name!]);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });
});

// kit.css variants: a subtree with [data-nk-density] / [data-nk-shape] re-declares every component token
// whose formula reaches --nk-density / --radius, or it would keep the value resolved at :root.
describe("kit variants re-derive what depends on density and radius", () => {
  const kit = read("packages/create-nuikit/kit.css");
  const at = kit.indexOf(":root,\n[data-nk-theme] {");
  const root = kit.slice(at, kit.indexOf("\n}\n", at));

  it("a themed subtree re-declares the component tokens ([data-nk-theme] on the :root block)", () => {
    expect(at).toBeGreaterThan(0);
  });
  const decls = [...root.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map((m) => [m[1]!, m[2]!] as const);
  const reaching = (seed: string) => {
    const set = new Set([seed]);
    for (let changed = true; changed; ) {
      changed = false;
      for (const [n, v] of decls)
        if (!set.has(n) && [...set].some((x) => v.includes(`var(${x})`) || v.includes(`var(${x},`))) (set.add(n), (changed = true));
    }
    set.delete(seed);
    return [...set];
  };
  const block = (selector: string) => {
    const at = kit.indexOf(`\n${selector} {`);
    return at < 0 ? "" : kit.slice(at, kit.indexOf("\n}", at + 1));
  };

  it.each([
    ["[data-nk-density]", "--nk-density"],
    ["[data-nk-shape]", "--radius"],
  ])("%s declares every token that depends on %s", (selector, seed) => {
    const body = block(selector);
    const missing = reaching(seed).filter((n) => !body.includes(`${n}:`));
    expect(missing).toEqual([]);
  });
});
