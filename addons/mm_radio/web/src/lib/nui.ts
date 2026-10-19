import { isBrowser, onNui } from "nuikit-core";
import { useEffect, useRef } from "react";

const resource = () => (typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "mm_radio");

/** Browser stand-ins for Lua (dev.tsx installs them). */
export const browserReplies: Record<string, (body: any) => unknown> = {};

/**
 * POST to mm_radio's Lua like the stock page: JSON body. Most callbacks answer the bare string
 * 'ok' (not JSON), which resolves to undefined here.
 */
export async function post<T = unknown>(name: string, body: unknown = {}): Promise<T> {
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.debug("[mm_radio →lua]", name, body);
    window.dispatchEvent(new CustomEvent("radio:post", { detail: { name, body } }));
    const reply = browserReplies[name];
    return (reply ? await reply(body) : "ok") as T;
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

/** Subscribe to an inbound mm_radio message ({ action, data }). The handler can change every render. */
export function useRadio<T = any>(action: string, handler: (data: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => onNui(action, (data) => ref.current(data as T)), [action]);
}
