// The contract between your Lua and the HUD. The player (vitals, money, job, voice) comes from
// nuikit's bridge (nk.player in Lua, usePlayer() here), the same on Qbox, QBCore, ESX or standalone;
// the vehicle is yours to send.
import "nuikit-core"

/** Sent when it changes (gear, fuel, damage, seatbelt), not as the car speeds up. */
export interface HudVehicle {
  /** Where the gauge starts when it appears; then it follows "hud:vehicle:speed". */
  speed: number
  units: "mph" | "kmh"
  /** 0–1, where the gauge starts; then it follows "hud:vehicle:rpm". */
  rpm: number
  gear: number | "R" | "N"
  /** 0–100 */
  fuel: number
  /** 0–100; below 35 a warning shows. */
  engine?: number
  seatbelt?: boolean
  /** Fast enough that an open seatbelt matters. */
  moving?: boolean
}

declare module "nuikit-core" {
  interface NuiEvents {
    /** false when the player leaves the vehicle. */
    "hud:vehicle": HudVehicle | false
    /** Live (nk.stream): speed in the vehicle's units, whole numbers. */
    "hud:vehicle:speed": number
    /** Live (nk.stream): rpm 0–1. */
    "hud:vehicle:rpm": number
  }
  interface NuiSurfaces {
    hud: void
  }
}
