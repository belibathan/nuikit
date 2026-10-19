import { post, send } from "@/lib/nui";
import type { Inventory, Side, Slot } from "@/lib/types";
import {
  Items,
  canCraft,
  canPurchase,
  canStack,
  durabilityOf,
  findAvailableSlot,
  hasItem,
  inv,
  sideInventory,
} from "@/state/inventory";

const other = (side: Side): Side => (side === "left" ? "right" : "left");
const isFixed = (type: string) => type === "shop" || type === "crafting";

/** Shop and crafting slots are never drop targets; a slot can't be dropped on itself (§4.1). */
export function canDropOn(from: { side: Side; slot: number }, to: { side: Side; slot: number }) {
  if (from.side === to.side && from.slot === to.slot) return false;
  return !isFixed(sideInventory(to.side).type);
}

/** Whether a slot can start a drag. */
export function canDragSlot(side: Side, slot: Slot) {
  const inventory = sideInventory(side);
  return hasItem(slot) && canPurchase(slot, inventory) && canCraft(slot, inventory);
}

/** Run a request with the grid locked; roll back to `snapshot` when Lua says no. */
async function guarded<T>(name: string, body: unknown, snapshot: { left: Inventory; right: Inventory } | null, onOk?: (r: T) => void) {
  inv.set({ busy: true });
  try {
    const res = await post<T>(name, body);
    if ((res as unknown) === false) {
      if (snapshot) inv.set({ left: snapshot.left, right: snapshot.right });
    } else onOk?.(res);
  } catch {
    if (snapshot) inv.set({ left: snapshot.left, right: snapshot.right });
  } finally {
    inv.set({ busy: false });
  }
}

/**
 * Move / stack / swap / split (§4). `to` omitted = quick move into the other inventory (§4.3).
 */
export function moveItem(from: { side: Side; slot: number }, to?: { side: Side; slot: number }) {
  const s = inv.get();
  if (s.busy) return;
  const fromInv = sideInventory(from.side, s);
  const source = fromInv.items[from.slot - 1];
  if (!hasItem(source) || isFixed(fromInv.type)) return;
  if (!Items[source.name]) return; // unregistered items can't be moved (Lua has no data for them either)

  const toSide = to?.side ?? other(from.side);
  const toInv = sideInventory(toSide, s);
  if (isFixed(toInv.type) || !toInv.slots) return;

  // §4.4 container guards
  const container = source.metadata?.container;
  if (container !== undefined) {
    if (toInv.type === "container") return;
    if (s.right.id === container) return;
  }

  const target = to ? toInv.items[to.slot - 1] : findAvailableSlot(source, toInv.items);
  if (!target) return;
  if (toSide === from.side && target.slot === source.slot) return;
  if (target.metadata?.container !== undefined && s.right.id === target.metadata.container) return;

  // §4.2 count
  const have = source.count ?? 1;
  const count = s.shift && have > 1 ? Math.floor(have / 2) : s.amount === 0 || s.amount > have ? have : s.amount;

  const snapshot = { left: s.left, right: s.right };
  const body = { fromSlot: source.slot, fromType: fromInv.type, toSlot: target.slot, toType: toInv.type, count };

  // optimistic local update (§4.5)
  const now = Math.floor(Date.now() / 1000);
  const unit = have ? source.weight / have : 0;
  const fromItems = [...fromInv.items];
  const toItems = toSide === from.side ? fromItems : [...toInv.items];
  const rest = have - count;
  const remainder: Slot = rest > 0 ? { ...source, count: rest, weight: unit * rest } : { slot: source.slot };

  if (hasItem(target) && target.count !== undefined) {
    if (Items[source.name]?.stack && canStack(source, target)) {
      toItems[target.slot - 1] = { ...target, count: target.count + count, weight: unit * (target.count + count) };
      fromItems[source.slot - 1] = remainder;
    } else {
      const a = fromItems[source.slot - 1];
      const b = toItems[target.slot - 1];
      fromItems[source.slot - 1] = { ...b, slot: source.slot, durability: durabilityOf(b.metadata, now) };
      toItems[target.slot - 1] = { ...a, slot: target.slot, durability: durabilityOf(a.metadata, now) };
    }
  } else {
    fromItems[source.slot - 1] = remainder;
    toItems[target.slot - 1] = { ...source, count, weight: unit * count, slot: target.slot, durability: durabilityOf(source.metadata, now) };
  }

  const patch: Record<Side, Inventory> = { left: s.left, right: s.right };
  patch[from.side] = { ...fromInv, items: fromItems };
  if (toSide !== from.side) patch[toSide] = { ...toInv, items: toItems };
  inv.set(patch);

  void guarded<boolean | number>("swapItems", body, snapshot, (res) => {
    if (typeof res !== "number") return;
    // the open container's new weight goes on the bag item that opened it
    const st = inv.get();
    const items = st.left.items.map((it) => (it.metadata?.container !== undefined && it.metadata.container === st.right.id ? { ...it, weight: res } : it));
    inv.set({ left: { ...st.left, items } });
  });
}

/** §5: drag from a shop onto a player slot. */
export function buyItem(fromSlot: number, toSlot: number) {
  const s = inv.get();
  if (s.busy) return;
  const shop = s.right;
  const source = shop.items[fromSlot - 1];
  if (!hasItem(source) || source.count === 0 || !Items[source.name]) return;
  const target = s.left.items[toSlot - 1];
  if (!target) return;
  const count = s.amount !== 0 ? (source.count ? Math.min(s.amount, source.count) : s.amount) : 1;
  void guarded("buyItem", { fromSlot, fromType: shop.type, toSlot, toType: s.left.type || "player", count }, { left: s.left, right: s.right });
}

/** §6: drag a recipe onto a player slot. */
export function craftItem(fromSlot: number, toSlot: number) {
  const s = inv.get();
  if (s.busy) return;
  const bench = s.right;
  const source = bench.items[fromSlot - 1];
  if (!hasItem(source) || source.count === 0 || !Items[source.name]) return;
  const target = s.left.items[toSlot - 1];
  if (!target) return;
  const count = s.amount === 0 ? 1 : s.amount;
  void guarded("craftItem", { fromSlot, fromType: bench.type, toSlot, toType: s.left.type || "player", count }, { left: s.left, right: s.right });
}

/** Route a finished drag to the right callback. */
export function dropOnSlot(from: { side: Side; slot: number }, to: { side: Side; slot: number }) {
  if (!canDropOn(from, to)) return;
  const type = sideInventory(from.side).type;
  if (type === "shop") return to.side === "left" && buyItem(from.slot, to.slot);
  if (type === "crafting") return to.side === "left" && craftItem(from.slot, to.slot);
  moveItem(from, to);
}

export const useItem = (slot: number) => send("useItem", slot);
export const giveItem = (slot: number) => send("giveItem", { slot, count: inv.get().amount });
export const removeAmmo = (slot: number) => send("removeAmmo", slot);
export const removeComponent = (component: string, slot: number) => send("removeComponent", { component, slot });
export const useButton = (index: number, slot: number) => send("useButton", { id: index + 1, slot });

/** Hide locally and ask Lua to close (Lua answers with closeInventory). */
export function exit() {
  inv.set({ visible: false });
  send("exit");
}
