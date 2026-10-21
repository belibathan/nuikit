// Every state of the vehicle shop, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { VehicleShopData, VehicleShopVehicle } from "./nui"

const vehicles: VehicleShopVehicle[] = [
  { id: "zentorno", label: "Zentorno", brand: "Pegassi", category: "super", price: 725000, seats: 2, stats: { speed: 92, acceleration: 88, braking: 70, handling: 84 } },
  { id: "t20", label: "T20", brand: "Progen", category: "super", price: 2200000, seats: 2, stats: { speed: 95, acceleration: 93, braking: 76, handling: 88 } },
  { id: "adder", label: "Adder", brand: "Truffade", category: "super", price: 1000000, seats: 2, stats: { speed: 96, acceleration: 84, braking: 60, handling: 72 } },
  { id: "elegy", label: "Elegy Retro Custom", brand: "Annis", category: "sports", price: 904000, seats: 2, stats: { speed: 84, acceleration: 82, braking: 66, handling: 86 } },
  { id: "sultan", label: "Sultan", brand: "Karin", category: "sports", price: 12000, seats: 4, stats: { speed: 76, acceleration: 70, braking: 58, handling: 74 } },
  { id: "banshee", label: "Banshee", brand: "Bravado", category: "sports", price: 105000, seats: 2, stats: { speed: 85, acceleration: 79, braking: 55, handling: 77 } },
  { id: "dominator", label: "Dominator", brand: "Vapid", category: "muscle", price: 35000, seats: 2, stats: { speed: 82, acceleration: 74, braking: 50, handling: 64 } },
  { id: "gauntlet", label: "Gauntlet", brand: "Bravado", category: "muscle", price: 32000, seats: 2, stats: { speed: 80, acceleration: 72, braking: 48, handling: 60 } },
  { id: "policeb", label: "Police Bike", brand: "Western", category: "muscle", price: 40000, seats: 1, locked: true, lockedReason: "LSPD only", stats: { speed: 78, acceleration: 80, braking: 70, handling: 72 } },
]

// nuikit-ignore-next-line color/hardcoded: paint colours for the car are data, not the theme
const colours = ["#0b0b0b", "#f5f5f5", "#7a7d82", "#c8102e", "#1f4fa3", "#f2b705", "#2e7d32", "#e0602f"]

const pdm: VehicleShopData = {
  title: "Premium Deluxe",
  description: "Simeon's showroom",
  categories: [
    { id: "super", label: "Super" },
    { id: "sports", label: "Sports" },
    { id: "muscle", label: "Muscle" },
  ],
  vehicles,
  wallet: { cash: 42000, bank: 1250000 },
  payment: ["bank", "cash"],
  colours,
  testDrive: 60,
}

export const vehicleShopFixtures = {
  pdm,
  /** Bank only, no test drives, and not much money. */
  budget: { ...pdm, title: "Larry's RV Sales", wallet: { bank: 30000 }, payment: ["bank"], testDrive: undefined },
} satisfies Record<string, VehicleShopData>

export type VehicleShopFixture = keyof typeof vehicleShopFixtures
