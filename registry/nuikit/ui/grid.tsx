"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Grid — a slot grid (docs/design.md): inventories, garages, wardrobes. Square cells of `--nk-grid-cell`
 * (5.5rem), `--nk-grid-gap` apart, `cols` across or as many as fit; `fluid` stretches cells to fill the row.
 * `useGridNav` moves focus between the cells with the arrow keys by where they are on screen (spatial: a
 * wrapped row, a gap, a cell twice as wide all just work), Home / End to the first and last.
 *
 *   const ref = React.useRef<HTMLDivElement>(null)
 *   useGridNav(ref)
 *   <Grid ref={ref} cols={5}>{slots.map((s) => <ItemSlot key={s.id} tabIndex={0} … />)}</Grid>
 *
 * Role: A grid of equal cells on two levers, with spatial keyboard navigation.
 * Anatomy: grid (css grid) > cells
 * Props: cols, cell, gap, fluid, as.
 * Rules: Cell size and gap are levers (--nk-grid-cell, --nk-grid-gap), never per-screen CSS. Navigation is
 *   spatial, never by index arithmetic.
 */
type GridProps = React.HTMLAttributes<HTMLElement> & {
  /** Columns across. Default: as many as fit. */
  cols?: number
  /** Cell size (a CSS length). Default --nk-grid-cell. */
  cell?: string
  /** Gap (a CSS length). Default --nk-grid-gap. */
  gap?: string
  /** Cells stretch to fill the row (at least `cell` wide). */
  fluid?: boolean
  as?: React.ElementType
}

const Grid = React.forwardRef<HTMLElement, GridProps>(function Grid({ cols, cell, gap, fluid, as: Comp = "div", className, style, ...props }, ref) {
  const vars: Record<string, string> = {}
  if (cols) vars["--nk-grid-cols"] = String(cols)
  if (cell) vars["--nk-grid-cell"] = cell
  if (gap) vars["--nk-grid-gap"] = gap
  return <Comp ref={ref} data-slot="grid" data-fluid={fluid || undefined} className={cn(className)} style={{ ...vars, ...style } as React.CSSProperties} {...props} />
})

type Box = { x: number; y: number; w: number; h: number }
type Dir = "left" | "right" | "up" | "down"

/**
 * The cell to move to from `from` in `dir`: the nearest one whose centre lies that way, preferring the same
 * column, then the smallest distance; left and right never leave the row. -1 when there is none. Pure (tested).
 */
function nextCell(boxes: Box[], from: number, dir: Dir): number {
  const a = boxes[from]
  if (!a) return -1
  const ax = a.x + a.w / 2
  const ay = a.y + a.h / 2
  let best = -1
  let score = Infinity
  boxes.forEach((b, i) => {
    if (i === from) return
    const bx = b.x + b.w / 2
    const by = b.y + b.h / 2
    const dx = bx - ax
    const dy = by - ay
    const main = dir === "left" ? -dx : dir === "right" ? dx : dir === "up" ? -dy : dy
    if (main <= 0.5) return
    // left and right stay in the row (the boxes overlap vertically); up and down may land on the nearest
    if ((dir === "left" || dir === "right") && (b.y >= a.y + a.h || b.y + b.h <= a.y)) return
    const cross = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx)
    // a cell in the same row / column wins over a nearer one off it
    const s = cross * 4 + main
    if (s < score) {
      score = s
      best = i
    }
  })
  return best
}

const KEYS: Record<string, Dir> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }

/** Arrow-key spatial navigation between the focusable cells of a grid (`cells`: their selector). */
function useGridNav(ref: React.RefObject<HTMLElement | null>, { cells = ":scope > *", onMove }: { cells?: string; onMove?: (index: number, el: HTMLElement) => void } = {}) {
  React.useEffect(() => {
    const root = ref.current
    if (!root) return
    const onKey = (e: KeyboardEvent) => {
      const list = Array.from(root.querySelectorAll<HTMLElement>(cells))
      const from = list.findIndex((el) => el === document.activeElement || el.contains(document.activeElement))
      if (from < 0) return
      let to = -1
      if (e.key === "Home") to = 0
      else if (e.key === "End") to = list.length - 1
      else if (KEYS[e.key]) {
        const boxes = list.map((el) => {
          const r = el.getBoundingClientRect()
          return { x: r.left, y: r.top, w: r.width, h: r.height }
        })
        to = nextCell(boxes, from, KEYS[e.key]!)
      } else return
      if (to < 0 || to === from) return
      e.preventDefault()
      list[to]!.focus({ preventScroll: false })
      onMove?.(to, list[to]!)
    }
    root.addEventListener("keydown", onKey)
    return () => root.removeEventListener("keydown", onKey)
  }, [ref, cells, onMove])
}

export { Grid, useGridNav, nextCell, type GridProps }
