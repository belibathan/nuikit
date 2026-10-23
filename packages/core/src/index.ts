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
  /** The server's currency and locale (bridge.lua, protocol §7.2). */
  "nuikit:context": import("./player").NuiContext;
  /** The server theme: compiled tokens from the nuikit resource (or a raw theme.css from an older one). */
  "nuikit:theme": string | import("./tokens").CompiledTheme;
  /** The player's UI preferences (scale, reduced motion, high contrast). */
  "nuikit:prefs": Partial<import("./tokens").NuiPrefs>;
}
export interface BuiltinCallbacks {
  "nuikit:ready": { req: { protocol: number; client: string }; res: Handshake };
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
  const hosted = hostedContext();
  if (hosted) return !hosted.inGame;
  if (typeof window === "undefined") return true;
  return typeof window.GetParentResourceName !== "function" && !window.invokeNative;
}

/** The current resource name. Falls back to "nuikit" in the browser. */
export function resourceName(): string {
  const hosted = hostedContext();
  if (hosted) return hosted.resource;
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
  // Hosted module: the host delivers only this resource's messages.
  const hosted = hostedContext();
  if (hosted) {
    hosted.listen((msg) => {
      if (msg && typeof msg.action === "string") dispatch(msg as NuiMessage);
    });
    return;
  }
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
  if (typeof window === "undefined" || hostedContext()) {
    dispatch({ action, data });
    return;
  }
  window.dispatchEvent(new MessageEvent("message", { data: { action, data } }));
}

// ───────────────────────────────── callbacks (UI → Lua)

type MockFn = (data: any) => unknown | Promise<unknown>;
const mocks = new Map<string, MockFn>();

/** Why a fetchNui call failed. */
export type NuiErrorCode = "TIMEOUT" | "TRANSPORT" | "UNKNOWN_CALLBACK" | "INVALID" | "CANCELLED";
const CODES: readonly string[] = ["TIMEOUT", "TRANSPORT", "UNKNOWN_CALLBACK", "INVALID", "CANCELLED"];

export interface NuiCallEntry {
  name: string;
  data: unknown;
  response: unknown;
  mocked: boolean;
  /** Wall time of the call in ms. */
  ms: number;
  /** Set when the call failed. */
  code?: NuiErrorCode;
}
const callLog = new Set<(entry: NuiCallEntry) => void>();

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

/** Observe every fetchNui call, successful or not (used by devtools). */
export function onNuiCall(handler: (entry: NuiCallEntry) => void) {
  callLog.add(handler);
  return () => {
    callLog.delete(handler);
  };
}

export interface FetchNuiOptions<R> {
  /** Response to use in the browser if no mock is registered. */
  mock?: R;
  /** Reject with `TIMEOUT` after this many ms (default: `configureNui().timeoutMs`, 10 s). */
  timeoutMs?: number;
  /** @deprecated Use `timeoutMs`. */
  timeout?: number;
  /** Aborting rejects with `CANCELLED`. */
  signal?: AbortSignal;
}

/** Request data is optional for void callbacks and for untyped (un-augmented) ones. */
type OptionalReq<T> = [T] extends [void] ? true : unknown extends T ? true : false;

export class NuiError extends Error {
  /**
   * `TIMEOUT` no answer in time · `TRANSPORT` the call never completed (fetch failed, resource stopped) ·
   * `UNKNOWN_CALLBACK` Lua has no such callback · `INVALID` Lua answered `{ error }` or the reply was not JSON ·
   * `CANCELLED` the caller's AbortSignal fired.
   */
  readonly code: NuiErrorCode;
  constructor(public callback: string, message: string, public cause?: unknown, code: NuiErrorCode = "INVALID") {
    super(`[nuikit] ${callback}: ${message}`);
    this.name = "NuiError";
    this.code = code;
  }
}

