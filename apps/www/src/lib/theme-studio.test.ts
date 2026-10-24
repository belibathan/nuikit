import { compileTheme } from "nuikit-core";
import { describe, expect, it } from "vitest";
import { identities, themes } from "@/themes";
import { exportThemeCss, fontChoice, identityValue, IDENTITY, studioTheme, toHex, withAlpha } from "./theme-studio";

/** Warnings about contrast and about the paste itself, minus wording that depends on the input form. */
const roundTrip = (css: string) => {
  const first = studioTheme(css);
  const again = compileTheme(exportThemeCss(first), { mode: "dark" });
  return { first, again };
};

describe("theme studio: the paste", () => {
  it("reads a full TweakCN export without a warning about the paste", () => {
    const { warnings, mode } = studioTheme(themes[0]!.css);
    expect(mode).toBe("dark");
    expect(warnings).toEqual([]);
  });

  it("reads every preset in dark mode, naming any token a preset leaves out", () => {
    for (const t of themes) {
      const { warnings, mode } = studioTheme(t.css);
      expect(mode, t.name).toBe("dark");
      expect(warnings.filter((w) => !/:1 \(needs/.test(w) && !w.includes("doesn't set")), t.name).toEqual([]);
    }
  });

  it("drops empty values (a cut-off paste) instead of compiling an empty token", () => {
    const t = studioTheme(".dark { --primary: ; --ring: #ff0000 } .dark { --accent:");
    expect(t.vars.primary).toBe("rgb(229, 229, 229)");
    expect(t.vars.accent).toBe("rgb(38, 38, 38)");
    expect(t.vars.ring).toBe("rgb(255, 0, 0)");
    expect(t.warnings[0]).toBe("--primary, --accent have no value; the stock value is used.");
  });

  it("fills a partial paste from stock and says which tokens it took", () => {
    const { vars, warnings } = studioTheme(".dark { --primary: oklch(0.72 0.17 295); --radius: 1rem; }");
    expect(vars.primary).toMatch(/^rgb\(/);
    expect(vars.radius).toBe("1rem");
    expect(vars.background).toBe("rgb(10, 10, 10)"); // stock neutral dark
    expect(warnings.some((w) => w.includes("doesn't set") && w.includes("--background"))).toBe(true);
  });

  it("survives garbage: stock theme, and a warning saying so", () => {
    for (const junk of ["", "hello world", "{ not json", ".dark { --primary: ", "<script>alert(1)</script>"]) {
      const t = studioTheme(junk);
      expect(t.vars.primary, JSON.stringify(junk)).toBe("rgb(229, 229, 229)");
      expect(t.warnings.length, JSON.stringify(junk)).toBeGreaterThan(0);
    }
  });

  it("warns when a paste only has light colours, and on values the game can't read", () => {
    expect(studioTheme(":root { --primary: #2563eb; }").warnings.some((w) => w.includes("no dark colours"))).toBe(true);
    expect(studioTheme(".dark { --primary: color-mix(in oklab, red 50%, blue); }").warnings.some((w) => w.includes("color-mix()"))).toBe(true);
  });
});

describe("theme studio: tweaks", () => {
  it("puts a tweak on top of the paste and re-checks contrast", () => {
    const t = studioTheme(themes[0]!.css, { primary: "#111111", "primary-foreground": "#151515" });
    expect(t.vars.primary).toBe("rgb(17, 17, 17)");
    expect(t.warnings.some((w) => w.startsWith("primary-foreground on primary"))).toBe(true);
  });

  it("keeps a token's alpha when its colour is picked", () => {
    expect(withAlpha("#ff0000", "rgba(0, 0, 0, 0.45)")).toBe("rgba(255, 0, 0, 0.45)");
    expect(withAlpha("#ff0000", "rgb(0, 0, 0)")).toBe("#ff0000");
    expect(toHex("rgb(229, 229, 229)")).toBe("#e5e5e5");
    expect(toHex(undefined)).toBe("#000000");
  });
});

describe("theme studio: identities (tokens 1.2)", () => {
  it("reads every identity (all of packages/core/themes) with no warnings, each a different identity", () => {
    expect(identities.map((t) => t.name).slice(0, 9)).toEqual(["Default", "Neon Pop", "Graphite", "Signal", "Velvet", "Vector", "Arcade", "Street", "Studio"]);
    const seen = new Set<string>();
    for (const t of identities) {
      const theme = studioTheme(t.css);
      expect(theme.warnings, t.name).toEqual([]);
      const key = [theme.vars["font-display"], theme.vars["nk-shape-cut"], theme.vars["nk-row-indicator"], theme.vars["nk-motion-feel"], theme.vars["nk-density"], theme.vars.primary, theme.vars["nk-shape-slab"], theme.vars["nk-type-slant"]].join("|");
      expect(seen.has(key), t.name).toBe(false);
      seen.add(key);
    }
  });

  it("round-trips every identity through theme.css: same tokens (identity, derived and motion), no new warnings", () => {
    for (const t of identities) {
      const { first, again } = roundTrip(t.css);
      expect(again.vars, t.name).toEqual(first.vars);
      expect(again.warnings, t.name).toEqual([]);
      expect(again.revision, t.name).toBe(first.revision);
    }
  });

  it("an identity tweak re-derives what hangs off it (the motion ladder, the clip path, the row flags)", () => {
    const base = studioTheme(identities[0]!.css);
    const t = studioTheme(identities[0]!.css, { "nk-motion-duration": "240ms", "nk-shape-cut": "0.5rem", "nk-row-indicator": "fill", "nk-surface-elevation": "deep" });
    expect(t.vars["nk-time-base"]).toBe("240ms");
    expect(t.vars["nk-time-base"]).not.toBe(base.vars["nk-time-base"]);
    expect(t.vars["nk-line-clip"]).not.toBe("none");
    expect(base.vars["nk-line-clip"]).toBe("none");
    expect(t.vars["nk-row-fill"]).toBe("1");
    expect(t.vars["nk-row-bar"]).toBe("0");
    expect(t.vars["nk-depth-elevation"]).not.toBe(base.vars["nk-depth-elevation"]);
    // and the file compiles back to the same thing
    expect(compileTheme(exportThemeCss(t), { mode: "dark" }).vars).toEqual(t.vars);
  });

  it("warns on the floors a control can cross (surface opacity, duration)", () => {
    const t = studioTheme(identities[0]!.css, { "nk-material-menu-opacity": "0.8", "nk-motion-duration": "400ms" });
    expect(t.warnings.some((w) => w.includes("nk-material-menu-opacity"))).toBe(true);
    expect(t.warnings.some((w) => w.includes("nk-motion-duration"))).toBe(true);
  });

  it("every identity control names a real token with a value in every identity", () => {
    const compiled = identities.map((i) => studioTheme(i.css));
    for (const g of IDENTITY) for (const c of g.controls) for (const t of compiled) expect(t.vars[c.name], `${c.name} in ${t.hash}`).toBeDefined();
  });

  it("formats range values with their unit and finds the bundled font behind a stack", () => {
    expect(identityValue({ name: "nk-shape-cut", label: "", kind: "range", min: 0, max: 1, step: 0.125, unit: "rem" }, 0.75)).toBe("0.75rem");
    expect(identityValue({ name: "nk-motion-duration", label: "", kind: "range", min: 60, max: 400, step: 10, unit: "ms" }, 140)).toBe("140ms");
    expect(identityValue({ name: "nk-density", label: "", kind: "range", min: 0.75, max: 1.3, step: 0.025 }, 1)).toBe("1");
    expect(fontChoice('"Barlow Condensed", Barlow, sans-serif')).toContain("Barlow Condensed");
    expect(fontChoice("Comic Sans, cursive")).toBeNull();
  });
});

describe("theme studio: theme.css", () => {
  it("round-trips every preset: same tokens, no new warnings", () => {
    for (const t of themes) {
      const { first, again } = roundTrip(t.css);
      expect(again.vars, t.name).toEqual(first.vars);
      expect(again.warnings.filter((w) => !first.warnings.includes(w)), t.name).toEqual([]);
      expect(again.mode, t.name).toBe("dark");
    }
  });

  it("round-trips a tweaked theme and a partial one", () => {
    for (const first of [studioTheme(themes[1]!.css, { "vital-health": "#ff3355", hud: "rgba(10, 10, 30, 0.6)" }), studioTheme(".dark { --primary: #22c55e; }")]) {
      const again = compileTheme(exportThemeCss(first), { mode: "dark" });
      expect(again.vars).toEqual(first.vars);
      // the partial paste's "doesn't set" note goes away: the file sets everything now
      expect(again.warnings.filter((w) => !first.warnings.includes(w))).toEqual([]);
    }
  });

  it("keeps font imports", () => {
    const first = studioTheme('@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600");\n' + themes[0]!.css);
    expect(exportThemeCss(first)).toContain('@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600");');
    expect(compileTheme(exportThemeCss(first)).imports).toEqual(first.imports);
  });
});
