import { __reset, emit } from "nuikit-core"
import { afterEach, describe, expect, it } from "vitest"

import { formatMoney, formatCount, moneyDirection } from "@/components/ui/money"

afterEach(() => __reset())

/** Intl separates with a no-break space (U+00A0); compare on plain spaces. */
const plain = (s: string) => s.replace(/\u00a0/g, " ")

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

describe("money follows the server context (nuikit:context)", () => {
  it("defaults to USD / en-US until Lua sends the context", () => {
    expect(plain(formatMoney(1520))).toBe("$1,520")
  })

  it("formats with the server's currency and locale once they arrive", () => {
    emit("nuikit:context", { currency: "EUR", locale: "de-DE" })
    expect(plain(formatMoney(1520))).toBe("1.520 €")
    expect(plain(formatMoney(9.99, { fractionDigits: 2 }))).toBe("9,99 €")
    emit("nuikit:context", { currency: "JPY", locale: "ja-JP" })
    expect(plain(formatMoney(1520))).toBe("￥1,520")
    emit("nuikit:context", { currency: "USD", locale: "en-US" })
    expect(plain(formatMoney(1520))).toBe("$1,520")
  })

  it("explicit currency and locale win over the context", () => {
    emit("nuikit:context", { currency: "EUR", locale: "de-DE" })
    expect(plain(formatMoney(1520, { currency: "GBP", locale: "en-GB" }))).toBe("£1,520")
    expect(plain(formatMoney(120, { currency: null, suffix: " chips" }))).toBe("120 chips")
    expect(plain(formatMoney(1520, { currency: "USD" }))).toBe("1.520 $") // locale still the server's
  })

  it("a malformed context falls back field by field, and an unknown currency never throws", () => {
    emit("nuikit:context", { currency: "", locale: "de-DE" } as never)
    expect(plain(formatMoney(1520))).toBe("1.520 $")
    emit("nuikit:context", { currency: "NOPE", locale: "xx-INVALID-TAG-@" } as never)
    expect(plain(formatMoney(1520))).toBe("1,520")
  })
})

describe("formatCount", () => {
  it("writes a count for a tight space, rounded down so it never overstates", () => {
    const cases: [number, string][] = [[0, "0"], [1, "1"], [999, "999"], [1000, "1k"], [2450, "2.4k"], [2999, "2.9k"], [9999, "9.9k"], [10000, "10k"], [24_999, "24k"], [245_100, "245k"], [999_999, "999k"], [1_000_000, "1M"], [1_250_000, "1.2M"], [3_000_000_000, "3B"], [-5, "0"], [Number.NaN, "0"], [12.7, "12"]]
    for (const [n, want] of cases) expect(formatCount(n), String(n)).toBe(want)
  })
})
