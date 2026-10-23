import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Chip } from "@/components/ui/chip"
import { Countdown } from "@/components/ui/countdown"
import { EdgeSheetEdge } from "@/components/ui/edge-sheet"
import { Fill, fillTargets } from "@/components/ui/fill"
import { HudChip } from "@/components/ui/hud-chip"
import { KeyPrompt } from "@/components/ui/key-prompt"
import { Meter } from "@/components/ui/meter"
import { Money } from "@/components/ui/money"
import { Notice } from "@/components/ui/notice"
import { NuiMenu } from "@/components/ui/nui-menu"
import { ProgressRing } from "@/components/ui/progress-ring"
import { SheetSection } from "@/components/ui/sheet-section"
import { Speedometer } from "@/components/ui/speedometer"
import { Cluster, Stack } from "@/components/ui/stack"
import { Stat } from "@/components/ui/stat"
import { Text } from "@/components/ui/text"
import { Vital } from "@/components/ui/vital"

// The composition contracts (docs/design/components.md): every composite draws its parts with the foundation,
// and every deprecated alias renders its canonical component.
const html = (node: React.ReactElement) => renderToStaticMarkup(node)
const dom = (node: React.ReactElement) => {
  const doc = new DOMParserLite(html(node))
  return doc
}

/** A tiny attribute reader over static markup (no DOM in the node test environment). */
class DOMParserLite {
  constructor(readonly markup: string) {}
  /** Every start tag whose attributes include all of `attrs` ("data-slot=\"fill\"", "class=\"…nk-fill…\""). */
  tags(...needles: string[]) {
    return [...this.markup.matchAll(/<[a-z][^>]*>/g)].map((m) => m[0]).filter((t) => needles.every((n) => t.includes(n)))
  }
  has(...needles: string[]) {
    return this.tags(...needles).length > 0
  }
}

