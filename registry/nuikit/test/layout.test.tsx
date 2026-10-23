import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Grid, nextCell } from "@/components/ui/grid"
import { Region } from "@/components/ui/region"
import { Screen } from "@/components/ui/screen"
import { Zone } from "@/components/ui/zone"

const html = (n: React.ReactElement) => renderToStaticMarkup(n)

describe("layout: screen, zone, region, grid", () => {
  it("a zone is placed by its id (any position word), its levers as variables", () => {
    const out = html(<Zone at="top-right" gap="items" inset="2rem" z={3} flow="row" align="end" />)
    expect(out).toContain('data-nk-zone="tr"')
    expect(out).toContain('data-nk-flow="row"')
    expect(out).toContain('data-nk-align="end"')
    expect(out).toContain("--nk-zone-gap:var(--nk-gap-items)")
    expect(out).toContain("--nk-zone-inset:2rem")
    expect(out).toContain("--nk-zone-z:3")
    expect(html(<Zone at="right-center" />)).toContain('data-nk-zone="mr"')
    expect(html(<Zone at="l" bleed />)).toContain("data-nk-bleed")
  })

  it("the screen carries its levers and the aspect", () => {
    const out = html(<Screen bleed ratio={2.37} safe={{ x: 1, y: 0.5 }} density="compact" />)
    expect(out).toContain('data-slot="screen"')
    expect(out).toMatch(/data-aspect="(4-3|16-10|16-9|21-9|32-9)"/)
    expect(out).toContain("data-nk-bleed")
    expect(out).toContain('data-nk-density="compact"')
    expect(out).toContain("--nk-safe-x:1rem")
    expect(out).toContain("--nk-screen-ratio:2.37")
  })

  it("a region has its three slots and scrolls in the body", () => {
    const out = html(<Region fill scroll pad="tight" max="30rem" header="H" footer="F">body</Region>)
    for (const s of ["region-header", "region-body", "region-footer", "scroll-area"]) expect(out).toContain(s)
    expect(out).toContain('data-pad="tight"')
    expect(out).toContain("--nk-region-max:30rem")
  })

  it("a grid sets its levers", () => {
    const out = html(<Grid cols={5} cell="6rem" gap="0.25rem" fluid />)
    expect(out).toContain("--nk-grid-cols:5")
    expect(out).toContain("--nk-grid-cell:6rem")
    expect(out).toContain("data-fluid")
  })

  it("useGridNav moves spatially: rows, wraps, a missing cell, a wide cell", () => {
    // 3 across, 2 rows, the last row short
    const at = (c: number, r: number, w = 1) => ({ x: c * 10, y: r * 10, w: w * 10 - 2, h: 8 })
    const g = [at(0, 0), at(1, 0), at(2, 0), at(0, 1), at(1, 1)]
    expect(nextCell(g, 0, "right")).toBe(1)
    expect(nextCell(g, 1, "down")).toBe(4)
    expect(nextCell(g, 2, "down")).toBe(4) // nothing under it: the nearest below
    expect(nextCell(g, 4, "right")).toBe(-1)
    expect(nextCell(g, 0, "left")).toBe(-1)
    expect(nextCell(g, 3, "up")).toBe(0)
    // a cell two wide under the first two
    const w = [at(0, 0), at(1, 0), at(0, 1, 2)]
    expect(nextCell(w, 1, "down")).toBe(2)
    expect(nextCell(w, 2, "up")).toBe(0)
  })
})
