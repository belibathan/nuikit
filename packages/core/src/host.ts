/**
 * nuikit-core/host: the page of the `nuikit` resource when it hosts other resources' UIs in one
 * frame (docs/host.md). One React, one theme, one document; each module in its own isolated
 * container with its own error boundary, talking only to its own resource's Lua.
 *
 *   import { createHost } from "nuikit-core/host";
 *   createHost();          // in game: nuikit's Lua tells it which modules to load
 *
 * Wire format (nuikit's Lua ⇄ this page):
 *   { action = 'nuikit:host:load', data = { resource, url, token } }   load + mount a module
 *   { action = 'nuikit:host:unload', data = resource }                  unmount it
 *   { nkm = resource, action, data }                                    a message for one module
 *   POST https://nuikit/nuikit:host:call  { t = token, n = name, d = data }   a module's callback
 *   POST https://nuikit/nuikit:host:ready                              page loaded: resend loads
 *   POST https://nuikit/nuikit:host:error  { resource, message }       a module failed
 */
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as ReactDOMClient from "react-dom/client";
import * as JSXRuntime from "react/jsx-runtime";
import { HOST_CTX_KEY, type HostedContext, type HostedMessage } from "./hosted";
import type { ModuleDefinition } from "./module";

export type Isolation = "shadow" | "scoped";

export interface HostOptions {
  /**
   * How each module's CSS is kept to itself.
   * "shadow" (default): a closed shadow root per module. Strongest; portals are redirected into it.
   * "scoped": no shadow root; every selector is prefixed with [data-nk="<resource>"].
   */
  isolation?: Isolation;
  /** Where module containers go. Default document.body. */
  container?: HTMLElement;
  /** Override in-game detection (tests, benchmarks). */
  inGame?: boolean;
  /**
   * Which `message` events count as coming from Lua. "parent" (default): trusted events whose
   * source is the parent frame (FiveM's root page relays SendNUIMessage). "any": every trusted
   * event (fallback if a client delivers them differently; see docs/host.md).
   */
  trust?: "parent" | "any";
  /** Observe loads, mounts and failures (devtools, benchmarks). */
  onEvent?: (event: HostEvent) => void;
  /** "closed" (default) keeps modules out of each other's shadow roots; "open" for tests and benchmarks. */
  shadowMode?: ShadowRootMode;
}

export interface HostEvent {
  type: "load" | "mount" | "error" | "unload";
  resource: string;
  /** ms since the load started (mount), or the error message. */
  ms?: number;
  message?: string;
}

export interface ModuleInfo {
  resource: string;
  url: string;
  status: "loading" | "mounted" | "failed" | "unloaded";
  error?: string;
  /** Script fetched + evaluated, ms. */
  loadMs?: number;
  /** mount() call, ms. */
  mountMs?: number;
  calls: number;
  messages: number;
}

interface Record_ extends ModuleInfo {
  token: string;
  script?: HTMLScriptElement;
  el?: HTMLElement;
  root?: HTMLElement;
  portal?: HTMLElement;
  sheet?: CSSStyleSheet;
  listeners: Set<(msg: HostedMessage) => void>;
  /** Held until the module is listening (status "mounted"): script loading, then its listeners attaching. */
  queue: HostedMessage[];
  /** The module said its listeners are attached (ctx.ready(), or mount() returned for a "mount" module). */
  ready: boolean;
  defined: boolean;
  cleanup?: () => void;
  started: number;
}

export interface Host {
  /** Load and mount a module (in game nuikit's Lua does this). */
  load(spec: { resource: string; url: string; token?: string }): void;
  unload(resource: string): void;
  /** Deliver a message to one module, as nuikit's Lua does with { nkm = resource }. */
  send(resource: string, action: string, data?: unknown): void;
  modules(): ModuleInfo[];
  /**
   * Renderer packs (docs/intents.md §9): load a module script from another resource and hand
   * back what it exported (its default export), without mounting it; the frame mounts renderers
   * itself. `portal` is where the module's React portals aimed at document.body go (the pack's
   * own portal element). Rejects when the script can't load, throws, or defines nothing in time.
   */
  fetchModule(spec: { resource: string; url: string; portal?: () => Element; timeoutMs?: number }): Promise<unknown>;
}

/** Surfaces fill the screen; only their content takes clicks (mirrors SURFACE_CSS in react.ts). */
const SURFACE_CSS = "[data-surface]{position:fixed;inset:0;pointer-events:none}[data-surface]>*{pointer-events:auto}";

