"use client"

import * as React from "react"
import { tokenMs } from "nuikit-core/motion"

import { cn } from "@/lib/utils"

/**
 * SelectionTile — the one selection mark of a list (the baseline's Selection section, docs/design/baseline.md):
 * the primary keycap's geometry (a face in the theme's skew over its wall, the same radius and depth line, the
 * `--nk-tile-*` levers) as ONE element per list that slides between items by transform. Pointer hover, keyboard,
 * controller and programmatic focus, and the UI's own active index all light the same item: the tile moves under
 * it and the item gets `data-lit` (its ink and lift; the item never paints a fill of its own). A size change is a
 * measured FLIP (the new box, scaled from the old one), never a height or width animation. Reduced motion jumps.
 *
 *   <div className="flex flex-col">            // the list: the tile's parent (it marks it data-nk-sel)
 *     <SelectionTile items="[data-slot=menu-row]" active={i} />
 *     {rows}
 *   </div>
 *   <TabsList><SelectionTile items="[data-slot=tabs-trigger]" lit="[data-state=active]" axis="x" />…</TabsList>
 *   <DropdownMenuContent><SelectionTile items="[data-slot=dropdown-menu-item]" lit="[data-highlighted]" />…
 *
 * `useSelectionIndicator(tileRef, options)` is the engine, for a list that renders its own tile element
 * (kit.css `nk-indicator`). The key-repeat rule holds: a move sooner than --nk-time-base after the last glides
 * fast (data-repeat="fast"), the third in a row jumps (data-repeat="jump"), so it never trails a held d-pad.
 *
 * Role: the one selection mark of a list, tabs or a menu: a Tile that slides to the lit item.
 * Anatomy: nk-indicator (absolute, behind the items) > ::before (the wall, dropped --nk-tile-wall) > ::after (the face).
 * Props: items, active, lit, pointer, focus, list.
 * Rules: one tile per list; the lit item gets data-lit and never paints its own fill; pointer, focus and the
 *   active index are one language (last input wins); moves are transform only, sizes a FLIP; reduced motion jumps.
 */

type SelectionOptions = {
  /** The items the tile marks (a selector, matched inside the list). Default `.nk-row`. */
  items?: string
  /** The item the UI drives (keys, Lua, the open section): an index among the items; null for none. */
  active?: number | null
  /** An attribute the items carry when lit by someone else (Radix `[data-highlighted]`, tabs `[data-state=active]`). */
  lit?: string
  /** Hovering an item lights it: true (items that aren't inert, read-only or disabled), false, or a selector they must match. */
  pointer?: boolean | string
  /** A focused item (:focus-visible: keyboard, controller, programmatic) lights it. Default true. */
  focus?: boolean
  /** The list element; default the tile's parent. */
  list?: React.RefObject<HTMLElement | null>
}

const NOT_USABLE = '[data-inert], [data-readonly], [aria-disabled="true"], :disabled, [data-disabled]'

type Box = { x: number; y: number; w: number; h: number }

/** An item's box in the list's coordinates, from offsets (transforms, a row's rise or press, don't move it). */
function boxOf(el: HTMLElement, list: HTMLElement): Box {
  let x = 0
  let y = 0
  let n: HTMLElement | null = el
  while (n && n !== list) {
    x += n.offsetLeft
    y += n.offsetTop
    const next = n.offsetParent as HTMLElement | null
    // an item positioned against something outside the list: fall back to the drawn boxes
    if (next !== list && next && !list.contains(next)) {
      const a = el.getBoundingClientRect()
      const b = list.getBoundingClientRect()
      return { x: a.left - b.left + list.scrollLeft - list.clientLeft, y: a.top - b.top + list.scrollTop - list.clientTop, w: el.offsetWidth, h: el.offsetHeight }
    }
    n = next
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight }
}

