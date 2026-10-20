import { describe, expect, it } from "vitest"

import { initials } from "@/components/ui/player-card"

describe("player-card", () => {
  it("takes the first letters of the first and last name", () => {
    expect(initials("Niko Bellic")).toBe("NB")
    expect(initials("Franklin D. Clinton")).toBe("FC")
    expect(initials("  lester  ")).toBe("L")
    expect(initials("lamar   davis")).toBe("LD")
    expect(initials("Élodie Ångström")).toBe("ÉÅ")
    expect(initials("")).toBe("?")
    expect(initials("   ")).toBe("?")
  })
})
