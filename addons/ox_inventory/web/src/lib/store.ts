import { useSyncExternalStore } from "react";

/** A tiny external store: get/set/subscribe plus a selector hook. Updates must be immutable. */
export function createStore<S>(initial: S) {
  let state = initial;
  const listeners = new Set<() => void>();
  const get = () => state;
  const set = (next: Partial<S> | ((s: S) => Partial<S>)) => {
    const patch = typeof next === "function" ? next(state) : next;
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  function use<T>(selector: (s: S) => T): T {
    return useSyncExternalStore(subscribe, () => selector(state));
  }
  return { get, set, subscribe, use };
}
