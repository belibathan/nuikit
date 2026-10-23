// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/smooth-input.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { motionLevel, token, tokenMs } from "nuikit-core/motion"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

/**
 * SmoothInput / SmoothTextarea — drop-ins for shadcn's Input and Textarea (same props, same ref) with
 * a caret that glides between positions and breathes in the theme's primary, and typed characters
 * that ease in. Stock shadcn underneath: the field is the real <input>/<textarea>, so focus, selection,
 * keyboard, paste, autofill, forms and screen readers are the browser's own.
 *
 *   <SmoothInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
 *   <SmoothTextarea rows={4} defaultValue={note} />
 *
 * How: the field's own glyphs and caret are made transparent and a mirror of its text is drawn over it
 * (same font, padding and scroll). The caret is a drawn element that glides to the measured position on the
 * ladder (`--nk-caret-time`, `--nk-caret-ease`, `--nk-caret-width`); every typed character rises in on its own
 * (`--nk-type-in-distance` over `--nk-type-in-time`, a key-stagger between characters of one paste) and a deleted
 * one drops out (`--nk-type-out-time`). While an IME composes, while there is a selection range (the field draws
 * its own highlight then), and whenever motion is off or reduced (`html[data-nk-motion]`, the OS setting), it is
 * the plain native field: nothing is drawn over it. Transform and opacity only; the value, events and form
 * semantics are the field's own.
 *
 * Role: Drop-in Input and Textarea with a caret that glides and characters that ease in.
 * Anatomy: the real field (selection, IME, paste) > overlay (caret, typed characters)
 * Rules: The real field stays underneath; the overlay never takes the pointer. The native caret with motion
 *   off.
 */

type Field = HTMLInputElement | HTMLTextAreaElement

/** Copied from the field to the mirror so the text lands on the same pixels. */
const MIRRORED = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "wordSpacing",
  "textTransform",
  "textIndent",
  "textAlign",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "fontVariantNumeric",
  "color",
] as const

/** The motion levers (kit.css), read from <html> once: the defaults when a page has no kit. */
const TYPE_IN_MS = 210
const TYPE_OUT_MS = 98
const STAGGER_MS = 20
/** Past this many characters an insertion (a paste) rises as one block, not a ripple. */
const RIPPLE_MAX = 12
const EASE_OUT = "cubic-bezier(0.2, 0.8, 0.2, 1)"
const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)"
const distanceOf = () => token("--nk-type-in-distance") || "0.45em"

function useMotionOn() {
  const [on, setOn] = React.useState(() => motionLevel() === "on")
  React.useEffect(() => {
    const read = () => setOn(motionLevel() === "on")
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-nk-motion"] })
    const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null
    mq?.addEventListener?.("change", read)
    return () => {
      mo.disconnect()
      mq?.removeEventListener?.("change", read)
    }
  }, [])
  return on
}

interface View {
  value: string
  /** caret index, or -1 when there is a selection range */
  caret: number
  /** the last insertion [from, to), keyed so it animates once */
  ins: { from: number; to: number; key: number } | null
  /** the last deletion: the text that left and where it stood, keyed so it leaves once */
  del: { at: number; text: string; key: number } | null
  focused: boolean
  composing: boolean
}

