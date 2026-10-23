// @vitest-environment jsdom
import * as React from "react"
import { act } from "react"
// @ts-ignore www has no @types/react-dom
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"

import { Speedometer, speedometerLit, speedometerPainter } from "@/components/ui/speedometer"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: { root: { render(n: React.ReactNode): void; unmount(): void }; el: HTMLElement } | null = null
afterEach(() => {
  if (mounted) act(() => mounted!.root.unmount())
  mounted?.el.remove()
  mounted = null
})

/** render() / rerender() over plain react-dom (no testing-library in this package set). */
function render(ui: React.ReactElement) {
  const el = document.body.appendChild(document.createElement("div"))
  const root = createRoot(el)
  mounted = { root, el }
  act(() => root.render(ui))
  return { container: el, rerender: (next: React.ReactElement) => act(() => root.render(next)) }
}

const lit = (root: HTMLElement) => root.querySelectorAll("[data-slot=dial-segment][data-active]").length
const root = (c: HTMLElement) => c.querySelector<HTMLElement>("[data-slot=speedometer]")!
const gear = (c: HTMLElement) => c.querySelector("[data-part=speedometer-gear]")!

describe("live speedometer: the painter owns the rpm", () => {
  it("lights, reds and clears with the painter (0 → 0.95 → 0.3 → 0)", () => {
    const { container } = render(<Speedometer live speed={0} rpm={0} />)
    const r = root(container)
    const p = speedometerPainter(r)
    p.rpm(0.95)
    expect(lit(r)).toBe(11)
    expect(r.getAttribute("data-state")).toBe("alert")
    expect(gear(container).getAttribute("data-state")).toBe("alert")
    p.rpm(0.3)
    expect(lit(r)).toBe(speedometerLit(0.3))
    expect(r.hasAttribute("data-state")).toBe(false)
    expect(gear(container).hasAttribute("data-state")).toBe(false)
    p.rpm(0)
    expect(lit(r)).toBe(0)
  })

  it("a re-render with a changed or stale rpm / redline prop never re-lights or re-reds", () => {
    const { container, rerender } = render(<Speedometer live speed={0} rpm={0.2} />)
    const r = root(container)
    const p = speedometerPainter(r)
    p.rpm(0.95)
    p.rpm(0.3)
    rerender(<Speedometer live speed={10} rpm={0.95} redline gear={4} />)
    expect(lit(r)).toBe(speedometerLit(0.3))
    expect(r.hasAttribute("data-state")).toBe(false)
    expect(gear(container).hasAttribute("data-state")).toBe(false)
    p.rpm(0)
    rerender(<Speedometer live speed={10} rpm={0.6} redline={false} gear={5} />)
    expect(lit(r)).toBe(0)
    rerender(<Speedometer live speed={10} rpm={0.99} redline gear={5} />)
    expect(lit(r)).toBe(0)
    expect(r.hasAttribute("data-state")).toBe(false)
  })

  it("unlit red-zone segments are not red-tinted: the track looks the same as every other unlit one", () => {
    const { container } = render(<Speedometer live speed={0} rpm={0} />)
    const track = Array.from(container.querySelectorAll("[data-slot=dial-track] circle"))
    const cls = new Set(track.map((c) => c.getAttribute("class")))
    expect(cls.size).toBe(1)
    expect(Array.from(cls)[0]).not.toContain("redline")
    // and nothing unlit shows: segments past the redline are hidden until lit
    for (const s of container.querySelectorAll<HTMLElement>("[data-slot=dial-segment]")) expect(s.style.opacity).toBe("0")
  })

  it("lit red-zone segments are red", () => {
    const { container } = render(<Speedometer live speed={0} rpm={0} />)
    speedometerPainter(root(container)).rpm(1)
    const reds = Array.from(container.querySelectorAll("[data-slot=dial-segment][data-active][data-red]"))
    expect(reds.length).toBeGreaterThan(0)
    for (const s of reds) expect(s.getAttribute("class")).toContain("redline")
  })
})
