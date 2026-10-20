// The contract between your Lua and the pause menu. Lua opens the `pause` surface with a
// PauseMenuData snapshot when Esc is pressed (and updates it when the server answers with the
// player count); the player (name, job, money) comes from nuikit's bridge (nk.player / usePlayer).
import "nuikit-core"

/** The menu's actions, in the order Lua lists them. */
export type PauseMenuAction = "resume" | "map" | "settings" | "keybinds" | "disconnect"

export interface PauseMenuData {
  server: {
    /** Empty: the page says "Paused". */
    name?: string
    tagline?: string
    /** Short text in a badge: "LS", "RP". */
    logo?: string
  }
  actions: PauseMenuAction[]
  /** Shown at the bottom of the rail, for reading (the game can't open a browser). */
  links?: { label: string; value: string }[]
  serverId?: number
  /** The FiveM name, shown when no character is loaded. */
  playerName?: string
  /** From the server once it answers; absent until then. */
  players?: number
  maxPlayers?: number
  /** ms */
  ping?: number
  /** Seconds the server has been up. */
  uptime?: number
}

declare module "nuikit-core" {
  interface NuiSurfaces {
    pause: PauseMenuData
  }
  interface NuiCallbacks {
    /** A button was pressed. Disconnect only arrives after the player confirmed it. */
    "pause:action": { req: { action: PauseMenuAction }; res: { ok: boolean } }
  }
}
