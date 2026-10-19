import { isBrowser, onNui } from "nuikit-core";
import { useEffect, useRef } from "react";

const resource = () => (typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "ox_inventory");

/** Browser stand-ins for Lua's replies (dev.tsx swaps these for smarter mocks). */
export const browserReplies: Record<string, (body: unknown) => unknown> = {};

/**
 * POST to ox_inventory's client Lua, like its own page does: JSON body (`undefined` → none),
 * JSON reply. Rejects on a network/parse failure so callers can roll back.
 */
export async function post<T = unknown>(name: string, body?: unknown): Promise<T> {
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.debug("[ox_inventory →lua]", name, body);
    window.dispatchEvent(new CustomEvent("ox:post", { detail: { name, body } }));
    const reply = browserReplies[name];
    return (reply ? await reply(body) : 1) as T;
  }
  const res = await fetch(`https://${resource()}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

/** Fire-and-forget POST (Lua replies 1). */
export function send(name: string, body?: unknown) {
  post(name, body).catch(() => {});
}

/** Subscribe to an inbound ox_inventory message. The handler may change every render. */
export function useOx<T = any>(action: string, handler: (data: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => onNui(action, (data) => ref.current(data as T)), [action]);
}

/** Copy text without the async Clipboard API, which CEF NUI doesn't reliably allow. */
export function copyText(text: string) {
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand("copy");
  } finally {
    el.remove();
  }
}
