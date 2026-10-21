// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/text-roll.tsx, then run pnpm sync.
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
function Reel({ text, dir, delay = 0, align = "start" }: { text: string; dir: Direction; delay?: number; align?: "start" | "end" | "center" }) {
  const seq = React.useRef(0)
  const [layers, setLayers] = React.useState<Layer[]>(() => [{ key: 0, text, out: false, enter: false, dir }])
  const current = React.useRef(text)

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

  return (
    <span
      data-slot="text-roll-reel"
      data-rolling={rolling || undefined}
      className={cn(
        // a little room above and below, so text shadows and descenders aren't cut by the window
        "-my-[0.12em] inline-grid max-w-full grid-cols-[minmax(0,auto)] overflow-hidden py-[0.12em] align-bottom whitespace-pre",
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
    <span ref={ref} data-out={out || undefined} className="min-w-0 overflow-hidden text-ellipsis [grid-area:1/1]" aria-hidden={out || undefined}>
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
}

function TextRoll({ value, direction = "up", stagger = 0, className, ...props }: RollProps) {
  const text = value ?? ""
  return (
    <span data-slot="text-roll" className={cn("inline-flex max-w-full", className)} {...props}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex min-w-0">
        {stagger > 0 ? (
          [...text].map((ch, i) => <Reel key={i} text={ch} dir={direction} delay={i * stagger} />)
        ) : (
          <Reel text={text} dir={direction} />
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
  // keyed from the right, so units, tens and hundreds keep their reel when the length changes
  return (
    <span data-slot="number-roll" className={cn("nk-num inline-flex", className)} {...props}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        {chars.map((ch, i) => {
          const fromRight = chars.length - 1 - i
          return <Reel key={fromRight} text={ch} dir={dir} delay={fromRight * stagger} align="center" />
        })}
      </span>
    </span>
  )
}

export { TextRoll, NumberRoll }
