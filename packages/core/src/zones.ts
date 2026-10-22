// Screen zones: what each UI covers on screen, so the others place themselves around it.
//
// A UI publishes its rectangles from Lua (`NUI.zone('hud', rects)`, nuikit.lua); every nuikit page gets
// the merged set as `nuikit:zones` (keyed `resource:name`). A corner-anchored stack (notices, prompts)
// asks `clearOf` how far to move to clear what's in its corner: the HUD's map, the vehicle cluster.
// Rectangles are fractions of the screen (0–1), so every page reads them at its own size.

import { onNui } from "./index";

/** A rectangle a UI covers, in fractions of the screen. */
export interface ZoneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Every published zone: `resource:name` → its rectangles. */
export type Zones = Record<string, ZoneRect[]>;

export type ZonePosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right" | "center-left" | "center-right" | "center";

let zones: Zones = {};
const listeners = new Set<() => void>();
let listening = false;

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  onNui("nuikit:zones", (data) => {
    // an empty Lua table arrives as [] (json.encode can't tell): no zones
    zones = data && typeof data === "object" && !Array.isArray(data) ? (data as Zones) : {};
    listeners.forEach((l) => l());
  });
}
// subscribed from the first import, so a set sent before any stack mounts isn't missed
listen();

/** The current zones (the latest `nuikit:zones`). */
export function getZones(): Zones {
  return zones;
}

/** Called on every change; returns the unsubscribe. */
export function onZones(fn: () => void): () => void {
  listen();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export interface ClearOptions {
  /** The stack's width in px (what it would cover from its edge). Default 20rem. */
  width?: number;
  /** Its distance from the screen edge in px. Default --nk-edge (1.5rem). */
  edge?: number;
  /** Space kept under (or over) the zone it clears, in px. Default 0.75rem. */
  gap?: number;
  /** Zones to ignore (a UI never clears itself), by `resource:name` or resource prefix. */
  ignore?: string[];
  /** The screen in px. Default the window. */
  screen?: { w: number; h: number };
}

/**
 * Where a stack anchored at `position` must start to clear the zones in its column: `{ top }` (px from
 * the top) for a top position, `{ bottom }` for a bottom one, `{}` when nothing is in the way (keep
 * the anchor's own edge). Only zones in the stack's half of the screen count, so the map top right
 * pushes top-right notices down and the cluster bottom right pushes bottom-right ones up.
 */
export function clearOf(all: Zones, position: ZonePosition, opts: ClearOptions = {}): { top?: number; bottom?: number } {
  const top = position.startsWith("top");
  const bottom = position.startsWith("bottom");
  if (!top && !bottom) return {};
  const rem = typeof document !== "undefined" ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 : 16;
  const W = opts.screen?.w ?? (typeof window !== "undefined" ? window.innerWidth : 1920);
  const H = opts.screen?.h ?? (typeof window !== "undefined" ? window.innerHeight : 1080);
  const width = opts.width ?? 20 * rem;
  const edge = opts.edge ?? 1.5 * rem;
  const gap = opts.gap ?? 0.75 * rem;

  // the column the stack occupies
  const x0 = position.endsWith("left") ? edge : position.endsWith("right") ? W - edge - width : (W - width) / 2;
  const x1 = x0 + width;

  let out: number | undefined;
  for (const [key, rects] of Object.entries(all)) {
    if (opts.ignore?.some((i) => key === i || key.startsWith(`${i}:`))) continue;
    for (const r of rects ?? []) {
      const rx0 = r.x * W;
      const rx1 = (r.x + r.w) * W;
      const ry0 = r.y * H;
      const ry1 = (r.y + r.h) * H;
      if (rx1 <= x0 || rx0 >= x1 || r.w <= 0 || r.h <= 0) continue;
      if (top && ry0 < H / 2) out = Math.max(out ?? 0, ry1 + gap);
      if (bottom && ry1 > H / 2) out = Math.max(out ?? 0, H - ry0 + gap);
    }
  }
  if (out === undefined || out <= edge) return {};
  return top ? { top: out } : { bottom: out };
}