declare global {
  interface Window {
    __nuikit?: { define(factory: (deps: ModuleDeps) => unknown): void };
  }
}

export interface ModuleDeps {
  react: typeof React;
  reactDom: typeof ReactDOM;
  reactDomClient: typeof ReactDOMClient;
  jsxRuntime: typeof JSXRuntime;
}

/** Messages held per module while it is not listening yet. */
const QUEUE_MAX = 200;
/** How long a "signal" module may take to call ready() before its messages are delivered anyway. */
const READY_GRACE_MS = 10_000;

let created: Host | null = null;

export function createHost(options: HostOptions = {}): Host {
  if (created) return created;
  const isolation = options.isolation ?? "shadow";
  const container = options.container ?? document.body;
  const inGame = options.inGame ?? typeof window.GetParentResourceName === "function";
  const hostResource = typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "nuikit";
  const trust = options.trust ?? "parent";
  const emitEvent = options.onEvent ?? (() => {});

  // Captured before any module runs, so a module can't wrap them to read another's traffic.
  const nativeFetch = window.fetch.bind(window);
  const stringify = JSON.stringify;
  const parse = JSON.parse;
  const responseText = Response.prototype.text;
  const getData = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "data")!.get!;
  const getSource = Object.getOwnPropertyDescriptor(MessageEvent.prototype, "source")!.get!;
  const stop = Event.prototype.stopImmediatePropagation;
  const parentWindow = window.parent;

  const records = new Map<string, Record_>();
  const loads = new Map<string, number>();

  const post = async (name: string, body: unknown) => {
    const res = await nativeFetch(`https://${hostResource}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: stringify(body ?? {}),
    });
    const text = await responseText.call(res);
    return text ? parse(text) : {};
  };

  const report = (rec: Record_, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[nuikit host] ${rec.resource}:`, error);
    emitEvent({ type: "error", resource: rec.resource, message });
    if (inGame) void post("nuikit:host:error", { resource: rec.resource, message }).catch(() => {});
  };

  const fail = (rec: Record_, error: unknown) => {
    rec.status = "failed";
    rec.error = error instanceof Error ? error.message : String(error);
    try {
      rec.cleanup?.();
    } catch {
      /* already broken */
    }
    rec.cleanup = undefined;
    report(rec, error);
  };

  // ── messages from Lua

  window.addEventListener(
    "message",
    (e: MessageEvent) => {
      const msg = getData.call(e) as { nkm?: unknown; action?: unknown; data?: unknown } | null;
      if (!msg || typeof msg !== "object") return;
      const internal = typeof msg.nkm === "string" || (typeof msg.action === "string" && msg.action.startsWith("nuikit:host:"));
      if (!internal) return;
      // Nobody else sees host traffic (other modules included).
      stop.call(e);
      const fromLua = e.isTrusted && (trust === "any" || getSource.call(e) === parentWindow);
      if (!fromLua) return;
      if (typeof msg.nkm === "string") host.send(msg.nkm, String(msg.action), msg.data);
      else if (msg.action === "nuikit:host:load") host.load(msg.data as { resource: string; url: string; token: string });
      else if (msg.action === "nuikit:host:unload") host.unload(String(msg.data));
    },
    true,
  );

  // Errors thrown from a module's code outside React rendering (timers, handlers).
  window.addEventListener("error", (e) => {
    for (const rec of records.values()) {
      if (e.filename && rec.url && e.filename.startsWith(rec.url.split("?")[0]!)) report(rec, e.error ?? e.message);
    }
  });

  // ── module scripts call window.__nuikit.define(factory) while they run

  const define = (factory: (deps: ModuleDeps) => unknown) => {
    const script = document.currentScript;
    // ── renderer packs: a script loaded by fetchModule() hands its exports back, nothing is mounted.
    const fetched = script ? fetches.get(script as HTMLScriptElement) : undefined;
    if (fetched) {
      fetches.delete(script as HTMLScriptElement);
      try {
        const exports = factory(depsWith(fetched.portal ?? (() => document.body)));
        fetched.resolve((exports as { default?: unknown })?.default ?? exports);
      } catch (error) {
        fetched.reject(error instanceof Error ? error : new Error(String(error)));
      }
      return;
    }
    // ── end renderer packs
    const rec = script ? [...records.values()].find((r) => r.script === script) : undefined;
    if (!rec || rec.defined) {
      console.warn("[nuikit host] define() ignored: not called by a module script the host loaded");
      return;
    }
    rec.defined = true;
    rec.loadMs = performance.now() - rec.started;
    emitEvent({ type: "load", resource: rec.resource, ms: rec.loadMs });
    createContainers(rec);

    const ctx: HostedContext = {
      resource: rec.resource,
      inGame,
      post: (name, data) => {
        if (rec.status === "unloaded") return Promise.reject(new Error("module unloaded"));
        rec.calls++;
        return post("nuikit:host:call", { t: rec.token, n: name, d: data });
      },
      listen: (handler) => {
        rec.listeners.add(handler);
        return () => {
          rec.listeners.delete(handler);
        };
      },
    };

    let exports: unknown;
    const g = globalThis as Record<string, unknown>;
    Object.defineProperty(g, HOST_CTX_KEY, { value: ctx, configurable: true });
    try {
      exports = factory(depsFor(rec));
    } catch (error) {
      return fail(rec, error);
    } finally {
      delete g[HOST_CTX_KEY];
    }
    const def = ((exports as { default?: ModuleDefinition })?.default ?? exports) as ModuleDefinition;
    if (!def || typeof def.mount !== "function") return fail(rec, new Error("module has no default export from defineModule()"));
    mount(rec, def);
  };
  Object.defineProperty(window, "__nuikit", { value: Object.freeze({ define }), writable: false, configurable: false });

  // Every module gets the host's React. Its react-dom is a copy whose createPortal sends
  // portals aimed at document.body (Radix, shadcn) into the module's own portal container.
  const depsWith = (portal: () => Element): ModuleDeps => {
    const reactDom = {
      ...ReactDOM,
      createPortal: (children: React.ReactNode, target: Element | DocumentFragment, key?: string | null) =>
        ReactDOM.createPortal(children, target === document.body ? portal() : target, key),
    } as typeof ReactDOM & { default?: unknown };
    reactDom.default = reactDom;
    return { react: React, reactDom, reactDomClient: ReactDOMClient, jsxRuntime: JSXRuntime };
  };
  const depsFor = (rec: Record_): ModuleDeps => depsWith(() => rec.portal!);

  // ── renderer packs: scripts loaded for their exports (fetchModule), keyed by their <script>.
  const fetches = new Map<HTMLScriptElement, { portal?: () => Element; resolve: (exports: unknown) => void; reject: (error: Error) => void }>();
  const fetchCounts = new Map<string, number>();
  const FETCH_TIMEOUT_MS = 15_000;
  const fetchModule: Host["fetchModule"] = ({ resource, url, portal, timeoutMs = FETCH_TIMEOUT_MS }) =>
    new Promise<unknown>((resolve, reject) => {
      const script = document.createElement("script");
      const n = (fetchCounts.get(url) ?? 0) + 1;
      fetchCounts.set(url, n);
      // A restarted pack must load its new build, not the cached one.
      script.src = n > 1 ? `${url}${url.includes("?") ? "&" : "?"}v=${n}` : url;
      script.async = true;
      script.dataset.nkPack = resource;
      let done = false;
      const finish = (ok: boolean, value: unknown) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        fetches.delete(script);
        script.remove();
        if (ok) resolve(value);
        else reject(value as Error);
      };
      const timer = setTimeout(() => finish(false, new Error(`${url} loaded but defined no module within ${timeoutMs} ms (built with nuikitModule()?)`)), timeoutMs);
      fetches.set(script, { portal, resolve: (v) => finish(true, v), reject: (e) => finish(false, e) });
      script.onerror = () => finish(false, new Error(`could not load ${url}`));
      document.head.appendChild(script);
    });
  // ── end renderer packs

  const createContainers = (rec: Record_) => {
    const root = document.createElement("div");
    const portal = document.createElement("div");
    for (const el of [root, portal]) {
      el.className = "dark";
      el.style.display = "contents";
    }
    root.setAttribute("data-nk-root", "");
    portal.setAttribute("data-nk-portal", "");
    if (isolation === "shadow") {
      const el = document.createElement("nk-module");
      el.setAttribute("data-resource", rec.resource);
      el.style.display = "contents";
      const shadow = el.attachShadow({ mode: options.shadowMode ?? "closed" });
      shadow.append(root, portal);
      container.appendChild(el);
      rec.el = el;
    } else {
      root.setAttribute("data-nk", rec.resource);
      portal.setAttribute("data-nk", rec.resource);
      container.appendChild(root);
      document.body.appendChild(portal);
      rec.el = root;
    }
    rec.root = root;
    rec.portal = portal;
  };

  const shadowOf = (rec: Record_) => rec.root!.getRootNode() as ShadowRoot;

  const mount = (rec: Record_, def: ModuleDefinition) => {
    const t = performance.now();
    try {
      const { sheet, hoisted } = scopeStylesheet(def.css ?? "", isolation === "shadow" ? ":host" : `[data-nk="${cssEscape(rec.resource)}"]`);
      if (hoisted.length) hoist(hoisted);
      rec.sheet = sheet;
      if (isolation === "shadow") {
        shadowOf(rec).adoptedStyleSheets = [surfaceSheet(), sheet];
      } else {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      }
      const cleanup = def.mount(rec.root!, {
        resource: rec.resource,
        hosted: true,
        portal: rec.portal!,
        reportError: (e) => report(rec, e),
        ready: () => markReady(rec),
      });
      rec.cleanup = typeof cleanup === "function" ? cleanup : undefined;
      rec.mountMs = performance.now() - t;
      if (def.ready === "signal") {
        // The module calls ctx.ready() once its listeners are attached. A module that never does
        // would hold its messages forever: after a long grace period, deliver anyway and say so.
        setTimeout(() => {
          if (rec.ready || rec.status !== "loading") return;
          console.warn(`[nuikit host] ${rec.resource}: ready() was never called ${READY_GRACE_MS} ms after mount; delivering its messages anyway`);
          markReady(rec);
        }, READY_GRACE_MS);
      } else {
        markReady(rec);
      }
    } catch (error) {
      fail(rec, error);
    }
  };

  /**
   * The module is listening: report it mounted and deliver, in order, everything held back since
   * the load started. From here on send() delivers straight away.
   */
  const markReady = (rec: Record_) => {
    if (rec.ready || rec.status !== "loading") return;
    rec.ready = true;
    rec.status = "mounted";
    emitEvent({ type: "mount", resource: rec.resource, ms: performance.now() - rec.started });
    flushQueue(rec);
  };

  const flushQueue = (rec: Record_) => {
    while (rec.queue.length && rec.status === "mounted" && rec.listeners.size) deliver(rec, rec.queue.shift()!);
  };

  const deliver = (rec: Record_, msg: HostedMessage) => {
    rec.listeners.forEach((h) => {
      try {
        h(msg);
      } catch (error) {
        report(rec, error);
      }
    });
  };

  const host: Host = {
    load({ resource, url, token = "" }) {
      if (records.has(resource)) host.unload(resource);
      const rec: Record_ = {
        resource,
        url,
        token,
        status: "loading",
        listeners: new Set(),
        queue: [],
        ready: false,
        defined: false,
        started: performance.now(),
        calls: 0,
        messages: 0,
      };
      records.set(resource, rec);
      const script = document.createElement("script");
      // A restarted resource must load its new build, not the cached one.
      const n = (loads.get(resource) ?? 0) + 1;
      loads.set(resource, n);
      script.src = n > 1 ? `${url}${url.includes("?") ? "&" : "?"}v=${n}` : url;
      script.async = true;
      script.onerror = () => fail(rec, new Error(`could not load ${url}`));
      rec.script = script;
      document.head.appendChild(script);
    },
    unload(resource) {
      const rec = records.get(resource);
      if (!rec) return;
      records.delete(resource);
      rec.status = "unloaded";
      try {
        rec.cleanup?.();
      } catch (error) {
        report(rec, error);
      }
      rec.listeners.clear();
      rec.script?.remove();
      rec.el?.remove();
      rec.portal?.remove();
      if (rec.sheet && isolation === "scoped") document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== rec.sheet);
      emitEvent({ type: "unload", resource });
    },
    send(resource, action, data) {
      const rec = records.get(resource);
      if (!rec || rec.status === "failed") return;
      rec.messages++;
      const msg = { action, data };
      if (rec.status !== "mounted" || !rec.listeners.size || rec.queue.length) {
        // Not listening yet (script loading, or listeners still attaching): hold it, in order,
        // bounded; the handshake resends state anyway.
        if (rec.queue.push(msg) > QUEUE_MAX) rec.queue.shift();
        return;
      }
      deliver(rec, msg);
    },
    modules: () =>
      [...records.values()].map(({ resource, url, status, error, loadMs, mountMs, calls, messages }) => ({
        resource,
        url,
        status,
        error,
        loadMs,
        mountMs,
        calls,
        messages,
      })),
    fetchModule,
  };
  created = host;

  if (inGame) void post("nuikit:host:ready", {}).catch(() => {});
  return host;
}

