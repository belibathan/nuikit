import { createContext, createElement, useCallback, useContext, useMemo, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactElement, type ReactNode } from "react";
import {
  closeSurface,
  defineSurface,
  getSurface,
  getSurfaces,
  onSurfaceBack,
  onSurfaces,
  openSurface,
  type SurfaceData,
  type SurfaceName,
  type SurfaceOptions,
  type SurfaceState,
  closeNui,
  getContext,
  getPlayer,
  onContext,
  type NuiContext,
  onPlayer,
  type NuiPlayer,
  fetchNui,
  follow,
  type FollowOptions,
  isBrowser,
  getVisible,
  onNui,
  onVisible,
  type CallbackName,
  type CallbackReq,
  type CallbackRes,
  type EventData,
  type EventName,
} from "./index";
import { flipFrom, indicator, motionLevel, spring, type Channel, type SpringName } from "./motion";
import { clearOf, getZones, onZones, type ClearOptions, type ZoneId, type ZonePosition, type Zones } from "./zones";
import { getViewport, onViewport, type Viewport } from "./viewport";
import { loadKeys, type KeyBinding } from "./keys";
import { applySettingsPreset, cancelSettings, draftSettings, loadSettings, resetSettings, saveSettings, type SettingValue, type SettingsSection } from "./settings";
import { getSlots, onSlots, type Slot } from "./slots";
import { getTheme } from "./theme";
import type { CompiledTheme } from "./tokens";

export * from "./index";
export {
  clearOf,
  getZones,
  onZones,
  publishZone,
  setLocalZone,
  stackOffsets,
  toZoneId,
  zoneOf,
  zonePlacement,
  zonePosition,
  zoneRect,
  ZONE_IDS,
  type ClearOptions,
  type ZoneFrame,
  type ZoneId,
  type ZonePlacement,
  type ZonePosition,
  type ZoneRect,
  type Zones,
} from "./zones";
export { aspectOf, DESIGN, getViewport, onViewport, parseViewport, viewportOf, VIEWPORT_SAMPLES, VIEWPORTS, watchViewport, type AspectId, type Viewport, type ViewportOptions, type ViewportSpec } from "./viewport";

/**
 * The screen as the layout sees it (docs/design/layout.md): size, aspect class (16-9, 21-9…), rem in px, the
 * UI scale, the safe area and the 16:9 content box. Follows resizes and theme / UI-size changes; starts
 * painting `data-nk-aspect` on <html>.
 */
export function useViewport(): Viewport {
  return useSyncExternalStore(onViewport, getViewport, getViewport);
}
export { getAllSlots, getSlots, onSlots, setSlots, type Slot, type Slots } from "./slots";

/** A cluster's slots, joined by any resource with NUI.slot(cluster, key, opts), ordered (docs/slots.md). */
export function useSlots(cluster: string): Slot[] {
  const get = useCallback(() => getSlots(cluster), [cluster]);
  return useSyncExternalStore(onSlots, get, get);
}

/** Every UI's published screen zones (NUI.zone in Lua, src/zones.ts); re-renders when they change. */
export function useZones(): Zones {
  return useSyncExternalStore(onZones, getZones, getZones);
}

/**
 * The inline style that keeps a stack anchored at `position` clear of every zone in its corner (the
 * HUD's map top right, the cluster bottom right), or `{}` when nothing is there. Follows resizes.
 *
 *   <NoticeStack position="top-right" style={useClearOf("top-right")}>…
 */
export function useClearOf(position: ZonePosition | ZoneId, opts?: ClearOptions): CSSProperties {
  const zones = useZones();
  const vp = useViewport();
  const key = JSON.stringify(opts ?? {});
  return useMemo(() => {
    const c = clearOf(zones, position, { area: { l: vp.box.x, r: vp.box.x }, ...opts, screen: { w: vp.w, h: vp.h } });
    return c as CSSProperties;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, position, vp, key]);
}
/**
 * Every key a resource declared with nk.keys (read-only; players rebind in GTA's Settings › Key Bindings › FiveM).
 *
 *   const { keys } = useKeys();  // [{ resource, id, label, default, binding, mapper }]
 */
