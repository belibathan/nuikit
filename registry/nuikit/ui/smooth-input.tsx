"use client"

import * as React from "react"
import { motionLevel } from "nuikit-core/motion"

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
 * (same font, padding and scroll), with the new characters fading up and a caret element that moves
 * by transform. While an IME composes, while there is a selection range (the field draws its own
 * highlight then), and whenever motion is off or reduced (`html[data-nk-motion]`, the
 * OS setting), it is the plain native field: nothing is drawn over it.
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

/** Longer insertions (a paste) fade in as one block; short ones per keystroke. */
const TYPE_MS = 140
const CARET_MS = 90

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
  const [view, setView] = React.useState<View>({ value: "", caret: 0, ins: null, focused: false, composing: false })

  // read the field into the view; diff the value to find what was typed
  const sync = React.useCallback(() => {
    const el = field.current
    if (!el) return
    setView((v) => {
      const value = el.value
      const a = el.selectionStart ?? value.length
      const b = el.selectionEnd ?? a
      let ins = v.ins
      if (value !== v.value) {
        let p = 0
        while (p < value.length && p < v.value.length && value[p] === v.value[p]) p++
        let s = 0
        while (s < value.length - p && s < v.value.length - p && value[value.length - 1 - s] === v.value[v.value.length - 1 - s]) s++
        const to = value.length - s
        ins = to > p ? { from: p, to, key: ++seq.current } : null
      }
      const next = { ...v, value, caret: a === b ? a : -1, ins, focused: document.activeElement === el }
      return next.value === v.value && next.caret === v.caret && next.ins === v.ins && next.focused === v.focused ? v : next
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
    c.style.transform = `translate(${x}px, ${y}px)`
    c.style.opacity = ""
    // typing or moving restarts the breath, so the caret is solid while it moves
    c.getAnimations?.().forEach((a) => a.cancel())
    if (typeof c.animate === "function")
      c.animate([{ opacity: 1 }, { opacity: 1, offset: 0.45 }, { opacity: 0.15, offset: 0.7 }, { opacity: 1 }], { duration: 1100, delay: 500, iterations: Infinity, easing: "ease-in-out" })
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
          className="absolute top-0 left-0 w-0.5 rounded-full bg-primary"
          style={{ transition: `transform ${CARET_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`, opacity: 0 }}
        />
      </div>
    </div>
  )

  // while drawn, the field's own glyphs and caret go transparent (its selection highlight stays)
  const fieldClass = drawn ? "[caret-color:transparent] [-webkit-text-fill-color:transparent] placeholder:[-webkit-text-fill-color:var(--muted-foreground)]" : undefined
  return { field, overlay, fieldClass }
}

/** The text as spans: before, the new characters (fading up once), after, with the caret marker. */
function Mirrored({ view, marker }: { view: View; marker: React.RefObject<HTMLSpanElement | null> }) {
  const { value, caret, ins } = view
  const cuts = new Set<number>([0, value.length])
  if (ins) {
    cuts.add(Math.min(ins.from, value.length))
    cuts.add(Math.min(ins.to, value.length))
  }
  if (caret >= 0) cuts.add(Math.min(caret, value.length))
  const points = [...cuts].sort((a, b) => a - b)
  const out: React.ReactNode[] = []
  for (let i = 0; i < points.length; i++) {
    const at = points[i]!
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

function Typed({ text }: { text: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof el.animate !== "function") return
    const a = el.animate(
      [
        { opacity: 0, transform: "translateY(0.25em)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: text.length > 12 ? TYPE_MS * 1.5 : TYPE_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    )
    return () => a.cancel()
  }, [text])
  // inline-block so the transform applies; pre keeps typed spaces
  return (
    <span ref={ref} className="inline-block whitespace-pre-wrap">
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
