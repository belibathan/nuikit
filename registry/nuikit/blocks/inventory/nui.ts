// The contract between your Lua and the inventory. Lua opens the `inventory` surface with the
// player's container and, when there is one, a second (a stash, a trunk, the ground); the page asks
// Lua to move or use, and shows what Lua answers. Lua (and the server behind it) decides every
// move; after one it sends a fresh snapshot (surface:update). The `hotbar` surface (hud, no input)
// shows the first slots on the game for a moment when a hotbar key is used.
import "nuikit-core"

/** Icons for items without an image (lucide, drawn by the page; unknown names draw a box). */
export type InventoryIcon =
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
  | "money"
  | "weapon"
  | "ammo"
  | "document"

export interface InventoryItem {
  /** Which slot it's in, from 1. */
  slot: number
  /** Your item name ("water"). */
  name: string
  /** "Water" */
  label: string
  count: number
  image?: string
  icon?: InventoryIcon
  /** Grams, for one. */
  weight?: number
  /** 0–100 */
  durability?: number
  description?: string
  /** Shown in the tooltip: { Serial: "A1B2", Owner: "Riley" }. */
  info?: Record<string, string>
  /** Can be used (double-click, Enter, a hotbar key). */
  usable?: boolean
}

export interface InventoryContainer {
  /** "player", or your id for the other side ("stash:police", "trunk:ZEN01"). */
  id: string
  /** "Pockets", "Police locker" */
  label: string
  slots: number
  /** Grams. */
  maxWeight?: number
  items: InventoryItem[]
}

export interface InventoryData {
  player: InventoryContainer
  /** The other side, when there is one. */
  other?: InventoryContainer
  /** How many of the player's first slots are the hotbar (keys 1…n). Default 5. */
  hotbar?: number
}

export interface HotbarData {
  items: InventoryItem[]
  /** Slots shown (1…n). Default 5. */
  size?: number
  /** The slot just used. */
  active?: number
}

/** Where an item is: a container and a slot. */
export interface InventoryRef {
  container: string
  slot: number
}

export type InventoryAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    inventory: InventoryData
    hotbar: HotbarData
  }
  interface NuiCallbacks {
    "inventory:move": { req: { from: InventoryRef; to: InventoryRef; count: number }; res: InventoryAnswer }
    "inventory:use": { req: { slot: number }; res: InventoryAnswer }
  }
}
