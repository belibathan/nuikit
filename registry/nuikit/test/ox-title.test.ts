import { describe, expect, it } from "vitest"

// The boundary normaliser ox_lib's context adapter runs on resource-supplied titles (addons/ox_lib/web/src/lib/title.ts).
import { splitTitle } from "../../../addons/ox_lib/web/src/lib/title"

describe("splitTitle", () => {
  it("takes a leading emoji and its separator into the icon slot", () => {
    expect(splitTitle("🎽 | Clothing store options")).toEqual({ icon: "🎽", title: "Clothing store options" })
    expect(splitTitle("🚗 - Garage")).toEqual({ icon: "🚗", title: "Garage" })
    expect(splitTitle("👮‍♂️: Police")).toEqual({ icon: "👮‍♂️", title: "Police" })
    expect(splitTitle("★ VIP")).toEqual({ icon: "★", title: "VIP" })
    expect(splitTitle("  🏠  |  Home  ")).toEqual({ icon: "🏠", title: "Home" })
  })

  it("leaves plain titles, a lone glyph and non-strings alone", () => {
    expect(splitTitle("Buy clothing - $100")).toBeNull()
    expect(splitTitle("🎽")).toBeNull()
    expect(splitTitle("| Clothing")).toBeNull()
    expect(splitTitle(undefined)).toBeNull()
  })
})
