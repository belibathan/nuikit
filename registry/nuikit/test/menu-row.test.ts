import { describe, expect, it } from "vitest"

import { menuMetadata, menuRowVariants } from "@/components/ui/menu-row"

describe("menu-row", () => {
  it("only hovers when hover is on (inert and readOnly turn it off)", () => {
    expect(menuRowVariants()).toContain("hover:bg-accent")
    expect(menuRowVariants({ hover: false })).not.toContain("hover:")
    // keyboard selection and active still highlight
    expect(menuRowVariants({ hover: false })).toContain("data-[active]:bg-accent")
    expect(menuRowVariants({ hover: false })).toContain("focus-visible:bg-accent")
    expect(menuRowVariants({ tone: "destructive" })).toContain("hover:text-destructive")
    expect(menuRowVariants({ tone: "destructive", hover: false })).not.toContain("hover:")
  })

  it("reads ox_lib metadata in all three shapes", () => {
    expect(menuMetadata(["Fast", 3])).toEqual([{ value: "Fast" }, { value: "3" }])
    expect(menuMetadata({ Plate: "ZEN 01", Seats: 2 })).toEqual([
      { label: "Plate", value: "ZEN 01" },
      { label: "Seats", value: "2" },
    ])
    expect(menuMetadata([{ label: "Fuel", value: "64%", progress: 64 }, { label: "Engine" }, { nope: 1 }])).toEqual([
      { label: "Fuel", value: "64%", progress: 64 },
      { label: "Engine", value: undefined, progress: undefined },
    ])
    expect(menuMetadata([{ label: "Body", progress: "bad" }])).toEqual([{ label: "Body", value: undefined, progress: undefined }])
    expect(menuMetadata(undefined)).toEqual([])
    expect(menuMetadata("text")).toEqual([])
  })
})