export function useKeys() {
  const [keys, setKeys] = useState<KeyBinding[]>([]);
  const reload = useCallback(async () => setKeys(await loadKeys()), []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { keys, reload };
}

/**
 * One resource's settings (nk.settings, docs/settings.md) and the draft → save → reset loop. `values`
 * follow every change: this page's own ops, and `nuikit:settings` when the page belongs to that resource.
 *
 *   const s = useSettings("nuikit_hud");
 *   <Select value={s.values.layout} onValueChange={(v) => s.draft({ layout: v })} /> … <Button onClick={s.save}>Save</Button>
 */
export function useSettings(resource: string) {
  const [section, setSection] = useState<SettingsSection | null>(null);
  const reload = useCallback(async () => setSection((await loadSettings(resource))[0] ?? null), [resource]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(
    () =>
      onNui("nuikit:settings" as EventName, (d: unknown) => {
        const data = d as { values?: Record<string, SettingValue>; draft?: boolean } | null;
        if (data?.values) setSection((s) => (s ? { ...s, values: data.values!, draft: !!data.draft } : s));
      }),
    [],
  );
  const run = useCallback(
    (p: Promise<Record<string, SettingValue> | null>, draft: boolean) =>
      p.then((values) => {
        if (values) setSection((s) => (s ? { ...s, values, draft } : s));
        return values;
      }),
    [],
  );
  return {
    section,
    rows: section?.rows ?? [],
    values: section?.values ?? {},
    presets: section?.presets ?? [],
    dirty: section?.draft ?? false,
    draft: (patch: Record<string, SettingValue>) => run(draftSettings(resource, patch), true),
    save: () => run(saveSettings(resource), false),
    cancel: () => run(cancelSettings(resource), false),
    reset: (keys?: string[]) => run(resetSettings(resource, keys), false),
    preset: (id: string) => run(applySettingsPreset(resource, id), true),
    reload,
  };
}

/**
 * Run a handler whenever Lua sends `action`. The handler can change every render;
 * the subscription doesn't.
 *
 *   useNuiEvent("hud:vitals", setVitals);
 */
export function useNuiEvent<K extends EventName>(action: K, handler: (data: EventData<K>) => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => onNui(action, (data) => ref.current(data)), [action]);
}

/**
 * Hold the latest payload of an event as state.
 *
 *   const vitals = useNuiState("hud:vitals", { health: 100, armor: 0 });
 */
export function useNuiState<K extends EventName>(action: K, initial: EventData<K>): EventData<K> {
  const [state, setState] = useState(initial);
  useNuiEvent(action, setState);
  return state;
}

/**
 * Follow a live value Lua streams (`NUI.stream`, docs/protocol.md §5.7) at the page's frame rate,
 * without rendering: `paint` writes straight to the DOM through your refs. It can change every
 * render; the glide doesn't restart. `start` is read when it mounts.
 *
 *   const bar = useRef<HTMLDivElement>(null);
 *   useFollow("hud:vehicle:rpm", (rpm) => { if (bar.current) bar.current.style.transform = `scaleX(${rpm})` }, { start: 0 });
 */
export function useFollow<K extends EventName>(action: K, paint: (value: number) => void, options: FollowOptions = {}): void {
  const ref = useRef(paint);
  ref.current = paint;
  const start = useRef(options.start);
  // a layout effect: the first paint lands before the browser draws
  useLayoutEffect(
    () => follow(action, (v) => ref.current(v), { ...options, start: start.current }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, options.kind, options.epsilon, options.maxSpan],
  );
}

/**
 * Visibility driven by Lua's NUI.open()/NUI.close(), with Escape built in.
 *
 *   const { visible, close } = useNuiVisibility();
 *   if (!visible) return null;
 *
 * In game, Escape goes through nuikit:escape like any surface (protocol §3.5): Lua gives it to the
 * topmost focused surface on the client, which is this UI's 'main' unless something is above it,
 * and honours NUI.open({ escape = 'ignore' | 'back' }). In the browser it closes locally.
 */
export function useNuiVisibility(options: { closeOnEscape?: boolean } = {}) {
  const { closeOnEscape = true } = options;
  const visible = useSyncExternalStore(onVisible, getVisible, getVisible);
  const close = useCallback(() => closeNui(), []);

  useEffect(() => {
    if (!visible || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || isTyping(e)) return;
      e.preventDefault();
      if (isBrowser()) close();
      else void fetchNui("nuikit:escape").catch(() => {});
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, closeOnEscape, close]);

  return { visible, close };
}

function isTyping(e: KeyboardEvent) {
  // composedPath: inside a hosted module (shadow root) e.target is retargeted to the host element.
  const el = ((e.composedPath?.()[0] as HTMLElement | undefined) ?? e.target) as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

/**
 * Call a Lua callback with loading/error state.
 *
 *   const buy = useNuiCallback("shop:buy");
 *   <Button disabled={buy.loading} onClick={() => buy.call({ id })}>Buy</Button>
 */
export function useNuiCallback<K extends CallbackName>(name: K) {
  const [state, setState] = useState<{ loading: boolean; error: Error | null; data: CallbackRes<K> | null }>({
    loading: false,
    error: null,
    data: null,
  });
  const call = useCallback(
    async (data?: CallbackReq<K>) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await (fetchNui as (n: string, d?: unknown) => Promise<CallbackRes<K>>)(name, data);
        setState({ loading: false, error: null, data: res });
        return res;
      } catch (error) {
        setState({ loading: false, error: error as Error, data: null });
        throw error;
      }
    },
    [name],
  );
  return { ...state, call };
}

