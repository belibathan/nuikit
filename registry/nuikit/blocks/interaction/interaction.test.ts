import { describe, expect, it } from "vitest"

import { interactionIcon } from "./interaction"

describe("interaction icons", () => {
  it("draws the icons Lua can name", () => {
    expect(interactionIcon("car")).not.toBeNull()
    expect(interactionIcon("money")).not.toBeNull()
  })

  it("draws nothing for a name it doesn't know, or none", () => {
    expect(interactionIcon("fa-solid fa-car")).toBeNull()
    expect(interactionIcon("")).toBeNull()
    expect(interactionIcon(undefined)).toBeNull()
  })
})