function useSmoothField<T extends Field>(multiline: boolean) {
  const field = React.useRef<T | null>(null)
  const mirror = React.useRef<HTMLDivElement>(null)
  const content = React.useRef<HTMLDivElement>(null)
  const marker = React.useRef<HTMLSpanElement>(null)
  const caret = React.useRef<HTMLSpanElement>(null)
  const on = useMotionOn()
  const seq = React.useRef(0)
  const [view, setView] = React.useState<View>({ value: "", caret: 0, ins: null, del: null, focused: false, composing: false })

  // read the field into the view; diff the value to find what was typed
  const sync = React.useCallback(() => {
    const el = field.current
    if (!el) return
    setView((v) => {
      const value = el.value
      const a = el.selectionStart ?? value.length
      const b = el.selectionEnd ?? a
      let ins = v.ins
      let del = v.del
      if (value !== v.value) {
        let p = 0
        while (p < value.length && p < v.value.length && value[p] === v.value[p]) p++
        let s = 0
        while (s < value.length - p && s < v.value.length - p && value[value.length - 1 - s] === v.value[v.value.length - 1 - s]) s++
        const to = value.length - s
        const gone = v.value.slice(p, v.value.length - s)
        const key = ++seq.current
        ins = to > p ? { from: p, to, key } : null
        del = gone ? { at: p, text: gone, key } : null
      }
      const next = { ...v, value, caret: a === b ? a : -1, ins, del, focused: document.activeElement === el }
      return next.value === v.value && next.caret === v.caret && next.ins === v.ins && next.del === v.del && next.focused === v.focused ? v : next
    })
  }, [])

  // the mirror matches the field's box and type
  React.useLayoutEffect(() => {
    const el = field.current
    const m = mirror.current
    if (!el || !m || !on) return
    const cs = getComputedStyle(el)
    for (const k of MIRRORED) (m.style as unknown as Record<string, string>)[k] = cs[k]
    m.style.borderStyle = "solid"
    m.style.borderColor = "transparent"
  })

  // follow every way the text or the caret can move
  React.useEffect(() => {
    const el = field.current
    if (!el) return
    sync()
    const onSel = () => {
      if (document.activeElement === el) sync()
    }
    const start = () => setView((v) => ({ ...v, composing: true }))
    const end = () => {
      setView((v) => ({ ...v, composing: false }))
      sync()
    }
    const evs = ["input", "keyup", "keydown", "mouseup", "pointerup", "focus", "blur", "select", "scroll"] as const
    const later = () => requestAnimationFrame(sync)
    for (const e of evs) el.addEventListener(e, later)
    el.addEventListener("compositionstart", start)
    el.addEventListener("compositionend", end)
    document.addEventListener("selectionchange", onSel)
    return () => {
      for (const e of evs) el.removeEventListener(e, later)
      el.removeEventListener("compositionstart", start)
      el.removeEventListener("compositionend", end)
      document.removeEventListener("selectionchange", onSel)
    }
  }, [sync])

  // a controlled value set from outside (no input event): pick it up
  React.useLayoutEffect(() => {
    const el = field.current
    if (el && el.value !== view.value) sync()
  })

  // a selection range is the field's own (its highlight and selected-text colours)
  const drawn = on && view.focused && !view.composing && view.caret >= 0
  // place the caret on the marker, minus the field's scroll
  React.useLayoutEffect(() => {
    const el = field.current
    const mk = marker.current
    const c = caret.current
    const box = content.current
    if (!el || !c || !box) return
    box.style.transform = `translate(${-el.scrollLeft}px, ${-el.scrollTop}px)`
    if (!drawn || !mk) {
      c.style.opacity = "0"
      return
    }
    const x = mk.offsetLeft - el.scrollLeft
    const y = mk.offsetTop - el.scrollTop
    c.style.height = `${mk.offsetHeight}px`
    if (c.style.opacity === "0") {
      // first show (focus): appear where the caret is, no glide from a stale place
      c.style.transition = "none"
      c.style.transform = `translate(${x}px, ${y}px)`
      void c.offsetWidth
      c.style.transition = ""
    } else c.style.transform = `translate(${x}px, ${y}px)`
    c.style.opacity = ""
    // typing or moving restarts the breath, so the caret is solid while it moves
    c.getAnimations?.().forEach((a) => a.cancel())
    if (typeof c.animate === "function")
      c.animate([{ opacity: 1 }, { opacity: 1, offset: 0.45 }, { opacity: 0.15, offset: 0.7 }, { opacity: 1 }], { duration: 1100, delay: 500, iterations: Infinity, easing: "linear" })
  })

  // the caret's breath stops when the field loses focus (nothing runs while idle)
  React.useEffect(() => {
    if (drawn) return
    caret.current?.getAnimations?.().forEach((a) => a.cancel())
  }, [drawn])

  const overlay = (
    <div
      ref={mirror}
      aria-hidden
      data-slot="smooth-field-mirror"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        multiline ? "whitespace-pre-wrap break-words" : "flex items-center whitespace-pre",
        !drawn && "invisible"
      )}
    >
      <div ref={content} className={cn("relative", multiline ? "min-h-full" : "")}>
        <Mirrored view={view} marker={marker} />
        <span
          ref={caret}
          data-slot="smooth-caret"
          className="absolute top-0 left-0 bg-primary [transition:transform_var(--nk-caret-time,140ms)_var(--nk-caret-ease,cubic-bezier(0.2,0,0,1))]"
          style={{ width: "var(--nk-caret-width, 0.125rem)", borderRadius: "var(--nk-r-key, 1px)", opacity: 0 }}
        />
      </div>
    </div>
  )

  // while drawn, the field's own glyphs and caret go transparent (its selection highlight stays)
  const fieldClass = drawn ? "[caret-color:transparent] [-webkit-text-fill-color:transparent] placeholder:[-webkit-text-fill-color:var(--muted-foreground)]" : undefined
  return { field, overlay, fieldClass }
}

/**
 * The text as spans: before, the new characters (each rising in once), after, with the caret marker; what was
 * just deleted leaves from where it stood (a zero-width span, so the rest of the line never shifts for it).
 */
