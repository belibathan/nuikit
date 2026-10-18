/**
 * nuikit — the NUI runtime.
 *
 * Wire format (compatible with the common `{ action, data }` convention):
 *   Lua  → UI : SendNUIMessage({ action = "hud:vitals", data = { health = 80 } })
 *   UI   → Lua: POST https://<resource>/<name>  body: JSON(data)  → cb(response)
 *
 * Types come from module augmentation, so both directions are checked:
 *
 *   declare module "nuikit-core" {
 *     interface NuiEvents    { "hud:vitals": { health: number } }
 *     interface NuiCallbacks { "inventory:use": { req: { slot: number }; res: { ok: boolean } } }
 *   }
 */

/** Messages Lua sends to the UI. Augment this interface in your project. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NuiEvents {}

/** Callbacks the UI can call in Lua. Augment this interface in your project. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NuiCallbacks {}

/** Built-ins every nuikit resource understands (mirrored in lua/nuikit.lua). */
export interface BuiltinEvents {
  "nuikit:visible": boolean;
  "nuikit:surfaces": import("./surfaces").SurfacesSnapshot;
  "nuikit:back": string;
  "nuikit:player": import("./player").NuiPlayer;
  "nuikit:theme": string;
}
export interface BuiltinCallbacks {
  "nuikit:ready": { req: void; res: { ok: boolean; resource?: string } };
  "nuikit:close": { req: void | { name?: string }; res: { ok: boolean } };
  "nuikit:escape": { req: void; res: { ok: boolean; closed?: string; back?: string } };
  "nuikit:surface:open": { req: { name: string; data?: unknown }; res: { ok: boolean } };
  "nuikit:surface:close": { req: { name: string }; res: { ok: boolean } };
}

type AllEvents = BuiltinEvents & NuiEvents;
type AllCallbacks = BuiltinCallbacks & NuiCallbacks;

/** Event names: typed when augmented, any string otherwise. */
export type EventName = keyof AllEvents extends never ? string : Extract<keyof AllEvents, string> | (string & {});
export type EventData<K> = K extends keyof AllEvents ? AllEvents[K] : unknown;

export type CallbackName = Extract<keyof AllCallbacks, string> | (string & {});
export type CallbackReq<K> = K extends keyof AllCallbacks
  ? AllCallbacks[K] extends { req: infer R } ? R : unknown
  : unknown;
export type CallbackRes<K> = K extends keyof AllCallbacks
  ? AllCallbacks[K] extends { res: infer R } ? R : unknown
  : unknown;

export interface NuiMessage<T = unknown> {
  action: string;
  data: T;
}

declare global {
  interface Window {
    GetParentResourceName?: () => string;
    invokeNative?: unknown;
  }
}

/** True when running in a normal browser (dev), false inside the game's CEF. */
export function isBrowser(): boolean {
  if (typeof window === "undefined") return true;
  return typeof window.GetParentResourceName !== "function" && !window.invokeNative;
}

/** The current resource name. Falls back to "nuikit" in the browser. */
export function resourceName(): string {
  if (typeof window !== "undefined" && typeof window.GetParentResourceName === "function") {
    return window.GetParentResourceName();
  }
  return "nuikit";
}

// ───────────────────────────────── events (Lua → UI)

type Handler = (data: any) => void;
const handlers = new Map<string, Set<Handler>>();
const anyHandlers = new Set<(msg: NuiMessage) => void>();
let listening = false;

function ensureListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("message", (event: MessageEvent) => {
    const msg = event.data as Partial<NuiMessage> | null;
    if (!msg || typeof msg !== "object" || typeof msg.action !== "string") return;
    dispatch(msg as NuiMessage);
  });
}

function dispatch(msg: NuiMessage) {
  handlers.get(msg.action)?.forEach((h) => h(msg.data));
  anyHandlers.forEach((h) => h(msg));
}

/**
 * Subscribe to a message from Lua. Returns an unsubscribe function.
 *
 *   const off = onNui("hud:vitals", (v) => render(v));
 */
export function onNui<K extends EventName>(action: K, handler: (data: EventData<K>) => void): () => void {
  ensureListener();
  let set = handlers.get(action);
  if (!set) handlers.set(action, (set = new Set()));
  set.add(handler as Handler);
  return () => {
    set!.delete(handler as Handler);
  };
}

/** Observe every message (used by devtools / logging). */
export function onAnyNui(handler: (msg: NuiMessage) => void): () => void {
  ensureListener();
  anyHandlers.add(handler);
  return () => {
    anyHandlers.delete(handler);
  };
}

/**
 * Pretend to be Lua: deliver a message to the UI exactly like SendNUIMessage would.
 * Works in the browser (devtools, tests, storybook) and is a no-op-safe call in game.
 */
export function emit<K extends EventName>(action: K, data: EventData<K>): void {
  ensureListener();
  if (typeof window === "undefined") {
    dispatch({ action, data });
    return;
  }
  window.dispatchEvent(new MessageEvent("message", { data: { action, data } }));
}

// ───────────────────────────────── callbacks (UI → Lua)

type MockFn = (data: any) => unknown | Promise<unknown>;
const mocks = new Map<string, MockFn>();
const callLog = new Set<(entry: { name: string; data: unknown; response: unknown; mocked: boolean }) => void>();

/**
 * Register a browser-only response for a callback. Ignored inside the game.
 *
 *   mockNui("bank:balance", () => ({ cash: 420, bank: 13370 }));
 */
export function mockNui<K extends CallbackName>(
  name: K,
  response: CallbackRes<K> | ((data: CallbackReq<K>) => CallbackRes<K> | Promise<CallbackRes<K>>),
): () => void {
  const fn: MockFn = typeof response === "function" ? (response as MockFn) : () => response;
  mocks.set(name, fn);
  return () => {
    if (mocks.get(name) === fn) mocks.delete(name);
  };
}

