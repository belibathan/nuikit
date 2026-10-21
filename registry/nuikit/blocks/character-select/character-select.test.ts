import { describe, expect, it } from "vitest"

import { newCharacterErrors, yearsAgo } from "./character-select"

const genders = ["Male", "Female", "Other"]
const today = new Date("2026-10-20T12:00:00Z")
const ok = { firstName: "Alex", lastName: "Moreno", birthdate: "1994-03-12", gender: "Male" }

describe("new characters", () => {
  it("takes a sensible character", () => {
    expect(newCharacterErrors(ok, genders, today)).toEqual({})
    expect(newCharacterErrors({ ...ok, firstName: "Zoë", lastName: "O'Brien-Diaz" }, genders, today)).toEqual({})
  })

  it("asks for names of 2–20 letters", () => {
    expect(newCharacterErrors({ ...ok, firstName: "" }, genders, today).firstName).toBe("Enter a name.")
    expect(newCharacterErrors({ ...ok, firstName: "A" }, genders, today).firstName).toBe("Use 2 to 20 letters.")
    expect(newCharacterErrors({ ...ok, lastName: "x".repeat(21) }, genders, today).lastName).toBe("Use 2 to 20 letters.")
    expect(newCharacterErrors({ ...ok, lastName: "R0b0t" }, genders, today).lastName).toBe("Use letters, spaces, hyphens and apostrophes.")
    expect(newCharacterErrors({ ...ok, firstName: "-Al" }, genders, today).firstName).toBe("Use letters, spaces, hyphens and apostrophes.")
  })

  it("keeps ages from 18 to 100", () => {
    expect(yearsAgo(today, 18)).toBe("2008-10-20")
    expect(newCharacterErrors({ ...ok, birthdate: "2008-10-20" }, genders, today)).toEqual({})
    expect(newCharacterErrors({ ...ok, birthdate: "2008-10-21" }, genders, today).birthdate).toBe("Characters are 18 or older.")
    expect(newCharacterErrors({ ...ok, birthdate: "1926-10-19" }, genders, today).birthdate).toBe("Characters are 100 or younger.")
    expect(newCharacterErrors({ ...ok, birthdate: "12/03/1994" }, genders, today).birthdate).toBe("Enter a date of birth.")
  })

  it("takes a gender from the list", () => {
    expect(newCharacterErrors({ ...ok, gender: "Robot" }, genders, today).gender).toBe("Pick one.")
    expect(newCharacterErrors({ ...ok, gender: undefined }, genders, today).gender).toBe("Pick one.")
  })
})
