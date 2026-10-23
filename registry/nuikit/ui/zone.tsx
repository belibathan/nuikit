"use client"

import * as React from "react"

import { publishZone, resourceName, toZoneId, useClearOf, type ZoneId } from "nuikit-core/react"

import { cn } from "@/lib/utils"

/**
 * Zone — one of the screen's nine places (tl tc tr / ml mc mr / bl bc br) or four edges (t r b l)
 * (docs/design/layout.md). Every HUD part, notice stack, prompt, sheet and dialog is placed in one, never with
 * coordinates. A zone is a flex column that grows towards the screen centre (a bottom zone stacks upwards),
 * aligned to its own side, `--nk-zone-gap` between what it holds, `--nk-zone-inset` (default --nk-edge) from
 * the safe area of the 16:9 box. Edges are flush and span their side (sheets, bands).
 *
 *   <Zone at="tr" clear>{notices}</Zone>          // starts below whatever another UI covers top right
 *   <Zone at="br" publish="cluster">…</Zone>      // tells every other page what it covers (NUI.zone)
 *
 * `clear` moves it clear of what other resources published in its corner (useClearOf, the HUD's map);
 * `publish` measures it and publishes its rectangle under `name` so the others clear it. Two things in one
 * zone never overlap: they are flex items of one column.
 *
 * Role: A place on the screen: the flex container everything is placed in.
 * Anatomy: zone (absolute; flex, towards the centre) > children
 * Props: at, clear, publish, gap, inset, z, flow, align, justify, bleed, as.
 * Rules: Placed by its id, never by coordinates. One zone per place per page; items inside it stack, never
 *   overlap. Gap, inset and order are levers.
 */
type ZoneProps = React.HTMLAttributes<HTMLElement> & {
  /** The place: a zone id or any position word (top-right, ox right-center, qb right). */
  at: ZoneId | string
  /** Start clear of what other UIs published in this place (screen zones). Default false. */
  clear?: boolean
  /** Publish what this zone covers under this name (NUI.zone), so other pages clear it. */
  publish?: string
  /** The gap between its items: a lever name (items, cluster, section) or any CSS length. */
  gap?: "items" | "cluster" | "section" | "surface" | (string & {})
  /** Its inset from the safe area (a CSS length). Default --nk-edge. */
  inset?: string
  /** Its stacking order among zones. */
  z?: number
  flow?: "row" | "column" | "row-reverse" | "column-reverse" | "wrap"
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between"
  /** On an ultrawide, sit at the screen's edge instead of the 16:9 box's. */
  bleed?: boolean
  as?: React.ElementType
}

const GAP: Record<string, string> = {
  items: "var(--nk-gap-items)",
  cluster: "var(--nk-gap-cluster)",
  section: "var(--nk-space-4)",
  surface: "var(--nk-pad-surface)",
}

function Zone({ at, clear = false, publish, gap, inset, z, flow, align, justify, bleed, as: Comp = "div", className, style, ...props }: ZoneProps) {
  const id = toZoneId(at)
  const self = React.useMemo(() => [resourceName()], [])
  const cleared = useClearOf(id, { ignore: self })
  const ref = React.useRef<HTMLElement>(null)
  usePublishedRect(ref, publish)
  const vars: Record<string, string | number> = {}
  if (gap) vars["--nk-zone-gap"] = GAP[gap] ?? gap
  if (inset) vars["--nk-zone-inset"] = inset
  if (z !== undefined) vars["--nk-zone-z"] = z
  return (
    <Comp
      ref={ref}
      data-slot="zone"
      data-nk-zone={id}
      data-nk-flow={flow}
      data-nk-align={align}
      data-nk-justify={justify}
      data-nk-bleed={bleed || undefined}
      className={cn(className)}
      style={{ ...vars, ...(clear ? cleared : null), ...style } as React.CSSProperties}
      {...props}
    />
  )
}

/**
 * Measure an element (settled: 150ms after the last change) and publish its rectangle as a screen zone: this page's
 * stacks clear it at once; `remote: false` keeps it to this page (no NUI.zone).
 */
function usePublishedRect(ref: React.RefObject<HTMLElement | null>, name: string | undefined, { remote = true }: { remote?: boolean } = {}) {
  React.useEffect(() => {
    const el = ref.current
    if (!name || !el || typeof ResizeObserver === "undefined") return
    let last = ""
    let t = 0
    const measure = () => {
      const r = el.getBoundingClientRect()
      const W = window.innerWidth
      const H = window.innerHeight
      const round = (n: number) => Math.round(n * 1000) / 1000
      const rects = r.width >= 1 && r.height >= 1 ? [{ x: round(r.left / W), y: round(r.top / H), w: round(r.width / W), h: round(r.height / H) }] : []
      const key = JSON.stringify(rects)
      if (key === last) return
      last = key
      void publishZone(name, rects, { remote })
    }
    const schedule = () => {
      clearTimeout(t)
      t = window.setTimeout(() => requestAnimationFrame(measure), 150)
    }
    const ro = new ResizeObserver(schedule)
    ro.observe(el)
    window.addEventListener("resize", schedule)
    schedule()
    return () => {
      clearTimeout(t)
      ro.disconnect()
      window.removeEventListener("resize", schedule)
      void publishZone(name, null, { remote })
    }
  }, [ref, name, remote])
}

export { Zone, usePublishedRect, type ZoneProps }
