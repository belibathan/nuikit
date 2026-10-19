import { isBrowser } from "nuikit-core";
import { useEffect, useRef } from "react";
import type { Account } from "./types";

const resource = () => (typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "Renewed-Banking");

/** Browser stand-ins for Lua (dev.tsx installs them). */
export const browserReplies: Record<string, (body: any) => unknown> = {};

/**
 * POST to Renewed-Banking's Lua, like the stock page: JSON body, JSON reply.
 * `closeInterface` replies with the bare string 'ok' (not JSON); that resolves to undefined.
 */
export async function post<T = unknown>(name: string, body: unknown = {}): Promise<T> {
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.debug("[Renewed-Banking →lua]", name, body);
    window.dispatchEvent(new CustomEvent("rb:post", { detail: { name, body } }));
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

/** Inbound messages. Renewed-Banking sends them flat ({ action, status, accounts, ... }). */
export interface Inbound {
  updateLocale: { translations?: Record<string, unknown>; currency?: string };
  setLoading: { status?: boolean };
  setVisible: { status?: boolean; accounts?: Account[]; loading?: boolean; atm?: boolean };
  notify: { status?: string };
}

/**
 * Subscribe to one inbound action. Fields are read from the message itself (how Lua sends them);
 * a `data` object, as the nuikit devtools send, is merged underneath.
 */
export function useBank<K extends keyof Inbound>(action: K, handler: (msg: Inbound[K]) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const m = e.data as Record<string, unknown> | null;
      if (!m || typeof m !== "object" || m.action !== action) return;
      const nested = m.data && typeof m.data === "object" && !Array.isArray(m.data) ? (m.data as Record<string, unknown>) : {};
      ref.current({ ...nested, ...m } as Inbound[K]);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [action]);
}
