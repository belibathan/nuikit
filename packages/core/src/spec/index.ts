/**
 * The spec, flattened: every lever with its path, CSS name, tier, scope and part. Generators and the compiler read
 * this; nothing else names a token.
 */
import { IDENTITY } from "./identity";
import { cssName, type ComponentDef, type Group, type LeverDef, type StateDef, type Tier } from "./lang";
import { SEMANTIC } from "./semantic";
import { COMPONENTS } from "./components";

export * from "./lang";
export { IDENTITY, SEMANTIC, COMPONENTS };

export interface Lever extends LeverDef {
  /** tile.face.color, space.2, @primary (palette), font.sans */
  path: string;
  /** --nk-tile-face-color */
  css: string;
  /** The compiled-theme key: nk-tile-face-color, primary */
  name: string;
  tier: Tier;
  /** The group or component. "" for the palette. */
  scope: string;
  part?: string;
  prop: string;
}
export interface StateVar extends StateDef {
  path: string;
  css: string;
  scope: string;
}

const prefixOf = (key: string, g: Group) => (g.prefix !== undefined ? g.prefix : `nk-${key}`);
const join = (...xs: string[]) => xs.filter((x) => x && x !== "$").join("-");

function flatten(): { levers: Lever[]; state: StateVar[] } {
  const levers: Lever[] = [];
  const state: StateVar[] = [];
  const addGroup = (key: string, g: Group) => {
    const pre = prefixOf(key, g);
    for (const [prop, def] of Object.entries(g.levers)) {
      const path = key === "" ? `@${prop}` : prop === "$" ? key : `${key}.${prop}`;
      const name = key === "" ? prop : join(pre, prop);
      levers.push({ ...def, path, name, css: `--${name}`, tier: g.tier, scope: key, prop });
    }
    for (const [part, props] of Object.entries(g.parts ?? {}))
      for (const [prop, def] of Object.entries(props)) {
        const name = join(pre, part, prop);
        levers.push({ ...def, path: prop === "$" ? `${key}.${part}` : `${key}.${part}.${prop}`, name, css: `--${name}`, tier: g.tier, scope: key, part, prop });
      }
  };
  for (const [k, g] of Object.entries(IDENTITY)) addGroup(k, g);
  for (const [k, g] of Object.entries(SEMANTIC)) addGroup(k, g);
  for (const [k, c] of Object.entries(COMPONENTS) as [string, ComponentDef][]) {
    for (const [prop, def] of Object.entries(c.levers ?? {})) {
      const name = join(`nk-${k}`, prop);
      levers.push({ ...def, path: prop === "$" ? k : `${k}.${prop}`, name, css: `--${name}`, tier: "component", scope: k, prop });
    }
    for (const [part, props] of Object.entries(c.parts ?? {}))
      for (const [prop, def] of Object.entries(props)) {
        const name = join(`nk-${k}`, part, prop);
        levers.push({ ...def, path: `${k}.${part}.${prop}`, name, css: `--${name}`, tier: "component", scope: k, part, prop });
      }
    for (const [prop, def] of Object.entries(c.state ?? {})) state.push({ ...def, path: `${k}.${prop}`, css: `--${join(`nk-${k}`, prop)}`, scope: k });
  }
  return { levers, state };
}

const flat = flatten();
/** Every lever, in spec order (identity, semantic, components; parts in anatomy order as written). */
export const LEVERS: readonly Lever[] = flat.levers;
/** Every per-state variable kit.css rules set. */
export const STATE: readonly StateVar[] = flat.state;
export const BY_PATH: ReadonlyMap<string, Lever> = new Map(LEVERS.map((l) => [l.path, l]));
export const BY_NAME: ReadonlyMap<string, Lever> = new Map(LEVERS.map((l) => [l.name, l]));
/** The anatomy of every component: its parts in render order, which are its data-slot names. */
export const ANATOMY: Readonly<Record<string, readonly string[]>> = Object.fromEntries(Object.entries(COMPONENTS).map(([k, c]) => [k, (c as ComponentDef).anatomy]));

/** The CSS name a path resolves to (`@primary` → --primary). */
export function pathCss(path: string): string {
  const l = BY_PATH.get(path);
  if (l) return l.css;
  if (path.startsWith("@")) return `--${path.slice(1)}`;
  return cssName(path);
}