/** Observe every fetchNui call (used by devtools). */
export function onNuiCall(handler: (entry: { name: string; data: unknown; response: unknown; mocked: boolean }) => void) {
  callLog.add(handler);
  return () => {
    callLog.delete(handler);
  };
}

export interface FetchNuiOptions<R> {
  /** Response to use in the browser if no mock is registered. */
  mock?: R;
  /** Abort after this many ms (default 10s). */
  timeout?: number;
}

/** Request data is optional for void callbacks and for untyped (un-augmented) ones. */
type OptionalReq<T> = [T] extends [void] ? true : unknown extends T ? true : false;

export class NuiError extends Error {
  constructor(public callback: string, message: string, public cause?: unknown) {
    super(`[nuikit] ${callback}: ${message}`);
    this.name = "NuiError";
  }
}

/**
 * Call a Lua NUI callback and await its response.
 *
 *   const { ok } = await fetchNui("inventory:use", { slot: 3 });
 *
 * In the browser it resolves with the registered mock (mockNui) or `options.mock`.
 */
export async function fetchNui<K extends CallbackName>(
  name: K,
  ...args: OptionalReq<CallbackReq<K>> extends true
    ? [data?: CallbackReq<K>, options?: FetchNuiOptions<CallbackRes<K>>]
    : [data: CallbackReq<K>, options?: FetchNuiOptions<CallbackRes<K>>]
): Promise<CallbackRes<K>> {
  const [data, options = {}] = args as [unknown, FetchNuiOptions<CallbackRes<K>>?];

  if (isBrowser()) {
    const mock = mocks.get(name);
    const response = (mock ? await mock(data) : options?.mock ?? ({} as unknown)) as CallbackRes<K>;
    callLog.forEach((h) => h({ name, data, response, mocked: true }));
    return response;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options?.timeout ?? 10_000);
  try {
    const res = await fetch(`https://${resourceName()}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(data ?? {}),
      signal: controller.signal,
    });
    const text = await res.text();
    const response = (text ? JSON.parse(text) : {}) as CallbackRes<K>;
    callLog.forEach((h) => h({ name, data, response, mocked: false }));
    if (response && typeof response === "object" && "error" in (response as object)) {
      throw new NuiError(name, String((response as unknown as { error: unknown }).error));
    }
    return response;
  } catch (err) {
    if (err instanceof NuiError) throw err;
    const reason = (err as Error)?.name === "AbortError" ? "timed out (is the callback registered in Lua?)" : String(err);
    throw new NuiError(name, reason, err);
  } finally {
    clearTimeout(timer);
  }
}

// ───────────────────────────────── visibility / focus

/** Hidden in game until Lua calls NUI.open(); visible in the browser so you can just work. */
let visible = isBrowser();
const visibilityListeners = new Set<(v: boolean) => void>();

/** Current visibility (driven by Lua's NUI.open / NUI.close). Defaults to true in the browser. */
export function getVisible(): boolean {
  return visible;
}

/** Set visibility locally (devtools / tests). Lua normally drives this via `nuikit:visible`. */
export function setVisible(next: boolean): void {
  if (visible === next) return;
  visible = next;
  visibilityListeners.forEach((l) => l(visible));
}

export function onVisible(listener: (v: boolean) => void): () => void {
  ensureListener();
  visibilityListeners.add(listener);
  return () => {
    visibilityListeners.delete(listener);
  };
}

// Lua → UI visibility is a built-in event.
onNui("nuikit:visible", (v) => setVisible(Boolean(v)));

// Built-in: the server theme (theme.css in the `nuikit` resource) applies to every nuikit UI.
onNui("nuikit:theme", (css) => {
  if (typeof css === "string" && css) applyTheme(css);
});

// In game, tell Lua the page is listening so it resends surfaces, player, theme: messages sent
// before the page loaded are lost otherwise.
if (!isBrowser() && typeof window !== "undefined") {
  setTimeout(() => {
    fetchNui("nuikit:ready").catch(() => {
      /* resource without nuikit.lua */
    });
  }, 0);
}

/** Ask Lua to close this UI (releases NUI focus). Also hides it locally. */
export async function closeNui(): Promise<void> {
  setVisible(false);
  try {
    await fetchNui("nuikit:close", undefined, { mock: { ok: true } });
  } catch {
    /* Lua may not have the built-in registered; hiding locally is still correct. */
  }
}

/** For tests: reset all module state. */
export function __reset(): void {
  handlers.clear();
  anyHandlers.clear();
  mocks.clear();
  callLog.clear();
  visibilityListeners.clear();
  visible = true;
  onNui("nuikit:visible", (v) => setVisible(Boolean(v)));
  onNui("nuikit:theme", (css) => {
    if (typeof css === "string" && css) applyTheme(css);
  });
  __resetSurfaces();
  __resetPlayer();
}

export { applyTheme, clearTheme, parseTheme, toRgba, type ThemeVars } from "./theme";
import { applyTheme } from "./theme";
export {
  closeSurface,
  defineSurface,
  getSurface,
  getSurfaces,
  onSurfaceBack,
  onSurfaces,
  openSurface,
  setSurfaceState,
  type NuiSurfaces,
  type SurfaceData,
  type SurfaceInput,
  type SurfaceLayer,
  type SurfaceName,
  type SurfaceOptions,
  type SurfaceState,
  type SurfacesSnapshot,
} from "./surfaces";
import { __resetSurfaces } from "./surfaces";
export { DEFAULT_PLAYER, getPlayer, onPlayer, type NuiPlayer, type NuiPlayerJob } from "./player";
import { __resetPlayer } from "./player";
