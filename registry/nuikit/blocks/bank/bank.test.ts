import { describe, expect, it } from "vitest"

import { bankAmountError } from "./bank"

describe("bank amounts", () => {
  it("takes whole dollars above zero up to what's available", () => {
    expect(bankAmountError("deposit", "500", 1520)).toBeNull()
    expect(bankAmountError("withdraw", "48210", 48210)).toBeNull()
  })

  it("says what's wrong in plain words", () => {
    expect(bankAmountError("deposit", "", 100)).toBe("Enter an amount.")
    expect(bankAmountError("deposit", "0", 100)).toBe("Enter an amount above $0.")
    expect(bankAmountError("deposit", "abc", 100)).toBe("Enter an amount above $0.")
    expect(bankAmountError("deposit", "12.5", 100)).toBe("Use whole dollars.")
    expect(bankAmountError("deposit", "101", 100)).toBe("You don't have that much cash.")
    expect(bankAmountError("withdraw", "101", 100)).toBe("There isn't that much in the account.")
  })

  it("needs a recipient for a transfer", () => {
    expect(bankAmountError("transfer", "50", 100, "  ")).toMatch(/^Who is it for\?/)
    expect(bankAmountError("transfer", "50", 100, "12")).toBeNull()
  })
})
