import { describe, expect, it } from "vitest"

import { sfAdd, sfCartError, sfClampPrice, sfLimit, sfLines, sfTotal } from "./storefront"
import type { StorefrontProduct } from "./nui"

const p = (o: Partial<StorefrontProduct> & { id: string }): StorefrontProduct => ({ label: o.id, price: 2, enabled: true, ...o })
const burger = p({ id: "burger", label: "Burger", price: 9, stock: 5, max: 3 })
const fries = p({ id: "fries", label: "Fries", price: 4 })
const shake = p({ id: "shake", label: "Shake", stock: 0 })
const off = p({ id: "meal", label: "Meal", enabled: false })
const products = [burger, fries, shake, off]

describe("storefront cart", () => {
  it("adds and removes within the stock, the max and 99", () => {
    expect(sfLimit(burger)).toBe(3)
    expect(sfLimit(fries)).toBe(99)
    expect(sfLimit(shake)).toBe(0)
    expect(sfLimit(off)).toBe(0)
    let cart = sfAdd({}, burger, 1)
    cart = sfAdd(cart, burger, 5)
    expect(cart).toEqual({ burger: 3 })
    expect(sfAdd(cart, burger, -3)).toEqual({})
    expect(sfAdd({}, shake, 1)).toEqual({})
  })

  it("totals in menu order and drops products that are gone", () => {
    const cart = { fries: 2, burger: 3, gone: 4 }
    expect(sfLines(products, cart)).toEqual([
      { id: "burger", count: 3 },
      { id: "fries", count: 2 },
    ])
    expect(sfTotal(products, cart)).toBe(35)
  })

  it("says what's wrong before asking", () => {
    const wallet = { cash: 10, bank: 0 }
    expect(sfCartError(products, {}, "cash", wallet, true)).toBe("Your cart is empty.")
    expect(sfCartError(products, { burger: 1 }, "cash", wallet, false)).toBe("Closed right now.")
    expect(sfCartError(products, { burger: 1 }, "cash", wallet, true)).toBeNull()
    expect(sfCartError(products, { burger: 4 }, "cash", wallet, true)).toBe("You can buy at most 3 Burger at once.")
    expect(sfCartError(products, { shake: 1 }, "cash", wallet, true)).toBe("Shake is sold out.")
    expect(sfCartError([{ ...burger, stock: 2, max: undefined }], { burger: 3 }, "cash", wallet, true)).toBe("Only 2 Burger left.")
    expect(sfCartError(products, { meal: 1 }, "cash", wallet, true)).toBe("Meal isn't on sale.")
    expect(sfCartError(products, { fries: 3 }, "cash", wallet, true)).toBe("You don't have enough cash.")
    expect(sfCartError(products, { fries: 1 }, "bank", wallet, true)).toBe("You don't have enough money in the bank.")
  })

  it("keeps a price inside the set range", () => {
    const q = p({ id: "q", price: 5, minPrice: 3, maxPrice: 8 })
    expect(sfClampPrice(q, 1)).toBe(6)
    expect(sfClampPrice(q, 10)).toBe(8)
    expect(sfClampPrice({ ...q, price: 3 }, -1)).toBe(3)
    expect(sfClampPrice(fries, -9)).toBe(1)
  })
})