// ───────────────────────────────── surfaces

const Z: Record<string, number> = { hud: 10, world: 20, panel: 30, modal: 40, system: 50 };

// A surface fills the screen like the game's NUI frame, but only its own content takes clicks,
// so a HUD never blocks a panel and a panel never blocks the HUD's neighbours.
// fixed, not absolute: a Radix modal locks scroll by making <body> position:relative, and an
// absolute surface would then collapse to the body's zero height.
const SURFACE_CSS = "[data-surface]{position:fixed;inset:0;pointer-events:none}[data-surface]>*{pointer-events:auto}[data-surface][data-closing],[data-surface][data-closing] *{pointer-events:none!important}";
let surfaceCssInjected = false;
function injectSurfaceCss() {
  if (surfaceCssInjected || typeof document === "undefined") return;
  surfaceCssInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-nuikit", "surfaces");
  style.textContent = SURFACE_CSS;
  document.head.appendChild(style);
}

/**
 * A surface's live state plus open/close. Re-renders only when this surface changes.
 *
 *   const inventory = useSurface("inventory");
 *   inventory.open && <InventoryGrid items={inventory.data.items} />
 */
export function useSurface<K extends SurfaceName>(name: K) {
  const state = useSyncExternalStore(
    onSurfaces,
    () => getSurface(name),
    () => getSurface(name),
  ) as SurfaceState<SurfaceData<K>>;
  const open = useCallback((data?: SurfaceData<K>) => openSurface(name, data), [name]);
  const close = useCallback(() => closeSurface(name), [name]);
  return { ...state, isOpen: state.open, openSurface: open, close };
}

/** Client-wide states set in Lua with NUI.state(name, value), e.g. { dead: true }. */
export function useNuiStates(): Record<string, unknown> {
  return useSyncExternalStore(
    onSurfaces,
    () => getSurfaces().states,
    () => getSurfaces().states,
  );
}

