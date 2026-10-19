import { isBrowser } from "nuikit-core";
import { useEffect, useRef } from "react";

const resource = () => (typeof window.GetParentResourceName === "function" ? window.GetParentResourceName() : "qbx_taxijob");

/** POST to qbx_taxijob's Lua (docs/qbx-taxijob-protocol.md). Every callback replies 'ok'. */
export async function post(name: "enableMeter" | "hideMouse", body: unknown = {}): Promise<void> {
  if (isBrowser()) {
    // eslint-disable-next-line no-console
    console.debug("[qbx_taxijob →lua]", name, body);
    window.dispatchEvent(new CustomEvent("qbx:post", { detail: { name, body } }));
    return;
  }
  try {
    await fetch(`https://${resource()}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(body),
    });
  } catch {
    /* Lua gone (resource restarting) */
  }
}

export type Message = { action: string } & Record<string, any>;

/**
 * qbx_taxijob sends flat messages ({ action, toggle, meterData }). The devtools' emit() wraps the
 * payload in `data`, so that is merged in too (the real messages never have a `data` field).
 */
export function useMessages(handler: (msg: Message) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const on = (e: MessageEvent) => {
      const m = e.data;
      if (!m || typeof m !== "object" || typeof m.action !== "string") return;
      const data = m.data && typeof m.data === "object" ? m.data : {};
      ref.current({ ...data, ...m });
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);
}