const nuiConfig = { timeoutMs: 10_000, strictMocks: false };
/**
 * Defaults for every fetchNui call. `timeoutMs` (10 s) is the deadline; `strictMocks` makes a browser call with
 * no mock and no `options.mock` reject with `UNKNOWN_CALLBACK` (as the game would) instead of resolving `{}`.
 */
export function configureNui(next: Partial<typeof nuiConfig>): void {
  Object.assign(nuiConfig, next);
}

// Per-resource call diagnostics (for `nuikit-doctor`). Percentiles come from the last 200 call times.
export interface NuiDiagnostics {
  resource: string;
  calls: number;
  errors: Partial<Record<NuiErrorCode, number>>;
  p50: number;
  p95: number;
}
const DIAG_WINDOW = 200;
const diag = new Map<string, { calls: number; errors: Partial<Record<NuiErrorCode, number>>; ms: number[] }>();

function record(ms: number, code?: NuiErrorCode): void {
  const r = resourceName();
  let d = diag.get(r);
  if (!d) diag.set(r, (d = { calls: 0, errors: {}, ms: [] }));
  d.calls++;
  if (code) d.errors[code] = (d.errors[code] ?? 0) + 1;
  d.ms.push(ms);
  if (d.ms.length > DIAG_WINDOW) d.ms.shift();
}

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)]!;
}

/** Calls, errors by code and p50/p95 ms for every resource this page has called from. */
export function getNuiDiagnostics(): NuiDiagnostics[] {
  return [...diag].map(([resource, d]) => {
    const sorted = [...d.ms].sort((a, b) => a - b);
    return { resource, calls: d.calls, errors: { ...d.errors }, p50: pct(sorted, 0.5), p95: pct(sorted, 0.95) };
  });
}

// The `nuikit:diagnostics` export: doctor and tooling read it from the page (`window["nuikit:diagnostics"]()`).
if (typeof window !== "undefined") (window as any)["nuikit:diagnostics"] = getNuiDiagnostics;

function luaCode(err: string): NuiErrorCode {
  if (CODES.includes(err)) return err as NuiErrorCode;
  if (err === "timed out") return "TIMEOUT"; // the host's forward deadline
  if (err === "resource stopped") return "TRANSPORT";
  return "INVALID";
}

