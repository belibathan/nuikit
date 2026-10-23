// Tokens 1.4 (docs/design/foundation.md): additive. Every theme compiles to exactly what it did under 1.3
// (fixtures/compiled-1.3.json), plus the new families.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compileTheme, ROLES, themeMotionLevel, TOKENS_REVISION, TREATMENT_PRESETS, withPrefs } from "../src/tokens";

const root = path.resolve(__dirname, "../../..") + "/";
const read = (p: string) => readFileSync(root + p, "utf8");
const BEFORE = JSON.parse(read("packages/core/test/fixtures/compiled-1.3.json")) as Record<string, Record<string, string>>;
const SOURCES: Record<string, string> = {
  stock: "packages/core/test/fixtures/stock-theme.css",
  daylight: "packages/core/test/themes/daylight.css",
};
const source = (n: string) => read(SOURCES[n] ?? `packages/core/themes/${n}.css`);

describe("tokens 1.4: today's look, exactly", () => {
  it("is revision 1.6 (1.4 plus the Default theme levers and the baseline)", () => expect(TOKENS_REVISION).toBe("1.6"));
  for (const n of Object.keys(BEFORE)) {
    it(`${n} compiles every 1.3 token to the same value`, () => {
      const t = compileTheme(source(n));
      const changed = Object.entries(BEFORE[n]!).filter(([k, v]) => t.vars[k] !== v).map(([k, v]) => `${k}: ${v} → ${t.vars[k]}`);
      expect(changed).toEqual([]);
    });
  }
  it("each identity names a treatment", () => {
    const want: Record<string, string> = { graphite: "soft", studio: "soft", velvet: "glass", signal: "plate", vector: "plate", arcade: "slab", street: "slab" };
    for (const [n, t] of Object.entries(want)) expect(compileTheme(source(n)).vars["nk-treatment"], n).toBe(t);
  });
});

describe("treatment presets", () => {
  it("fill only what the theme leaves out", () => {
    const slab = compileTheme(".dark { --nk-treatment: slab; --nk-border-width: 3px; }").vars;
    expect(slab["nk-border-width"]).toBe("3px");
    expect(slab["nk-elevation"]).toBe("hard");
    expect(slab["nk-focus-style"]).toBe("fill");
    const glass = compileTheme(".dark { --nk-treatment: glass; }").vars;
    expect(glass["nk-material-menu-blur"]).toBe("2rem");
    expect(glass["nk-focus-style"]).toBe("halo");
  });
  it("an unknown treatment is soft, with a warning", () => {
    const t = compileTheme(".dark { --nk-treatment: chrome; }");
    expect(t.vars["nk-treatment"]).toBe("soft");
    expect(t.warnings.join()).toMatch(/--nk-treatment must be/);
  });
  it("every preset value is a valid token value (no warnings)", () => {
    for (const name of Object.keys(TREATMENT_PRESETS)) expect(compileTheme(`.dark { --nk-treatment: ${name}; }`).warnings, name).toEqual([]);
  });
});

describe("roles", () => {
  const v = compileTheme(read("packages/core/test/fixtures/stock-theme.css")).vars;
  it("every role has a colour and its deep and light steps", () => {
    for (const r of ROLES) for (const k of [`role-${r}`, `role-${r}-deep`, `role-${r}-light`]) expect(v[k], k).toMatch(/^rgba?\(/);
  });
  it("vitals keep today's vital colours; status roles alias the status tokens", () => {
    expect(v["role-health"]).toBe(v["vital-health"]);
    expect(v["role-armor"]).toBe(v["vital-armor"]);
    expect(v["role-danger"]).toBe(v.destructive);
    expect(v["role-stamina"]).toBe(v.success);
    expect(v["role-brand"]).toBe(v.brand);
  });
  it("a theme sets a role; its ramp follows", () => {
    const t = compileTheme(".dark { --role-police: #2060ff; }").vars;
    expect(t["role-police"]).toBe("rgb(32, 96, 255)");
    expect(t["role-police-deep"]).not.toBe(t["role-police"]);
  });
});

describe("materials, behaviour, motion, layers", () => {
  const v = compileTheme(read("packages/core/test/fixtures/stock-theme.css")).vars;
  it("materials default to today's surfaces", () => {
    expect(v["nk-material-hud-opacity"]).toBe(v["nk-hud-opacity"]);
    expect(v["nk-material-menu-opacity"]).toBe(v["nk-surface-opacity"]);
    expect(v["nk-material-menu-radius"]).toBe(v.radius);
    expect(v["nk-material-menu-texture"]).toBe("none");
    expect(v["nk-legibility"]).toBe("auto");
  });
  it("behaviour tokens accept long durations, within range", () => {
    expect(v["nk-notify-ms-danger"]).toBe("5000ms");
    const t = compileTheme(".dark { --nk-notify-ms-danger: 7s; --nk-rest-delay: 120s; }");
    expect(t.vars["nk-notify-ms-danger"]).toBe("7000ms");
    expect(t.vars["nk-rest-delay"]).toBe("0ms");
    expect(t.warnings.join()).toMatch(/--nk-rest-delay/);
  });
  it("the ladder's new rungs and eases derive from d; prefs clamp them", () => {
    expect(v["nk-time-confirm"]).toBe("91ms");
    expect(v["nk-time-fill"]).toBe("420ms");
    expect(v["nk-ease-retract"]).toBe(v["nk-ease-in"]);
    expect(withPrefs(v, { reducedMotion: true })["nk-time-fill"]).toBe("100ms");
  });
  it("motion profile: reduced and instant", () => {
    expect(themeMotionLevel({ ...v, "nk-motion-profile": "instant" })).toBe("off");
    expect(themeMotionLevel({ ...v, "nk-motion-profile": "reduced" })).toBe("reduced");
  });
  it("layers stack world < hud < scrim < surface < dim < dialog < system", () => {
    const z = ["world", "hud", "scrim", "surface", "dim", "dialog", "system"].map((l) => Number(v[`nk-z-${l}`]));
    expect([...z].sort((a, b) => a - b)).toEqual(z);
    expect(v["nk-glow-budget"]).toBe("1");
  });
});
