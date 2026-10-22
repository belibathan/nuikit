import { post } from "@/lib/nui";
import { createStore } from "@/lib/store";
import type { Inventory, ItemData, ItemSlot, Side, Slot, WireInventory } from "@/lib/types";

const EMPTY: Inventory = { id: "", type: "", slots: 0, items: [], maxWeight: 0 };

export type InvState = {
  visible: boolean;
  left: Inventory;
  right: Inventory;
  /** Centre amount field. 0 = the whole stack. */
  amount: number;
  shift: boolean;
  busy: boolean;
  extraMeta: { metadata: string; value: string }[];
  imagepath: string;
  /** Bumped whenever the item registry changes, so labels/craft checks re-render. */
  registry: number;
};

export const inv = createStore<InvState>({
  visible: false,
  left: EMPTY,
  right: EMPTY,
  amount: 0,
  shift: false,
  busy: false,
  extraMeta: [],
  imagepath: "images",
  registry: 0,
});

/** Item registry by name (§2.3). Mutable; bump `registry` after changing it. */
export const Items: Record<string, ItemData | undefined> = {};

const bumpRegistry = () => inv.set((s) => ({ registry: s.registry + 1 }));

// ───────────────────────────── slot helpers

export const hasItem = (s: Slot | undefined | null): s is ItemSlot => !!s && s.name !== undefined && s.weight !== undefined;

/** §2.4: metadata.durability, or a degrade timestamp turned into a percentage. */
export function durabilityOf(metadata: Slot["metadata"], now = Math.floor(Date.now() / 1000)): number | undefined {
  if (metadata?.durability === undefined || metadata.durability === null) return undefined;
  let d = Number(metadata.durability);
  if (d > 100 && metadata.degrade) d = ((d - now) / (60 * metadata.degrade)) * 100;
  return d < 0 ? 0 : d;
}

const withDurability = (s: Slot): Slot => (s.name ? { ...s, durability: durabilityOf(s.metadata) } : s);

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as any)[k], (b as any)[k]));
}

/** Lua's empty table `{}` and a missing metadata are the same thing. */
const sameMeta = (a: Slot["metadata"], b: Slot["metadata"]) =>
  deepEqual(a && Object.keys(a).length ? a : undefined, b && Object.keys(b).length ? b : undefined);

export const canStack = (a: Slot, b: Slot) => a.name === b.name && sameMeta(a.metadata, b.metadata);

/** §4.3: first matching stack (stackable items) or first empty slot. */
export function findAvailableSlot(item: ItemSlot, items: Slot[]): Slot | undefined {
  const data = Items[item.name];
  if (data?.stack) {
    const stack = items.find((t) => t.name === item.name && sameMeta(t.metadata, item.metadata));
    if (stack) return stack;
  }
  return items.find((t) => t.name === undefined);
}

export const totalWeight = (items: Slot[]) => items.reduce((w, s) => (hasItem(s) ? w + (s.weight || 0) : w), 0);

// ───────────────────────────── set-up

function wireList(items: WireInventory["items"]): Slot[] {
  if (!items) return [];
  return (Array.isArray(items) ? items : Object.values(items)).filter((s): s is Slot => !!s && typeof s === "object" && typeof s.slot === "number");
}

const requested = new Set<string>();

/** §2.3: ask Lua for registry entries we don't have. */
function requestMissing(items: Slot[]) {
  for (const s of items) {
    if (!s.name || Items[s.name] || requested.has(s.name)) continue;
    const name = s.name;
    requested.add(name);
    post<ItemData | null>("getItemData", name)
      .then((data) => {
        if (data && (data as ItemData).name) {
          Items[name] = data;
          bumpRegistry();
        }
      })
      .catch(() => {})
      .finally(() => requested.delete(name));
  }
}

/** Dense 1..slots array from a sparse wire list. */
export function buildInventory(wire: WireInventory, base: Partial<Inventory> = {}): Inventory {
  const merged = { ...base, ...wire } as WireInventory;
  const slots = Math.max(0, Number(merged.slots) || 0);
  const list = wireList(merged.items);
  const bySlot = new Map<number, Slot>();
  for (const s of list) bySlot.set(s.slot, s);
  const items = Array.from({ length: slots }, (_, i) => {
    const s = bySlot.get(i + 1);
    return s && s.name ? withDurability(s) : { slot: i + 1 };
  });
  requestMissing(items);
  return { ...(merged as Inventory), id: merged.id ?? "", type: merged.type ?? "", slots, items };
}

export function applyInit(data: { locale?: unknown; items?: Record<string, ItemData>; leftInventory?: WireInventory; imagepath?: string }) {
  for (const [name, item] of Object.entries(data?.items ?? {})) if (item) Items[name] = { ...item, name: item.name ?? name };
  const patch: Partial<InvState> = {};
  if (data?.imagepath) patch.imagepath = data.imagepath;
  if (data?.leftInventory) patch.left = buildInventory({ type: "player", ...data.leftInventory });
  inv.set((s) => ({ ...patch, registry: s.registry + 1 }));
}

export function applySetup(data: { leftInventory?: WireInventory; rightInventory?: WireInventory } | undefined) {
  const patch: Partial<InvState> = { shift: false, busy: false, visible: true };
  if (data?.leftInventory) patch.left = buildInventory(data.leftInventory);
  if (data?.rightInventory) patch.right = buildInventory(data.rightInventory);
  inv.set(patch);
}

type RefreshItem = { item: Slot; inventory?: string | number };