function Mirrored({ view, marker }: { view: View; marker: React.RefObject<HTMLSpanElement | null> }) {
  const { value, caret, ins, del } = view
  const cuts = new Set<number>([0, value.length])
  if (ins) {
    cuts.add(Math.min(ins.from, value.length))
    cuts.add(Math.min(ins.to, value.length))
  }
  if (caret >= 0) cuts.add(Math.min(caret, value.length))
  if (del) cuts.add(Math.min(del.at, value.length))
  const points = [...cuts].sort((a, b) => a - b)
  const out: React.ReactNode[] = []
  for (let i = 0; i < points.length; i++) {
    const at = points[i]!
    if (del && del.at === at) out.push(<Leaving key={`d${del.key}`} text={del.text} />)
    if (caret === at) out.push(<span key={`m${at}`} ref={marker} className="inline-block w-0 align-baseline" style={{ height: "1.15em", verticalAlign: "-0.2em" }} />)
    const next = points[i + 1]
    if (next === undefined || next <= at) continue
    const text = value.slice(at, next)
    const fresh = ins && at >= ins.from && next <= ins.to
    out.push(fresh ? <Typed key={`t${ins!.key}-${at}`} text={text} /> : <span key={`s${at}`}>{text}</span>)
  }
  // an empty last line in a textarea still has a height
  if (value.endsWith("\n")) out.push(<span key="nl">{"​"}</span>)
  return <>{out}</>
}

/** A typed run: each character rises in from --nk-type-in-distance, a key-stagger apart; a paste rises as one. */
function Typed({ text }: { text: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const ripple = text.length <= RIPPLE_MAX
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== "function") return
    const time = tokenMs("--nk-type-in-time", TYPE_IN_MS)
    const stagger = Math.min(tokenMs("--nk-stagger", STAGGER_MS), 30)
    const frames = [
      { opacity: 0, transform: `translateY(${distanceOf()})` },
      { opacity: 1, transform: "translateY(0)" },
    ]
    const targets = ripple ? Array.from(el.children as HTMLCollectionOf<HTMLElement>) : [el]
    const runs = targets.map((t, i) => t.animate(frames, { duration: ripple ? time : time * 1.5, delay: ripple ? i * stagger : 0, easing: EASE_OUT, fill: "backwards" }))
    return () => runs.forEach((a) => a.cancel())
  }, [text, ripple])
  // inline-block so the transform applies; pre keeps typed spaces
  return (
    <span ref={ref} className="inline-block whitespace-pre-wrap">
      {ripple ? [...text].map((ch, i) => <span key={i} className="inline-block whitespace-pre">{ch}</span>) : text}
    </span>
  )
}

/** What was deleted: it drops out and fades over --nk-type-out-time, taking no width (the line closes at once). */
function Leaving({ text }: { text: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== "function") return
    const a = el.animate(
      [
        { opacity: 0.8, transform: "translateY(0)" },
        { opacity: 0, transform: `translateY(${distanceOf()})` },
      ],
      { duration: tokenMs("--nk-type-out-time", TYPE_OUT_MS), easing: EASE_IN, fill: "forwards" }
    )
    return () => a.cancel()
  }, [text])
  return (
    <span ref={ref} aria-hidden className="pointer-events-none inline-block w-0 overflow-visible whitespace-pre align-baseline text-muted-foreground" style={{ opacity: 0 }}>
      {text}
    </span>
  )
}

function assign<T>(ref: React.Ref<T> | undefined, el: T | null) {
  if (typeof ref === "function") ref(el)
  else if (ref) (ref as React.RefObject<T | null>).current = el
}

function SmoothInput({ className, ref, ...props }: React.ComponentProps<typeof Input>) {
  const { field, overlay, fieldClass } = useSmoothField<HTMLInputElement>(false)
  return (
    <span data-slot="smooth-input" className="relative flex w-full min-w-0">
      <Input
        ref={(el) => {
          field.current = el
          assign(ref, el)
        }}
        className={cn(className, fieldClass)}
        {...props}
      />
      {overlay}
    </span>
  )
}

function SmoothTextarea({ className, ref, ...props }: React.ComponentProps<typeof Textarea>) {
  const { field, overlay, fieldClass } = useSmoothField<HTMLTextAreaElement>(true)
  return (
    <span data-slot="smooth-textarea" className="relative flex w-full min-w-0">
      <Textarea
        ref={(el) => {
          field.current = el
          assign(ref, el)
        }}
        className={cn(className, fieldClass)}
        {...props}
      />
      {overlay}
    </span>
  )
}

export { SmoothInput, SmoothTextarea }
