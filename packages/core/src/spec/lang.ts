/**
 * The nuikit token language. Every custom property a nuikit UI reads is declared here once, in one of four tiers,
 * and every output (kit.css's declaration blocks, the compiler's tables, the DTCG file, levers.md, Figma variables)
 * is generated from it. Names are never written by hand: a lever's CSS name is its path.
 *
 *   identity   what a server chooses (palette, faces, radius scale, density, skew, motion). Literals live here only.
 *   semantic   roles every component shares (surfaces, ink, status, the keycap, fills). References identity.
 *   component  one component's own levers (its root). References semantic / identity, or a component it inherits.
 *   part       one part of a component's anatomy (a data-slot). Same rules as its component.
 *
 *   --nk-<scope>-<part>-<prop>   (part omitted for a root lever, scope is the group or component)
 */

export type Tier = "identity" | "semantic" | "component";
export type LeverType = "color" | "length" | "angle" | "time" | "ease" | "number" | "keyword" | "font" | "shadow" | "paint" | "string";

/** A reference to another lever by its path (`radius.control`, `tile.face.radius`) or to a palette token (`@primary`). */
export interface Ref {
  kind: "ref";
  path: string;
  /** Channels of a palette colour (`@primary` → `--primary-rgb`), for rgba() over a theme colour on Chromium 103. */
  channel?: "rgb" | "a";
  /** var(--x, <fallback>): for a channel of a lever only a theme sets (the compiler writes -rgb next to set colours). */
  fallback?: Ref;
}
/** A CSS expression whose holes are references: css`calc(${ref("space.unit")} * 2)`. */
export interface Expr {
  kind: "expr";
  strings: readonly string[];
  refs: readonly Ref[];
}
/** A literal. Allowed at the identity tier, and below it only as a documented floor (`floor: true`). */
export interface Lit {
  kind: "lit";
  value: string;
}
export type Value = Ref | Expr | Lit;

export interface LeverDef {
  type: LeverType;
  default: Value;
  /** One line: what the lever moves. */
  description: string;
  /** Numbers: accepted range (the compiler rejects a value outside it). */
  range?: readonly [number, number];
  /** Keywords: accepted values. Painted as `data-nk-<attr>` when `attr` is set. */
  values?: readonly string[];
  attr?: string;
  /** Computed by compileTheme (a theme may still set it): motion ladder, shadows from keywords. */
  derived?: boolean;
  /** A literal default below the identity tier that is a floor by design (a hairline's 1px, a 0 that means off). */
  floor?: boolean;
  /** How compileTheme derives it when a theme leaves it out (palette and derived levers: prose, for the docs). */
  rule?: string;
  /** The names this lever replaces (pre-language). migration.json and the codemod are generated from these. */
  was?: readonly string[];
  /**
   * One of the canonical choices a theme author makes: the public surface of the design language (about forty levers,
   * identity tier only). Everything else is derived from these and is the reference renderer's business. The catalog
   * lists them first; the studio shows them first; another implementation of the language must honour them.
   */
  core?: boolean;
}

/** A custom property set by kit.css rules for one state (the face colour a tile shows right now): no default, no theme value. */
export interface StateDef {
  type: LeverType;
  description: string;
  was?: readonly string[];
}

export interface Group {
  tier: "identity" | "semantic";
  description: string;
  /**
   * The CSS prefix. Default `nk-<group>`. The palette is the v1 contract, shadcn's own names, so a TweakCN paste
   * is a theme: `""` (→ `--primary`); the faces are shadcn's `font` (→ `--font-sans`).
   */
  prefix?: string;
  levers: Record<string, LeverDef>;
  /** Named sub-groups (`type.scan`, `material.hud`): the same as parts. */
  parts?: Record<string, Record<string, LeverDef>>;
}

export interface ComponentDef {
  description: string;
  /** Its parts in render order: these ARE the data-slot names (without the component prefix where it repeats). */
  anatomy: readonly string[];
  /** Components whose levers this one may reference (explicit inheritance). */
  inherits?: readonly string[];
  /** Root levers: --nk-<component>-<prop>. */
  levers?: Record<string, LeverDef>;
  /** Part levers: --nk-<component>-<part>-<prop>. Every key must be in anatomy. */
  parts?: Record<string, Record<string, LeverDef>>;
  /** Per-state custom properties kit.css rules set (`face.color-now`): named by the language, never declared as defaults. */
  state?: Record<string, StateDef>;
}

// ─────────────────────────────────────────── the DSL

export const ref = (path: string, channel?: "rgb" | "a", fallback?: Ref): Ref => ({ kind: "ref", path, ...(channel ? { channel } : {}), ...(fallback ? { fallback } : {}) });
/** A palette token (the v1 contract: shadcn's names and the game families, unprefixed). */
export const pal = (name: string, channel?: "rgb" | "a"): Ref => ref(`@${name}`, channel);
export const lit = (value: string | number): Lit => ({ kind: "lit", value: String(value) });
export function css(strings: TemplateStringsArray, ...holes: (Ref | Expr)[]): Expr {
  // an Expr hole is spliced in: its strings join ours, so the result is flat (strings.length = refs.length + 1)
  const out: string[] = [strings[0]!];
  const refs: Ref[] = [];
  holes.forEach((h, i) => {
    if (h.kind === "ref") {
      refs.push(h);
      out.push(strings[i + 1]!);
    } else {
      out[out.length - 1] += h.strings[0]!;
      h.refs.forEach((r, j) => {
        refs.push(r);
        out.push(h.strings[j + 1]!);
      });
      out[out.length - 1] += strings[i + 1]!;
    }
  });
  return { kind: "expr", strings: out, refs };
}

/** calc(<lever> * n). */
export const times = (path: string, n: number): Expr => ({ kind: "expr", strings: ["calc(", ` * ${n})`], refs: [ref(path)] });
/** rgba(<palette colour's channels>, alpha) — the Chromium 103 way to draw a theme colour at an opacity. */
export const alpha = (palette: string, a: number | Ref): Expr =>
  typeof a === "number" ? { kind: "expr", strings: ["rgba(", `, ${a})`], refs: [pal(palette, "rgb")] } : { kind: "expr", strings: ["rgba(", ", ", ")"], refs: [pal(palette, "rgb"), a] };

type Opts =Omit<LeverDef, "type" | "default" | "description">;
const mk = (type: LeverType) => (value: Value | string | number, description: string, opts: Opts = {}): LeverDef => ({
  type,
  default: typeof value === "object" ? value : lit(value),
  description,
  ...opts,
});
export const color = mk("color");
export const length = mk("length");
export const angle = mk("angle");
export const time = mk("time");
export const ease = mk("ease");
export const number = mk("number");
export const font = mk("font");
export const shadow = mk("shadow");
export const paint = mk("paint");
export const string = mk("string");
export const keyword = (values: readonly string[], value: string | Value, description: string, opts: Opts = {}): LeverDef => ({
  type: "keyword",
  default: typeof value === "object" ? value : lit(value),
  description,
  values,
  ...opts,
});

/** A component lever that takes another lever's value as is (the explicit form of inheritance). */
export const inherit = (from: string, description: string, type: LeverType, opts: Opts = {}): LeverDef => ({ type, default: ref(from), description, ...opts });

// ─────────────────────────────────────────── names

/** The CSS custom property of a lever path: tile.face.radius → --nk-tile-face-radius. */
export const cssName = (path: string): string => (path.startsWith("@") ? `--${path.slice(1)}` : `--nk-${path.split(".").join("-")}`);
/** The compiled-theme key (no leading --). */
export const varName = (path: string): string => cssName(path).slice(2);
