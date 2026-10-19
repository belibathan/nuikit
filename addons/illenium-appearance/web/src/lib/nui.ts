import { isBrowser } from "nuikit-core";
import { useEffect, useRef } from "react";

const resource = () =>
  typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "illenium-appearance";

type BrowserHandler = (name: string, body: unknown) => unknown | Promise<unknown>;
let browserHandler: BrowserHandler | undefined;

/** Browser only: answer callbacks the way illenium-appearance's Lua would (see dev.tsx). */
export function setBrowserHandler(fn: BrowserHandler | undefined) {
  browserHandler = fn;
}

/**
 * POST to illenium-appearance's Lua: JSON body (a bare string goes as a JSON string), JSON reply.
 * Handlers reply 1, a boolean or a settings object (docs/illenium-appearance-protocol.md §2).
 */
export async function post<T = unknown>(name: string, body: unknown = {}): Promise<T> {
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.debug("[appearance →lua]", name, body);
    window.dispatchEvent(new CustomEvent("appearance:post", { detail: { name, body } }));
    const res = browserHandler ? await browserHandler(name, body) : 1;
    return (res ?? 1) as T;
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

/**
 * Subscribe to an inbound message. illenium-appearance sends `{ type, payload }`; `{ action, data }`
 * is accepted too so the nuikit devtools can fire the same events.
 */
export function useAppearanceMessage<T = unknown>(type: string, handler: (payload: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; payload?: unknown; action?: string; data?: unknown } | null;
      if (!d || typeof d !== "object") return;
      const name = d.type ?? d.action;
      if (name !== type) return;
      ref.current((d.type !== undefined ? d.payload : d.data) as T);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [type]);
}

/** Pretend to be Lua (browser dev and tests). */
export function sendMessage(type: string, payload: unknown = {}) {
  window.dispatchEvent(new MessageEvent("message", { data: { type, payload } }));
}
