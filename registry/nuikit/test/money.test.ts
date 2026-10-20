import { describe, expect, it } from "vitest"

import { formatMoney, moneyDirection } from "@/components/ui/money"

describe("money", () => {
  it("formats whole dollars by default", () => {
    expect(formatMoney(48210)).toBe("$48,210")
    expect(formatMoney(0)).toBe("$0")
    expect(formatMoney(1520.75)).toBe("$1,521")
  })

  it("signs: auto shows only minus, always shows plus too, never shows none", () => {
    expect(formatMoney(-250)).toBe("-$250")
    expect(formatMoney(500, { sign: "always" })).toBe("+$500")
    expect(formatMoney(-250, { sign: "always" })).toBe("-$250")
    expect(formatMoney(0, { sign: "always" })).toBe("$0")
    expect(formatMoney(-250, { sign: "never" })).toBe("$250")
  })

  it("compacts large amounts", () => {
    expect(formatMoney(1250000, { compact: true })).toBe("$1.3M")
    expect(formatMoney(1200, { compact: true })).toBe("$1.2K")
    expect(formatMoney(950, { compact: true })).toBe("$950")
  })

  it("follows currency, locale and decimals", () => {
    expect(formatMoney(9.99, { currency: "EUR", locale: "de-DE", fractionDigits: 2 })).toBe("9,99 €")
    expect(formatMoney(1234.5, { currency: "GBP", locale: "en-GB", fractionDigits: 2 })).toBe("£1,234.50")
  })

  it("does plain numbers with a prefix or suffix", () => {
    expect(formatMoney(120, { currency: null, suffix: " chips" })).toBe("120 chips")
    expect(formatMoney(3, { currency: null, prefix: "Ⓒ " })).toBe("Ⓒ 3")
  })

  it("never throws: bad input and unknown currencies fall back", () => {
    expect(formatMoney(Number.NaN)).toBe("$0")
    expect(formatMoney(Infinity)).toBe("$0")
    expect(formatMoney(10, { currency: "NOT-A-CODE" })).toBe("10")
  })

  it("knows the direction", () => {
    expect(moneyDirection(5)).toBe(1)
    expect(moneyDirection(-5)).toBe(-1)
    expect(moneyDirection(0)).toBe(0)
    expect(moneyDirection(Number.NaN)).toBe(0)
  })
})
