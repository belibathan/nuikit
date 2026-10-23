import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio, rgbToOklch, toRgba } from "../src/color";
import {
  checkContrast,
  compileTheme,
  DEFAULT_PREFS,
  NEUTRAL,
  normalizePrefs,
  parseDtcg,
  parseThemeCss,
  themeChannels,
  themeJsonSchema,
  themeToCss,
  toDtcg,
  TOKEN_NAMES,
  TOKENS,
  TOKENS_VERSION,
  withPrefs,
} from "../src/tokens";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const read = (p: string) => readFileSync(root + p, "utf8");
const THEMES = {
  neutral: read("packages/core/test/fixtures/stock-theme.css"),
  highChroma: read("packages/core/test/themes/high-chroma.css"),
  lightOnly: read("packages/core/test/themes/light-only.css"),
  lowContrast: read("packages/core/test/themes/low-contrast.css"),
};
const LEGACY = /okl(ch|ab)\(|color-mix\(|\blab\(|\blch\(/;
const hue = (v: string) => rgbToOklch(toRgba(v)!).h;

describe("the token contract", () => {
  it("is v1 with the documented names (other packages depend on them)", () => {
    expect(TOKENS_VERSION).toBe(1);
    expect(TOKEN_NAMES).toEqual([
      "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
      "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground",
      "accent", "accent-foreground", "destructive", "destructive-foreground", "border", "input", "ring",
      "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "radius", "font-sans", "font-mono",
      "success", "success-foreground", "warning", "warning-foreground", "info", "info-foreground",
      "hud", "hud-foreground", "scrim", "vital-health", "vital-armor", "vital-hunger", "vital-thirst", "vital-stress",
      "nk-scale", "nk-motion",
    ]);
    for (const t of TOKENS) expect(t.fallback, t.name).toBeTruthy();
  });

  it("embeds the vendored stock shadcn neutral theme", () => {
    const { cssVars } = JSON.parse(read("vendor/shadcn/colors/neutral.json"));
    expect(NEUTRAL.light).toEqual(cssVars.light);
    expect(NEUTRAL.dark).toEqual(cssVars.dark);
  });

  it("publishes a JSON Schema that requires every token", () => {
    const schema = themeJsonSchema() as any;
    expect(schema.properties.vars.required).toEqual([...TOKEN_NAMES]);
    expect(schema.properties.version.const).toBe(1);
    const published = JSON.parse(read("packages/core/tokens/nuikit-theme.schema.json"));
    expect(published).toEqual(schema);
  });

  it("ships the default theme as a DTCG file that compiles back to the same tokens", () => {
    const file = JSON.parse(read("packages/core/tokens/nuikit.tokens.json"));
    const stock = compileTheme(THEMES.neutral);
    expect(compileTheme(file).vars).toEqual(stock.vars);
    expect(file).toEqual(toDtcg(stock, "nuikit default theme (stock shadcn neutral)"));
  });
});

describe("reference theme: stock neutral (test/fixtures/stock-theme.css)", () => {
  const t = compileTheme(THEMES.neutral);

  it("uses the dark set, has every token and no warnings", () => {
    expect(t.mode).toBe("dark");
    expect(t.warnings).toEqual([]);
    expect(Object.keys(t.vars).slice(0, TOKEN_NAMES.length)).toEqual([...TOKEN_NAMES]);
    expect(t.vars.background).toBe("rgb(10, 10, 10)");
    expect(t.vars.border).toBe("rgba(255, 255, 255, 0.1)");
    for (const v of Object.values(t.vars)) expect(v).not.toMatch(LEGACY);
  });

  it("derives the nuikit tokens", () => {
    expect(t.vars.info).toBe(t.vars.primary);
    expect(t.vars["info-foreground"]).toBe(t.vars["primary-foreground"]);
    expect(t.vars.hud).toBe("rgba(0, 0, 0, 0.45)");
    expect(t.vars["hud-foreground"]).toBe("rgb(255, 255, 255)");
    expect(t.vars.scrim).toBe("rgb(0, 0, 0)");
    expect(hue(t.vars.success!)).toBeGreaterThan(130);
    expect(hue(t.vars.success!)).toBeLessThan(170);
    expect(hue(t.vars.warning!)).toBeGreaterThan(55);
    expect(hue(t.vars.warning!)).toBeLessThan(95);
    expect(t.vars["nk-scale"]).toBe("1");
    expect(t.vars["nk-motion"]).toBe("1");
    expect(t.vars.radius).toBe("0.625rem");
  });

  it("doesn't use grey chart colours for vitals: health is destructive, the rest fixed hues", () => {
    expect(t.vars["vital-health"]).toBe(t.vars.destructive);
    expect(hue(t.vars["vital-armor"]!)).toBeCloseTo(250, -1);
    expect(hue(t.vars["vital-hunger"]!)).toBeCloseTo(70, -1);
    expect(hue(t.vars["vital-thirst"]!)).toBeCloseTo(215, -1);
    expect(hue(t.vars["vital-stress"]!)).toBeCloseTo(320, -1);
  });

  it("passes every contrast check", () => {
    expect(t.contrast.length).toBeGreaterThanOrEqual(9);
    expect(t.contrast.filter((r) => !r.ok)).toEqual([]);
  });
});

describe("reference theme: high-chroma TweakCN export", () => {
  const t = compileTheme(THEMES.highChroma);

  it("reads :root + .dark, fonts from :root, imports, and ignores @theme inline mappings", () => {
    expect(t.mode).toBe("dark");
    expect(t.imports).toEqual([
      "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&display=swap",
      "https://fonts.googleapis.com/css2?family=Fira+Code&display=swap",
    ]);
    expect(t.vars["font-sans"]).toBe("Outfit, sans-serif");
    expect(t.vars["font-mono"]).toBe('"Fira Code", monospace');
    expect(t.vars.radius).toBe("0.75rem");
    expect(t.vars.primary).toBe(`rgb(${toRgba("oklch(0.72 0.24 330)")!.slice(0, 3).join(", ")})`);
    expect(t.warnings).toEqual([]);
  });

  it("passes the rest through, lowered: sidebar refs resolved, shadows with oklch inside", () => {
    expect(t.vars["sidebar-primary"]).toBe(t.vars.primary);
    expect(t.vars["shadow-sm"]).toBe("0 1px 3px 0px rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)");
    expect(t.vars["font-serif"]).toBe("Georgia, serif");
    expect(t.vars["tracking-normal"]).toBe("0em");
    for (const v of Object.values(t.vars)) expect(v).not.toMatch(LEGACY);
  });

  it("takes vitals from chart colours whose hue fits, in the documented order", () => {
    expect(t.vars["vital-health"]).toBe(t.vars["chart-5"]); // chart-1 is magenta → the red one
    expect(t.vars["vital-armor"]).toBe(t.vars["chart-4"]); // blue
    expect(t.vars["vital-hunger"]).toBe(t.vars["chart-3"]); // amber
    expect(t.vars["vital-thirst"]).toBe(t.vars["chart-2"]); // cyan
    expect(t.vars["vital-stress"]).toBe(t.vars["chart-1"]); // magenta
  });

  it("keeps an explicit destructive-foreground and derives success/warning near destructive's lightness", () => {
    expect(t.vars["destructive-foreground"]).toBe(`rgb(${toRgba("oklch(0.16 0.04 290)")!.slice(0, 3).join(", ")})`);
    const d = rgbToOklch(toRgba(t.vars.destructive!)!);
    expect(Math.abs(rgbToOklch(toRgba(t.vars.success!)!).l - d.l)).toBeLessThan(0.05);
  });

  it("light mode reads :root only", () => {
    const light = compileTheme(THEMES.highChroma, { mode: "light" });
    expect(light.mode).toBe("light");
    expect(light.vars.background).toBe(`rgb(${toRgba("oklch(0.98 0.01 300)")!.slice(0, 3).join(", ")})`);
  });
});

describe("reference theme: light-only paste", () => {
  const t = compileTheme(THEMES.lightOnly);

  it("falls back to the light colours, says so, and still fills every token", () => {
    expect(t.mode).toBe("light");
    expect(t.warnings[0]).toMatch(/no dark colours/);
    for (const name of TOKEN_NAMES) expect(t.vars[name], name).toBeDefined();
    expect(t.vars.background).toBe("rgb(255, 255, 255)");
  });

  it("derives readable foregrounds against the light set", () => {
    expect(contrastRatio(toRgba(t.vars["success-foreground"]!)!, toRgba(t.vars.success!)!)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(toRgba(t.vars["destructive-foreground"]!)!, toRgba(t.vars.destructive!)!)).toBeGreaterThanOrEqual(3);
    expect(t.vars["vital-hunger"]).toBe(t.vars["chart-1"]); // orange (chart-3 is too dark for the game)
    expect(t.vars["vital-thirst"]).toBe(t.vars["chart-2"]); // teal
  });
});

describe("reference theme: low contrast", () => {
  const t = compileTheme(THEMES.lowContrast);

  it("warns in plain words, with the ratio and what it breaks", () => {
    const text = t.warnings.join("\n");
    expect(text).toMatch(/^primary-foreground on primary is \d\.\d:1 \(needs 4\.5:1\); text on buttons will be hard to read\.$/m);
    expect(text).toMatch(/^foreground on background is \d\.\d:1/m);
    expect(text).toMatch(/^popover-foreground on popover is/m);
    expect(text).toMatch(/^muted-foreground on popover is/m);
    expect(text).toMatch(/^hud-foreground on hud is \d\.\d:1 \(needs 3:1\); HUD text will be hard to read over a bright sky\.$/m);
    expect(t.contrast.find((r) => r.fg === "primary-foreground")).toMatchObject({ ok: false, min: 4.5 });
  });

  it("high contrast (player pref) fixes every check", () => {
    const hc = compileTheme(THEMES.lowContrast, { highContrast: true });
    expect(hc.contrast.filter((r) => !r.ok && r.fg !== "destructive")).toEqual([]);
    expect(hc.vars.hud).toBe("rgba(0, 0, 0, 0.72)");
  });
});

describe("compileTheme inputs", () => {
  it("accepts objects, with or without --, and fills the rest", () => {
    const t = compileTheme({ "--primary": "#22c55e", radius: "0.5rem" });
    expect(t.vars.primary).toBe("rgb(34, 197, 94)");
    expect(t.vars.info).toBe("rgb(34, 197, 94)");
    expect(t.vars.radius).toBe("0.5rem");
    expect(t.vars.background).toBe("rgb(10, 10, 10)");
  });

  it("partial: only the given tokens, lowered", () => {
    const t = compileTheme({ primary: "oklch(0.7 0.2 150)" }, { partial: true });
    expect(Object.keys(t.vars)).toEqual(["primary"]);
    expect(t.vars.primary).toMatch(/^rgb\(/);
  });

  it("accepts a compiled theme (idempotent) and its JSON", () => {
    const a = compileTheme(THEMES.highChroma);
    expect(compileTheme(a).vars).toEqual(a.vars);
    expect(compileTheme(JSON.stringify(a)).vars).toEqual(a.vars);
    expect(compileTheme(a).hash).toBe(a.hash);
  });

  it("round-trips DTCG 2025.10, including aliases and oklch colour spaces", () => {
    const a = compileTheme(THEMES.highChroma);
    const doc = toDtcg(a);
    expect((doc.color as any).primary.$value.colorSpace).toBe("srgb");
    expect((doc.radius as any).$value).toEqual({ value: 0.75, unit: "rem" });
    expect((doc.font as any).sans.$value).toEqual(["Outfit", "sans-serif"]);
    expect((doc.nk as any).scale.$value).toBe(1);
    const back = compileTheme(doc);
    expect(back.imports).toEqual(a.imports);
    for (const name of TOKEN_NAMES) {
      if (name.startsWith("font-")) continue;
      expect(back.vars[name], name).toBe(a.vars[name]);
    }
    const vars = parseDtcg({
      color: {
        $type: "color",
        brand: { $value: { colorSpace: "oklch", components: [0.7, 0.2, 150], alpha: 1 } },
        primary: { $value: "{color.brand}" },
        border: { $value: { colorSpace: "srgb", components: [1, 1, 1], alpha: 0.1, hex: "#ffffff" } },
      },
      nk: { scale: { $type: "number", $value: 1.1 } },
    });
    expect(vars.primary).toBe(vars.brand);
    expect(vars.border).toBe("rgba(255, 255, 255, 0.1)");
    expect(vars["nk-scale"]).toBe("1.1");
  });

  it("reads @media (prefers-color-scheme: dark), [data-theme=dark] and bare declarations", () => {
    expect(parseThemeCss("@media (prefers-color-scheme: dark) { :root { --primary: red; } }").dark.primary).toBe("red");
    expect(parseThemeCss('[data-theme="dark"] { --primary: blue; }').dark.primary).toBe("blue");
    expect(parseThemeCss("--primary: #111; --radius: 0;").light).toEqual({ primary: "#111", radius: "0" });
    expect(parseThemeCss("@layer base { :root { --a: 1; } body { --b: 2; } }").light).toEqual({ a: "1" });
  });

  it("drops values FiveM can't read, with a warning", () => {
    const t = compileTheme(".dark { --accent: color-mix(in oklab, red 50%, blue); --primary: lab(50% 40 59); }");
    expect(t.vars.accent).toBe("rgb(38, 38, 38)"); // stock value instead
    expect(t.warnings.join("\n")).toMatch(/--accent uses color-mix\(\)/);
    expect(t.warnings.join("\n")).toMatch(/--primary uses a colour format/);
  });

  it("warns on an empty token and on an alias that resolves to nothing", () => {
    const t = compileTheme(".dark { --primary: ; --accent: var(--nope); --ring: var(--primary); --card: var(--accent, #112233); }");
    const w = t.warnings.join("\n");
    expect(w).toMatch(/--primary is empty; the stock value is used\./);
    expect(w).toMatch(/--accent is var\(--nope\), which isn't defined; the stock value is used\./);
    expect(w).toMatch(/--ring is var\(--primary\), which resolves to nothing; the stock value is used\./);
    const stock = compileTheme("").vars;
    expect(t.vars.primary).toBe(stock.primary);
    expect(t.vars.accent).toBe(stock.accent);
    expect(t.vars.ring).toBe(stock.ring);
    // a var() with a fallback is fine
    expect(t.vars.card).toBe("rgb(17, 34, 51)");
    expect(w).not.toMatch(/--card is/);
    // a patch has no stock to fall back on: the token is left out
    const p = compileTheme({ primary: "", accent: "var(--zzz)" }, { partial: true });
    expect(p.vars).toEqual({});
    expect(p.warnings).toEqual(["--primary is empty; it was left out.", "--accent is var(--zzz), which isn't defined; it was left out."]);
  });

  it("validates --nk-scale and --nk-motion", () => {
    expect(compileTheme(".dark { --nk-scale: 1.15; --nk-motion: 0; }").vars).toMatchObject({ "nk-scale": "1.15", "nk-motion": "0" });
    const bad = compileTheme(".dark { --nk-scale: big; --nk-motion: maybe; }");
    expect(bad.vars).toMatchObject({ "nk-scale": "1", "nk-motion": "1" });
    expect(bad.warnings.filter((w) => /nk-/.test(w))).toHaveLength(2);
  });

  it("an explicit theme value always wins over the derived default", () => {
    const t = compileTheme(".dark { --success: #00ff00; --hud: rgb(20 20 20 / 0.6); --vital-health: #ff0000; --info: #0000ff; }");
    expect(t.vars).toMatchObject({ success: "rgb(0, 255, 0)", hud: "rgba(20, 20, 20, 0.6)", "vital-health": "rgb(255, 0, 0)", info: "rgb(0, 0, 255)" });
  });

  it("an empty paste is the stock theme, with one warning", () => {
    const t = compileTheme("");
    expect(t.vars).toEqual(compileTheme(THEMES.neutral).vars);
    expect(t.warnings).toEqual(["The theme has no variables; the stock theme is used."]);
  });

  it("hashes change with the theme", () => {
    expect(compileTheme(THEMES.neutral).hash).not.toBe(compileTheme(THEMES.highChroma).hash);
    expect(compileTheme(THEMES.neutral).hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("composites translucent colours where they're drawn for contrast", () => {
    const r = checkContrast({ hud: "rgba(0, 0, 0, 0.45)", "hud-foreground": "rgb(255, 255, 255)" });
    expect(r).toHaveLength(1);
    expect(r[0]!.ratio).toBeGreaterThan(3); // white on 45% black over a white sky
    expect(r[0]!.ratio).toBeLessThan(4);
  });
});

describe("outputs", () => {
  it("channels and CSS for pages that set variables themselves", () => {
    const t = compileTheme(THEMES.neutral);
    const ch = themeChannels(t.vars);
    expect(ch["primary-rgb"]).toBe("229, 229, 229");
    expect(ch["border-a"]).toBe("0.1");
    expect(ch["radius-rgb"]).toBeUndefined();
    const css = themeToCss(t);
    expect(css).toMatch(/^:root \{\n  --background: rgb\(10, 10, 10\);/);
    expect(css).toContain("--hud-a: 0.45;");
  });
});

describe("player preferences", () => {
  const vars = compileTheme(THEMES.neutral).vars;
  it("clamps and defaults", () => {
    expect(normalizePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(normalizePrefs({ scale: 3 }).scale).toBe(1.25);
    expect(normalizePrefs({ scale: 0.1 }).scale).toBe(0.85);
    expect(normalizePrefs({ scale: "x" as unknown as number }).scale).toBe(1);
    expect(normalizePrefs({ density: 2 }).density).toBe(1.2);
    expect(withPrefs({ ...vars, "nk-density": "0.875" }, { density: 1.2 })["nk-density"]).toBe("1.05");
  });
  it("multiply the theme's scale and turn motion off", () => {
    const out = withPrefs({ ...vars, "nk-scale": "1.1" }, { scale: 1.2, reducedMotion: true });
    expect(out["nk-scale"]).toBe("1.32");
    expect(out["nk-motion"]).toBe("0");
    expect(withPrefs(vars)).toEqual(vars);
  });
  it("high contrast raises muted text to 7:1 and strengthens borders", () => {
    const out = withPrefs(vars, { highContrast: true });
    expect(contrastRatio(toRgba(out["muted-foreground"]!)!, toRgba(out.popover!)!)).toBeGreaterThanOrEqual(7);
    expect(out.border).toBe("rgba(255, 255, 255, 0.35)");
    expect(vars.border).toBe("rgba(255, 255, 255, 0.1)"); // input untouched
  });
});
