// Every state of the storefront, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { StorefrontData, StorefrontProduct } from "./nui"

const products: StorefrontProduct[] = [
  { id: "burger", label: "Burger", price: 9, icon: "burger", stock: 24, max: 10, enabled: true },
  { id: "fries", label: "Fries", price: 4, icon: "fries", stock: 40, max: 10, enabled: true },
  { id: "cola", label: "eCola", price: 3, icon: "drink", stock: 30, max: 10, enabled: true },
  { id: "shake", label: "Milkshake", price: 6, icon: "dessert", stock: 0, enabled: true },
  { id: "meal", label: "Family meal", price: 32, icon: "box", stock: 5, max: 2, enabled: true },
]

const burgers: StorefrontData = {
  title: "Burger Shot",
  description: "Open until late",
  open: true,
  products,
  wallet: { cash: 120, bank: 4210 },
  payment: ["cash", "bank"],
}

export const storefrontFixtures = {
  burgers,
  /** The mechanic's parts counter: cash and bank, no stock limit on some parts. */
  parts: {
    title: "Benny's parts",
    description: "Parts and kits",
    open: true,
    products: [
      { id: "repairkit", label: "Repair kit", price: 220, icon: "tool", stock: 8, max: 3, enabled: true },
      { id: "tyre", label: "Tyre", price: 85, icon: "part", stock: 16, enabled: true },
      { id: "jerrycan", label: "Jerry can", price: 40, icon: "fuel", enabled: true },
    ],
    wallet: { cash: 600, bank: 2500 },
    payment: ["cash", "bank"],
  },
  /** Shut for the night: nothing can be bought. */
  closed: { ...burgers, open: false },
  /** An employee: the Manage tab, with a hidden product and what they carry to restock. */
  staff: {
    ...burgers,
    staff: true,
    products: products.map((p, i) => ({
      ...p,
      enabled: p.id !== "meal",
      minPrice: Math.max(1, Math.round(p.price / 2)),
      maxPrice: p.price * 2,
      have: i % 2 ? 0 : 20,
    })),
  },
  /** Almost broke. */
  broke: { ...burgers, wallet: { cash: 3, bank: 0 } },
} satisfies Record<string, StorefrontData>

/** Carts for stills: a full one, and one that's too much for the wallet. */
export const storefrontCarts = {
  lunch: { burger: 2, fries: 1, cola: 2 },
  big: { meal: 2, burger: 5 },
}

export type StorefrontFixture = keyof typeof storefrontFixtures