// ───────────────────────────────── styles

let surfaceSheet_: CSSStyleSheet | null = null;
function surfaceSheet(): CSSStyleSheet {
  if (!surfaceSheet_) {
    surfaceSheet_ = new CSSStyleSheet();
    surfaceSheet_.replaceSync(SURFACE_CSS);
  }
  return surfaceSheet_;
}

const hoistedSeen = new Set<string>();
let hoistSheet: CSSStyleSheet | null = null;
/**
 * @property and @font-face are ignored inside shadow roots: register them on the document. Exported
 * for the frame, which gives renderer packs a shadow root of their own (docs/intents.md §9).
 */
export function hoist(rules: string[]) {
  if (!hoistSheet) {
    hoistSheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, hoistSheet];
  }
  for (const text of rules) {
    if (hoistedSeen.has(text)) continue;
    hoistedSeen.add(text);
    try {
      hoistSheet.insertRule(text, hoistSheet.cssRules.length);
    } catch {
      /* unsupported at-rule in this browser */
    }
  }
}

function cssEscape(s: string) {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, "\\$&");
}

const ROOT_LIKE = /^(?::root|html|:host|\.dark)$/;
const LEADING_ROOT = /^(:root|html|:host|\.dark)(\s*[>+~]\s*|\s+)(.+)$/s;
/** html[data-nk-motion="off"] …: document state (player prefs) set on the host's <html>, not the module's root. */
const DOC_STATE = /^(html(?:\[[^\]]+\])+)\s+(.+)$/s;

