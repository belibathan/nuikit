// Renderer packs (docs/intents.md §9): a resource that declares `nuikit_renderer '<kind>'` ships a
// module (built with nuikitModule()) whose default export is a renderer, or a record of renderers by
// kind. client/renderers.lua tells this page which pack draws each kind; this loader fetches the
// pack's script through the host's module loader, picks the renderer for the kind, gives the pack
// a shadow root of its own (its CSS scoped, the server theme inherited) and hands the renderer to
// the frame, which mounts it like a default. Anything that fails falls back to the default renderer
// and is reported to Lua (an F8 line, and the doctor's `renderer-failed` finding).
//
//   Lua → page   nuikit:renderer { op = 'state', active = { [kind] = { resource, url, gen } } }
//   page → Lua   POST nuikit:renderer:sync {}                       page (re)loaded: send the state
//                POST nuikit:renderer:failed { kind, resource, url, message }
import { fetchNui, isBrowser, onNui } from "nuikit-core";
import { hoist, scopeStylesheet, type Host } from "nuikit-core/host";
import { INTENT_KINDS, INTENT_VERSIONS, type IntentKind, type RendererDefinition } from "nuikit-core/intents";

export interface PackEntry {
  resource: string;
  url: string;
  /** Bumped by Lua each time the pack (re)starts, so a restart reloads its build. */
  gen?: number;
}
/** What Lua sends: the pack that draws each kind (a kind that is absent uses the default). */
export type PackState = Partial<Record<IntentKind, PackEntry>>;

export interface PackRenderer {
  resource: string;
  url: string;
  gen: number;
  def: RendererDefinition;
  /** Where the frame mounts this renderer: an element inside the pack's shadow root. Remove it on cleanup. */
  mountEl(): HTMLElement;
  /** The pack's portal element (overlays), inside its shadow root. */
  portal: HTMLElement;
}

export interface RendererPacks {
  /** Apply the active packs Lua sent. Resolves once every load has settled (for tests). */
  apply(active: PackState): Promise<void>;
  /** The pack renderer for a kind, or undefined: the default draws it. */
  get(kind: IntentKind): PackRenderer | undefined;
  subscribe(listener: () => void): () => void;
  /** For devtools: the state of every kind. */
  status(): Record<IntentKind, { resource: string; status: "loading" | "ready" | "failed"; error?: string } | null>;
}

export interface RendererPacksOptions {
  /** Where the packs' containers go (the frame's element). */
  container?: HTMLElement;
  /** A pack failed for a kind; the default draws it. In game this is posted to Lua. */
  onFailed?(info: { kind: IntentKind; resource: string; url: string; message: string }): void;
  /** Shadow root mode: "closed" in game; "open" for tests and screenshots. */
  shadowMode?: ShadowRootMode;
}

interface Pack {
  resource: string;
  url: string;
  gen: number;
  key: string;
  exports: Promise<unknown>;
  el: HTMLElement;
  shadow: ShadowRoot;
  portal: HTMLElement;
  /** Stylesheets adopted so far, by their text (one build's CSS is shared by every renderer in it). */
  sheets: Set<string>;
}

const keyOf = (e: PackEntry) => `${e.resource}|${e.url}|${e.gen ?? 0}`;

/**
 * The module's default export is one renderer (`defineReactRenderer({ kind: 'notify', … })`) or a
 * record / list of them; find the one for `kind`.
 */
export function pickRenderer(exports: unknown, kind: IntentKind): RendererDefinition {
  const isRenderer = (v: unknown): v is RendererDefinition =>
    !!v && typeof v === "object" && typeof (v as RendererDefinition).mount === "function" && typeof (v as RendererDefinition).kind === "string";
  if (isRenderer(exports)) {
    if (exports.kind === kind) return exports;
    throw new Error(`the module's renderer draws "${exports.kind}", not "${kind}"`);
  }
  if (exports && typeof exports === "object") {
    const list = Array.isArray(exports) ? exports : Object.values(exports as Record<string, unknown>);
    const byKey = !Array.isArray(exports) ? (exports as Record<string, unknown>)[kind] : undefined;
    const found = isRenderer(byKey) && byKey.kind === kind ? byKey : list.find((v) => isRenderer(v) && v.kind === kind);
    if (found) return found as RendererDefinition;
    const kinds = list.filter(isRenderer).map((r) => r.kind);
    throw new Error(kinds.length ? `the module has no renderer for "${kind}" (it has: ${kinds.join(", ")})` : "the module exports no renderer (defineRenderer / defineReactRenderer)");
  }
  throw new Error("the module exports no renderer (defineRenderer / defineReactRenderer)");
}

