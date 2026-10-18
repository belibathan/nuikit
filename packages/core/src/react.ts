import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
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
