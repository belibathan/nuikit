/**
 * The arsenal spec's shape (docs/README.md › arsenal). Every domain of the public API is one file in this folder
 * that `export default`s a `DomainSpec`. The spec is the source: `scripts/arsenal.mjs` generates `arsenal.json`
 * (and the site's /kit page) from it, and tests fail when the code on either side drifts from it.
 *
 * Naming (enforced by naming.ts): Lua `nk.<lua>.<verb>`, JS `nuikit-core/<js>`, events `nuikit:<lua>:<event>`.
 * An older name survives only as a `legacy` row with the version it goes away in.
 */

export type Side = "js" | "lua" | "both";
export type Status = "stable" | "unproven";
/** call: a function · hook: a React hook · component: a React component · handle: a method on a returned object · const / type: data. */
export type EntryKind = "call" | "hook" | "component" | "handle" | "const" | "type" | "intent";

export interface EntrySpec {
  /** The canonical short name inside the domain ("define", "open"). */
  name: string;
  kind: EntryKind;
  /** One line, no essay. */
  doc: string;
  /** The JS export (from `nuikit-core/<domain>`), when the page side has it. */
  js?: string;
  /** More JS exports this row covers (a family of constants: the token tables). */
  also?: string[];
  /** The Lua path (`nk.surface.define`), when the Lua side has it. */
  lua?: string;
  /**
   * Where the Lua implementation lives today, when it is not `lua` itself (`NUI.surface`). The generated
   * lua/api.lua binds `lua` to it, and the old path becomes a legacy alias (listed in arsenal.json with `removeIn`).
   */
  /** Or a Lua expression (starts with `function`) when no function holds it (a flag: `nk.host.isHosted`). */
  impl?: string;
  /** Signatures, one line each. */
  sig?: { js?: string; lua?: string };
  /** Why only one side has it ("lua only: focus natives run in Lua"). Required when js or lua is missing. */
  only?: string;
  since: string;
  status?: Status;
  /** "nuikit": the Lua path exists only inside the nuikit resource (the store side of a service). */
  scope?: "nuikit";
}

/** Who may send an event. runtime: nuikit.lua / nuikit-core themselves · owner: the resource that owns the thing · nuikit: the nuikit resource · any: any resource. */
export type Sender = "runtime" | "owner" | "nuikit" | "any";
/** lua→page: SendNUIMessage · page→lua: a NUI callback (fetchNui) · local: TriggerEvent between client resources · net: client → server. */
export type Direction = "lua→page" | "page→lua" | "local" | "net";

export interface EventSpec {
  /** Canonical name: `nuikit:<lua>:<event>`. */
  name: string;
  dir: Direction;
  /** The payload as a TypeScript type (for page↔Lua events: the page-side type). */
  payload: string;
  /** The reply, for page→lua callbacks. */
  reply?: string;
  sender: Sender;
  doc: string;
  /** The name on the wire today when it differs from `name` (protocol 1); renamed in the next protocol. */
  wire?: string;
  since: string;
}

export interface LegacySpec {
  /** The old name as code calls it (`NUI.surface`, `nk.notify`, `nuikit:surfaces`). */
  old: string;
  /** The canonical replacement. */
  now: string;
  removeIn: string;
  /** Lua for the alias when it is not a plain rename (`function() nk.intent.cancelAll('prompt') end`); the generated legacy.lua assigns it. */
  shim?: string;
}

export interface DomainSpec {
  /** The JS name: `nuikit-core/<js>`. */
  js: string;
  /** The Lua name: `nk.<lua>`; also the event prefix `nuikit:<lua>:`. */
  lua: string;
  title: string;
  doc: string;
  /** The markdown doc for depth. */
  docs?: string;
  entries: EntrySpec[];
  events?: EventSpec[];
  legacy?: LegacySpec[];
  /** External calls brought in without rewrites: the adapter resource maps `from` onto the `to` entry. */
  adapters?: { from: string; to: string; pack: string }[];
  /** The Lua table today when the domain table takes over an existing one (`nk.intents`): the same table, renamed. */
  luaTable?: string;
  /** Type-only imports the event payload types need: module (relative to src/) → names. */
  imports?: Record<string, string[]>;
  /** Ownership and lifetime rules, one line each (services: who holds what, when it is released). */
  rules?: string[];
}
