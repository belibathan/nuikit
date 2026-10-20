import { describe, expect, it } from "vitest"

import { shopAdd, shopCartError, shopLimit, shopLines, shopTotal } from "./shop"
import type { ShopItem } from "./nui"

const water: ShopItem = { id: "water", label: "Water", price: 2, stock: 5, max: 3 }
const chips: ShopItem = { id: "chips", label: "Chips", price: 4 }
const donut: ShopItem = { id: "donut", label: "Donut", price: 3, stock: 0 }
const pick: ShopItem = { id: "pick", label: "Lockpick", price: 120, locked: true, lockedReason: "Members only" }
const items = [water, chips, donut, pick]

describe("shop cart", () => {
  it("adds and removes within the stock, the max and 99", () => {
    expect(shopLimit(water)).toBe(3)
    expect(shopLimit(chips)).toBe(99)
    expect(shopLimit(donut)).toBe(0)
    let cart = shopAdd({}, water, 1)
    cart = shopAdd(cart, water, 5)
    expect(cart).toEqual({ water: 3 })
    expect(shopAdd(cart, water, -3)).toEqual({})
    expect(shopAdd({}, donut, 1)).toEqual({})
    expect(shopAdd({}, chips, 500)).toEqual({ chips: 99 })
  })

  it("totals in catalogue order and drops items that are gone", () => {
    const cart = { chips: 2, water: 3, gone: 4 }
    expect(shopLines(items, cart)).toEqual([
      { id: "water", count: 3 },
      { id: "chips", count: 2 },
    ])
    expect(shopTotal(items, cart)).toBe(14)
  })

  it("says what's wrong before asking", () => {
    const wallet = { cash: 10, bank: 0 }
    expect(shopCartError(items, {}, "cash", wallet)).toBe("Your cart is empty.")
    expect(shopCartError(items, { water: 3 }, "cash", wallet)).toBeNull()
    expect(shopCartError(items, { water: 4 }, "cash", wallet)).toBe("You can buy at most 3 Water at once.")
    expect(shopCartError(items, { donut: 1 }, "cash", wallet)).toBe("Donut is sold out.")
    expect(shopCartError([{ ...water, stock: 2 }], { water: 3 }, "cash", wallet)).toBe("Only 2 Water left.")
    expect(shopCartError(items, { pick: 1 }, "cash", { cash: 999 })).toBe("You can't buy Lockpick: members only.")
    expect(shopCartError(items, { chips: 3 }, "cash", wallet)).toBe("You don't have enough cash.")
    expect(shopCartError(items, { chips: 1 }, "bank", wallet)).toBe("You don't have enough money in the bank.")
  })
})
