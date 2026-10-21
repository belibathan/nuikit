// The contract between your Lua and the vehicle shop. Lua opens the `vehicle-shop` surface with the
// showroom (vehicles, prices, the player's money); the page tells Lua which vehicle and colour to
// show, and asks for a test drive or a purchase. The server decides the price and whether it
// went through.
import "nuikit-core"

export interface VehicleShopVehicle {
  /** The model name ("zentorno"). */
  id: string
  /** "Zentorno" */
  label: string
  /** "Pegassi" */
  brand?: string
  /** The category's id, for the tabs. */
  category?: string
  price: number
  /** A picture URL (the showroom shows the real car behind the panel; this is for the list). */
  image?: string
  /** 0–100 each, for the bars. */
  stats?: { speed?: number; acceleration?: number; braking?: number; handling?: number }
  seats?: number
  /** Not for this player (a licence, a job): dimmed, with `lockedReason`. */
  locked?: boolean
  lockedReason?: string
}

export type VehicleShopPayment = "cash" | "bank"

export interface VehicleShopData {
  /** "Premium Deluxe Motorsport" */
  title: string
  description?: string
  categories?: { id: string; label: string }[]
  vehicles: VehicleShopVehicle[]
  wallet: Partial<Record<VehicleShopPayment, number>>
  payment: VehicleShopPayment[]
  /** Paint swatches ("#rrggbb"); any other hex colour can be typed too. */
  colours?: string[]
  /** Test drives last this many seconds; omit to offer none. */
  testDrive?: number
}

export interface VehicleShopChoice {
  id: string
  /** "#rrggbb" */
  colour: string
}

export type VehicleShopAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    "vehicle-shop": VehicleShopData
  }
  interface NuiCallbacks {
    /** Show this one in the showroom (Lua spawns a local preview). */
    "vehicle-shop:preview": { req: VehicleShopChoice; res: VehicleShopAnswer }
    "vehicle-shop:test-drive": { req: VehicleShopChoice; res: VehicleShopAnswer }
    "vehicle-shop:buy": { req: VehicleShopChoice & { payment: VehicleShopPayment }; res: VehicleShopAnswer }
  }
}
