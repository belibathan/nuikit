/** Wire types (docs/ox-inventory-protocol.md §2). */

export type Metadata = Record<string, any>;

export type Slot = {
  slot: number;
  name?: string;
  count?: number;
  /** Total grams for the stack. */
  weight?: number;
  metadata?: Metadata;
  /** Derived from metadata on the UI side (§2.4). */
  durability?: number;
  // shops
  price?: number;
  currency?: string;
  grade?: number | number[];
  license?: string;
  // crafting
  ingredients?: Record<string, number>;
  duration?: number;
};

export type ItemSlot = Slot & { name: string; weight: number };

export type Inventory = {
  id: string | number;
  type: string;
  slots: number;
  items: Slot[];
  weight?: number;
  maxWeight?: number;
  label?: string;
  groups?: Record<string, number>;
};

/** What Lua sends: items may be a sparse array or a slot-keyed object. */
export type WireInventory = Omit<Partial<Inventory>, "items"> & { items?: Slot[] | Record<string, Slot | null> | null };

export type ItemData = {
  name?: string;
  label: string;
  stack: boolean;
  close?: boolean;
  count: number;
  description?: string;
  buttons?: { label: string; group?: string }[];
  ammoName?: string;
  image?: string;
  /** a rarity role (common, uncommon, rare, epic, legendary) when the server's item definition has one */
  rarity?: string;
};

export type Side = "left" | "right";
