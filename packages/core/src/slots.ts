// Cluster slots (docs/slots.md): a cluster (the HUD's vitals row) draws the slots other resources joined with
// NUI.slot(cluster, key, opts) in Lua. Every nuikit page gets the set as `nuikit:slots`; a cluster reads its own,
// ordered (order, then resource, then key), and draws what each slot carries.

import { onNui } from "./index";

export interface Slot {
  key: string;
  /** The resource that joined. */
  resource: string;
  /** Lower first. Default 100. */
  order: number;
  label?: string;
  icon?: string;
  /** A role (tokens 1.4): the cluster sets data-hue from it. */
  hue?: string;
  /** 0–1, what the slot's fill means is the slot's own (voice volume, radio signal…). */
  level?: number;
  value?: string | number;
  alert?: boolean;
  hidden?: boolean;
  [extra: string]: unknown;
}

/** cluster → `resource:key` → slot. */
export type Slots = Record<string, Record<string, Slot>>;

let slots: Slots = {};
const listeners = new Set<() => void>();
let listening = false;

/** Replace the set (what `nuikit:slots` does). An empty Lua table arrives as []: no slots. */
export function setSlots(data: unknown): void {
  slots = data && typeof data === "object" && !Array.isArray(data) ? (data as Slots) : {};
  cache.clear();
  listeners.forEach((l) => l());
}

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  onNui("nuikit:slots" as never, setSlots);
}
// one microtask after import (index → … → slots may be a cycle), before any message arrives
void Promise.resolve().then(listen);

export function getAllSlots(): Slots {
  return slots;
}

const cache = new Map<string, Slot[]>();

/** A cluster's visible slots, ordered. The same array until the set changes (safe for useSyncExternalStore). */
export function getSlots(cluster: string): Slot[] {
  let list = cache.get(cluster);
  if (!list) {
    const raw = slots[cluster];
    list = (raw && typeof raw === "object" ? Object.values(raw) : [])
      .filter((s) => s && !s.hidden)
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.resource.localeCompare(b.resource) || a.key.localeCompare(b.key));
    cache.set(cluster, list);
  }
  return list;
}

export function onSlots(fn: () => void): () => void {
  listen();
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
