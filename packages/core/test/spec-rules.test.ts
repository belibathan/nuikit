/**
 * The rules the token language enforces (packages/core/src/spec). A failure here is a spec bug: fix the spec, run
 * `pnpm --filter nuikit-core gen:tokens`.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ANATOMY, BY_PATH, COMPONENTS, LEVERS, STATE, TEXT_STYLES, type Ref, type Value } from "../src/spec";
import naming from "../spec/migration.json";

const root = path.resolve(__dirname, "../../..");
const refsOf = (v: Value): Ref[] => (v.kind === "ref" ? [v, ...(v.fallback ? [v.fallback] : [])] : v.kind === "expr" ? v.refs.flatMap((r) => [r, ...(r.fallback ? [r.fallback] : [])]) : []);
const TIER = { identity: 0, semantic: 1, component: 2 } as const;

describe("the token language", () => {
  it("the core identity is small and sits in the identity tier: the language a theme author learns", () => {
    const core = LEVERS.filter((l) => l.core);
    expect(core.length).toBeGreaterThanOrEqual(24);
    expect(core.length).toBeLessThanOrEqual(48);
    for (const l of core) expect(l.tier, l.path).toBe("identity");
    // the four things a designer decides first are in it
    for (const p of ["@primary", "font.display", "shape.skew", "motion.duration", "style.fill"]) expect(core.some((l) => l.path === p), p).toBe(true);
  });

  it("every lever has exactly one declaration (one path, one CSS name)", () => {
    const paths = LEVERS.map((l) => l.path);
    const names = [...LEVERS.map((l) => l.css), ...STATE.map((s) => s.css)];
    expect(paths.filter((p, i) => paths.indexOf(p) !== i)).toEqual([]);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
  });

  it("names are generated: kebab, --nk-<scope>[-<part>]-<prop> (docs/design.md)", () => {
    for (const l of LEVERS) {
      if (l.scope === "") continue; // the palette: shadcn's own names
      expect(l.css, l.path).toMatch(/^--(nk|font)-[a-z0-9]+(-[a-z0-9]+)*$/);
      const expected = l.scope === "font" ? `--font-${l.prop}` : `--nk-${[l.scope, l.part, l.prop === "$" ? null : l.prop].filter(Boolean).join("-")}`;
      expect(l.css, l.path).toBe(expected);
    }
  });

  it("every reference resolves to a lever (or a palette colour's channel)", () => {
    for (const l of LEVERS) for (const r of refsOf(l.default)) expect(BY_PATH.has(r.path), `${l.path} → ${r.path}`).toBe(true);
  });

  it("references point up the tiers; a component reaches only itself, what it inherits, semantic and identity", () => {
    for (const l of LEVERS)
      for (const r of refsOf(l.default)) {
        const t = BY_PATH.get(r.path)!;
        expect(TIER[t.tier] <= TIER[l.tier], `${l.path} (${l.tier}) → ${r.path} (${t.tier})`).toBe(true);
        if (l.tier === "component" && t.tier === "component" && t.scope !== l.scope) {
          const inh = (COMPONENTS as Record<string, { inherits?: readonly string[] }>)[l.scope]!.inherits ?? [];
          expect(inh, `${l.path} → ${r.path}: ${l.scope} doesn't inherit ${t.scope}`).toContain(t.scope);
        }
      }
  });

  it("no literal defaults below the identity tier except documented floors", () => {
    const bad = LEVERS.filter((l) => l.tier !== "identity" && l.default.kind === "lit" && !l.floor && !l.derived).map((l) => l.path);
    expect(bad).toEqual([]);
  });

  it("no colour literal below the identity tier, ever: colours reference identity tokens or -rgb channels", () => {
    const COLOR = /#[0-9a-f]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch)\(\s*[\d.]/i;
    for (const l of LEVERS) {
      if (l.tier === "identity") continue;
      const lits = l.default.kind === "lit" ? [l.default.value] : l.default.kind === "expr" ? [...l.default.strings] : [];
      for (const s of lits) expect(COLOR.test(s), `${l.path}: ${s}`).toBe(false);
    }
  });

  it("every component has an anatomy of at least one part and no duplicates, and its part levers name anatomy parts", () => {
    for (const [k, parts] of Object.entries(ANATOMY)) {
      expect(parts.length, k).toBeGreaterThan(0);
      expect(new Set(parts).size, k).toBe(parts.length);
      for (const l of LEVERS.filter((x) => x.tier === "component" && x.scope === k && x.part)) expect(parts, `${l.path}`).toContain(l.part);
    }
  });

  it("every inherited component exists and inheritance has no cycles", () => {
    const comps = COMPONENTS as Record<string, { inherits?: readonly string[] }>;
    const seen = (k: string, path: string[]): void => {
      for (const i of comps[k]!.inherits ?? []) {
        expect(comps[i], `${k} inherits ${i}`).toBeTruthy();
        expect(path, `cycle: ${[...path, i].join(" → ")}`).not.toContain(i);
        seen(i, [...path, i]);
      }
    };
    for (const k of Object.keys(comps)) seen(k, [k]);
  });

  it("migration.json maps old names onto names the language declares, and never onto another old name", () => {
    const declared = new Set([...LEVERS.map((l) => l.css.slice(2)), ...STATE.map((s) => s.css.slice(2))]);
    for (const [from, to] of Object.entries(naming as Record<string, string>)) {
      expect(declared.has(to), `${from} → ${to}`).toBe(true);
      expect((naming as Record<string, string>)[to], `${to} is itself renamed`).toBeUndefined();
    }
  });

  it("every lever has a reader (kit.css rules, the registry, systems, addons, the runtime) or is a theme input the compiler reads", () => {
    const files: string[] = [];
    const walk = (p: string) => {
      const s = statSync(p);
      if (s.isDirectory()) {
        if (/node_modules|dist|\/components\/ui$|\/spec$|\/test$/.test(p)) return;
        for (const f of readdirSync(p)) walk(path.join(p, f));
      } else if (/\.(css|tsx?|lua|mjs)$/.test(p) && !/index\.css$|tokens\.generated\.ts$|kit\.css$/.test(p)) files.push(p);
    };
    for (const d of ["registry/nuikit", "systems", "addons", "packages/core/src", "packages/core/lua", "apps/www/src"]) walk(path.join(root, d));
    const kit = readFileSync(path.join(root, "packages/create-nuikit/kit.css"), "utf8");
    const rules = kit.slice(kit.indexOf("/* @end generated levers */"));
    const generatedBlock = kit.slice(0, kit.indexOf("/* @end generated levers */"));
    const text = rules + files.map((f) => readFileSync(f, "utf8")).join("\n");
    const compiler = readFileSync(path.join(root, "packages/core/src/tokens.ts"), "utf8");
    const dead = LEVERS.filter((l) => {
      if (l.scope === "" || l.scope === "font") return false; // the palette: every theme carries it
      const n = l.css.slice(2);
      if (new RegExp(`--${n}(?![\\w-])`).test(text)) return false;
      if (new RegExp(`["'\`]${n}["'\`]`).test(text + compiler)) return false; // read by name (vars["nk-…"], getPropertyValue)
      if (l.attr) return false; // painted as data-nk-<attr>, read by attribute
      if (l.scope === "spring") return false; // read as --nk-spring-${name} by nuikit-core/motion
      if (l.part && new RegExp(`nk-${l.scope}-${l.part}-\\$\\{`).test(text)) return false; // a part read by a computed name (nk-behavior-notify-${severity})
      // read by another lever's default (a building block of the language)
      if (new RegExp(`var\\(--${n}(?![\\w-])`).test(generatedBlock)) return false;
      return true;
    }).map((l) => l.css);
    expect(dead).toEqual([]);
  });

  it("the generator is idempotent: its outputs are up to date", () => {
    expect(() => execFileSync(process.execPath, [path.join(root, "packages/core/scripts/gen-tokens.mjs"), "--check"], { stdio: "pipe" })).not.toThrow();
  });
});

