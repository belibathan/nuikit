import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ActionBar, ActionBarItem, ActionBarSep } from "@/components/ui/action-bar"

// One action, one place (roadmap A5): a hint and a button that name the same action render once.
const items = (html: string) => html.match(/data-slot="action-bar-item"/g)?.length ?? 0

describe("action-bar dedupe", () => {
  it("folds a hint and an acting item with the same label into one item that does both", () => {
    const html = renderToStaticMarkup(
      <ActionBar>
        <ActionBarItem keys={["Esc"]} label="Exit" />
        <ActionBarItem label="Exit" onClick={() => {}} />
      </ActionBar>
    )
    expect(items(html)).toBe(1)
    expect(html).toContain("<button")
    expect(html).toContain('data-slot="kbd"')
  })

  it("matches on a shared key, case-insensitively", () => {
    const html = renderToStaticMarkup(
      <ActionBar>
        <ActionBarItem keys={["ESC"]} label="Back" onClick={() => {}} />
        <ActionBarItem keys={["Esc"]} label="Close" />
      </ActionBar>
    )
    expect(items(html)).toBe(1)
    expect(html).toContain("Back")
    expect(html).not.toContain("Close")
  })

  it("folds a foreign button with the hint's text into the hint", () => {
    const html = renderToStaticMarkup(
      <ActionBar>
        <ActionBarItem keys={["Esc"]} label="Exit" />
        <button type="button" onClick={() => {}}>
          <svg /> Exit
        </button>
      </ActionBar>
    )
    expect(items(html)).toBe(1)
    expect(html.match(/<button/g)).toHaveLength(1)
    expect(html).toContain('data-slot="kbd"')
  })

  it("leaves distinct actions and separators alone", () => {
    const html = renderToStaticMarkup(
      <ActionBar>
        <ActionBarItem keys={["Tab"]} label="Choose" />
        <ActionBarSep />
        <ActionBarItem keys={["Enter"]} label="Confirm" />
      </ActionBar>
    )
    expect(items(html)).toBe(2)
    expect(html).toContain('data-slot="action-bar-sep"')
  })

  it("dedupe={false} keeps both", () => {
    const html = renderToStaticMarkup(
      <ActionBar dedupe={false}>
        <ActionBarItem keys={["Esc"]} label="Exit" />
        <ActionBarItem label="Exit" onClick={() => {}} />
      </ActionBar>
    )
    expect(items(html)).toBe(2)
  })
})
