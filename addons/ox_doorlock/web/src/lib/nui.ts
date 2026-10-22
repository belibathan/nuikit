import { isBrowser } from "nuikit-core";
import { useEffect, useRef } from "react";

const resource = () => (typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "ox_doorlock");

export type Callback = "exit" | "createDoor" | "deleteDoor" | "teleportToDoor" | "notify";

/**
 * POST to ox_doorlock's Lua (docs/ox-doorlock-protocol.md §2). Every callback replies 1, ignored.
 * `exit` has no body at all; the others send their body as JSON (deleteDoor/teleportToDoor a bare id,
 * notify a bare string).
 */
export async function post(name: Callback, body?: unknown): Promise<void> {
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.debug("[ox_doorlock →lua]", name, body);
    return;
  }
  try {
    await fetch(`https://${resource()}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    /* Lua gone (resource restarting) */
  }
}

/** ox_doorlock's messages: always `{ action, data }`. */
export function useMessages(handler: (action: string, data: unknown) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const on = (e: MessageEvent) => {
      const m = e.data;
      if (!m || typeof m !== "object" || typeof m.action !== "string") return;
      ref.current(m.action, m.data);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
}
