"use client"

import * as React from "react"
import { motionLevel } from "nuikit-core/motion"

import { cn } from "@/lib/utils"

/**
 * TextRoll — a short text that changes like a slot reel: the old value rolls out, the new one rolls
 * in, masked to the line (docs/design.md, Motion: transform and opacity only, Chromium 103). For
 * labels that change while you watch: the street under the minimap, a zone, a status, a timer.
 *
 *   <TextRoll value={street} />                       → the whole word rolls (up)
 *   <TextRoll value={zone} direction="down" />
 *   <TextRoll value={label} stagger={18} />           → per character, a ripple left to right
 *
 * NumberRoll — the numeric variant: each digit is its own reel, so only the digits that change roll,
 * up when the value grows and down when it shrinks, ripple from the right. Money, speed, ammo, clocks.
 *
 *   <NumberRoll value={cash} format={(n) => money.format(n)} />
 *   <NumberRoll value={ammo} />
 *
 * Motion: `html[data-nk-motion="off"]` swaps at once; "reduced" (the player's pref or the OS) keeps a
 * ≤ 100 ms cross-fade with no movement. Nothing runs when the value is still. The reel is
 * `aria-hidden`; the current value is read once from a visually hidden copy.
 */

type Direction = "up" | "down"
type Align = "start" | "center" | "end"

/**
 * Where the text sits in its line, from the layout around it: the inherited text-align, or a flex
 * parent that centres or end-aligns its items. Each layer of a reel is aligned on its own this way,
 * so a centred word rolls straight up and the next one comes straight up on the same centre.
 */
function resolveAlign(el: HTMLElement): Align {
  const parent = el.parentElement
  if (parent) {
    const ps = getComputedStyle(parent)
    if (ps.display.includes("flex")) {
      const column = ps.flexDirection.startsWith("column")
      const along = column ? ps.alignItems : ps.justifyContent
      if (along === "center") return "center"
      if (along === "flex-end" || along === "end" || along === "right") return "end"
      if (along === "flex-start" || along === "start" || along === "left") return "start"
    }
  }
  const ta = getComputedStyle(el).textAlign
  if (ta === "center" || ta === "-webkit-center") return "center"
  const rtl = getComputedStyle(el).direction === "rtl"
  if (ta === "right") return rtl ? "start" : "end"
  if (ta === "end") return "end"
  return "start"
}

/** The alignment to use: the prop, else resolved from the layout once mounted (and on resize). */
function useAlign(root: React.RefObject<HTMLElement | null>, align?: Align): Align {
  const [auto, setAuto] = React.useState<Align>("start")
  React.useLayoutEffect(() => {
    if (align || !root.current) return
    setAuto(resolveAlign(root.current))
  })
  return align ?? auto
}

const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)"
/** One roll's duration: about 1.6 panel steps (the identity's --nk-duration), at most 420 ms. */
function rollMs() {
  if (typeof document === "undefined") return 220
  const v = getComputedStyle(document.documentElement).getPropertyValue("--nk-duration").trim()
  const m = /^([\d.]+)(m?s)$/.exec(v)
  const base = m ? parseFloat(m[1]!) * (m[2] === "s" ? 1000 : 1) : 140
  return Math.min(420, Math.max(120, base * 1.6))
}

interface Layer {
  key: number
  text: string
  /** rolling out (removed when its animation ends) */
  out: boolean
  /** rolls in when it mounts (not the first value) */
  enter: boolean
  dir: Direction
}

