import { isBrowser } from "nuikit-core";
import { useEffect, useRef } from "react";

const resource = () => (typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "ox_target");

/** POST to ox_target's Lua exactly like its own page: JSON body, reply is `1`. */
export async function post<T = unknown>(name: string, body?: unknown): Promise<T> {
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.debug("[ox_target →lua]", name, JSON.stringify(body));
    window.dispatchEvent(new CustomEvent("ox:post", { detail: { name, body } }));
    return 1 as T;
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

export type TargetMessage = { event: string; [key: string]: unknown };

/**
 * ox_target's Lua sends `{ event, ...fields }`, not nuikit's `{ action, data }` envelope.
 * In the browser the nuikit devtools emit `{ action, data }`, so dev builds accept that too
 * (with `data` holding the fields).
 */
function normalize(raw: unknown): TargetMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.event === "string") return m as TargetMessage;
  if (import.meta.env.DEV && typeof m.action === "string") {
    const data = m.data && typeof m.data === "object" ? (m.data as Record<string, unknown>) : {};
    return { ...data, event: m.action };
  }
  return null;
}

/** Subscribe to every ox_target message. The handler can change every render. */
export function useTargetMessages(handler: (msg: TargetMessage) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      const msg = normalize(e.data);
      if (msg) ref.current(msg);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);
}