export interface SurfaceProps<K extends SurfaceName> extends SurfaceOptions {
  name: K;
  /** Content, or a function of the surface's data. */
  children: ReactNode | ((data: SurfaceData<K>, state: SurfaceState<SurfaceData<K>>) => ReactNode);
  /** Runs when Escape is pressed and the surface uses escape: 'back'. */
  onBack?: () => void;
  /** Keep the children mounted while closed (hidden with CSS). Default false. */
  keepMounted?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** How long a closed surface stays drawn so its children can play their exit (a Sheet sliding out). */
const EXIT_MS = 250;
function exitMs(): number {
  const level = motionLevel();
  return level === "off" ? 0 : level === "reduced" ? 120 : EXIT_MS;
}

const SurfaceOpen = createContext(true);
/**
 * false while the surrounding <Surface> is closing: it stays drawn for its exit (at most 250 ms, none
 * with motion off) but is already closed in the game (focus and cursor released at once). Feed it to a
 * Sheet or Dialog's `open` so it plays its own exit:
 *
 *   <Sheet open={useSurfaceOpen()} modal={false}>…</Sheet>
 */
export function useSurfaceOpen(): boolean {
  return useContext(SurfaceOpen);
}

/**
 * Renders its children while the surface is open and visible, stacked by layer. When it closes, its
 * last content stays drawn for the exit (see useSurfaceOpen), takes no pointer events, then unmounts. It fills the
 * screen (position: absolute; inset: 0) so children position like the game frame; only the
 * children take pointer events.
 * Props mirror NUI.surface() in Lua; in the browser they drive the local manager,
 * in game Lua's declaration is the source of truth.
 *
 *   <Surface name="inventory" layer="panel" hides={["hud"]}>
 *     {(data) => <InventoryGrid items={data.items} />}
 *   </Surface>
 */
export function Surface<K extends SurfaceName>(props: SurfaceProps<K>): ReactElement | null {
  const { name, children, onBack, keepMounted, className, style, layer, input, keepInput, exclusive, escape, hides, blockedBy } = props;
  const state = useSurface(name);
  const key = JSON.stringify([layer, input, keepInput, exclusive, escape, hides, blockedBy]);

  injectSurfaceCss();
  installPressFeel();
  useEffect(() => {
    defineSurface(name, { layer, input, keepInput, exclusive, escape, hides, blockedBy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, key]);

  const back = useRef(onBack);
  back.current = onBack;
  useEffect(() => onSurfaceBack(name, () => back.current?.()), [name]);

  const shown = state.open && state.visible;
  // closing: decided during render (not in an effect), so the content never unmounts for a frame
  const [prevShown, setPrevShown] = useState(shown);
  const [closing, setClosing] = useState(false);
  if (prevShown !== shown) {
    setPrevShown(shown);
    setClosing(!shown && exitMs() > 0);
  }
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => setClosing(false), exitMs());
    return () => clearTimeout(t);
  }, [closing]);
  // what was last on screen, drawn again while it closes (the data may already be gone)
  const last = useRef<{ data: unknown; state: SurfaceState<SurfaceData<K>> } | null>(null);
  if (shown) last.current = { data: state.data, state };

  const drawn = shown || closing;
  if (!drawn && !keepMounted) return null;
  const view = closing && last.current ? last.current : { data: state.data, state };
  const content = typeof children === "function" ? children(view.data as SurfaceData<K>, view.state) : children;
  return createElement(
    "div",
    {
      "data-surface": name,
      "data-layer": state.layer,
      "data-state": shown ? "open" : "closed",
      "data-closing": closing || undefined,
      className,
      style: {
        zIndex: (Z[state.layer] ?? 30) + (state.z ?? 0),
        display: drawn ? undefined : "none",
        ...style,
      },
    },
    createElement(SurfaceOpen.Provider, { value: shown }, content),
  );
}

// ───────────────────────────────── player

/**
 * The player from lua/bridge.lua, the same shape on Qbox, QBCore, ESX or standalone.
 *
 *   const { health, armor, cash, job } = usePlayer();
 */
export function usePlayer(): NuiPlayer {
  return useSyncExternalStore(onPlayer, getPlayer, getPlayer);
}

/**
 * The server's currency and locale (`nuikit:context`, protocol §7.2), for Intl formatting.
 * `{ currency: "USD", locale: "en-US" }` until Lua sends them.
 *
 *   const { currency, locale } = useNuiContext();
 */
export function useNuiContext(): NuiContext {
  return useSyncExternalStore(onContext, getContext, getContext);
}

// ───────────────────────────────── motion (nuikit-core/motion)

/**
 * Spring one channel of `ref` to `value` whenever it changes, retargeting a spring in flight. The first
 * value is set without animating. No React state is set during the animation.
 *
 *   useSpring(badge, count > 0 ? 1 : 0.9, "scale", "pop");
 */
export function useSpring(ref: { current: HTMLElement | null }, value: number, channel: Channel = "y", preset: SpringName | string = "move"): void {
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = first.current ? value : undefined;
    first.current = false;
    void spring(el, channel, value, { from, preset });
  }, [ref, value, channel, preset]);
}

/**
 * FLIP the children of `ref` whenever `deps` change: each child that moved glides from where it was drawn
 * to its new place (toast stacks, inventory reorders). Translate only; positions are read once per change.
 */