describe("the text styles (src/spec/text-styles.ts)", () => {
  it("every style names real levers: its voice, size, leading and overrides", () => {
    for (const [n, st] of Object.entries(TEXT_STYLES)) {
      for (const p of ["family", "style", "weight", "tracking", "case"]) expect(BY_PATH.has(`type.${st.voice}.${p}`), `${n}: type.${st.voice}.${p}`).toBe(true)
      for (const p of [st.size, st.leading, st.weight, st.tracking, st.case].filter(Boolean) as string[]) expect(BY_PATH.has(p), `${n}: ${p}`).toBe(true)
      if (st.size) expect(st.size.startsWith("text."), `${n} size`).toBe(true)
      if (st.leading) expect(st.leading.startsWith("leading."), `${n} leading`).toBe(true)
    }
  })

  it("aliases are unique and never shadow a style", () => {
    const names = Object.keys(TEXT_STYLES).map((n) => `nk-text-${n}`)
    const aliases = Object.values(TEXT_STYLES).flatMap((s) => s.aliases ?? [])
    expect(new Set([...names, ...aliases]).size).toBe(names.length + aliases.length)
  })

  it("kit.css carries every style, generated (gen-tokens), and slant comes only from the voices", () => {
    const kit = readFileSync(path.resolve(__dirname, "../../create-nuikit/kit.css"), "utf8")
    for (const n of Object.keys(TEXT_STYLES)) expect(kit, n).toContain(`@utility nk-text-${n} {`)
    const decls = kit.replace(/\/\*[\s\S]*?\*\//g, "")
    expect(decls.match(/font-style:\s*italic/g) ?? [], "kit.css sets italic outside the voices").toEqual([])
  })
})