/** §10. Returns the refreshed (side, slot) pairs so an active drag can be cancelled. */
export function applyRefresh(data: {
  items?: RefreshItem | RefreshItem[];
  itemCount?: Record<string, number>;
  weightData?: { inventoryId: string | number; maxWeight: number };
  slotsData?: { inventoryId: string | number; slots: number };
}): { side: Side; slot: number }[] {
  const touched: { side: Side; slot: number }[] = [];
  const s = inv.get();
  let left = s.left;
  let right = s.right;
  let registry = s.registry;

  if (data?.items) {
    const list = (Array.isArray(data.items) ? data.items : Object.values(data.items as any)).filter(Boolean) as RefreshItem[];
    const now = Math.floor(Date.now() / 1000);
    const leftItems = [...left.items];
    const rightItems = [...right.items];
    for (const entry of list) {
      if (!entry?.item || typeof entry.item.slot !== "number") continue;
      const side: Side = entry.inventory === undefined || entry.inventory === null || entry.inventory === "player" ? "left" : "right";
      const target = side === "left" ? leftItems : rightItems;
      const i = entry.item.slot - 1;
      if (i < 0) continue;
      const next: Slot = entry.item.name ? { ...entry.item, durability: durabilityOf(entry.item.metadata, now) } : { slot: entry.item.slot };
      if (i < target.length) target[i] = next;
      touched.push({ side, slot: entry.item.slot });
    }
    left = { ...left, items: leftItems };
    right = { ...right, items: rightItems };
    requestMissing(list.map((e) => e.item).filter(Boolean));
  }

  if (data?.itemCount) {
    for (const [name, delta] of Object.entries(data.itemCount)) {
      const item = Items[name];
      if (item) item.count = (item.count || 0) + (Number(delta) || 0);
    }
    registry++;
  }

  const sideOf = (id: string | number) => (id === left.id ? "left" : id === right.id ? "right" : null);

  if (data?.weightData) {
    const side = sideOf(data.weightData.inventoryId);
    if (side === "left") left = { ...left, maxWeight: data.weightData.maxWeight };
    if (side === "right") right = { ...right, maxWeight: data.weightData.maxWeight };
  }

  if (data?.slotsData) {
    const side = sideOf(data.slotsData.inventoryId);
    const rebuild = (i: Inventory) => buildInventory({ ...i, slots: data.slotsData!.slots, items: i.items.filter((x) => x.name) });
    if (side === "left") left = rebuild(left);
    if (side === "right") right = rebuild(right);
  }

  inv.set({ left, right, registry });
  return touched;
}

export function addExtraMeta(entries: { metadata: string; value: string }[] | undefined) {
  if (!Array.isArray(entries)) return;
  inv.set((s) => {
    const next = [...s.extraMeta];
    for (const e of entries) if (e && !next.some((x) => x.value === e.value)) next.push(e);
    return { extraMeta: next };
  });
}

// ───────────────────────────── display helpers

/** §2.5, exactly. */
export function itemImage(item: string | Slot | undefined, imagepath = inv.get().imagepath): string | undefined {
  if (!item) return undefined;
  if (typeof item === "object") {
    if (!item.name) return undefined;
    if (item.metadata?.imageurl) return String(item.metadata.imageurl);
    if (item.metadata?.image) return `${imagepath}/${item.metadata.image}.png`;
  }
  const name = typeof item === "object" ? item.name! : item;
  const data = Items[name];
  if (data?.image) return data.image;
  return `${imagepath}/${name}.png`;
}

export const itemLabel = (s: Slot) => (s.metadata?.label as string) || (s.name && Items[s.name]?.label) || s.name || "";

export function formatWeight(grams: number) {
  if (!grams || grams <= 0) return "";
  return grams >= 1000 ? `${(grams / 1000).toLocaleString("en-US", { minimumFractionDigits: 2 })}kg` : `${grams.toLocaleString("en-US")}g`;
}

export const formatKg = (grams: number) => `${(Math.floor(grams) / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 })}`;

// ───────────────────────────── shop / crafting checks

/** §5 buyable check. */
export function canPurchase(item: Slot, inventory: Inventory, playerGroups = inv.get().left.groups): boolean {
  if (inventory.type !== "shop" || !hasItem(item)) return true;
  if (item.count !== undefined && item.count === 0) return false;
  if (item.grade === undefined || !inventory.groups) return true;
  if (!playerGroups) return false;
  const required = Object.keys(inventory.groups);
  const grades = Array.isArray(item.grade) ? item.grade : null;
  return required.some((g) => {
    const mine = playerGroups[g];
    if (mine === undefined) return false;
    return grades ? grades.includes(mine) : mine >= (item.grade as number);
  });
}

/** Whether one ingredient is satisfied (§6). */
export function hasIngredient(name: string, amount: number, playerItems = inv.get().left.items): boolean {
  if (amount >= 1) return (Items[name]?.count ?? 0) >= amount;
  if (amount === 0) return (Items[name]?.count ?? 0) >= 1 || playerItems.some((p) => p.name === name);
  return playerItems.some((p) => p.name === name && Number(p.metadata?.durability) >= amount * 100);
}

export function canCraft(item: Slot, inventory: Inventory): boolean {
  if (inventory.type !== "crafting" || !hasItem(item) || !item.ingredients) return true;
  return Object.entries(item.ingredients).every(([name, n]) => hasIngredient(name, Number(n)));
}

export const sideInventory = (side: Side, s = inv.get()) => (side === "left" ? s.left : s.right);

const RARITIES = new Set(["common", "uncommon", "rare", "epic", "legendary"]);
/**
 * The rarity role an item draws in (data-hue): the item's own metadata.rarity first, then its
 * definition's rarity field (servers add it in ox_inventory's data/items.lua). None: no hue.
 */
export function rarityOf(item: Slot): string | undefined {
  const r = String(item.metadata?.rarity ?? (item.name ? Items[item.name]?.rarity : undefined) ?? "").toLowerCase();
  return RARITIES.has(r) ? r : undefined;
}
