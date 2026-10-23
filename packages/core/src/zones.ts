// Screen zones: what each UI covers on screen, so the others place themselves around it.
//
// A UI publishes its rectangles from Lua (`NUI.zone('hud', rects)`, nuikit.lua); every nuikit page gets
// the merged set as `nuikit:zones` (keyed `resource:name`). A corner-anchored stack (notices, prompts)
// asks `clearOf` how far to move to clear what's in its corner: the HUD's map, the vehicle cluster.
// Rectangles are fractions of the screen (0–1), so every page reads them at its own size.

import { fetchNui, isBrowser, onNui } from "./index";

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

// ─────────────────────────────────────────── the layout zones (docs/design/layout.md)

/** The nine zones of the screen and its four edges. */
export type ZoneId = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br" | "t" | "r" | "b" | "l";
export const ZONE_IDS: readonly ZoneId[] = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br", "t", "r", "b", "l"];

const LONG: Record<string, ZoneId> = {
  "top-left": "tl",
  "top-center": "tc",
  "top-right": "tr",
  "center-left": "ml",
  "left-center": "ml",
  center: "mc",
  middle: "mc",
  "center-right": "mr",
  "right-center": "mr",
  "bottom-left": "bl",
  "bottom-center": "bc",
  "bottom-right": "br",
  top: "tc",
  bottom: "bc",
  left: "ml",
  right: "mr",
};
const POSITION: Record<ZoneId, ZonePosition> = {
  tl: "top-left",
  tc: "top-center",
  tr: "top-right",
  ml: "center-left",
  mc: "center",
  mr: "center-right",
  bl: "bottom-left",
  bc: "bottom-center",
  br: "bottom-right",
  t: "top-center",
  r: "center-right",
  b: "bottom-center",
  l: "center-left",
};

/** Any position word (a zone id, `top-right`, ox `right-center`, qb `right`) to a zone id; unknown is `fallback`. */
export function toZoneId(value: string | null | undefined, fallback: ZoneId = "tr"): ZoneId {
  const v = String(value ?? "").toLowerCase();
  if ((ZONE_IDS as readonly string[]).includes(v)) return v as ZoneId;
  return LONG[v] ?? fallback;
}

/** A zone id's long name (what clearOf and the stacks take). Edges map to the middle of their side. */
export const zonePosition = (id: ZoneId): ZonePosition => POSITION[id];

export interface ZonePlacement {
  /** Which side of the box it holds on each axis. */
  x: "start" | "center" | "end" | "stretch";
  y: "start" | "center" | "end" | "stretch";
  /** The flex direction that grows towards the screen centre (first child at the edge). */
  flow: "column" | "column-reverse" | "row" | "row-reverse";
  /** Cross-axis alignment: towards its own side. */
  align: "flex-start" | "center" | "flex-end" | "stretch";
  /** An edge zone touches the box edge (no inset) and spans its side. */
  edge: boolean;
}

/** How a zone sits and flows: deterministic, the same in CSS (kit.css nk.layout) and here. */
export function zonePlacement(id: ZoneId): ZonePlacement {
  if (id === "t" || id === "b") return { x: "stretch", y: id === "t" ? "start" : "end", flow: id === "t" ? "column" : "column-reverse", align: "stretch", edge: true };
  if (id === "l" || id === "r") return { x: id === "l" ? "start" : "end", y: "stretch", flow: id === "l" ? "row" : "row-reverse", align: "stretch", edge: true };
  const y = id[0] === "t" ? "start" : id[0] === "b" ? "end" : "center";
  const x = id[1] === "l" ? "start" : id[1] === "r" ? "end" : "center";
  return { x, y, flow: y === "end" ? "column-reverse" : "column", align: x === "start" ? "flex-start" : x === "end" ? "flex-end" : "center", edge: false };
}

export interface ZoneFrame {
  /** The screen in px. */
  screen: { w: number; h: number };
  /** The content box's insets from the screen in px (the 16:9 box on an ultrawide; 0 when the zone bleeds). */
  area?: { l: number; r: number; t: number; b: number };
  /** Safe area in px. */
  safe?: { x: number; y: number };
  /** The zone's inset from the safe area in px (--nk-zone-inset, default --nk-edge). */
  inset?: number;
}

/**
 * The rectangle a zone may fill, in px: where its content starts and how far it can grow. Corner and middle
 * zones get their third of the box (inset); edge zones the whole side, flush. Pure: the CSS draws the same.
 */
export function zoneRect(id: ZoneId, f: ZoneFrame): { x: number; y: number; w: number; h: number } {
  const a = f.area ?? { l: 0, r: 0, t: 0, b: 0 };
  const s = f.safe ?? { x: 0, y: 0 };
  const p = zonePlacement(id);
  const i = p.edge ? 0 : f.inset ?? 24;
  const x0 = a.l + s.x + i;
  const x1 = f.screen.w - a.r - s.x - i;
  const y0 = a.t + s.y + i;
  const y1 = f.screen.h - a.b - s.y - i;
  if (p.edge) {
    if (id === "t" || id === "b") return { x: x0, y: id === "t" ? y0 : y1, w: x1 - x0, h: 0 };
    return { x: id === "l" ? x0 : x1, y: y0, w: 0, h: y1 - y0 };
  }
  const w = (x1 - x0) / 3;
  const h = (y1 - y0) / 3;
  const col = p.x === "start" ? 0 : p.x === "center" ? 1 : 2;
  const row = p.y === "start" ? 0 : p.y === "center" ? 1 : 2;
  return { x: x0 + col * w, y: y0 + row * h, w, h };
}

