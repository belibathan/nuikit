import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { MenuRow, MenuRowList, menuMetadata, menuRowColor, menuRowVariants } from "@/components/ui/menu-row"

describe("menu-row", () => {
  it("paints no hover fill and no focus ring of its own (Selection: one lit state, drawn by the kit)", () => {
    for (const v of [menuRowVariants(), menuRowVariants({ hover: false }), menuRowVariants({ tone: "destructive" })]) {
      expect(v).toContain("nk-row")
      expect(v).not.toMatch(/hover:bg-|focus-visible:(bg|ring|text)-|data-\[active\]:/)
    }
    expect(menuRowVariants({ tone: "destructive" })).toContain("text-destructive")
  })

  it("a list spaces its rows and carries one selection tile; the pointer lights only rows that hover", () => {
    const html = renderToStaticMarkup(
      React.createElement(MenuRowList, { active: 1 }, [
        React.createElement(MenuRow, { key: "a" }, "Map"),
        React.createElement(MenuRow, { key: "b", inert: true }, "Keys"),
        React.createElement(MenuRow, { key: "c", tone: "destructive" }, "Disconnect"),
      ])
    )
    expect(html.match(/data-slot="selection-tile"/g)).toHaveLength(1)
    expect(html).toMatch(/data-slot="menu-row-list" class="nk-list"/)
    expect(html).toContain('class="nk-indicator"')
    expect(html.match(/data-hover="true"/g)).toHaveLength(2)
    expect(html).toContain('data-tone="destructive"')
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

  it("keeps each ox metadata item's own colorScheme", () => {
    const items = menuMetadata([
      { label: "Engine", value: "92%", progress: 92, colorScheme: "green" },
      { label: "Body", value: "41%", progress: 41, colorScheme: "red.6" },
      { label: "Fuel", value: "64%", progress: 64, colorScheme: " #4dabf7 " },
      { label: "Seats", value: 2 },
      { label: "Oil", progress: 10, colorScheme: "" },
      { label: "Brakes", progress: 70, colorScheme: 5 },
    ])
    expect(items).toEqual([
      { label: "Engine", value: "92%", progress: 92, color: "green" },
      { label: "Body", value: "41%", progress: 41, color: "red.6" },
      { label: "Fuel", value: "64%", progress: 64, color: "#4dabf7" },
      { label: "Seats", value: "2", progress: undefined },
      { label: "Oil", value: undefined, progress: 10 },
      { label: "Brakes", value: undefined, progress: 70 },
    ])
    // items without a colour don't carry the key, so the default bar is untouched
    expect("color" in items[3]).toBe(false)
    // and the colours land on the right bars
    expect(items.map((i) => menuRowColor(i.color))).toEqual([
      "var(--success)",
      "var(--destructive)",
      "#4dabf7",
      undefined,
      undefined,
      undefined,
    ])
  })

  it("turns a tone, a library name or a CSS colour into the bar's colour", () => {
    // tones, like Meter's
    expect(menuRowColor("success")).toBe("var(--success)")
    expect(menuRowColor("chart-2")).toBe("var(--chart-2)")
    expect(menuRowColor("health")).toBe("var(--vital-health)")
    expect(menuRowColor("stress")).toBe("var(--vital-stress)")
    // library names through meterColor()
    expect(menuRowColor("green")).toBe("var(--success)")
    expect(menuRowColor("Yellow.4")).toBe("var(--warning)")
    expect(menuRowColor("blue")).toBe("var(--info)")
    // muted, and ox's greys (dark.3 is its default bar): quiet, not near-white
    expect(menuRowColor("muted")).toBe("var(--muted-foreground)")
    expect(menuRowColor("dark.3")).toBe("var(--muted-foreground)")
    expect(menuRowColor("gray.6")).toBe("var(--muted-foreground)")
    // CSS colours pass through
    expect(menuRowColor("#c8102e")).toBe("#c8102e") // nuikit-ignore color/hardcoded
    expect(menuRowColor("rgb(77, 171, 247)")).toBe("rgb(77, 171, 247)")
    // anything else: the default bar
    expect(menuRowColor(undefined)).toBeUndefined()
    expect(menuRowColor("")).toBeUndefined()
    expect(menuRowColor("toString")).toBeUndefined()
    expect(menuRowColor("url(x)")).toBeUndefined()
  })
})