/**
 * Call a Lua NUI callback and await its response. Rejects with a `NuiError` (see `.code`).
 *
 *   const { ok } = await fetchNui("inventory:use", { slot: 3 }, { timeoutMs: 2000, signal });
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
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const mocked = isBrowser();
  let response: unknown;
  let failure: NuiError | undefined;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? options.timeout ?? nuiConfig.timeoutMs);
  const onAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener("abort", onAbort);
  }
  const aborted = new Promise<never>((_, reject) =>
    controller.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))),
  );
  aborted.catch(() => {});

  try {
    if (controller.signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
    if (mocked) {
      const mock = mocks.get(name);
      if (!mock && options.mock === undefined && nuiConfig.strictMocks) {
        response = { error: "UNKNOWN_CALLBACK" };
      } else {
        response = await Promise.race([mock ? mock(data) : (options.mock ?? {}), aborted]);
      }
    } else {
      const hosted = hostedContext();
      if (hosted) {
        // Hosted module: the host forwards the call to this resource's Lua.
        response = (await Promise.race([hosted.post(name, data ?? {}), aborted])) ?? {};
      } else {
        const res = await fetch(`https://${resourceName()}/${name}`, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=UTF-8" },
          body: JSON.stringify(data ?? {}),
          signal: controller.signal,
        });
        const text = await res.text();
        try {
          response = text ? JSON.parse(text) : {};
        } catch (e) {
          throw new NuiError(name, "the reply was not JSON", e, "INVALID");
        }
      }
    }
    if (response && typeof response === "object" && "error" in (response as object)) {
      const e = response as { error: unknown; message?: unknown };
      const code = luaCode(String(e.error));
      throw new NuiError(name, String(e.message ?? e.error), undefined, code);
    }
    return response as CallbackRes<K>;
  } catch (err) {
    if (err instanceof NuiError) failure = err;
    else if ((err as Error)?.name === "AbortError") {
      failure = timedOut
        ? new NuiError(name, "timed out (is the callback registered in Lua?)", err, "TIMEOUT")
        : new NuiError(name, "cancelled", err, "CANCELLED");
    } else failure = new NuiError(name, String(err), err, "TRANSPORT");
    throw failure;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
    const ms = now() - t0;
    record(ms, failure?.code);
    callLog.forEach((h) => h({ name, data, response, mocked, ms, ...(failure ? { code: failure.code } : {}) }));
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

// Built-ins: the server theme (compiled by the `nuikit` resource) and the player's prefs apply
// to every nuikit UI, live. A hosted module shares the host's document: the host page applies
// both once, for all modules.
function builtinTheme() {
  onNui("nuikit:theme", (theme) => {
    if (hostedContext()) return;
    if ((typeof theme === "string" && theme) || (theme && typeof theme === "object")) applyTheme(theme);
  });
  onNui("nuikit:prefs", (p) => {
    if (!hostedContext() && p && typeof p === "object") setPrefs(p);
  });
}
builtinTheme();
// The server context (currency, locale) is kept from the first message on, even before any UI reads it.
subscribeContext();

// In game, tell Lua the page is listening so it resends surfaces, player, theme: messages sent
// before the page loaded are lost otherwise.
// Pages that replace another resource's UI (addons) opt out with
// <meta name="nuikit-handshake" content="off">: that resource's Lua has no nuikit:ready callback.
const handshakeOff = () => document.querySelector('meta[name="nuikit-handshake"][content="off"]') !== null;

/** The protocol version this nuikit-core speaks (docs/protocol.md §2). */
export const PROTOCOL = 1;
declare const __NUIKIT_CORE_VERSION__: string | undefined;
const CLIENT = `nuikit-core@${typeof __NUIKIT_CORE_VERSION__ === "string" ? __NUIKIT_CORE_VERSION__ : "dev"}`;

/** Lua's answer to the ready handshake (protocol §2.2). */
export interface Handshake {
  ok: boolean;
  resource?: string;
  /** Lua's protocol version; absent means 0 (a 0.4.0 nuikit.lua). */
  protocol?: number;
  /** Optional parts Lua provides: surfaces, states, theme, player, context, notify, prefs. */
  capabilities?: string[];
}
let handshake: Handshake | null = null;

/** The handshake reply, once Lua answered (null before, outside the game, or with the handshake off). */
export function getHandshake(): Handshake | null {
  return handshake;
}

/** The effective protocol version: the lower of ours and Lua's (§2.2). 0 until Lua answers. */
export function protocolVersion(): number {
  return Math.min(PROTOCOL, handshake?.protocol ?? 0);
}

/** Does this UI's Lua provide `capability`? (§2.2: absent means not provided.) */
export function hasCapability(capability: string): boolean {
  return !!handshake?.capabilities?.includes(capability);
}

