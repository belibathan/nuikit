import { createContext, createElement, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactElement, type ReactNode } from "react";
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
  getPlayer,
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

export * from "./index";

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
