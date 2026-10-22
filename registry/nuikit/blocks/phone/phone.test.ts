import { describe, expect, it } from "vitest"

import { contactError, contactName, formatPhone, formatTime, messageError, phoneDigits, sortThreads } from "./phone"
import { phoneFixtures } from "./fixtures"

const data = phoneFixtures.full

describe("phone helpers", () => {
  it("reads and draws numbers", () => {
    expect(phoneDigits(" 555-0142 ")).toBe("5550142")
    expect(formatPhone("5550142")).toBe("555-0142")
    expect(formatPhone("911")).toBe("911")
  })

  it("names a number from the contacts, else draws it", () => {
    expect(contactName(data, "5550188")).toBe("Ana Reyes")
    expect(contactName(data, "5550999")).toBe("555-0999")
  })

  it("formats the server's time on the player's clock", () => {
    expect(formatTime(new Date(2026, 9, 22, 18, 5).getTime() / 1000)).toBe("18:05")
  })

  it("puts the newest thread first", () => {
    expect(sortThreads(data.threads).map((t) => t.number)).toEqual(["5550188", "5550123"])
  })

  it("says what's wrong with a contact before asking", () => {
    expect(contactError(data, "Sam", "555-0166")).toBeNull()
    expect(contactError(data, " ", "5550166")).toBe("Enter a name.")
    expect(contactError(data, "x".repeat(25), "5550166")).toBe("Names are up to 24 characters.")
    expect(contactError(data, "Sam", "555")).toBe("Numbers have 7 digits.")
    expect(contactError(data, "Sam", "5550142")).toBe("That's your own number.")
    expect(contactError(data, "Sam", "555-0188")).toBe("Ana Reyes is already saved.")
  })

  it("says what's wrong with a text before asking", () => {
    expect(messageError(data, "hi")).toBeNull()
    expect(messageError(data, "   ")).toBe("Write something first.")
    expect(messageError(data, "x".repeat(241))).toBe("Texts are up to 240 characters.")
  })
})
