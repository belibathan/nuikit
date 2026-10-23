import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { NumberRoll, TextRoll, __tokenize as tokenize } from "@/components/ui/text-roll"

// TextRoll rolls per numeric token (roadmap A4): "1 / 243" rolls only the "1", separators never move.
describe("text-roll", () => {
  it("splits a text into digit runs and the still text between them", () => {
    expect(tokenize("1 / 243")).toEqual([
      { text: "1", num: true },
      { text: " / ", num: false },
      { text: "243", num: true },
    ])
    expect(tokenize("$1,250")).toEqual([
      { text: "$", num: false },
      { text: "1", num: true },
      { text: ",", num: false },
      { text: "250", num: true },
    ])
    expect(tokenize("Vinewood")).toEqual([{ text: "Vinewood", num: false }])
    expect(tokenize("")).toEqual([{ text: "", num: false }])
  })

  it("renders one reel per digit and one per text run, the whole value for readers", () => {
    const html = renderToStaticMarkup(<TextRoll value="1 / 243" />)
    expect(html).toContain('class="sr-only">1 / 243<')
    // 1 + 3 digit reels and the separator's own reel
    expect(html.match(/data-slot="text-roll-reel"/g)).toHaveLength(5)
    expect(html).toContain("> / <")
  })

  it("keeps a plain word as one reel", () => {
    const html = renderToStaticMarkup(<TextRoll value="Vinewood" />)
    expect(html.match(/data-slot="text-roll-reel"/g)).toHaveLength(1)
  })

  it("NumberRoll still rolls each character of the formatted number", () => {
    const html = renderToStaticMarkup(<NumberRoll value={1250} format={(n) => `$${n}`} />)
    expect(html).toContain('class="sr-only">$1250<')
    expect(html.match(/data-slot="text-roll-reel"/g)).toHaveLength(5)
  })
})