describe("foundation", () => {
  it("Fill carries .nk-fill, --level, alert and tween off", () => {
    const d = dom(<Fill level={0.4} alert tween={false} tone="warning" data-slot="meter-segment" />)
    expect(d.has('data-slot="meter-segment"', "nk-fill", "--level:0.4", 'data-state="alert"', 'data-tween="off"', 'data-tone="warning"')).toBe(true)
  })

  it("fillTargets runs the bar and the edge of one Fill", () => {
    const t = fillTargets(null, 1, 0.25)
    expect(t.map((x) => x.pseudoElement)).toEqual(["::before", "::after"])
    expect(t[0]!.keyframes).toEqual([{ transform: "scaleX(1)" }, { transform: "scaleX(0.25)" }])
    expect(t[1]!.keyframes).toEqual([{ transform: "translateX(0%)" }, { transform: "translateX(-75%)" }])
  })

  it("Text is a role class on the value ladder; Stack and Cluster are gap levers", () => {
    expect(html(<Text variant="num" size="md">1</Text>)).toMatch(/class="nk-num text-\(length:--nk-hud-value-size\)/)
    expect(html(<Stack gap="items" />)).toContain('class="flex flex-col gap-(--nk-gap-items)"')
    expect(html(<Cluster />)).toContain('class="flex flex-row gap-(--nk-gap-cluster) items-center"')
  })
})

describe("composites", () => {
  it("Meter's segments are Fills in the meter's colour", () => {
    const d = dom(<Meter value={50} segments={4} tone="health" />)
    const segs = d.tags('data-slot="meter-segment"')
    expect(segs).toHaveLength(4)
    for (const s of segs) expect(s).toContain("nk-fill")
    expect(segs[0]).toContain("--level:1")
    expect(segs[2]).toContain("--level:0")
    expect(segs[0]).toContain("--nk-fill-color:var(--vital-health)")
    expect(segs[0]).toContain("data-color")
    // critical: the alert beats a hue
    expect(dom(<Meter value={10} low={20} segments={2} hue="police" />).tags('data-slot="meter-segment"', 'data-state="alert"')).toHaveLength(2)
  })

  it("Meter's slab line is a Fill", () => {
    const d = dom(<Meter variant="slab" label="Repairing" value={30} />)
    expect(d.has('data-slot="meter-line"', "nk-fill", "nk-slab-line", "--level:0.3")).toBe(true)
  })

  it("ProgressRing is a Dial with sweep 360", () => {
    const d = dom(<ProgressRing value={50} />)
    expect(d.has('data-slot="progress-ring"')).toBe(true)
    expect(d.has('data-slot="dial"')).toBe(true)
    expect(d.has('data-slot="progress-ring-fill"', 'stroke-linecap="round"')).toBe(true)
  })

  it("Speedometer is a Dial, a gear Tile and a fuel Fill", () => {
    const d = dom(<Speedometer speed={80} rpm={0.95} gear={3} fuel={10} />)
    expect(d.has('data-slot="speedometer"', 'data-state="alert"')).toBe(true)
    expect(d.has('data-slot="tile"', 'data-part="speedometer-gear"', 'data-state="alert"')).toBe(true)
    expect(d.has('data-slot="fill"', 'data-part="speedometer-fuel"', 'data-state="alert"')).toBe(true)
  })

  it("Countdown's line and Notice's time line are Fills", () => {
    expect(dom(<Countdown seconds={30} total={60} />).has('data-slot="countdown-line"', "nk-fill", "--level:0.5")).toBe(true)
    const n = dom(<Notice tone="warning" title="Low fuel" duration={4000} elapsed={1000} paused />)
    expect(n.has('data-slot="notice-time"', "nk-fill", 'data-tone="warning"', "--level:0.75")).toBe(true)
  })

  it("KeyPrompt's keys are Tiles and its hold is a Fill", () => {
    const d = dom(<KeyPrompt surface="panel" keys={["Shift", "E"]} label="Lock" hold={1000} progress={0.5} />)
    expect(d.tags('data-slot="kbd"', 'data-size="sm"')).toHaveLength(2)
    expect(d.has('data-slot="key-prompt-hold"', "nk-fill", "--level:0.5")).toBe(true)
  })

  it("EdgeSheet's edge is a Fill (variant edge) that alerts at the danger level", () => {
    expect(dom(<EdgeSheetEdge value={95} />).has('data-slot="edge-sheet-edge"', "nk-fill", 'data-variant="edge"', 'data-state="alert"')).toBe(true)
    expect(dom(<EdgeSheetEdge value={40} />).has('data-slot="edge-sheet-edge"', 'data-state="alert"')).toBe(false)
  })

  it("Stat's value and Money are Text in the num role", () => {
    expect(dom(<Stat label="Cash" value="$1" />).has('data-slot="stat-value"', 'data-variant="num"', "nk-num")).toBe(true)
    expect(dom(<Money amount={5} currency="USD" locale="en-US" />).has('data-slot="money"', 'data-variant="num"', "nk-num")).toBe(true)
  })

  it("SheetSection's rows are a Stack", () => {
    expect(html(<SheetSection label="Cars" rows="items" />)).toContain('data-slot="sheet-section-rows" class="flex flex-col gap-(--nk-gap-items)"')
  })
})

describe("aliases render their canonical component", () => {
  it("HudChip is Chip material=\"hud\", markup for markup", () => {
    const props = { icon: <svg />, active: true, hue: "police", children: "Normal" }
    expect(html(<HudChip {...props} />)).toBe(html(<Chip material="hud" {...props} />))
    expect(html(<HudChip state="warning">Seatbelt</HudChip>)).toContain('data-slot="hud-chip"')
    expect(html(<Chip material="hud" tone="danger">Seatbelt</Chip>)).toBe(html(<HudChip state="warning">Seatbelt</HudChip>))
  })

  it("Vital is a Meter", () => {
    const d = dom(<Vital value={10} tone="health" label="Health" icon={<svg />} />)
    expect(d.has('data-slot="vital"', 'data-state="alert"', "w-32")).toBe(true)
    expect(html(<Vital value={60} tone="armor" />)).toBe(html(<Meter value={60} tone="armor" low={20} className="w-32" data-slot="vital" />))
  })

  it("NuiMenu is a Panel of MenuRows", () => {
    const d = dom(
      <NuiMenu
        title="Garage"
        items={[
          { id: "a", label: "Sultan" },
          { id: "b", label: "Buffalo", disabled: true },
        ]}
        onSelect={() => {}}
      />
    )
    expect(d.has('data-slot="nui-menu"', "nk-panel")).toBe(true)
    expect(d.has('data-slot="menu-row-list"')).toBe(true)
    expect(d.tags('data-slot="menu-row"')).toHaveLength(2)
  })
})
