import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SegmentedControl, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/selection-tabs"

// The composition contract: one Selection per list inside the tabs list, triggers --nk-list-gap apart,
// no fill or ring of their own; SegmentedControl is the same with options and no panels.
const html = (node: React.ReactElement) => renderToStaticMarkup(node)
const tags = (markup: string, ...needles: string[]) => [...markup.matchAll(/<[a-z][^>]*>/g)].map((m) => m[0]).filter((t) => needles.every((n) => t.includes(n)))

describe("selection tabs", () => {
  it("draws one selection tile first in the list, and the shadcn parts around it", () => {
    const h = html(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">panel</TabsContent>
      </Tabs>,
    )
    expect(tags(h, 'data-slot="selection"')).toHaveLength(1)
    expect(h.indexOf('data-slot="tabs-list"')).toBeLessThan(h.indexOf('data-slot="selection"'))
    expect(h.indexOf('data-slot="selection"')).toBeLessThan(h.indexOf('data-slot="tabs-trigger"'))
    expect(tags(h, 'data-slot="tabs-list"')[0]).toContain('data-selection-tabs="list"')
    expect(tags(h, 'data-slot="tabs-trigger"')).toHaveLength(2)
    expect(h).toContain('data-slot="tabs-content"')
  })

  it("segmented control is the same list from options, with the first (or the value) active and no panels", () => {
    const opts = [{ value: "x", label: "X" }, { value: "y", label: "Y" }]
    const d = html(<SegmentedControl options={opts} />)
    expect(tags(d, 'data-slot="selection"')).toHaveLength(1)
    expect(tags(d, 'data-slot="tabs-trigger"', 'data-state="active"')[0]).toContain('trigger-x')
    const c = html(<SegmentedControl options={opts} value="y" onValueChange={() => {}} />)
    expect(tags(c, 'data-slot="tabs-trigger"', 'data-state="active"')[0]).toContain('trigger-y')
    expect(c).not.toContain('data-slot="tabs-content"')
  })
})