export function useFlip(ref: { current: HTMLElement | null }, deps: readonly unknown[], preset: SpringName | string = "move"): void {
  const prev = useRef(new WeakMap<Element, [number, number]>());
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) flipFrom(el.children as unknown as ArrayLike<HTMLElement>, prev.current, preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Drive a list's sliding selection indicator (kit.css `nk-indicator`): `indicatorRef` moves to the row at
 * `active` (the elements in `listRef` matching `rows`) with the key-repeat rule of motion's indicator().
 * Row offsets are read on mount, when the row count changes and on resize, never per move.
 */
export function useIndicator(
  listRef: { current: HTMLElement | null },
  indicatorRef: { current: HTMLElement | null },
  active: number | null | undefined,
  rows = ".nk-row",
): void {
  const offsets = useRef<[number, number][]>([]);
  const move = useRef<ReturnType<typeof indicator> | null>(null);
  const [epoch, setEpoch] = useState(0);
  const read = useCallback(() => {
    const list = listRef.current;
    offsets.current = list ? Array.from(list.querySelectorAll<HTMLElement>(rows)).map((r) => [r.offsetTop, r.offsetHeight]) : [];
  }, [listRef, rows]);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      read();
      setEpoch((e) => e + 1);
    });
    ro.observe(list);
    return () => ro.disconnect();
  }, [listRef, read]);
  useLayoutEffect(() => {
    const el = indicatorRef.current;
    const list = listRef.current;
    if (!el || !list) return;
    if (list.querySelectorAll(rows).length !== offsets.current.length) read();
    const at = active === null || active === undefined ? undefined : offsets.current[active];
    el.toggleAttribute("data-hidden", !at);
    if (!at) return;
    move.current ??= indicator(el);
    const base = offsets.current[0]![1] || 1;
    el.style.height = `${base}px`;
    move.current(at[0], at[1] / base);
  }, [active, epoch, indicatorRef, listRef, rows, read]);
}

// ───────────────────────────────── choreography (groups move in sequence, layered)

export interface StaggerOptions {
  /** delay between neighbours (ms); default from the identity: --nk-stagger, else 40 */
  step?: number;
  /** no group takes longer than this to start its last member (ms); default 300 */
  budget?: number;
  /** enter: first child first (default) or from the end */
  from?: "start" | "end";
}

interface StaggerRequest {
  el: HTMLElement | SVGElement;
  on: boolean;
  /** draw it with the kit's stagger animation (data-nk-stagger): rise, pop or fade; false = the element's own CSS */
  animate?: StaggerAnimation | false;
}
export type StaggerAnimation = "rise" | "pop" | "fade";

// --nk-stagger (ms between items), read once per theme: getComputedStyle on <html> forces a style
// recalc (~10 ms on an ox_inventory open, every flush). A new compiled theme reads it again.
let stagger: { theme: CompiledTheme | null; ms: number } | null = null;
function staggerToken(): number {
  const theme = getTheme();
  if (stagger && stagger.theme === theme) return stagger.ms;
  const token = typeof document === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue("--nk-stagger").trim();
  stagger = { theme, ms: parseFloat(token) || 40 };
  return stagger.ms;
}

/**
 * A group's choreographer: children that change state in the same frame are given delays in DOM order
 * (entering) or reverse order (leaving: the last in leaves first), within the budget. The delay is set on
 * the element before the browser starts the transition, so CSS does the moving (transform / opacity,
 * interruptible: a group that comes back mid-exit reverses from where it is).
 */
export class StaggerGroup {
  private pending: StaggerRequest[] = [];
  private queued = false;
  /** the group's own state (a sheet's open): members that follow it enter and leave with it */
  on = true;
  constructor(public opts: StaggerOptions = {}) {}
  request(r: StaggerRequest) {
    this.pending.push(r);
    if (this.queued) return;
    this.queued = true;
    queueMicrotask(() => this.flush());
  }
  private flush() {
    this.queued = false;
    const batch = this.pending;
    this.pending = [];
    const level = motionLevel();
    const order = (list: StaggerRequest[]) =>
      list.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const enter = order(batch.filter((r) => r.on));
    const exit = order(batch.filter((r) => !r.on)).reverse();
    if (this.opts.from === "end") enter.reverse();
    const stepOf = (n: number) => {
      const base = this.opts.step ?? staggerToken();
      const budget = this.opts.budget ?? 300;
      return n > 1 ? Math.min(base, budget / (n - 1)) : 0;
    };
    for (const list of [enter, exit]) {
      const step = level === "on" ? stepOf(list.length) : 0;
      list.forEach((r, i) => {
        const ms = `${Math.round(i * step)}ms`;
        r.el.style.transitionDelay = ms;
        r.el.style.animationDelay = ms;
        r.el.style.setProperty("--nk-notice-delay", ms);
        if (r.animate) {
          r.el.setAttribute("data-nk-stagger", r.on ? "in" : "out");
          r.el.setAttribute("data-nk-stagger-kind", r.animate);
        }
      });
    }
  }
}