if (!isBrowser() && typeof window !== "undefined") {
  setTimeout(() => {
    if (handshakeOff()) return;
    fetchNui("nuikit:ready", { protocol: PROTOCOL, client: CLIENT })
      .then((res) => {
        if (res && typeof res === "object") handshake = res as Handshake;
      })
      .catch(() => {
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
  handshake = null;
  handlers.clear();
  anyHandlers.clear();
  mocks.clear();
  callLog.clear();
  diag.clear();
  nuiConfig.timeoutMs = 10_000;
  nuiConfig.strictMocks = false;
  visibilityListeners.clear();
  visible = true;
  onNui("nuikit:visible", (v) => setVisible(Boolean(v)));
  builtinTheme();
  __resetTheme();
  __resetSurfaces();
  __resetPlayer();
  subscribeContext();
  __resetFollow();
}

export { hostedContext, type HostedContext, type HostedMessage } from "./hosted";
import { hostedContext } from "./hosted";
export { applyGlowBudget, startGlowBudget } from "./glow";
export { loadKeys, mockKeys, type KeyBinding } from "./keys";
export { applySettingsPreset, cancelSettings, draftSettings, loadSettings, mergeSettings, mockSettings, normalizeSetting, resetSettings, saveSettings, type SettingRow, type SettingValue, type SettingsSection } from "./settings";
export { KEYWORD_ATTRS, applyTheme, clearTheme, getPrefs, getTheme, loadImports, onTheme, parseTheme, setPrefs, toRgba, type ThemeVars } from "./theme";
import { __resetTheme, applyTheme, setPrefs } from "./theme";
export {
  checkContrast,
  compileTheme,
  CONTRAST_PAIRS,
  DEFAULT_PREFS,
  highContrast,
  lowerValue,
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
  TOKENS_REVISION,
  IDENTITY_TOKENS,
  MOTION_TOKENS,
  MOTION_FEELS,
  SPRING_PRESETS,
  motionTokens,
  themeMotionLevel,
  type MotionFeel,
  type SpringPresetName,
  ALL_TOKENS,
  ALL_TOKEN_NAMES,
  KIT_TOKENS,
  BASELINE_TOKENS,
  SELECTION_TOKENS,
  SCALE_TOKENS,
  TYPE_ROLES,
  TYPE_ROLE_TOKENS,
  TILE_TOKENS,
  PLATE_TOKENS,
  ACCENT_TOKENS,
  FILL_TOKENS,
  MOTION_15_TOKENS,
  HYGIENE_TOKENS,
  TREATMENTS,
  TREATMENT_PRESETS,
  DEFAULT_FONT_SANS,
  DEFAULT_FONT_DISPLAY,
  DEFAULT_FONT_MONO,
  elevationShadow,
  hudTextShadow,
  VITALS,
  withPrefs,
  type CompileOptions,
  type CompiledTheme,
  type ContrastResult,
  type DtcgDocument,
  type NuiPrefs,
  type ThemeInput,
  type ThemeMode,
  type TokenSpec,
  type TokenType,
} from "./tokens";
export { composite, contrastRatio, formatRgba, luminance, oklchToRgb, rgbToOklch, type RGBA } from "./color";
export { applyServerTheme, loadServerTheme, type ServerThemePayload } from "./remote";
export {
  DEFAULT_IMAGES,
  clothingValues,
  getImageConfig,
  hasClothingImages,
  loadImageConfig,
  onImageConfig,
  parseTemplates,
  resolveImage,
  setImageConfig,
  type ClothingKey,
  type ImageConfig,
  type ImageKey,
  type ImageKind,
} from "./images";
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
export { DEFAULT_CONTEXT, DEFAULT_PLAYER, getContext, getPlayer, onContext, onPlayer, type NuiContext, type NuiPlayer, type NuiPlayerJob } from "./player";
import { __resetPlayer, subscribeContext } from "./player";
export { follow, followed, type FollowKind, type FollowOptions } from "./follow";
import { __resetFollow } from "./follow";

export { bytesHash, formatInstall, overrideOutdated, planInstall, planUninstall, type InstalledManifest, type InstallPlan, type InstallAction, type InstallOp, type ShippedOverride } from "./install";
export { COVERAGE_TARGETS, computeCoverage, formatCoverage, parseSessionLog, type CoverageResult, type SessionStep } from "./coverage";
export {
  ADAPTER_PACKS,
  compareVersions,
  detectFramework,
  doctor,
  formatDoctor,
  pageHash,
  type AdapterPack,
  type DoctorReport,
  type DoctorResource,
  type DoctorSnapshot,
  type Finding,
  type Framework,
  type OverrideManifest,
  type ResourceReport,
} from "./doctor";
// Intents (docs/intents.md): the generated types, for scripts' pages and adapters. The validator,
// the store and the renderer contract live in nuikit-core/intents (nuikit-core/intents-react for React).
export { INTENT_KINDS, INTENT_VERSIONS, type IntentKind, type IntentProps, type IntentResults, type IntentEvents } from "./intents.generated";
