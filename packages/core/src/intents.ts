/**
 * nuikit-core/intents: the nine intents (docs/intents.md): a script asks for `notify`, `menu`,
 * `input`, `confirm`, `progress`, `prompt`, `target`, `radial` or `challenge`; the `nuikit`
 * resource's frame draws it with a renderer. This module is the page side of the contract:
 *
 *   - the generated types (src/intents.generated.ts, from packages/core/intents/*.json),
 *   - `validateIntent(kind, props)`: the same checks lua/intents.lua runs, for renderers and tests,
 *   - the wire format between nuikit's Lua and its frame (IntentMessage, the callbacks),
 *   - `createIntentStore()`: what a renderer subscribes to,
 *   - `defineRenderer()`: the renderer module format, built on the host's module contract
 *     (nuikit-core/module) so a resource can replace one (`nuikit_renderer 'notify'`).
 *     React renderers: `defineReactRenderer()` in nuikit-core/intents-react.
 */
import { fetchNui, isBrowser, onNui } from "./index";
import { INTENT_DEFS, INTENT_KINDS, INTENT_SCHEMAS, type IntentKind, type IntentProps, type IntentResults } from "./intents.generated";
import type { ModuleContext, ModuleDefinition } from "./module";

export * from "./intents.generated";

// ───────────────────────────────── validation

/** One problem with a props table: where, and what. */
export interface IntentIssue {
  /** JSON-pointer-like path: "items[2].label". "" is the root. */
  path: string;
  message: string;
}

type SchemaType =
  | { type: "string"; minLength?: number; maxLength?: number }
  | { type: "number" | "integer"; min?: number; max?: number }
  | { type: "boolean" }
  | { type: "any" }
  | { type: "enum"; values: readonly string[] }
  | { type: "ref"; ref: string }
  | { type: "self" }
  | { type: "oneOf"; of: readonly SchemaType[] }
  | { type: "array"; items: SchemaType; minItems?: number; maxItems?: number }
  | { type: "object"; props?: Record<string, SchemaProp>; open?: boolean };
type SchemaProp = SchemaType & { required?: boolean; default?: unknown; doc?: string };

const defs = INTENT_DEFS as unknown as Record<string, SchemaType>;

