import { isBrowser, onNui } from "nuikit-core";
import { useEffect, useRef } from "react";

const resource = () => (typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "ox_lib");

/** Browser responses for the callbacks that return something. */
const browserReplies: Record<string, unknown> = { getConfig: { primaryColor: "blue", primaryShade: 8 }, radialTransition: true };

/**
 * POST to ox_lib's Lua, exactly like ox_lib's own page: JSON body, `undefined` → no body.
 * Every handler replies with JSON (1, an object or a boolean).
 */
export async function post<T = unknown>(name: string, body?: unknown): Promise<T> {
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.debug("[ox_lib →lua]", name, body);
    window.dispatchEvent(new CustomEvent("ox:post", { detail: { name, body } }));
    return (browserReplies[name] ?? 1) as T;
  }
  const res = await fetch(`https://${resource()}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });
  try {
    return (await res.json()) as T;
  } catch {
    return undefined as T;
  }
}

/** Subscribe to an inbound ox_lib message. The handler can change every render. */
export function useOx<T = any>(action: string, handler: (data: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => onNui(action, (data) => ref.current(data as T)), [action]);
}

/** Calls fn once `ms` after the last call. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
