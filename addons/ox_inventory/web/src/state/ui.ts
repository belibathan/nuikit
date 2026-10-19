import type { PointerEvent as ReactPointerEvent } from "react";
import { createStore } from "@/lib/store";
import type { ItemSlot, Side } from "@/lib/types";
import { canDragSlot, canDropOn, dropOnSlot, giveItem, useItem } from "@/state/actions";
import { hasItem, inv, sideInventory } from "@/state/inventory";

export type SlotRef = { side: Side; slot: number };

type UiState = {
  tooltip: { side: Side; slot: number } | null;
  menu: { slot: number; x: number; y: number } | null;
  help: boolean;
  /** Slot under the pointer (for Ctrl+C serial copy). */
  hover: SlotRef | null;
  drag: { from: SlotRef; item: ItemSlot } | null;
  /** data-drop key of the valid target under the cursor. */
  over: string | null;
};

export const ui = createStore<UiState>({ tooltip: null, menu: null, help: false, hover: null, drag: null, over: null });

// ───────────────────────────── pointer position (shared by tooltip and drag preview, no re-render)

export const pointer = { x: 0, y: 0 };
const moveListeners = new Set<() => void>();
export function onPointerMove(l: () => void) {
  moveListeners.add(l);
  return () => void moveListeners.delete(l);
}
if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      moveListeners.forEach((l) => l());
    },
    { passive: true },
  );
  // Native HTML5 drags (images, text) never start: drag & drop is pointer-driven (§0).
  window.addEventListener("dragstart", (e) => e.preventDefault());
}

// ───────────────────────────── tooltip (opens after 500 ms of rest, §8)

let tipTimer: ReturnType<typeof setTimeout> | undefined;
export function hoverSlot(ref: SlotRef | null) {
  clearTimeout(tipTimer);
  ui.set({ hover: ref, tooltip: null });
  if (!ref) return;
  tipTimer = setTimeout(() => {
    if (!ui.get().drag && !ui.get().menu) ui.set({ tooltip: ref });
  }, 500);
}
export function closeTooltip() {
  clearTimeout(tipTimer);
  ui.set({ tooltip: null });
}

// ───────────────────────────── drag & drop with pointer events (HTML5 DnD is unreliable in CEF)

const THRESHOLD = 4;
let press: { ref: SlotRef; x: number; y: number } | null = null;
/** Set right after a drag ends, so the click that follows the pointerup is ignored. */
let suppressClick = false;
export const clickSuppressed = () => suppressClick;

function targetAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop]");
  const key = el?.dataset.drop ?? null;
  const d = ui.get().drag;
  if (!key || !d) return null;
  if (key === "use" || key === "give") return d.from.side === "left" && sideInventory("left").type !== "" ? key : null;
  const [, side, slot] = key.split(":");
  return canDropOn(d.from, { side: side as Side, slot: Number(slot) }) ? key : null;
}

function onMove(e: PointerEvent) {
  if (!press) return;
  const d = ui.get().drag;
  if (!d) {
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) < THRESHOLD) return;
    const item = sideInventory(press.ref.side).items[press.ref.slot - 1];
    if (!hasItem(item) || !canDragSlot(press.ref.side, item) || inv.get().busy) return end();
    clearTimeout(tipTimer);
    ui.set({ drag: { from: press.ref, item }, tooltip: null, menu: null });
    document.body.classList.add("inv-dragging");
  }
  const over = targetAt(e.clientX, e.clientY);
  if (over !== ui.get().over) ui.set({ over });
}

function onUp(e: PointerEvent) {
  const d = ui.get().drag;
  const over = d ? targetAt(e.clientX, e.clientY) : null;
  end();
  if (!d) return;
  suppressClick = true;
  setTimeout(() => (suppressClick = false), 0);
  if (!over) return;
  if (over === "use") return useItem(d.from.slot);
  if (over === "give") return giveItem(d.from.slot);
  const [, side, slot] = over.split(":");
  dropOnSlot(d.from, { side: side as Side, slot: Number(slot) });
}

function end() {
  press = null;
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerup", onUp);
  document.body.classList.remove("inv-dragging");
  if (ui.get().drag || ui.get().over) ui.set({ drag: null, over: null });
}

/** Left button down on a slot: maybe the start of a drag. */
export function pressSlot(e: ReactPointerEvent, ref: SlotRef) {
  if (e.button !== 0 || e.ctrlKey || e.altKey || inv.get().busy) return;
  press = { ref, x: e.clientX, y: e.clientY };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

/** closeInventory, or a refresh of the dragged slot, cancels the drag. */
export function cancelDrag() {
  end();
}

export const dropKey = (side: Side, slot: number) => `slot:${side}:${slot}`;