function typeName(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function check(t: SchemaType, v: unknown, path: string, self: SchemaType | undefined, out: IntentIssue[]): boolean {
  const before = out.length;
  const fail = (message: string) => {
    out.push({ path, message });
    return false;
  };
  switch (t.type) {
    case "any":
      return true;
    case "ref":
      return check(defs[t.ref]!, v, path, self, out);
    case "self":
      return self ? check(self, v, path, self, out) : true;
    case "string":
      if (typeof v !== "string") return fail(`expected a string, got ${typeName(v)}`);
      if (t.minLength !== undefined && v.length < t.minLength) return fail(`at least ${t.minLength} characters`);
      if (t.maxLength !== undefined && v.length > t.maxLength) return fail(`at most ${t.maxLength} characters`);
      return true;
    case "number":
    case "integer":
      if (typeof v !== "number" || !Number.isFinite(v)) return fail(`expected a number, got ${typeName(v)}`);
      if (t.type === "integer" && !Number.isInteger(v)) return fail(`expected a whole number, got ${v}`);
      if (t.min !== undefined && v < t.min) return fail(`must be ≥ ${t.min}`);
      if (t.max !== undefined && v > t.max) return fail(`must be ≤ ${t.max}`);
      return true;
    case "boolean":
      return typeof v === "boolean" ? true : fail(`expected true or false, got ${typeName(v)}`);
    case "enum":
      return typeof v === "string" && t.values.includes(v) ? true : fail(`expected one of ${t.values.join(", ")}, got ${JSON.stringify(v)}`);
    case "oneOf": {
      // Try each alternative quietly; report only when none fits.
      for (const alt of t.of) {
        const scratch: IntentIssue[] = [];
        if (check(alt, v, path, self, scratch)) return true;
      }
      return fail(`expected ${t.of.map(describe).join(" or ")}, got ${typeName(v)}`);
    }
    case "array": {
      if (!Array.isArray(v)) return fail(`expected a list, got ${typeName(v)}`);
      if (t.minItems !== undefined && v.length < t.minItems) fail(`needs at least ${t.minItems} ${t.minItems === 1 ? "entry" : "entries"}`);
      if (t.maxItems !== undefined && v.length > t.maxItems) fail(`at most ${t.maxItems} entries`);
      v.forEach((item, i) => check(t.items, item, `${path}[${i + 1}]`, self, out));
      return out.length === before;
    }
    case "object": {
      if (!v || typeof v !== "object" || Array.isArray(v)) return fail(`expected a table, got ${typeName(v)}`);
      const nextSelf = t.props && Object.keys(t.props).length ? t : self;
      const obj = v as Record<string, unknown>;
      for (const [key, prop] of Object.entries(t.props ?? {})) {
        const child = path ? `${path}.${key}` : key;
        if (obj[key] === undefined || obj[key] === null) {
          if (prop.required) out.push({ path: child, message: "is required" });
          continue;
        }
        check(prop, obj[key], child, nextSelf, out);
      }
      // Unknown keys are allowed: schemas are supersets and adapters carry library-specific fields through.
      return out.length === before;
    }
  }
}

function describe(t: SchemaType): string {
  switch (t.type) {
    case "ref":
      return t.ref;
    case "enum":
      return t.values.map((x) => `'${x}'`).join(" | ");
    case "array":
      return "a list";
    case "object":
      return "a table";
    default:
      return t.type;
  }
}

/**
 * Validate the props of an intent against its schema. Unknown keys pass (supersets); wrong types,
 * out-of-range numbers, bad enum words and missing required fields are reported with their path.
 */
export function validateIntent<K extends IntentKind>(kind: K, props: unknown): IntentIssue[] {
  const schema = INTENT_SCHEMAS[kind] as unknown as { props: Record<string, SchemaProp> } | undefined;
  if (!schema) return [{ path: "", message: `unknown intent "${String(kind)}" (one of ${INTENT_KINDS.join(", ")})` }];
  const out: IntentIssue[] = [];
  check({ type: "object", props: schema.props }, props, "", undefined, out);
  return out;
}

/** Fill schema defaults into a copy of props (top level only; nested defaults are the renderer's). */
export function withIntentDefaults<K extends IntentKind>(kind: K, props: IntentProps[K]): IntentProps[K] {
  const schema = INTENT_SCHEMAS[kind] as unknown as { props: Record<string, SchemaProp> };
  const out = { ...(props as Record<string, unknown>) };
  for (const [key, prop] of Object.entries(schema.props)) {
    if (out[key] === undefined && prop.default !== undefined) out[key] = prop.default;
  }
  return out as unknown as IntentProps[K];
}

// ───────────────────────────────── wire format (nuikit's Lua ⇄ its frame)

/** Why an intent ended without a result. */
export type IntentReason = "escape" | "close" | "back" | "submenu" | "timeout" | "cancel" | "replaced" | "stopped";

/** One open intent as the frame sees it. */
export interface IntentInstance<K extends IntentKind = IntentKind> {
  id: string;
  kind: K;
  /** The resource that asked for it. */
  resource: string;
  props: IntentProps[K];
  /** Open order across every kind (the stack). */
  seq: number;
  /** GetGameTimer() when opened, for timers that must survive a page reload. */
  at?: number;
}

/** `nuikit:intent` messages, Lua → frame. */
export type IntentMessage =
  | { op: "open"; intent: IntentInstance }
  | { op: "update"; id: string; props: Record<string, unknown> }
  | { op: "cancel"; id: string; reason?: IntentReason }
  | { op: "sync"; intents: IntentInstance[] };

/** Callbacks the frame POSTs to nuikit's Lua. */
export interface IntentCallbacks {
  /** The intent ended: with a result (resolve), or without one and a reason. */
  "nuikit:intent:resolve": { req: { id: string; result?: unknown; reason?: IntentReason; data?: unknown }; res: { ok: boolean } };
  /** Something happened the caller may listen to (a highlight moved, a checkbox toggled). */
  "nuikit:intent:event": { req: { id: string; event: string; data?: unknown }; res: { ok: boolean } };
}

declare module "./index" {
  interface NuiEvents {
    "nuikit:intent": IntentMessage;
  }
  interface NuiCallbacks extends IntentCallbacks {}
}

// ───────────────────────────────── the store (one per frame)

export interface IntentStore {
  /** Open intents of one kind, bottom → top. */
  list<K extends IntentKind>(kind: K): IntentInstance<K>[];
  /** Every open intent, bottom → top. */
  all(): IntentInstance[];
  /** Re-runs after any change to that kind. */
  subscribe(kind: IntentKind, listener: () => void): () => void;
  /** End an intent with a result (the Lua call returns it). */
  resolve<K extends IntentKind>(id: string, result: IntentResults[K], data?: unknown): void;
  /** End an intent without a result: a reason, and what it needs (the submenu id for "submenu"). */
  cancel(id: string, reason?: IntentReason, data?: unknown): void;
  /** Tell the caller something happened; the intent stays open. */
  emit(id: string, event: string, data?: unknown): void;
  /** Apply a message as Lua would send it (dev fixtures, tests). */
  apply(msg: IntentMessage): void;
  /** Escape on the kind's surface: the top intent of that kind decides. Renderers register here. */
  onBack(kind: IntentKind, handler: () => void): () => void;
  back(kind: IntentKind): void;
  /** What left the page (dev: a log; tests: assertions). */
  onPost(handler: (name: string, body: unknown) => void): () => void;
}

let store: IntentStore | null = null;

/** The frame's one store. Listens to `nuikit:intent`; posts resolve/event to nuikit's Lua. */
export function createIntentStore(): IntentStore {
  if (store) return store;
  let seq = 0;
  const open = new Map<string, IntentInstance>();
  const listeners = new Map<IntentKind, Set<() => void>>();
  const backs = new Map<IntentKind, Set<() => void>>();
  const posts = new Set<(name: string, body: unknown) => void>();
  const cache = new Map<IntentKind, IntentInstance[]>();

  const changed = (kind: IntentKind) => {
    cache.delete(kind);
    listeners.get(kind)?.forEach((l) => l());
  };
  const post = (name: "nuikit:intent:resolve" | "nuikit:intent:event", body: unknown) => {
    posts.forEach((h) => h(name, body));
    if (isBrowser()) return;
    void fetchNui(name as never, body as never).catch(() => {});
  };
  const drop = (id: string) => {
    const it = open.get(id);
    if (!it) return null;
    open.delete(id);
    changed(it.kind);
    return it;
  };

  const s: IntentStore = {
    list(kind) {
      let list = cache.get(kind);
      if (!list) {
        list = [...open.values()].filter((i) => i.kind === kind).sort((a, b) => a.seq - b.seq);
        cache.set(kind, list);
      }
      return list as IntentInstance<typeof kind>[];
    },
    all: () => [...open.values()].sort((a, b) => a.seq - b.seq),
    subscribe(kind, listener) {
      let set = listeners.get(kind);
      if (!set) listeners.set(kind, (set = new Set()));
      set.add(listener);
      return () => {
        set!.delete(listener);
      };
    },
    resolve(id, result, data) {
      if (!drop(id)) return;
      post("nuikit:intent:resolve", { id, result: result as unknown, data });
    },
    cancel(id, reason = "close", data) {
      if (!drop(id)) return;
      post("nuikit:intent:resolve", { id, reason, data });
    },
    emit(id, event, data) {
      if (!open.has(id)) return;
      post("nuikit:intent:event", { id, event, data });
    },
    apply(msg) {
      if (!msg || typeof msg !== "object") return;
      if (msg.op === "open") {
        const it = { ...msg.intent, seq: msg.intent.seq ?? ++seq };
        const prev = open.get(it.id);
        open.set(it.id, it);
        if (prev && prev.kind !== it.kind) changed(prev.kind);
        changed(it.kind);
      } else if (msg.op === "update") {
        const it = open.get(msg.id);
        if (!it) return;
        open.set(msg.id, { ...it, props: { ...(it.props as object), ...msg.props } as typeof it.props });
        changed(it.kind);
      } else if (msg.op === "cancel") {
        drop(msg.id);
      } else if (msg.op === "sync") {
        const kinds = new Set<IntentKind>([...open.values()].map((i) => i.kind));
        open.clear();
        for (const it of msg.intents ?? []) {
          open.set(it.id, { ...it, seq: it.seq ?? ++seq });
          kinds.add(it.kind);
        }
        kinds.forEach(changed);
      }
    },
    onBack(kind, handler) {
      let set = backs.get(kind);
      if (!set) backs.set(kind, (set = new Set()));
      set.add(handler);
      return () => {
        set!.delete(handler);
      };
    },
    back(kind) {
      const set = backs.get(kind);
      if (set?.size) set.forEach((h) => h());
      else {
        const top = s.list(kind).at(-1);
        if (top) s.cancel(top.id, "escape");
      }
    },
    onPost(handler) {
      posts.add(handler);
      return () => {
        posts.delete(handler);
      };
    },
  };
  onNui("nuikit:intent", (msg) => s.apply(msg));
  store = s;
  return s;
}

/** For tests. */
export function __resetIntentStore(): void {
  store = null;
}

// ───────────────────────────────── renderers (the module format)

/** What a renderer gets from the frame, on top of the host's module context. */
export interface RendererContext<K extends IntentKind = IntentKind> extends ModuleContext {
  kind: K;
  store: IntentStore;
  /** The open intents of this kind, bottom → top. */
  intents(): IntentInstance<K>[];
  subscribe(listener: () => void): () => void;
  resolve(id: string, result: IntentResults[K], data?: unknown): void;
  cancel(id: string, reason?: IntentReason, data?: unknown): void;
  emit(id: string, event: string, data?: unknown): void;
  /** Escape on this kind's surface. Register to decide (a menu with canClose = false ignores it). */
  onBack(handler: () => void): () => void;
}

export interface RendererDefinition<K extends IntentKind = IntentKind> extends Omit<ModuleDefinition, "mount"> {
  kind: K;
  /** The schema version this renderer draws. The frame warns when the runtime's is newer. */
  version?: number;
  mount(el: HTMLElement, ctx: RendererContext<K>): void | (() => void);
}

/** Declare a renderer for one intent (any framework: it gets an element and a context). */
export function defineRenderer<K extends IntentKind>(def: RendererDefinition<K>): RendererDefinition<K> {
  if (!def || typeof def.mount !== "function") throw new Error("[nuikit] defineRenderer needs a mount(el, ctx) function");
  if (!INTENT_KINDS.includes(def.kind)) throw new Error(`[nuikit] defineRenderer: unknown intent "${String(def.kind)}"`);
  return def;
}

/** Build a renderer's context from the frame's store and the host's module context. */
export function rendererContext<K extends IntentKind>(kind: K, s: IntentStore, base: ModuleContext): RendererContext<K> {
  return {
    ...base,
    kind,
    store: s,
    intents: () => s.list(kind),
    subscribe: (l) => s.subscribe(kind, l),
    resolve: (id, result, data) => s.resolve(id, result, data),
    cancel: (id, reason, data) => s.cancel(id, reason, data),
    emit: (id, event, data) => s.emit(id, event, data),
    onBack: (h) => s.onBack(kind, h),
  };
}