/** Split a selector list on top-level commas (not the ones inside :is(), :not(), […]). */
export function splitSelectors(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    const c = list[i]!;
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      out.push(list.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(list.slice(start).trim());
  return out.filter(Boolean);
}

/**
 * Rewrite one selector list for a module.
 *   scope ":host" (shadow root): :root/html/.dark → :host; everything else is already scoped.
 *   scope "[data-nk=x]": :root/html/.dark → the scope; everything else gets it as an ancestor.
 */
export function scopeSelector(selector: string, scope: string): string {
  const shadow = scope === ":host";
  return splitSelectors(selector)
    .map((s) => {
      if (ROOT_LIKE.test(s)) return scope;
      const d = DOC_STATE.exec(s);
      if (d) return shadow ? `:host-context(${d[1]}) ${d[2]}` : `${d[1]} ${scope} ${d[2]}`;
      const m = LEADING_ROOT.exec(s);
      if (m) return shadow ? `:host${m[2]}${m[3]}` : `${scope}${m[2]}${m[3]}`;
      return shadow ? s : `${scope} ${s}`;
    })
    .join(", ");
}

/** True for rules on the document root, where the theme's tokens live. */
const isRootRule = (selector: string) => splitSelectors(selector).every((s) => ROOT_LIKE.test(s));

/**
 * Turn a module's stylesheet into one that only styles that module:
 *  - selectors scoped (see scopeSelector);
 *  - custom properties the host document already defines are dropped from root rules, so the
 *    server theme (applied once to the host document) wins over the module's built-in defaults;
 *  - @property / @font-face moved to the document (returned in `hoisted`).
 */
export function scopeStylesheet(css: string, scope: string): { sheet: CSSStyleSheet; hoisted: string[] } {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  const hoisted: string[] = [];
  const docStyle = getComputedStyle(document.documentElement);
  const shadow = scope === ":host";

  const walk = (rules: CSSRuleList, owner: CSSStyleSheet | CSSGroupingRule) => {
    for (let i = rules.length - 1; i >= 0; i--) {
      const rule = rules[i]!;
      if (rule instanceof CSSStyleRule) {
        if (isRootRule(rule.selectorText)) {
          for (let j = rule.style.length - 1; j >= 0; j--) {
            const prop = rule.style.item(j);
            if (prop.startsWith("--") && docStyle.getPropertyValue(prop) !== "") rule.style.removeProperty(prop);
          }
        }
        const next = scopeSelector(rule.selectorText, scope);
        if (next !== rule.selectorText) rule.selectorText = next;
      } else if (typeof CSSPropertyRule !== "undefined" && rule instanceof CSSPropertyRule) {
        hoisted.push(rule.cssText);
        owner.deleteRule(i);
      } else if (rule instanceof CSSFontFaceRule) {
        if (shadow) {
          hoisted.push(rule.cssText);
          owner.deleteRule(i);
        }
      } else if ("cssRules" in rule && !(rule instanceof CSSKeyframesRule)) {
        walk((rule as CSSGroupingRule).cssRules, rule as CSSGroupingRule);
      }
    }
  };
  walk(sheet.cssRules, sheet);
  return { sheet, hoisted };
}
