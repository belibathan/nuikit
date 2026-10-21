// Every state of the inventory, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { HotbarData, InventoryContainer, InventoryData, InventoryItem } from "./nui"

const pockets: InventoryItem[] = [
  { slot: 1, name: "phone", label: "Phone", count: 1, icon: "phone", weight: 190, info: { Number: "555-0142" } },
  { slot: 2, name: "water", label: "Water", count: 4, icon: "drink", weight: 500, usable: true, description: "Takes the edge off a hot day." },
  { slot: 3, name: "sandwich", label: "Sandwich", count: 2, icon: "food", weight: 250, usable: true },
  { slot: 4, name: "bandage", label: "Bandage", count: 3, icon: "medical", weight: 50, usable: true, description: "Stops the bleeding. Heals a little." },
  { slot: 5, name: "flashlight", label: "Flashlight", count: 1, icon: "light", weight: 400, durability: 64 },
  { slot: 7, name: "cash", label: "Cash", count: 1520, icon: "money", weight: 0 },
  { slot: 8, name: "lockpick", label: "Lockpick", count: 2, icon: "tool", weight: 60, durability: 12 },
  { slot: 9, name: "id_card", label: "ID card", count: 1, icon: "document", weight: 10, info: { Name: "Alex Moreno", "Date of birth": "1994-03-12" } },
  { slot: 12, name: "radio", label: "Radio", count: 1, icon: "radio", weight: 350, info: { Channel: "4" } },
  { slot: 14, name: "keys", label: "Car keys", count: 1, icon: "key", weight: 20, info: { Plate: "ZEN 01" } },
]

const player: InventoryContainer = { id: "player", label: "Pockets", slots: 25, maxWeight: 30000, items: pockets }

const locker: InventoryContainer = {
  id: "stash:locker",
  label: "Police locker",
  slots: 20,
  maxWeight: 100000,
  items: [
    { slot: 1, name: "pistol", label: "Pistol", count: 1, icon: "weapon", weight: 1200, durability: 92, info: { Serial: "LS-48213" } },
    { slot: 2, name: "ammo", label: "Pistol ammo", count: 48, icon: "ammo", weight: 10 },
    { slot: 3, name: "radio", label: "Radio", count: 2, icon: "radio", weight: 350 },
    { slot: 6, name: "bandage", label: "Bandage", count: 10, icon: "medical", weight: 50, usable: true },
    { slot: 7, name: "shirt", label: "Uniform", count: 1, icon: "shirt", weight: 600 },
  ],
}

export const inventoryFixtures = {
  pockets: { player },
  locker: { player, other: locker },
  /** Almost too heavy to carry more. */
  heavy: { player: { ...player, items: [...pockets, { slot: 16, name: "toolbox", label: "Toolbox", count: 1, icon: "tool", weight: 22000 }] } },
  empty: { player: { ...player, items: [] }, other: { ...locker, label: "Glovebox", id: "glovebox:ZEN01", slots: 10, maxWeight: 10000, items: [] } },
} satisfies Record<string, InventoryData>

export const hotbarFixtures = {
  hotbar: { items: pockets.filter((i) => i.slot <= 5), active: 2 },
} satisfies Record<string, HotbarData>

export type InventoryFixture = keyof typeof inventoryFixtures
