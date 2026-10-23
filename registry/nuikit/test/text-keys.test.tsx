import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Text, parseKeyTokens } from "@/components/ui/text"

describe("key tokens", () => {
  it("parses [A-Z0-9 +-]{1,12} tokens and leaves the rest", () => {
    expect(parseKeyTokens("Press [E] to talk")).toEqual([
      { key: false, text: "Press " },
      { key: true, text: "E" },
      { key: false, text: " to talk" },
    ])
    expect(parseKeyTokens("[LEFT MOUSE]").map((p) => p.text)).toEqual(["LEFT MOUSE"])
    expect(parseKeyTokens("[SHIFT + E]")[0]).toEqual({ key: true, text: "SHIFT + E" })
  })
  it("ignores lowercase, too long, empty and symbol-only brackets", () => {
    for (const s of ["[e]", "[Esc]", "[ABCDEFGHIJKLM]", "[]", "[ ]", "[-]", "[+ +]", "a [b"]) {
      expect(parseKeyTokens(s).every((p) => !p.key)).toBe(true)
    }
  })
})

describe("Text keys", () => {
  it("renders tokens as keycaps inline", () => {
    const html = renderToStaticMarkup(<Text>Press [E] to open</Text>)
    expect(html).toContain('data-slot="kbd"')
    expect(html).toContain("--nk-inline-key-scale")
    expect(html).toContain("Press ")
  })
  it("keys={false} keeps the brackets literally", () => {
    const html = renderToStaticMarkup(<Text keys={false}>Press [E]</Text>)
    expect(html).not.toContain("kbd")
    expect(html).toContain("[E]")
  })
  it("is XSS-safe: markup in the text is escaped", () => {
    const html = renderToStaticMarkup(<Text>{"<img src=x onerror=alert(1)> [E]"}</Text>)
    expect(html).toContain("&lt;img")
    expect(html).not.toContain("<img")
  })
})