export function createRendererPacks(host: Pick<Host, "fetchModule">, options: RendererPacksOptions = {}): RendererPacks {
  const container = options.container ?? document.body;
  const packs = new Map<string, Pack>();
  const active = new Map<IntentKind, PackRenderer>();
  const state = new Map<IntentKind, { resource: string; status: "loading" | "ready" | "failed"; error?: string }>();
  /** The latest apply() per kind wins; an older load that lands later is ignored. */
  const tokens = new Map<IntentKind, number>();
  let token = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const createPack = (entry: PackEntry): Pack => {
    const el = document.createElement("nk-pack");
    el.setAttribute("data-resource", entry.resource);
    el.style.display = "contents";
    const shadow = el.attachShadow({ mode: options.shadowMode ?? "closed" });
    const portal = document.createElement("div");
    portal.className = "dark";
    portal.setAttribute("data-nk-portal", "");
    portal.style.display = "contents";
    shadow.appendChild(portal);
    container.appendChild(el);
    const pack: Pack = {
      resource: entry.resource,
      url: entry.url,
      gen: entry.gen ?? 0,
      key: keyOf(entry),
      exports: host.fetchModule({ resource: entry.resource, url: entry.url, portal: () => portal }),
      el,
      shadow,
      portal,
      sheets: new Set(),
    };
    pack.exports.catch(() => {}); // reported per kind
    return pack;
  };

  const dropPack = (pack: Pack) => {
    packs.delete(pack.resource);
    pack.el.remove();
  };

  const adoptCss = (pack: Pack, css: string | undefined) => {
    if (!css || pack.sheets.has(css)) return;
    pack.sheets.add(css);
    if (typeof CSSStyleSheet === "undefined" || !("adoptedStyleSheets" in pack.shadow)) return;
    const { sheet, hoisted } = scopeStylesheet(css, ":host");
    if (hoisted.length) hoist(hoisted);
    pack.shadow.adoptedStyleSheets = [...pack.shadow.adoptedStyleSheets, sheet];
  };

  const fail = (kind: IntentKind, entry: PackEntry, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[nuikit] renderer pack ${entry.resource} failed for ${kind}, using the default:`, message);
    state.set(kind, { resource: entry.resource, status: "failed", error: message });
    active.delete(kind);
    options.onFailed?.({ kind, resource: entry.resource, url: entry.url, message });
  };

  const load = async (kind: IntentKind, entry: PackEntry) => {
    const mine = ++token;
    tokens.set(kind, mine);
    let pack = packs.get(entry.resource);
    if (pack && pack.key !== keyOf(entry)) {
      // The pack restarted (new gen) or moved: everything of it reloads.
      for (const [k, r] of active) if (r.resource === pack.resource) active.delete(k);
      dropPack(pack);
      pack = undefined;
    }
    if (!pack) {
      pack = createPack(entry);
      packs.set(entry.resource, pack);
    }
    // Another pack owned this kind: the default draws while the new one loads.
    if (active.get(kind)?.resource !== entry.resource) active.delete(kind);
    state.set(kind, { resource: entry.resource, status: "loading" });
    notify();
    try {
      const exports = await pack.exports;
      if (tokens.get(kind) !== mine) return;
      const def = pickRenderer(exports, kind);
      if (def.version !== undefined && def.version < INTENT_VERSIONS[kind]) {
        console.warn(`[nuikit] renderer pack ${entry.resource}: its ${kind} renderer is for schema v${def.version}; the runtime draws v${INTENT_VERSIONS[kind]}`);
      }
      adoptCss(pack, def.css);
      const p = pack;
      active.set(kind, {
        resource: p.resource,
        url: p.url,
        gen: p.gen,
        def,
        portal: p.portal,
        mountEl: () => {
          const el = document.createElement("div");
          el.className = "dark";
          el.setAttribute("data-nk-root", "");
          el.setAttribute("data-renderer", kind);
          el.style.cssText = "position:absolute;inset:0;pointer-events:none";
          p.shadow.insertBefore(el, p.portal);
          return el;
        },
      });
      state.set(kind, { resource: entry.resource, status: "ready" });
    } catch (error) {
      if (tokens.get(kind) !== mine) return;
      fail(kind, entry, error);
    }
    notify();
  };

  const api: RendererPacks = {
    async apply(next) {
      const waits: Promise<void>[] = [];
      for (const kind of INTENT_KINDS) {
        const want = next[kind];
        const have = active.get(kind);
        const pending = state.get(kind);
        if (!want) {
          tokens.set(kind, ++token); // an in-flight load for this kind lands on nothing
          if (have || pending) {
            active.delete(kind);
            state.delete(kind);
            notify();
          }
          continue;
        }
        const key = keyOf(want);
        const current = packs.get(want.resource);
        const same = current?.key === key && (have?.resource === want.resource || pending?.resource === want.resource);
        if (same) continue;
        waits.push(load(kind, want));
      }
      await Promise.all(waits);
      // Packs nothing uses any more (stopped, or replaced by another pack for every kind) go.
      const used = new Set([...active.values()].map((r) => r.resource));
      for (const [, s] of state) if (s.status === "loading") used.add(s.resource);
      for (const pack of [...packs.values()]) if (!used.has(pack.resource)) dropPack(pack);
    },
    get: (kind) => active.get(kind),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    status() {
      const out = {} as ReturnType<RendererPacks["status"]>;
      for (const kind of INTENT_KINDS) out[kind] = state.get(kind) ?? null;
      return out;
    },
  };
  return api;
}

let packs_: RendererPacks | null = null;

/** The page's one loader (main.tsx creates it with the host; the frame and devtools use it). */
export function rendererPacks(host?: Pick<Host, "fetchModule">, options?: RendererPacksOptions): RendererPacks {
  if (!packs_) {
    if (!host) throw new Error("[nuikit] rendererPacks(): create it with the host first");
    packs_ = createRendererPacks(host, {
      onFailed: (info) => {
        if (!isBrowser()) void fetchNui("nuikit:renderer:failed" as never, info as never).catch(() => {});
      },
      ...options,
    });
    onNui("nuikit:renderer" as never, ((msg: { op?: string; active?: PackState }) => {
      if (msg && msg.op === "state") void packs_!.apply(msg.active ?? {});
    }) as never);
    // The page (re)loaded: ask Lua which packs are running.
    if (!isBrowser()) void fetchNui("nuikit:renderer:sync" as never).catch(() => {});
  }
  return packs_;
}
