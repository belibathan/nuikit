// The contract between your Lua and the shop. Lua opens the `shop` surface with a ShopData snapshot
// (what's for sale, prices, stock, the player's money); the player fills a cart on the page and
// checks out, the page asks Lua to buy, and Lua answers. The server decides the price, the stock
// and whether it went through; after a purchase Lua sends a fresh snapshot (surface:update).
import "nuikit-core"

/** Icons for items without an image (lucide, drawn by the page; unknown names draw a box). */
export type ShopIcon =
  | "drink"
  | "coffee"
  | "food"
  | "snack"
  | "phone"
  | "radio"
  | "medical"
  | "tool"
  | "key"
  | "box"
  | "shirt"
  | "fuel"
  | "light"
  | "battery"

export interface ShopItem {
  id: string
  /** "Water" */
  label: string
  /** Price of one, in whole units. */
  price: number
  /** Your item image URL (an inventory's own images). Without one, `icon` draws. */
  image?: string
  icon?: ShopIcon
  /** The category's id, for the tabs. */
  category?: string
  description?: string
  /** How many are left. Omit for unlimited. */
  stock?: number
  /** The most one purchase can take. */
  max?: number
  /** Not for this player (a licence, a job): dimmed, with `lockedReason`. */
  locked?: boolean
  lockedReason?: string
}

export type ShopPayment = "cash" | "bank"

export interface ShopData {
  /** "24/7, Innocence Blvd" */
  title: string
  description?: string
  categories?: { id: string; label: string }[]
  items: ShopItem[]
  /** What the player has, per payment method this shop takes. */
  wallet: Partial<Record<ShopPayment, number>>
  /** The ways to pay here, in order (the first is the default). */
  payment: ShopPayment[]
}

export interface ShopLine {
  id: string
  count: number
}

export type ShopAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    shop: ShopData
  }
  interface NuiCallbacks {
    "shop:buy": { req: { items: ShopLine[]; payment: ShopPayment }; res: ShopAnswer }
  }
}
