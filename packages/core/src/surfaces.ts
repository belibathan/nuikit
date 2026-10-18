/**
 * Surfaces: every piece of UI declares what it is (layer, input, what Escape does), and nuikit
 * decides focus, cursor, stacking and Escape across every resource that uses it.
 *
 * In game, lua/nuikit.lua owns the client-wide stack and sends this resource's view of it as
 * `nuikit:surfaces`. In the browser there is no Lua, so a small local manager plays its part,
 * driven by the same declarations, so `npm run dev` behaves like the game.
 *
 * Types come from module augmentation, like events:
 *
 *   declare module "nuikit-core" {
 *     interface NuiSurfaces { inventory: { items: Item[] }; confirm: { amount: number } }
 *   }
 */

import { emit, fetchNui, isBrowser, onNui } from "./index";

/** Surface name → the data its `open(data)` carries. Augment this interface in your project. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NuiSurfaces {}

export type SurfaceName = keyof NuiSurfaces extends never ? string : Extract<keyof NuiSurfaces, string> | (string & {});
export type SurfaceData<K> = K extends keyof NuiSurfaces ? NuiSurfaces[K] : unknown;

export type SurfaceLayer = "hud" | "world" | "panel" | "modal" | "system";
export type SurfaceInput = "none" | "cursor" | "keyboard" | "full";

/** Mirrors NUI.surface(name, opts) in Lua. Used by the browser manager (in game, Lua's copy wins). */
export interface SurfaceOptions {
  layer?: SurfaceLayer;
  input?: SurfaceInput;
  keepInput?: boolean;
  exclusive?: boolean;
  escape?: "close" | "back" | "ignore";
  hides?: string[];
  blockedBy?: string[];
}

export interface SurfaceState<T = unknown> {
  /** Open in the stack. */
  open: boolean;
  /** Open and not hidden by a surface above it (e.g. the HUD under a full-screen panel). */
  visible: boolean;
  /** Holds NUI focus (top-most surface that takes input). */
  focused: boolean;
  layer: SurfaceLayer;
  /** What open(data) / update(data) last sent. */
  data?: T;
  /** Position in the stack, bottom = 1. Use it as a z-index if you render several surfaces. */
  z?: number;
}

export interface SurfacesSnapshot {
  surfaces: Record<string, SurfaceState>;
  /** Client-wide states set with NUI.state(name, value), e.g. { dead: true }. */
  states: Record<string, unknown>;
}

const CLOSED: SurfaceState = { open: false, visible: false, focused: false, layer: "panel" };
const LAYERS: Record<SurfaceLayer, number> = { hud: 1, world: 2, panel: 3, modal: 4, system: 5 };

let snapshot: SurfacesSnapshot = { surfaces: {}, states: {} };
const listeners = new Set<() => void>();
let subscribed = false;

function set(next: SurfacesSnapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  onNui("nuikit:surfaces" as never, (payload: SurfacesSnapshot) => {
    set({ surfaces: payload?.surfaces ?? {}, states: payload?.states ?? {} });
  });
  installEscape();
}

/** Current state of every surface this resource declared. */
export function getSurfaces(): SurfacesSnapshot {
  ensureSubscribed();
  return snapshot;
}

/** One surface's state (closed if unknown). */
export function getSurface<K extends SurfaceName>(name: K): SurfaceState<SurfaceData<K>> {
  ensureSubscribed();
  return (snapshot.surfaces[name] ?? CLOSED) as SurfaceState<SurfaceData<K>>;
}

