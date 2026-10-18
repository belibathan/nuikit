import { useSyncExternalStore } from "react";

let locale: Record<string, any> = {};
const listeners = new Set<() => void>();

export function setLocale(next: Record<string, any>) {
  locale = next ?? {};
  listeners.forEach((l) => l());
}

/** ox_lib's UI uses three strings: ui.cancel, ui.confirm and ui.more. */
export function useLocale() {
  const l = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => locale,
  );
  return {
    cancel: (l?.ui?.cancel as string) ?? "Cancel",
    confirm: (l?.ui?.confirm as string) ?? "Confirm",
    more: (l?.ui?.more as string) ?? "More...",
  };
}