function useSelectionIndicator(tileRef: React.RefObject<HTMLElement | null>, options: SelectionOptions = {}): void {
  const opts = React.useRef(options)
  opts.current = options
  const s = React.useRef({
    lit: null as HTMLElement | null,
    pointer: null as HTMLElement | null,
    focus: null as HTMLElement | null,
    box: null as Box | null,
    last: -Infinity,
    rapid: 0,
  })
  const listOf = () => opts.current.list?.current ?? (tileRef.current?.parentElement as HTMLElement | null) ?? null
  const itemsOf = (list: HTMLElement) => {
    const tile = tileRef.current
    return Array.from(list.querySelectorAll<HTMLElement>(opts.current.items ?? ".nk-row")).filter((el) => el !== tile)
  }

  const place = React.useCallback((el: HTMLElement | null, instant = false) => {
    const tile = tileRef.current
    const list = listOf()
    const st = s.current
    if (!tile || !list) return
    if (st.lit !== el) {
      st.lit?.removeAttribute("data-lit")
      el?.setAttribute("data-lit", "")
      st.lit = el
    }
    if (!el) {
      tile.setAttribute("data-hidden", "")
      st.box = null
      return
    }
    const to = boxOf(el, list)
    const from = st.box
    const tone = el.getAttribute("data-tone") ?? (/\btext-destructive\b/.test(el.className) ? "destructive" : null)
    if (tone) tile.setAttribute("data-tone", tone)
    else tile.removeAttribute("data-tone")
    const at = (b: Box) => `translate(${b.x}px, ${b.y}px)`
    if (!from || instant) {
      // first show (or a resize): no glide from a stale place; the tile fades in where it is
      tile.style.transition = "none"
      tile.style.width = `${to.w}px`
      tile.style.height = `${to.h}px`
      tile.style.transform = at(to)
      void tile.offsetWidth
      tile.style.transition = ""
      tile.removeAttribute("data-hidden")
      tile.removeAttribute("data-repeat")
      st.box = to
      return
    }
    if (from.x === to.x && from.y === to.y && from.w === to.w && from.h === to.h) return
    const now = performance.now()
    st.rapid = now - st.last < tokenMs("--nk-time-base", 180) ? st.rapid + 1 : 0
    st.last = now
    if (st.rapid === 0) tile.removeAttribute("data-repeat")
    else tile.setAttribute("data-repeat", st.rapid < 3 ? "fast" : "jump")
    if (from.w !== to.w || from.h !== to.h) {
      // FLIP: take the new box at once, drawn scaled from the old one, then let the transform settle
      tile.style.transition = "none"
      tile.style.width = `${to.w}px`
      tile.style.height = `${to.h}px`
      tile.style.transform = `${at(from)} scale(${from.w / (to.w || 1)}, ${from.h / (to.h || 1)})`
      void tile.offsetWidth
      tile.style.transition = ""
    }
    tile.style.transform = at(to)
    st.box = to
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileRef])

  /** Who is lit now: the pointer's item, else the focused one, else the one carrying `lit`, else `active`. */
  const resolve = React.useCallback((instant = false) => {
    const list = listOf()
    if (!list) return
    const o = opts.current
    const st = s.current
    const items = itemsOf(list)
    const alive = (el: HTMLElement | null) => (el && el.isConnected && items.includes(el) ? el : null)
    st.pointer = alive(st.pointer)
    st.focus = alive(st.focus)
    const byAttr = o.lit ? (items.find((el) => el.matches(o.lit!)) ?? null) : null
    const byIndex = o.active === null || o.active === undefined ? null : (items[o.active] ?? null)
    const next = st.pointer ?? st.focus ?? byAttr ?? byIndex
    place(next && !next.matches("[data-readonly], :disabled, [data-disabled]") ? next : null, instant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place])

  // listeners and observers, once per list
  React.useLayoutEffect(() => {
    const list = listOf()
    if (!list) return
    list.setAttribute("data-nk-sel", "")
    const st = s.current
    const itemAt = (t: EventTarget | null) => {
      const sel = opts.current.items ?? ".nk-row"
      const el = t instanceof Element ? (t.closest(sel) as HTMLElement | null) : null
      return el && list.contains(el) && el !== tileRef.current ? el : null
    }
    const onMove = (e: PointerEvent) => {
      const p = opts.current.pointer ?? true
      if (p === false) return
      const el = itemAt(e.target)
      if (!el) return // over a gap or the list's own padding: keep the last one (no flicker between rows)
      const ok = !el.matches(NOT_USABLE) && (typeof p !== "string" || el.matches(p))
      const next = ok ? el : null
      if (next === st.pointer) return
      st.pointer = next
      resolve()
    }
    const onLeave = () => {
      if (!st.pointer) return
      st.pointer = null
      resolve()
    }
    const onFocusIn = (e: FocusEvent) => {
      if (opts.current.focus === false) return
      const el = itemAt(e.target)
      if (!el) return
      if (!(e.target as Element).matches(":focus-visible")) {
        // a click focused it: the pointer already lights it; drop a stale keyboard claim
        if (st.focus) {
          st.focus = null
          resolve()
        }
        return
      }
      st.focus = el
      // the keyboard took over from a pointer resting on another row
      st.pointer = null
      resolve()
    }
    const onFocusOut = (e: FocusEvent) => {
      if (!st.focus) return
      if (e.relatedTarget instanceof Node && st.focus.contains(e.relatedTarget)) return
      // focus moving to another item: its focusin moves the tile (a slide, not a hide and a show)
      if (opts.current.focus !== false && itemAt(e.relatedTarget)) return
      st.focus = null
      resolve()
    }
    // a key anywhere is the last input: the pointer's claim waits for its next move
    const onKey = () => {
      if (!st.pointer) return
      st.pointer = null
      resolve()
    }
    list.addEventListener("pointermove", onMove)
    list.addEventListener("pointerleave", onLeave)
    list.addEventListener("focusin", onFocusIn)
    list.addEventListener("focusout", onFocusOut)
    window.addEventListener("keydown", onKey, true)
    const mo = new MutationObserver(() => opts.current.lit && resolve())
    mo.observe(list, { subtree: true, attributes: true, attributeFilter: ["data-highlighted", "data-state", "aria-selected", "data-active"] })
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => resolve(true))
    ro?.observe(list)
    return () => {
      list.removeEventListener("pointermove", onMove)
      list.removeEventListener("pointerleave", onLeave)
      list.removeEventListener("focusin", onFocusIn)
      list.removeEventListener("focusout", onFocusOut)
      window.removeEventListener("keydown", onKey, true)
      mo.disconnect()
      ro?.disconnect()
      st.lit?.removeAttribute("data-lit")
      st.lit = null
      st.box = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolve, tileRef])

  // the UI's own state (active, the items) changed: a programmatic move is the last input
  React.useLayoutEffect(() => {
    s.current.pointer = null
  }, [options.active])
  React.useLayoutEffect(() => resolve())
}

function SelectionTile({
  className,
  items,
  active,
  lit,
  pointer,
  focus,
  list,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & SelectionOptions) {
  const ref = React.useRef<HTMLDivElement>(null)
  useSelectionIndicator(ref, { items, active, lit, pointer, focus, list })
  return <div ref={ref} aria-hidden data-slot="selection-tile" data-hidden="" className={cn("nk-indicator", className)} {...props} />
}

export { SelectionTile, useSelectionIndicator, type SelectionOptions }
