import { describe, expect, it } from "vitest"

import { vehicleShopError } from "./vehicle-shop"

const sultan = { id: "sultan", label: "Sultan", price: 12000 }
const bike = { id: "policeb", label: "Police Bike", price: 40000, locked: true, lockedReason: "LSPD only" }

describe("vehicle shop", () => {
  it("lets the player buy what they can afford, with the method they pick", () => {
    expect(vehicleShopError(sultan, "bank", { bank: 12000 })).toBeNull()
    expect(vehicleShopError(sultan, "cash", { cash: 11999, bank: 99999 })).toBe("You don't have enough cash.")
    expect(vehicleShopError(sultan, "bank", { cash: 99999 })).toBe("You don't have enough money in the bank.")
  })

  it("says why a vehicle is locked, or that none is picked", () => {
    expect(vehicleShopError(bike, "bank", { bank: 1e9 })).toBe("You can't buy the Police Bike (LSPD only).")
    expect(vehicleShopError({ ...bike, lockedReason: undefined }, "bank", { bank: 1e9 })).toBe("You can't buy the Police Bike.")
    expect(vehicleShopError(undefined, "bank", { bank: 1e9 })).toBe("Pick a vehicle.")
  })
})