/** Subscribe to any surface or state change. Returns an unsubscribe function. */
export function onSurfaces(listener: () => void): () => void {
  ensureSubscribed();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Open a surface declared in Lua with NUI.surface(name, opts). Lua decides focus and stacking;
 * it refuses surfaces blocked by a state. In the browser the local manager does the same.
 */
export async function openSurface<K extends SurfaceName>(name: K, data?: SurfaceData<K>): Promise<boolean> {
  ensureSubscribed();
  if (isBrowser()) return browser.open(name, data);
  const res = (await fetchNui("nuikit:surface:open" as never, { name, data } as never)) as { ok?: boolean };
  return res?.ok !== false;
}

/** Close a surface. Safe when it's already closed. */
export async function closeSurface(name: SurfaceName): Promise<void> {
  ensureSubscribed();
  if (isBrowser()) return browser.close(name);
  await fetchNui("nuikit:surface:close" as never, { name } as never);
}

/** Run `handler` when Escape is pressed on a surface declared with `escape: 'back'`. */
export function onSurfaceBack(name: SurfaceName, handler: () => void): () => void {
  ensureSubscribed();
  return onNui("nuikit:back" as never, (n: string) => {
    if (n === name) handler();
  });
}

/**
 * Tell the browser manager how a surface behaves. Lua's NUI.surface() is the source of truth in
 * game; this mirrors it so dev mode stacks and focuses the same way. <Surface> calls it for you.
 */
export function defineSurface(name: SurfaceName, options: SurfaceOptions = {}): void {
  ensureSubscribed();
  browser.define(name, options);
}

/** Browser-only: set a client-wide state, as Lua's NUI.state(name, value) would. */
export function setSurfaceState(name: string, value: unknown): void {
  ensureSubscribed();
  browser.state(name, value);
}

// ───────────────────────────────── Escape

let escapeInstalled = false;
function installEscape() {
  if (escapeInstalled || typeof window === "undefined") return;
  escapeInstalled = true;
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented || isTyping(e)) return;
    const focused = Object.values(snapshot.surfaces).some((s) => s.focused);
    if (!focused) return;
    if (isBrowser()) browser.escape();
    else void fetchNui("nuikit:escape" as never).catch(() => {});
  });
}

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

// ───────────────────────────────── browser manager (mirrors lua/nuikit.lua)

type Entry = { name: string; opts: Required<Pick<SurfaceOptions, "layer" | "input" | "escape">> & SurfaceOptions; seq: number };

const browser = (() => {
  const defs = new Map<string, Entry["opts"]>();
  const data = new Map<string, unknown>();
  let stack: Entry[] = [];
  let states: Record<string, unknown> = {};
  let seq = 0;

  const normalize = (o: SurfaceOptions): Entry["opts"] => {
    const layer = o.layer ?? "panel";
    return { ...o, layer, input: o.input ?? (layer === "panel" || layer === "modal" ? "full" : "none"), escape: o.escape ?? "close" };
  };
  const ordered = () => [...stack].sort((a, b) => LAYERS[a.opts.layer] - LAYERS[b.opts.layer] || a.seq - b.seq);

  function publish() {
    const list = ordered();
    const target = [...list].reverse().find((e) => e.opts.input !== "none");
    const surfaces: Record<string, SurfaceState> = {};
    for (const [name, o] of defs) surfaces[name] = { open: false, visible: false, focused: false, layer: o.layer, data: data.get(name) };
    list.forEach((e, i) => {
      const hidden = list.slice(i + 1).some((a) => a.opts.hides?.includes(e.name) || a.opts.hides?.includes(e.opts.layer));
      surfaces[e.name] = { open: true, visible: !hidden, focused: e === target, layer: e.opts.layer, data: data.get(e.name), z: i + 1 };
    });
    emit("nuikit:surfaces" as never, { surfaces, states: { ...states } } as never);
  }

  return {
    define(name: string, o: SurfaceOptions) {
      defs.set(name, normalize(o));
      if (isBrowser()) publish();
    },
    open(name: string, payload: unknown): boolean {
      const opts = defs.get(name) ?? normalize({});
      if (!defs.has(name)) defs.set(name, opts);
      if (opts.blockedBy?.some((s) => states[s])) return false;
      data.set(name, payload);
      if (!stack.some((e) => e.name === name)) {
        if (opts.exclusive) stack = stack.filter((e) => e.opts.layer !== opts.layer);
        stack.push({ name, opts, seq: ++seq });
      }
      publish();
      return true;
    },
    close(name: string) {
      stack = stack.filter((e) => e.name !== name);
      publish();
    },
    escape() {
      const target = [...ordered()].reverse().find((e) => e.opts.input !== "none");
      if (!target || target.opts.escape === "ignore") return;
      if (target.opts.escape === "back") emit("nuikit:back" as never, target.name as never);
      else this.close(target.name);
    },
    state(name: string, value: unknown) {
      if (value === false || value == null) delete states[name];
      else states = { ...states, [name]: value };
      publish();
    },
    reset() {
      defs.clear();
      data.clear();
      stack = [];
      states = {};
      seq = 0;
    },
  };
})();

/** For tests: reset all surface state. */
export function __resetSurfaces(): void {
  browser.reset();
  snapshot = { surfaces: {}, states: {} };
  listeners.clear();
  subscribed = false;
}
