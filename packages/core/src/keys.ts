// nk.keys, page side: the keys every resource declared (packages/core/lua/keys.lua), for a read-only
// "Controls" list. Players change them in GTA's Settings › Key Bindings › FiveM. In the browser (dev) the list
// is whatever you pass to `mockKeys`.

import { isBrowser } from "./index";

export interface KeyBinding {
  resource: string;
  id: string;
  label: string;
  /** The key the resource declared. */
  default: string;
  /** What it is bound to now (the player's own choice, or the default). */
  binding: string;
  mapper: string;
}

let mock: KeyBinding[] = [];

/** Dev only: the keys the browser pretends the server has. */
export function mockKeys(keys: (Omit<KeyBinding, "binding" | "mapper"> & { binding?: string; mapper?: string })[]): void {
  mock = keys.map((k) => ({ ...k, binding: k.binding ?? k.default, mapper: k.mapper ?? "keyboard" }));
}

/** Every declared key, sorted by resource then label. */
export async function loadKeys(): Promise<KeyBinding[]> {
  if (isBrowser()) return mock.map((k) => ({ ...k }));
  try {
    const res = await fetch("https://nuikit/keys", { method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: "{}" });
    if (!res.ok) return [];
    const text = await res.text();
    return text ? ((JSON.parse(text) as { keys?: KeyBinding[] }).keys ?? []) : [];
  } catch {
    return [];
  }
}