/** Which zone a rectangle (screen fractions) belongs to: the third of the screen its centre falls in. */
export function zoneOf(r: ZoneRect): ZoneId {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const col = cx < 1 / 3 ? "l" : cx > 2 / 3 ? "r" : "c";
  const row = cy < 1 / 3 ? "t" : cy > 2 / 3 ? "b" : "m";
  return `${row}${col}` as ZoneId;
}

let zones: Zones = {};
const listeners = new Set<() => void>();
let listening = false;

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  onNui("nuikit:zones", setZones);
}

/**
 * Replace the zones (what `nuikit:zones` does). Override pages get them through the theme long-poll
 * (`loadServerTheme`, remote.ts), since nuikit.lua can't message them.
 */
export function setZones(data: unknown): void {
  // an empty Lua table arrives as [] (json.encode can't tell): no zones
  zones = data && typeof data === "object" && !Array.isArray(data) ? (data as Zones) : {};
  listeners.forEach((l) => l());
}
// subscribed right after the first import (a microtask: index → remote → zones is a cycle, so onNui's
// module may still be loading), before any message arrives, so a set sent before a stack mounts isn't missed
void Promise.resolve().then(listen);

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
  /** A middle stack's height in px (what it covers around the centre line). Default 12rem. */
  height?: number;
  /** Zones to ignore (a UI never clears itself), by `resource:name` or resource prefix. */
  ignore?: string[];
  /** The screen in px. Default the window. */
  screen?: { w: number; h: number };
  /** The content box's left and right insets in px (Screen's area: the 16:9 box on an ultrawide). Default 0. */
  area?: { l: number; r: number };
}

/**
 * Where a stack anchored at `position` must start to clear the zones in its column: `{ top }` (px from
 * the top) for a top position, `{ bottom }` for a bottom one, `{ left }` / `{ right }` (px from that side)
 * for a middle-left or middle-right one, `{}` when nothing is in the way (keep the anchor's own edge). Only
 * zones in the stack's half (its band, for a middle one) count, so the map top right pushes top-right
 * notices down, the cluster bottom right pushes bottom-right ones up, a phone on the right edge pushes
 * center-right prompts inwards. The centre never moves.
 */
export function clearOf(all: Zones, position: ZonePosition | ZoneId, opts: ClearOptions = {}): { top?: number; bottom?: number; left?: number; right?: number } {
  const pos = (ZONE_IDS as readonly string[]).includes(position) ? POSITION[position as ZoneId] : (position as ZonePosition);
  const top = pos.startsWith("top");
  const bottom = pos.startsWith("bottom");
  const side = pos === "center-left" ? "left" : pos === "center-right" ? "right" : null;
  if (!top && !bottom && !side) return {};
  const rem = typeof document !== "undefined" ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 : 16;
  const W = opts.screen?.w ?? (typeof window !== "undefined" ? window.innerWidth : 1920);
  const H = opts.screen?.h ?? (typeof window !== "undefined" ? window.innerHeight : 1080);
  const width = opts.width ?? 20 * rem;
  const edge = opts.edge ?? 1.5 * rem;
  const gap = opts.gap ?? 0.75 * rem;
  const al = opts.area?.l ?? 0;
  const ar = opts.area?.r ?? 0;
  const skip = (key: string) => opts.ignore?.some((i) => key === i || key.startsWith(`${i}:`));

  if (side) {
    // a middle stack's band: its height around the centre line, its own half of the width
    const band = opts.height ?? 12 * rem;
    const y0 = (H - band) / 2;
    const y1 = (H + band) / 2;
    let out: number | undefined;
    for (const [key, rects] of Object.entries(all)) {
      if (skip(key)) continue;
      for (const r of rects ?? []) {
        const rx0 = r.x * W;
        const rx1 = (r.x + r.w) * W;
        const ry0 = r.y * H;
        const ry1 = (r.y + r.h) * H;
        if (ry1 <= y0 || ry0 >= y1 || r.w <= 0 || r.h <= 0) continue;
        if (side === "left" && rx0 < W / 2) out = Math.max(out ?? 0, rx1 + gap);
        if (side === "right" && rx1 > W / 2) out = Math.max(out ?? 0, W - rx0 + gap);
      }
    }
    const own = edge + (side === "left" ? al : ar);
    if (out === undefined || out <= own) return {};
    return side === "left" ? { left: out } : { right: out };
  }

  // the column the stack occupies
  const x0 = pos.endsWith("left") ? al + edge : pos.endsWith("right") ? W - ar - edge - width : (W - width) / 2;
  const x1 = x0 + width;

  let out: number | undefined;
  for (const [key, rects] of Object.entries(all)) {
    if (skip(key)) continue;
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

/**
 * Lay out stacks that share a corner without overlap: each item (its height in px, in order from the edge)
 * starts after the previous one plus `gap`, from `start` (clearOf's offset, or the edge). Returns each item's
 * offset from the edge. Deterministic: the same input is always the same layout.
 */
export function stackOffsets(heights: number[], start: number, gap: number): number[] {
  const out: number[] = [];
  let at = start;
  for (const h of heights) {
    out.push(at);
    at += Math.max(0, h) + gap;
  }
  return out;
}

/** Publish rectangles (screen fractions) a page covers, through NUI.zone (nuikit.lua `nuikit:zone`). */
export async function publishZone(name: string, rects: ZoneRect[] | null): Promise<void> {
  if (isBrowser()) return;
  await fetchNui("nuikit:zone" as never, { name, rects: rects ?? null } as never).catch(() => {});
}
