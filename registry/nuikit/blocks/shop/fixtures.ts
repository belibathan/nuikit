// Every state of the shop, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { ShopData, ShopItem } from "./nui"

const items: ShopItem[] = [
  { id: "water", label: "Water", price: 2, icon: "drink", category: "food", stock: 48, max: 10 },
  { id: "cola", label: "eCola", price: 3, icon: "drink", category: "food", stock: 24, max: 10 },
  { id: "coffee", label: "Coffee", price: 4, icon: "coffee", category: "food", stock: 12 },
  { id: "sandwich", label: "Sandwich", price: 6, icon: "food", category: "food", stock: 9 },
  { id: "donut", label: "Donut", price: 3, icon: "snack", category: "food", stock: 0 },
  { id: "chips", label: "Chips", price: 2, icon: "snack", category: "food" },
  { id: "bandage", label: "Bandage", price: 25, icon: "medical", category: "tools", stock: 15, max: 5 },
  { id: "flashlight", label: "Flashlight", price: 40, icon: "light", category: "tools", stock: 4 },
  { id: "battery", label: "Battery", price: 8, icon: "battery", category: "tools" },
  { id: "lockpick", label: "Lockpick", price: 120, icon: "tool", category: "tools", locked: true, lockedReason: "Members only" },
  { id: "phone", label: "Phone", price: 450, icon: "phone", category: "tech", stock: 3, max: 1 },
  { id: "radio", label: "Radio", price: 250, icon: "radio", category: "tech", stock: 6, max: 1 },
]

const categories = [
  { id: "food", label: "Food & drink" },
  { id: "tools", label: "Tools" },
  { id: "tech", label: "Tech" },
]

const store: ShopData = {
  title: "24/7, Innocence Blvd",
  description: "Open all night",
  categories,
  items,
  wallet: { cash: 1520, bank: 48210 },
  payment: ["cash", "bank"],
}

export const shopFixtures = {
  store,
  /** Cash only, a short list, no categories. */
  vending: {
    title: "Vending machine",
    items: items.filter((i) => ["water", "cola", "chips", "donut"].includes(i.id)),
    wallet: { cash: 12 },
    payment: ["cash"],
  },
  /** Almost broke. */
  broke: { ...store, wallet: { cash: 7, bank: 0 } },
} satisfies Record<string, ShopData>

/** Carts for stills: a full one, and one that's too much for the wallet. */
export const shopCarts = {
  lunch: { water: 2, sandwich: 1, coffee: 1 },
  big: { phone: 1, radio: 1, flashlight: 2 },
}

export type ShopFixture = keyof typeof shopFixtures