const StaggerCtx = createContext<{ group: StaggerGroup; on: boolean } | null>(null);

/**
 * A group whose children enter and leave in sequence (see useStaggerItem). Renders its children only;
 * wrap the list:
 *
 *   <Stagger step={40}>{vitals.map((v) => <Vital key={v.id} … />)}</Stagger>
 */
export function Stagger({ children, step, budget, from, on = true }: StaggerOptions & { children: ReactNode; on?: boolean }): ReactElement {
  installPressFeel();
  const group = useRef<StaggerGroup | null>(null);
  if (!group.current) group.current = new StaggerGroup({ step, budget, from });
  group.current.opts = { step, budget, from };
  group.current.on = on;
  // members that follow the group re-render with it (the context value changes with `on`)
  const value = useMemo(() => ({ group: group.current!, on }), [on]);
  return createElement(StaggerCtx.Provider, { value }, children);
}

/** The surrounding <Stagger> group and its state, or null outside one. */
export function useStaggerGroup(): { group: StaggerGroup; on: boolean } | null {
  return useContext(StaggerCtx);
}

/**
 * One member of a <Stagger> group: when `on` changes, the element gets its delay in the group's sequence
 * (transition-delay, animation-delay and --nk-notice-delay), so its own CSS transition plays in turn.
 * Returns the ref to put on the element. Outside a group it does nothing.
 */
export function useStaggerItem<T extends HTMLElement | SVGElement>(
  on?: boolean,
  opts: { appear?: boolean; animate?: StaggerAnimation | false } = {},
): (el: T | null) => void {
  const ctx = useContext(StaggerCtx);
  const group = ctx?.group ?? null;
  // no state of its own: it follows the group (enters with it, leaves with it)
  const state = on ?? ctx?.on ?? true;
  const el = useRef<T | null>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      // mounted inside a group: enter in sequence with the others mounting now
      if (opts.appear && state && group && el.current) group.request({ el: el.current, on: true, animate: opts.animate });
      return;
    }
    if (group && el.current) group.request({ el: el.current, on: state, animate: opts.animate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, group]);
  return useCallback((node: T | null) => {
    el.current = node;
  }, []);
}

// ───────────────────────────────── press feel for the keyboard and controller

let pressInstalled = false;
const PRESSABLE = '[data-slot="button"], .nk-row, [data-slot="menu-row"], [data-slot="tabs-trigger"], .nk-press, [data-nk-pressable]';
/**
 * The kit's press dip (kit.css: :active, [data-nk-press]) for Enter and Space, and for a controller's
 * confirm (which nuikit's controls deliver as Enter): the focused control is marked pressed for a moment,
 * so it dips and springs back like a click. Installed once per page by <Stagger>, <Surface> and MenuRow.
 */
export function installPressFeel(): void {
  if (pressInstalled || typeof window === "undefined") return;
  pressInstalled = true;
  const release = (el: Element) => setTimeout(() => el.removeAttribute("data-nk-press"), 110);
  // A controller: nuikit's controls service doesn't turn a gamepad's confirm into a key, so the page
  // watches the Gamepad API itself while one is connected: A (button 0) dips the focused control.
  let polling = false;
  const poll = () => {
    const pads = typeof navigator.getGamepads === "function" ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    if (!pads.length) {
      polling = false;
      return;
    }
    for (const pad of pads) {
      const down = !!pad!.buttons[0]?.pressed;
      const was = padDown.get(pad!.index) ?? false;
      padDown.set(pad!.index, down);
      if (down && !was) {
        const el = document.activeElement?.closest?.(PRESSABLE);
        if (el && !el.matches("input, textarea")) {
          el.setAttribute("data-nk-press", "");
          release(el);
        }
      }
    }
    requestAnimationFrame(poll);
  };
  const padDown = new Map<number, boolean>();
  window.addEventListener("gamepadconnected", () => {
    if (polling) return;
    polling = true;
    requestAnimationFrame(poll);
  });
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.repeat || (e.key !== "Enter" && e.key !== " ")) return;
      const t = (e.composedPath?.()[0] as Element | undefined) ?? (e.target as Element | null);
      const el = t instanceof Element ? t.closest(PRESSABLE) : null;
      if (!el || el.matches("input, textarea")) return;
      el.setAttribute("data-nk-press", "");
      release(el);
    },
    true,
  );
}
