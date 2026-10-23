import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Stepper, stepperVariants } from "@/components/ui/stepper"

// The composition contract (docs/design/components.md): three parts at one height, the keycaps are Tiles, the
// value is a roll (per digit for numbers, a text reel for strings), no focus ring, no px.
const html = (node: React.ReactElement) => renderToStaticMarkup(node)
const tags = (markup: string, ...needles: string[]) => [...markup.matchAll(/<[a-z][^>]*>/g)].map((m) => m[0]).filter((t) => needles.every((n) => t.includes(n)))

describe("stepper", () => {
  it("is one control at --nk-h-control with two Tile keycaps and a rolling value", () => {
    const h = html(<Stepper value={12} min={0} max={243} aria-label="Drawable" />)
    expect(tags(h, 'data-slot="stepper"', "h-(--nk-h-control)", "rounded-(--nk-r-control)")).toHaveLength(1)
    const keys = tags(h, 'data-slot="tile"', 'data-size="lg"', 'data-shape="square"', "h-full")
    expect(keys).toHaveLength(2)
    expect(keys[0]).toContain('data-part="stepper-prev"')
    expect(keys[1]).toContain('data-part="stepper-next"')
    // the value rolls per digit: one reel for "1" and one for "2"
    expect(tags(h, 'data-slot="number-roll"')).toHaveLength(1)
    expect(h).toContain("<span class=\"sr-only\">12</span>")
    // no focus ring, no px
    expect(h).not.toMatch(/ring-|outline-(?!none)|\d+px/)
  })

  it("sizes pick the chip, control or field height; nothing else changes", () => {
    expect(stepperVariants({ size: "sm" })).toContain("h-(--nk-h-chip)")
    expect(stepperVariants()).toContain("h-(--nk-h-control)")
    expect(stepperVariants({ size: "lg" })).toContain("h-(--nk-h-field)")
  })

  it("disables the keycap at an end unless it wraps or the parent steps", () => {
    const off = (markup: string, part: string) => / disabled=""/.test(tags(markup, `data-part="${part}"`)[0]!)
    expect(off(html(<Stepper value={0} min={0} max={3} />), "stepper-prev")).toBe(true)
    expect(off(html(<Stepper value={3} min={0} max={3} />), "stepper-next")).toBe(true)
    expect(off(html(<Stepper value={0} min={0} max={3} wrap />), "stepper-prev")).toBe(false)
    expect(off(html(<Stepper value={0} min={0} max={3} onStep={() => {}} />), "stepper-prev")).toBe(false)
    expect(tags(html(<Stepper value={1} disabled />), 'data-slot="stepper"')[0]).toContain("data-disabled")
  })

  it("a text value is a text reel; a formatted number keeps its reel per character", () => {
    const t = html(<Stepper value="Medium" onStep={() => {}} />)
    expect(tags(t, 'data-slot="text-roll"')).toHaveLength(1)
    expect(t).not.toContain('data-slot="number-roll"')
    const f = html(<Stepper value={7} format={(n) => `${n} / 9`} />)
    expect(f).toContain("<span class=\"sr-only\">7 / 9</span>")
  })
})
