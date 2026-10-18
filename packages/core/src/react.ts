import { createElement, useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactElement, type ReactNode } from "react";
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
  fetchNui,
  getVisible,
  onNui,
  onVisible,
  type CallbackName,
  type CallbackReq,
  type CallbackRes,
  type EventData,
  type EventName,
} from "./index";

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
 * Visibility driven by Lua's NUI.open()/NUI.close(), with Escape-to-close built in.
 *
 *   const { visible, close } = useNuiVisibility();
 *   if (!visible) return null;
 */
export function useNuiVisibility(options: { closeOnEscape?: boolean } = {}) {
  const { closeOnEscape = true } = options;
  const visible = useSyncExternalStore(onVisible, getVisible, getVisible);
  const close = useCallback(() => closeNui(), []);

  useEffect(() => {
    if (!visible || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isTyping(e)) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, closeOnEscape, close]);

  return { visible, close };
}

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
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
const SURFACE_CSS = "[data-surface]{position:absolute;inset:0;pointer-events:none}[data-surface]>*{pointer-events:auto}";
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

/**
 * Renders its children while the surface is open and visible, stacked by layer. It fills the
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
  if (!shown && !keepMounted) return null;
  const content = typeof children === "function" ? children(state.data as SurfaceData<K>, state) : children;
  return createElement(
    "div",
    {
      "data-surface": name,
      "data-layer": state.layer,
      "data-state": shown ? "open" : "closed",
      className,
      style: {
        zIndex: (Z[state.layer] ?? 30) + (state.z ?? 0),
        display: shown ? undefined : "none",
        ...style,
      },
    },
    content,
  );
}
