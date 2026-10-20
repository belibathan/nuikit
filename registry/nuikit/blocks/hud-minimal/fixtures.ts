// Every state of the HUD, as nuikit's bridge (the player) and your Lua (the vehicle) would send
// it. Used by dev.tsx (browser development, ?fixture=<name>), screenshots and the site's previews.
import type { NuiPlayer } from "nuikit-core"

import type { HudVehicle } from "./nui"

const player: NuiPlayer = {
  loaded: true,
  health: 86,
  armor: 40,
  hunger: 72,
  thirst: 58,
  stress: 12,
  cash: 1520,
  bank: 48210,
  job: { name: "police", label: "LSPD", grade: 3, gradeLabel: "Sergeant", onDuty: true },
  dead: false,
  voice: { range: 3, mode: "Normal", talking: false, radio: 101 },
}

const car: HudVehicle = { speed: 64, units: "mph", rpm: 0.54, gear: 3, fuel: 62, engine: 92, seatbelt: true, moving: true }

export const hudMinimalFixtures = {
  "on-foot": { player, vehicle: false },
  talking: { player: { ...player, voice: { ...player.voice, talking: true } }, vehicle: false },
  driving: { player, vehicle: car },
  redline: { player, vehicle: { ...car, speed: 118, rpm: 0.94, gear: 5 } },
  warnings: {
    player: { ...player, health: 14, thirst: 9, stress: 86 },
    vehicle: { ...car, speed: 41, rpm: 0.38, gear: 2, fuel: 8, engine: 22, seatbelt: false },
  },
  standalone: {
    player: { loaded: true, health: 100, armor: 0, dead: false, voice: { talking: false } },
    vehicle: false,
  },
} satisfies Record<string, { player: NuiPlayer; vehicle: HudVehicle | false }>

export type HudMinimalFixture = keyof typeof hudMinimalFixtures
