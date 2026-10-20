// The contract between your Lua and the death screen. Lua opens the surface with a DeathScreenData
// snapshot (nk.surface('death', …):open(data) / :update(data)) and streams the respawn key's hold.
import "nuikit-core"

export interface DeathScreenData {
  /** down: last stand, bleeding out, another player can still help. dead: waiting to respawn. */
  phase: "down" | "dead"
  title?: string
  subtitle?: string
  /** The countdown in seconds: until you bleed out (down) or until you can respawn (dead). Omit for none. */
  seconds?: number
  /** What the countdown started from, for the bar under it. */
  total?: number
  /** Down: another player can revive you now. */
  helpable?: boolean
  respawn?: {
    /** The key your Lua listens for, as the player sees it: "E". */
    key: string
    /** Your Lua accepts the key now (hold it to respawn). */
    available: boolean
    /** A hospital bill, shown next to the key. */
    cost?: number
    /** Seconds until the key is accepted, when it isn't yet. */
    wait?: number
  }
  ems?: {
    key: string
    state: "available" | "requested" | "cooldown"
    /** Cooldown left, in seconds. */
    seconds?: number
  }
}

declare module "nuikit-core" {
  interface NuiEvents {
    /** Live (nk.stream): how far the respawn key is held, 0–1. 0 when it is let go. */
    "death:hold": number
  }
  interface NuiSurfaces {
    death: DeathScreenData
  }
}