/** One reel: a string that rolls to its next value. The building block of both components. */
function Reel({ text, dir, delay = 0, align = "start", appear = false }: { text: string; dir: Direction; delay?: number; align?: Align; appear?: boolean }) {
  const seq = React.useRef(0)
  // appear: mounted after its parent's first value (a new digit): start empty and roll in, width and all
  const start = appear && motionLevel() !== "off" ? "" : text
  const [layers, setLayers] = React.useState<Layer[]>(() => [{ key: 0, text: start, out: false, enter: false, dir }])
  const current = React.useRef(start)

  React.useLayoutEffect(() => {
    if (text === current.current) return
    current.current = text
    const key = ++seq.current
    if (motionLevel() === "off") {
      setLayers([{ key, text, out: false, enter: false, dir }])
      return
    }
    setLayers((ls) => [...ls.map((l) => (l.out ? l : { ...l, out: true, dir })), { key, text, out: false, enter: true, dir }])
  }, [text, dir])

  const done = React.useCallback((key: number) => setLayers((ls) => ls.filter((l) => l.key !== key)), [])
  const rolling = layers.length > 1

  // The width moves with the roll: from the old text's width to the new one's, over the same time and
  // easing, so centred or right-aligned neighbours slide with it instead of jumping when it ends.
  const box = React.useRef<HTMLSpanElement>(null)
  const widthAnim = React.useRef<Animation | null>(null)
  const lastKey = layers[layers.length - 1]!.key
  React.useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    if (!rolling) {
      // at rest: auto width
      widthAnim.current?.cancel()
      widthAnim.current = null
      el.style.width = ""
      el.style.gridTemplateColumns = ""
      // nothing measured at rest: a page full of rolls would force a layout per mount
      return
    }
    const level = motionLevel()
    const incoming = el.lastElementChild as HTMLElement | null
    if (level !== "on" || !incoming || typeof el.animate !== "function") return
    // from where it is now (mid-roll, if one is running) or the outgoing text's width, to the incoming
    // text's own width (both layers measured the same way)
    const outgoing = incoming.previousElementSibling as HTMLElement | null
    const from = widthAnim.current || !outgoing ? el.getBoundingClientRect().width : outgoing.getBoundingClientRect().width
    const to = incoming.getBoundingClientRect().width
    widthAnim.current?.cancel()
    // the column follows the box while it moves, so text aligns in what you see, not the widest layer
    el.style.gridTemplateColumns = "100%"
    el.style.width = `${to}px`
    if (Math.abs(to - from) < 0.5) {
      widthAnim.current = null
      return
    }
    widthAnim.current = el.animate([{ width: `${from}px` }, { width: `${to}px` }], { duration: rollMs(), delay, easing: EASE, fill: "backwards" })
  }, [rolling, lastKey, delay])

  return (
    <span
      ref={box}
      data-slot="text-roll-reel"
      data-rolling={rolling || undefined}
      className={cn(
        // a little room above and below, so text shadows and descenders aren't cut by the window
        // the window clips y only (clip-path), never x: italic glyphs overhang their box sideways
        "-my-[0.12em] inline-grid max-w-full grid-cols-[minmax(0,auto)] py-[0.12em] align-bottom whitespace-pre [clip-path:inset(0_-0.5em)]",
        // the slot window: a soft fade at the top and bottom edges while it turns
        rolling && "[mask-image:linear-gradient(to_bottom,transparent,currentColor_22%,currentColor_78%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,currentColor_22%,currentColor_78%,transparent)]"
      )}
      style={{ justifyItems: align }}
    >
      {layers.map((l) => (
        <ReelLayer key={l.key} layer={l} delay={delay} onDone={done} />
      ))}
    </span>
  )
}

function ReelLayer({ layer, delay, onDone }: { layer: Layer; delay: number; onDone: (key: number) => void }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const { key, out, enter, dir, text } = layer

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || (!out && !enter)) return
    const level = motionLevel()
    if (level === "off") {
      if (out) onDone(key)
      return
    }
    const reduced = level === "reduced"
    const ms = reduced ? 100 : rollMs()
    const sign = dir === "up" ? 1 : -1
    // in: from below (up) or above (down); out: away the same way
    const frames: Keyframe[] = reduced
      ? out
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ opacity: 0 }, { opacity: 1 }]
      : out
        ? [
            { transform: "translateY(0)", opacity: 1 },
            { transform: `translateY(${-sign * 100}%)`, opacity: 0 },
          ]
        : [
            { transform: `translateY(${sign * 100}%)`, opacity: 0 },
            { transform: "translateY(0)", opacity: 1 },
          ]
    if (typeof el.animate !== "function") {
      if (out) onDone(key)
      return
    }
    const a = el.animate(frames, { duration: ms, delay: reduced ? 0 : delay, easing: EASE, fill: "both" })
    let live = true
    a.finished
      .then(() => {
        if (!live) return
        if (out) onDone(key)
        // nothing left running or held: the end state is the element's own
        else a.cancel()
      })
      .catch(() => {})
    return () => {
      live = false
      a.cancel()
    }
  }, [out, enter, dir, delay, key, onDone])

  return (
    // max-w: a no-wrap layer is never narrower than its text (its min-content), so cap it at the window
    // (plus its italic padding) or a long value is cut instead of ending in an ellipsis
    <span ref={ref} data-out={out || undefined} className="-mx-[0.15em] max-w-[calc(100%+0.3em)] min-w-0 overflow-hidden px-[0.15em] text-ellipsis [grid-area:1/1]" aria-hidden={out || undefined}>
      {text}
    </span>
  )
}

type RollProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** The text shown; a change rolls. */
  value: string
  /** Which way it turns. Default "up". */
  direction?: Direction
  /** Per-character ripple in ms (0: the whole text as one reel). Default 0. */
  stagger?: number
  /** Where the text sits in its line; default: read from the layout (text-align, a centring flex parent). */
  align?: Align
}

/** Positions that just went away stay a roll longer (empty), so their width closes smoothly. */
function useLinger(length: number): [number, boolean] {
  const [shown, setShown] = React.useState(length)
  const mounted = React.useRef(false)
  React.useEffect(() => {
    mounted.current = true
  }, [])
  React.useEffect(() => {
    if (length >= shown) {
      setShown(length)
      return
    }
    if (motionLevel() === "off") {
      setShown(length)
      return
    }
    const t = setTimeout(() => setShown(length), rollMs() + 60)
    return () => clearTimeout(t)
  }, [length, shown])
  return [Math.max(length, shown), mounted.current]
}

function TextRoll({ value, direction = "up", stagger = 0, align, className, ...props }: RollProps) {
  const root = React.useRef<HTMLSpanElement>(null)
  const at = useAlign(root, align)
  const text = value ?? ""
  const chars = [...text]
  const [slots, live] = useLinger(stagger > 0 ? chars.length : 0)
  return (
    <span ref={root} data-slot="text-roll" data-align={at} className={cn("inline-flex max-w-full", className)} {...props}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex min-w-0">
        {stagger > 0 ? (
          Array.from({ length: slots }, (_, i) => <Reel key={i} text={chars[i] ?? ""} dir={direction} delay={i * stagger} appear={live} align="center" />)
        ) : (
          <Reel text={text} dir={direction} align={at} />
        )}
      </span>
    </span>
  )
}

type NumberRollProps = Omit<React.ComponentProps<"span">, "children"> & {
  value: number
  /** How the number is written (Intl, a unit…). Default: the locale's grouping. */
  format?: (n: number) => string
  /** Force a direction; default: up when it grows, down when it shrinks. */
  direction?: Direction
  /** Ripple between digits, right to left, in ms. Default 24. */
  stagger?: number
}

const plain = (n: number) => n.toLocaleString("en-US")

function NumberRoll({ value, format = plain, direction, stagger = 24, className, ...props }: NumberRollProps) {
  const prev = React.useRef(value)
  const way = React.useRef<Direction>("up")
  // the direction is decided when the value changes, before the reels see the new text
  if (value !== prev.current) {
    way.current = value >= prev.current ? "up" : "down"
    prev.current = value
  }
  const dir = direction ?? way.current
  const text = format(Number.isFinite(value) ? value : 0)
  const chars = [...text]
  const [slots, live] = useLinger(chars.length)
  // keyed from the right, so units, tens and hundreds keep their reel when the length changes; a
  // digit that comes rolls in from nothing, one that goes rolls out and closes its width
  return (
    <span data-slot="number-roll" className={cn("nk-num inline-flex", className)} {...props}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        {Array.from({ length: slots }, (_, i) => {
          const fromRight = slots - 1 - i
          const ch = chars[chars.length - 1 - fromRight] ?? ""
          return <Reel key={fromRight} text={ch} dir={dir} delay={fromRight * stagger} align="center" appear={live} />
        })}
      </span>
    </span>
  )
}

export { TextRoll, NumberRoll }
