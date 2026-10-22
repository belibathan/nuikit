// The contract between your Lua and the storefront. Lua opens the `storefront` surface with a
// StorefrontData snapshot (the business, whether it's open, its products at the business's prices
// and stock, the player's money, and `staff` for the business's employees); the player fills a cart
// and checks out, or an employee manages the counter, and Lua answers. The server prices every line
// and checks every manage action; after either, Lua sends a fresh snapshot (surface:update).
import "nuikit-core"

/** Icons for products without an image (lucide, drawn by the page; unknown names draw a box). */
export type StorefrontIcon = "burger" | "drink" | "fries" | "dessert" | "part" | "tool" | "fuel" | "box"

export interface StorefrontProduct {
  id: string
  /** "Burger" */
  label: string
  /** What the business charges for one, in whole units. */
  price: number
  /** Your item image URL. Without one, `icon` draws. */
  image?: string
  icon?: StorefrontIcon
  /** How many are left. Omit for unlimited. */
  stock?: number
  /** The most one order can take. */
  max?: number
  /** Whether customers can buy it. Customers are only sent enabled products. */
  enabled: boolean
  /** Staff only: the range the price can be set within. */
  minPrice?: number
  maxPrice?: number
  /** Staff only: how many the employee carries, for restocking. */
  have?: number
}

export type StorefrontPayment = "cash" | "bank"

export interface StorefrontData {
  /** "Burger Shot" */
  title: string
  description?: string
  /** Closed businesses sell nothing. */
  open: boolean
  products: StorefrontProduct[]
  /** What the player has, per payment method this business takes. */
  wallet: Partial<Record<StorefrontPayment, number>>
  /** The ways to pay here, in order (the first is the default). */
  payment: StorefrontPayment[]
  /** The player works here: the Manage tab shows. The server checks it again on every action. */
  staff?: boolean
}

export interface StorefrontLine {
  id: string
  count: number
}

export type StorefrontManage =
  | { action: "price"; product: string; price: number }
  | { action: "enabled"; product: string; enabled: boolean }
  | { action: "restock"; product: string; count: number }
  | { action: "open"; open: boolean }

export type StorefrontAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    storefront: StorefrontData
  }
  interface NuiCallbacks {
    "storefront:buy": { req: { items: StorefrontLine[]; payment: StorefrontPayment }; res: StorefrontAnswer }
    "storefront:manage": { req: StorefrontManage; res: StorefrontAnswer }
  }
}
