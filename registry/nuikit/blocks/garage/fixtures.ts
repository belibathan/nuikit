// Every state of the garage, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { GarageData, GarageVehicle } from "./nui"

const vehicles: GarageVehicle[] = [
  { id: "1", label: "Pegassi Zentorno", plate: "ZEN 01", class: "Super", state: "stored", fuel: 92, engine: 98, body: 95 },
  { id: "2", label: "Bravado Buffalo", plate: "BUF 22", class: "Muscle", state: "out", location: "Last seen in Vinewood", fuel: 41, engine: 77, body: 64 },
  { id: "3", label: "Karin Sultan", plate: "SUL 07", class: "Sports", state: "impounded", location: "Davis impound", fee: 250, fuel: 8, engine: 22, body: 18 },
  { id: "4", label: "Declasse Vigero", plate: "VIG 13", class: "Muscle", state: "stored", fuel: 64, engine: 81, body: 70 },
  { id: "5", label: "Obey Tailgater", plate: "TAI 88", class: "Sedan", state: "stored", fuel: 100, engine: 100, body: 100 },
  { id: "6", label: "Dinka Blista", plate: "BLI 04", class: "Compact", state: "stored", fuel: 12, engine: 54, body: 71 },
]

export const garageFixtures = {
  full: { title: "Legion Square", vehicles, canStore: true },
  // standing in the garage on foot: nothing to store
  "on-foot": { title: "Legion Square", vehicles },
  impounded: { title: "Davis impound", description: "Pay the fee to get it back", vehicles: vehicles.filter((v) => v.state === "impounded") },
  empty: { title: "Pillbox Hill", vehicles: [], canStore: true },
} satisfies Record<string, GarageData>

export type GarageFixture = keyof typeof garageFixtures
