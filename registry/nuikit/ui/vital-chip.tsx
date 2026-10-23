"use client"

import * as React from "react"
import { token, tokenMs } from "nuikit-core/motion"

import { cn, nkLevel } from "@/lib/utils"
import { NumberRoll } from "@/components/ui/text-roll"
import { CollapseMore } from "@/components/ui/collapse-stack"
import { useCollapse, type UseCollapseOptions } from "@/hooks/use-collapse"

/**
 * VitalChip — the HUD's status chip as composable parts (shadcn-style), so a theme (or a player) can vary
 * the shape, how the level shows, and how a label attaches, without new components:
 *
 *   <VitalChip.Root value={hunger} tone="hunger" shape="diamond" level="fill" attach="tag">
 *     <VitalChip.Shape>
 *       <VitalChip.Level />
 *       <VitalChip.Icon><UtensilsIcon /></VitalChip.Icon>
 *     </VitalChip.Shape>
 *     <VitalChip.Label>Hunger</VitalChip.Label>
 *     <VitalChip.Pop label="Hunger" />
 *   </VitalChip.Root>
 *
 * One SVG path per shape is the single source of truth, generated for the chip's measured size: the
 * chip's surface, its outline, the level trace, the liquid's container (clip) and the label anchors all
 * come from it. Shapes: auto (the identity's chip: --nk-chip-radius and the --nk-chip-clip chamfer, the
 * default look) | square | rounded | circle | diamond | hex | chamfer.
 * Levels: outline (traced along the edge, clockwise from the top) | fill (liquid rising inside the shape,
 * with a surface line) | bar | none. Label attach: inline (grows sideways, rect shapes only; others use
 * flag) | tag (a banner hanging beneath, like a crest's ribbon) | flag (sticks out to the side) | none.
 * Pop: a flag out of the chip's side on a change ("Hunger +25"), in line with the row (so pops of several
 * vitals never overlap), merged while it shows, gone after ~1.5 s.
 *
 * Theme tokens choose the defaults: --nk-chip-shape, --nk-level-style, --nk-label-attach and
 * --nk-vital-icon (vital: the icon in the vital's colour; uniform: the chip's ink, the level carries
 * the colour). Props win over tokens. Transform and opacity only for motion; Chromium 103.
 *
 * Role: One vital on the HUD: health, armor, hunger, thirst, stress.
 * Anatomy: vital-chip-row (optional: chips that know each other) > vital-chip (shape) > icon > level drawing
 *   (outline | liquid | bar) > label (name, value) > pop (a change)
 * Props: value, tone, shape, level, attach, icon, open, display, neighbours, format, max.
 * Level means: the vital, 0–100 as 0–1.
 * Rules: data-hue carries the vital's role (health, armor…). The level style comes from the theme (outline,
 *   liquid, bar); the data never picks it. Readable over a bright sky (legibility fixture). display: pill
 *   (icon, name, value) | value | icon (level as fill) | expand (opens on a change, settles after
 *   --nk-rest-delay); the theme default is --nk-vital-display. neighbours (a chip that opens, in a Row): push |
 *   collapse | overlay; the theme default is --nk-vital-neighbours. expand chips in a VitalChip.Row open
 *   through the row's collapse engine (useCollapse): batched, ordered, capped at max with +N.
 */

export type ChipShape = "auto" | "square" | "rounded" | "circle" | "diamond" | "hex" | "chamfer"
export type LevelStyle = "outline" | "fill" | "bar" | "none"
export type LabelAttach = "inline" | "tag" | "flag" | "none"
export type IconMode = "vital" | "uniform"
/**
 * What the chip shows (the owner's HUD customization): pill = icon + label + value; value = icon + value;
 * icon = the icon alone, the level as fill; expand = the icon, which opens to the pill when the value
 * changes and settles back after --nk-rest-delay (2.5 s when that is 0). auto: the label shows while
 * the Root is open (the parts as composed).
 */
export type ChipDisplay = "auto" | "pill" | "value" | "icon" | "expand"
/**
 * How a chip that opens (voice while talking, an expand) treats the chips beside it in a VitalChip.Row:
 * push = they make way (its label takes room in the row); collapse = they close to their icons while
 * it's open; overlay = they never move (its label floats over them).
 */
export type ChipNeighbours = "push" | "collapse" | "overlay"

const SHAPES: ChipShape[] = ["auto", "square", "rounded", "circle", "diamond", "hex", "chamfer"]
const LEVELS: LevelStyle[] = ["outline", "fill", "bar", "none"]
const ATTACH: LabelAttach[] = ["inline", "tag", "flag", "none"]
/** tokens 1.4's --nk-level-style names, as the chip's drawings */
const LEVEL_14: Record<string, LevelStyle> = { ring: "outline", liquid: "fill", bar: "bar", slab: "bar", pips: "bar" }
const DISPLAYS: ChipDisplay[] = ["auto", "pill", "value", "icon", "expand"]
const NEIGHBOURS: ChipNeighbours[] = ["push", "collapse", "overlay"]

export interface ChipStyle {
  shape: ChipShape
  level: LevelStyle
  attach: LabelAttach
  icon: IconMode
  display: ChipDisplay
  neighbours: ChipNeighbours
}
const DEFAULT_STYLE: ChipStyle = { shape: "auto", level: "outline", attach: "inline", icon: "vital", display: "auto", neighbours: "push" }

function pickOf<T extends string>(list: readonly T[], v: string, d: T): T {
  const s = v.trim().replace(/["']/g, "") as T
  return list.includes(s) ? s : d
}

/** The theme's chip style from the computed tokens (defaults: today's look). */
function readChipStyle(get: (name: string) => string): ChipStyle {
  return {
    shape: pickOf(SHAPES, get("--nk-chip-shape"), DEFAULT_STYLE.shape),
    level: pickOf(LEVELS, LEVEL_14[get("--nk-level-style").trim()] ?? get("--nk-level-style"), DEFAULT_STYLE.level),
    attach: pickOf(ATTACH, get("--nk-label-attach"), DEFAULT_STYLE.attach),
    icon: pickOf(["vital", "uniform"] as const, get("--nk-vital-icon"), DEFAULT_STYLE.icon),
    display: pickOf(DISPLAYS, get("--nk-vital-display"), DEFAULT_STYLE.display),
    neighbours: pickOf(NEIGHBOURS, get("--nk-vital-neighbours"), DEFAULT_STYLE.neighbours),
  }
}

/** The chip style tokens, live: re-read when <html>'s style or class changes (a theme, a player override). */
// One store for every chip: <html>'s style is read once per change (coalesced to a frame), not once per chip.
let chipStyle: ChipStyle = DEFAULT_STYLE
const chipListeners = new Set<() => void>()
let chipObserver: MutationObserver | null = null
let chipPending = false
function readChipStyleNow() {
  const cs = getComputedStyle(document.documentElement)
  const next = readChipStyle((n) => cs.getPropertyValue(n))
  if ((Object.keys(next) as (keyof ChipStyle)[]).every((k) => chipStyle[k] === next[k])) return
  chipStyle = next
  chipListeners.forEach((l) => l())
}
function subscribeChipStyle(listener: () => void) {
  chipListeners.add(listener)
  if (!chipObserver && typeof MutationObserver !== "undefined") {
    readChipStyleNow()
    chipObserver = new MutationObserver(() => {
      if (chipPending) return
      chipPending = true
      requestAnimationFrame(() => {
        chipPending = false
        readChipStyleNow()
      })
    })
    chipObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] })
  }
  return () => {
    chipListeners.delete(listener)
    if (!chipListeners.size) {
      chipObserver?.disconnect()
      chipObserver = null
    }
  }
}

function useChipStyle(): ChipStyle {
  return React.useSyncExternalStore(subscribeChipStyle, () => chipStyle, () => DEFAULT_STYLE)
}

// ───────────────────────────────── geometry: one path per shape

export interface Geometry {
  w: number
  h: number
  /** auto / rounded: the corner radius (px) */
  r: number
  /** auto / chamfer: the cut at top-left and bottom-right (px) */
  cut: number
  /** the root font size (px) when measured: read with the geometry, never during a render */
  rem?: number
}

const f = (n: number) => (Math.round(n * 100) / 100).toString()

function polygon(points: [number, number][], start: [number, number]): string {
  // start at the top centre, clockwise: the level trace fills from twelve o'clock
  const parts = [`M ${f(start[0])} ${f(start[1])}`]
  for (const [x, y] of points) parts.push(`L ${f(x)} ${f(y)}`)
  parts.push("Z")
  return parts.join(" ")
}

/**
 * The shape's outline, inset by `inset` px (half a stroke), starting at the top centre and running
 * clockwise. The single source for the surface, the border, the trace, the liquid clip and anchors.
 */
function shapePath(shape: ChipShape, g: Geometry, inset = 0): string {
  const d = inset
  const x0 = d
  const y0 = d
  const x1 = g.w - d
  const y1 = g.h - d
  const iw = x1 - x0
  const ih = y1 - y0
  if (iw <= 0 || ih <= 0) return ""
  const cx = x0 + iw / 2
  const cy = y0 + ih / 2
  switch (shape) {
    case "diamond":
      return polygon([[x1, cy], [cx, y1], [x0, cy], [cx, y0]], [cx, y0])
    case "hex": {
      const k = iw * 0.25
      return polygon([[x1 - k, y0], [x1, cy], [x1 - k, y1], [x0 + k, y1], [x0, cy], [x0 + k, y0], [cx, y0]], [cx, y0])
    }
    case "circle": {
      const rx = iw / 2
      const ry = ih / 2
      return `M ${f(cx)} ${f(y0)} A ${f(rx)} ${f(ry)} 0 1 1 ${f(cx)} ${f(y1)} A ${f(rx)} ${f(ry)} 0 1 1 ${f(cx)} ${f(y0)} Z`
    }
    case "square":
      return rounded(x0, y0, x1, y1, 0, 0)
    case "rounded":
      return rounded(x0, y0, x1, y1, Math.max(0, Math.min(g.r || 0.25 * Math.min(g.w, g.h), iw / 2, ih / 2) - d), 0)
    case "chamfer":
      return rounded(x0, y0, x1, y1, 0, Math.max(0, (g.cut || 0.3 * Math.min(g.w, g.h)) - d * (2 - Math.SQRT2)))
    default:
      return rounded(x0, y0, x1, y1, Math.max(0, Math.min(g.r - d, iw / 2, ih / 2)), g.cut > 0 ? Math.max(0, g.cut - d * (2 - Math.SQRT2)) : 0)
  }
}

/** A rect with rounded corners and, when cut, chamfers at top-left and bottom-right (the kit's clip). */
function rounded(x0: number, y0: number, x1: number, y1: number, rr: number, cut: number): string {
  const iw = x1 - x0
  const ih = y1 - y0
  const cc = Math.min(cut, iw / 2, ih / 2)
  const mid = x0 + iw / 2
  const arc = (x: number, y: number) => `A ${f(rr)} ${f(rr)} 0 0 1 ${f(x)} ${f(y)}`
  const p = [`M ${f(mid)} ${f(y0)}`, `L ${f(x1 - rr)} ${f(y0)}`]
  if (rr > 0) p.push(arc(x1, y0 + rr))
  if (cc > 0) p.push(`L ${f(x1)} ${f(y1 - cc)}`, `L ${f(x1 - cc)} ${f(y1)}`)
  else {
    p.push(`L ${f(x1)} ${f(y1 - rr)}`)
    if (rr > 0) p.push(arc(x1 - rr, y1))
  }
  p.push(`L ${f(x0 + rr)} ${f(y1)}`)
  if (rr > 0) p.push(arc(x0, y1 - rr))
  if (cc > 0) p.push(`L ${f(x0)} ${f(y0 + cc)}`, `L ${f(x0 + cc)} ${f(y0)}`)
  else {
    p.push(`L ${f(x0)} ${f(y0 + rr)}`)
    if (rr > 0) p.push(arc(x0 + rr, y0))
  }
  p.push("Z")
  return p.join(" ")
}

// ───────────────────────────────── parts

interface Ctx {
  value?: number
  tone?: string
  style: ChipStyle
  geo: Geometry | null
  setGeo: React.Dispatch<React.SetStateAction<Geometry | null>>
  open: boolean
  /** the label floats over the row (neighbours: overlay) */
  float: boolean
  /** what the label says besides its children: the value, formatted */
  valueText: React.ReactNode | null
  /** value: the label is the value alone */
  valueOnly: boolean
  wide: boolean
  setWide: (w: boolean) => void
}
const ChipCtx = React.createContext<Ctx | null>(null)

/** A row of chips: which chip (if any) has claimed the room (neighbours: collapse). */
const RowCtx = React.createContext<{
  claim: string | null
  take: (id: string) => void
  give: (id: string) => void
  /** the row's collapse engine: expand chips open and close through it */
  collapse: ReturnType<typeof useCollapse>
} | null>(null)

/**
 * A row of chips that know about each other. A chip that opens with neighbours="collapse" closes the rest.
 * Chips with display="expand" open through the row's collapse engine (useCollapse): changes within the batch
 * window open together and close together, open chips lead the row (critical first, then the biggest
 * change), at most `max` (default 3), then "+N".
 */
function Row({ className, children, max, batchMs, restDelay, optOut, ...props }: React.ComponentProps<"div"> & UseCollapseOptions) {
  const [claim, setClaim] = React.useState<string | null>(null)
  const collapse = useCollapse({ max, batchMs, restDelay, optOut })
  const api = React.useMemo(
    () => ({ claim, take: (id: string) => setClaim(id), give: (id: string) => setClaim((c) => (c === id ? null : c)), collapse }),
    [claim, collapse]
  )
  return (
    <RowCtx.Provider value={api}>
      <div data-slot="vital-chip-row" className={cn("flex items-center gap-(--nk-space-2)", className)} {...props}>
        {children}
        {collapse.overflow > 0 && <CollapseMore count={collapse.overflow} style={{ order: -50 }} />}
      </div>
    </RowCtx.Provider>
  )
}

/** --nk-alert-threshold (tokens 1.4: 0.2): a vital at or under it is critical. */
function alertThreshold() {
  const n = parseFloat(token("--nk-alert-threshold"))
  return Number.isFinite(n) ? n : 0.2
}
/** true inside Shape: an inline Label renders there, a tag or flag outside it */
const InShape = React.createContext(false)
function useChip() {
  const c = React.useContext(ChipCtx)
  if (!c) throw new Error("VitalChip parts go inside <VitalChip.Root>")
  return c
}

/** A label that grows sideways needs a rect; other shapes use a flag instead. */
function effectiveAttach(style: ChipStyle): LabelAttach {
  const rect = style.shape === "auto" || style.shape === "square" || style.shape === "rounded" || style.shape === "chamfer"
  return style.attach === "inline" && !rect ? "flag" : style.attach
}

/** expand: true from a change of the value until --nk-rest-delay (2.5 s when 0) after the last one. */
function useExpand(value: number | undefined) {
  const [on, setOn] = React.useState(false)
  const last = React.useRef(value)
  React.useEffect(() => {
    if (value === undefined || last.current === value) return
    const first = last.current === undefined
    last.current = value
    if (first) return
    setOn(true)
    const t = setTimeout(() => setOn(false), tokenMs("--nk-rest-delay", 0) || 2500)
    return () => clearTimeout(t)
  }, [value])
  return on
}

type RootProps = React.ComponentProps<"div"> & {
  /** 0–100; leave out for a chip without a level (voice, radio) */
  value?: number
  /** the vital: its --vital-<tone> colours the level (and the icon unless uniform) */
  tone?: string
  shape?: ChipShape
  level?: LevelStyle
  attach?: LabelAttach
  icon?: IconMode
  /** the label shows (inline / tag / flag) */
  open?: boolean
  /** what it shows: pill, value, icon, expand (see ChipDisplay); default the theme's --nk-vital-display */
  display?: ChipDisplay
  /** when it opens, what the chips beside it in a Row do (see ChipNeighbours) */
  neighbours?: ChipNeighbours
  /** the value as text (pill, value, expand); default the rounded number */
  format?: (value: number) => React.ReactNode
}

function Root({ value, tone, shape, level, attach, icon, open = false, display, neighbours, format, className, style, children, ...props }: RootProps) {
  const theme = useChipStyle()
  const mode = display ?? theme.display
  const chip: ChipStyle = {
    shape: shape ?? theme.shape,
    // icon only: the level shows as the fill
    level: level ?? (mode === "icon" ? "fill" : theme.level),
    attach: attach ?? theme.attach,
    icon: icon ?? theme.icon,
    display: mode,
    neighbours: neighbours ?? theme.neighbours,
  }
  const row = React.useContext(RowCtx)
  const id = React.useId()
  // expand: in a Row through its collapse engine (batched, ordered, capped), alone on its own timer
  const engine = row && mode === "expand" ? row.collapse : null
  const key = tone ?? id
  const ownExpanded = useExpand(mode === "expand" && !engine ? value : undefined)
  const report = engine?.report
  const critical = value !== undefined && value <= alertThreshold() * 100
  React.useEffect(() => {
    if (report && value !== undefined) report(key, value, { critical })
  }, [report, key, value, critical])
  const rank = engine ? engine.rank(key) : -1
  const expanded = engine ? rank >= 0 : ownExpanded
  const own = open || mode === "pill" || mode === "value" || (mode === "expand" && expanded)
  // in a Row: a chip that opens with neighbours="collapse" takes the room; the others close meanwhile
  const claiming = own && chip.neighbours === "collapse"
  const take = row?.take
  const give = row?.give
  React.useEffect(() => {
    if (claiming) take?.(id)
    else give?.(id)
  }, [claiming, id, take, give])
  React.useEffect(() => () => give?.(id), [give, id])
  const yielded = !!row?.claim && row.claim !== id
  const isOpen = own && !yielded
  const shown = mode === "pill" || mode === "value" || mode === "expand"
  const valueText = shown && value !== undefined ? (format ? format(value) : Math.round(value)) : null
  const [geo, setGeo] = React.useState<Geometry | null>(null)
  const [wide, setWide] = React.useState(false)
  const at = effectiveAttach(chip)
  return (
    <ChipCtx.Provider value={{ value, tone, style: chip, geo, setGeo, open: isOpen, float: chip.neighbours === "overlay", valueText, valueOnly: mode === "value", wide, setWide }}>
      <div
        data-slot="vital-chip"
        data-hue={tone}
        data-shape={chip.shape}
        data-level={chip.level}
        data-attach={at}
        data-icon={chip.icon}
        data-open={isOpen || undefined}
        data-display={mode}
        data-neighbours={chip.neighbours}
        data-yielded={yielded || undefined}
        // overlay: an open chip's floating label sits above the chips after it
        className={cn("relative isolate inline-flex shrink-0", isOpen && chip.neighbours === "overlay" && "z-10", className)}
        style={{ ...(rank >= 0 ? { order: rank - 100 } : null), ...nkLevel(value === undefined ? undefined : value / 100), ...(tone ? ({ "--vital": `var(--hue-solid, var(--vital-${tone}))` } as React.CSSProperties) : null), ...style }}
        {...props}
      >
        {children}
      </div>
    </ChipCtx.Provider>
  )
}

const STROKE_1080 = 2.5

/**
 * The chip's body: sized by --vital-size (default 1.875rem; inline labels widen it), drawn as one SVG
 * from the shape path: surface, level, outline. Its children (Icon, an inline Label) sit on top.
 */
function Shape({ className, children, ...props }: React.ComponentProps<"span">) {
  const { style, setGeo, geo, value, open } = useChip()
  const face = React.useRef<HTMLSpanElement>(null)
  const probe = React.useRef<HTMLSpanElement>(null)
  const inline = effectiveAttach(style) === "inline"

  React.useLayoutEffect(() => {
    const el = face.current
    if (!el) return
    const measure = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (!w || !h) return setGeo(null)
      const p = probe.current
      let r = 0
      let cut = 0
      if (p) {
        const cs = getComputedStyle(p)
        r = Math.min(parseFloat(cs.borderTopRightRadius) || 0, w / 2, h / 2)
        if (cs.clipPath && cs.clipPath !== "none") cut = p.getBoundingClientRect().width
      }
      // the rem with it: reading it in every render forced a style recalc each time a value changed
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      setGeo((g) => (g && g.w === w && g.h === h && g.r === r && g.cut === cut && g.rem === rem ? g : { w, h, r, cut, rem }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    let pending = false
    const mo = new MutationObserver(() => {
      if (pending) return
      pending = true
      requestAnimationFrame(() => {
        pending = false
        measure()
      })
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [setGeo])

  const id = React.useId().replace(/:/g, "")
  const rem = geo?.rem ?? 16
  const sw = (STROKE_1080 * rem) / 16
  const shape = style.shape
  const body = geo ? shapePath(shape, geo, 0) : ""
  const edge = geo ? shapePath(shape, geo, sw / 2) : ""
  const v = value === undefined ? undefined : Math.max(0, Math.min(100, value))
  const level = v === undefined ? "none" : style.level

  return (
    <span
      ref={face}
      data-slot="vital-chip-shape"
      className={cn(
        "relative z-[1] inline-flex items-center justify-center whitespace-nowrap text-(--nk-chip-fg)",
        inline ? "min-w-(--vital-size) px-[calc((var(--vital-size)-var(--vital-icon-size))/2)]" : "w-(--vital-size)",
        "h-(--vital-size)",
        className
      )}
      {...props}
    >
      {/* the identity's chip radius and clip, measured for the auto shape */}
      <span
        ref={probe}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 h-0 rounded-(--nk-chip-radius) [clip-path:var(--nk-chip-clip,none)]"
        style={{ width: "calc(var(--nk-cut, 0px) / 2)" }}
      />
      {/* --nk-skew: the whole drawing (surface, border, level) is skewed together, so the trace stays on the
          edge; the icon and label stay upright */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible [transform:skewX(var(--nk-skew,0deg))]" viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : "0 0 1 1"}>
        {geo && (
          <>
            <defs>
              <clipPath id={`vc-${id}`}>
                <path d={body} />
              </clipPath>
            </defs>
            {/* the surface */}
            <path d={body} style={{ fill: "var(--nk-chip-bg)" }} />
            {/* the active fill (talking, selected): rises from the bottom inside the shape; a parent marks it
                active with [data-active] and styles [data-slot=vital-chip-activefill] */}
            <g clipPath={`url(#vc-${id})`}>
              <rect data-slot="vital-chip-activefill" x={0} y={0} width={geo.w} height={geo.h} style={{ fill: "var(--nk-chip-active-fill, transparent)" }} />
            </g>
            {/* liquid: rises inside the shape, a brighter line on its surface */}
            {level === "fill" && (
              <g clipPath={`url(#vc-${id})`}>
                {/* levels snap to the value: an SVG element's transform isn't composited, so a transition here costs
                    style, layout and paint on the main thread every frame (the HUD ticks; it never stops) */}
                <g style={{ transform: `translateY(${((1 - v! / 100) * geo.h).toFixed(2)}px)` }}>
                  <rect x={0} y={0} width={geo.w} height={geo.h} style={{ fill: "var(--vital, var(--primary))", opacity: 0.42 }} />
                  <rect x={0} y={0} width={geo.w} height={Math.max(1, sw * 0.6)} style={{ fill: "var(--vital, var(--primary))", opacity: 0.95 }} />
                </g>
              </g>
            )}
            {level === "bar" && (
              <g clipPath={`url(#vc-${id})`}>
                <rect x={0} y={geo.h - sw * 1.4} width={geo.w} height={sw * 1.4} style={{ fill: "var(--nk-chip-track, rgba(var(--hud-foreground-rgb, 255, 255, 255), 0.16))" }} />
                <rect
                  x={0}
                  y={geo.h - sw * 1.4}
                  width={geo.w}
                  height={sw * 1.4}
                  style={{ fill: "var(--vital, var(--primary))", transformOrigin: "0 0", transform: `scaleX(${(v! / 100).toFixed(3)})` }}
                />
              </g>
            )}
            {/* the border, and the level traced along it */}
            <path d={edge} strokeWidth={sw} strokeLinejoin="round" style={{ fill: "none", stroke: "var(--nk-chip-track, rgba(var(--hud-foreground-rgb, 255, 255, 255), 0.16))" }} />
            {level === "outline" && v! > 0 && (
              <path
                d={edge}
                strokeWidth={sw}
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={100}
                // full: a plain closed stroke (its corners joined), no dash, so start and end meet with no gap
                strokeDasharray={v! >= 99.5 ? undefined : `${v} 100`}
                style={{ fill: "none", stroke: "var(--vital, var(--primary))" }}
              />
            )}
          </>
        )}
      </svg>
      <span data-open={open || undefined} className="relative inline-flex items-center">
        <InShape.Provider value={true}>{children}</InShape.Provider>
      </span>
    </span>
  )
}

/** Kept for API symmetry: the level is drawn by Shape from the Root's value and style. */
function Level() {
  return null
}

/** The icon, centred on the shape: in the vital's colour, or the chip's ink when the theme says uniform. */
function Icon({ className, ...props }: React.ComponentProps<"span">) {
  const { style } = useChip()
  return (
    <span
      data-slot="vital-chip-icon"
      className={cn(
        "flex [&_svg]:size-(--vital-icon-size)",
        style.icon === "uniform" ? "text-(--nk-chip-fg)" : "text-(--vital,currentColor)",
        className
      )}
      {...props}
    />
  )
}

/**
 * The chip's text (voice range, radio channel, a vital's name). Put it both inside Shape and after it;
 * the one that fits the attachment renders. Inline: grows sideways inside the chip.
 * Tag: a banner hanging beneath on a short stem. Flag: a rect sticking out to the right, tucked under
 * the chip. Shows while the Root is open.
 */
function Label({ className, children: name, ...props }: React.ComponentProps<"span">) {
  const { style, open, float, valueText, valueOnly } = useChip()
  const inShape = React.useContext(InShape)
  const attached = effectiveAttach(style)
  // overlay: an inline or flag label floats over the row (rendered outside Shape, like a tag)
  const at = float && (attached === "inline" || attached === "flag") ? "float" : attached
  // pill and expand: the name and the value; value: the value alone
  const children =
    valueText === null ? (
      name
    ) : valueOnly ? (
      <span className="nk-num">{valueText}</span>
    ) : (
      <>
        {name}
        <span className="nk-num ml-(--nk-space-2) opacity-80">{valueText}</span>
      </>
    )
  // write it in both places: inside Shape it is the inline label, outside the tag or flag
  if (at === "none" || (at === "inline") !== inShape) return null
  if (at === "inline") {
    return (
      <span
        data-slot="vital-chip-label"
        data-open={open || undefined}
        className={cn(
          "pointer-events-none order-last max-w-0 overflow-hidden text-(length:--nk-text-key) leading-none [font-weight:var(--nk-weight-strong,600)] opacity-0 -translate-x-1 transition-[opacity,transform] duration-[calc(var(--nk-time-slow)*var(--nk-motion,1))] ease-(--nk-ease-out) data-[open]:ml-[0.3125rem] data-[open]:max-w-24 data-[open]:translate-x-0 data-[open]:opacity-100",
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
  if (at === "flag") {
    // a flag sticks out to the side in its own shape, tucked under the chip; it takes its room in the
    // row (opening like an inline label), so neighbours make way instead of being covered
    return (
      <span
        data-slot="vital-chip-label"
        data-attach="flag"
        data-open={open || undefined}
        className={cn(
          "pointer-events-none relative z-0 data-[open]:-ml-[0.375rem] flex h-[calc(var(--vital-size)*0.72)] max-w-0 items-center self-center overflow-hidden rounded-r-(--nk-chip-radius) bg-(--nk-chip-bg) text-(length:--nk-text-key) [font-weight:var(--nk-weight-strong,600)] whitespace-nowrap text-(--nk-chip-fg) opacity-0 -translate-x-1 transition-[opacity,transform] duration-[calc(var(--nk-time-slow)*var(--nk-motion,1))] ease-(--nk-ease-out) data-[open]:max-w-28 data-[open]:translate-x-0 data-[open]:pr-2 data-[open]:pl-[0.625rem] data-[open]:opacity-100",
          className
        )}
        {...props}
      >
        {children}
      </span>
    )
  }
  const tag = at === "tag"
  return (
    <span
      data-slot="vital-chip-label"
      data-attach={at}
      data-open={open || undefined}
      className={cn(
        "pointer-events-none absolute z-0 flex items-center whitespace-nowrap bg-(--nk-chip-bg) text-(--nk-chip-fg) opacity-0 transition-[opacity,transform] duration-[calc(var(--nk-time-slow)*var(--nk-motion,1))] ease-(--nk-ease-out) data-[open]:opacity-100",
        tag
          ? "top-full left-1/2 mt-[0.1875rem] h-4 -translate-x-1/2 -translate-y-1 rounded-(--nk-chip-radius) px-(--nk-space-2) text-(length:--nk-text-key) [font-weight:var(--nk-weight-strong,600)] data-[open]:translate-y-0"
          : "top-1/2 left-[calc(100%-0.375rem)] h-[calc(var(--vital-size)*0.72)] -translate-x-1 -translate-y-1/2 rounded-r-(--nk-chip-radius) pr-2 pl-[0.625rem] text-(length:--nk-text-key) [font-weight:var(--nk-weight-strong,600)] data-[open]:translate-x-0",
        className
      )}
      {...props}
    >
      {/* a tag hangs from the chip on a short stem, like a ribbon under a crest */}
      {tag && <span aria-hidden className="absolute bottom-full left-1/2 h-[0.1875rem] w-px -translate-x-1/2 bg-(--nk-chip-bg)" />}
      {children}
    </span>
  )
}

type PopProps = {
  /** the vital's name ("Hunger") */
  label: string
  /** when it pops: on every change (of at least `min`), only past a threshold, or never */
  mode?: false | "change" | "threshold"
  /** a change smaller than this doesn't pop (regeneration ticks) */
  min?: number
  /** true while the value is past its threshold (for mode 'threshold') */
  critical?: boolean
  /** an extra change to show (a test trigger); bump `nonce` to fire it again */
  force?: { by: number; nonce: number } | null
  /** how long it stays after the last change */
  ms?: number
  /** told while it shows, so the chip can stay visible */
  onShow?: (shown: boolean) => void
}

/**
 * When the value changes, a flag grows out of the chip's side with the vital's name and the signed
 * change, which rolls (NumberRoll) as further changes merge in; it closes ~1.5 s after the last change.
 * In line with the row, so pops of vitals that change together sit side by side.
 */
function Pop({ label, mode = "change", min = 3, critical = false, force = null, ms = 1500, onShow }: PopProps) {
  const { value } = useChip()
  const prev = React.useRef(value)
  const [sum, setSum] = React.useState<number | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = React.useCallback(
    (by: number) => {
      setSum((s) => (s ?? 0) + by)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setSum(null), ms)
    },
    [ms]
  )
  React.useEffect(() => {
    const before = prev.current
    prev.current = value
    if (mode === false || value === undefined || before === undefined) return
    const by = Math.round(value - before)
    if (by === 0 || Math.abs(by) < min) return
    if (mode === "threshold" && !critical) return
    show(by)
  }, [value, mode, min, critical, show])
  React.useEffect(() => {
    if (force) show(force.by)
  }, [force, show])
  React.useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])
  React.useEffect(() => onShow?.(sum !== null), [sum, onShow])

  const shown = sum !== null
  // the last change stays written while the flag closes
  const last = React.useRef(0)
  if (sum !== null) last.current = sum
  const total = sum ?? last.current
  const up = total > 0
  return (
    <span
      role="status"
      data-slot="vital-chip-pop"
      data-open={shown || undefined}
      aria-hidden={!shown}
      className={cn(
        // a flag out of the chip's side, in line with the row: it takes its own room, so pops of
        // vitals that change together sit side by side and can never overlap
        "pointer-events-none relative z-0 data-[open]:-ml-[0.375rem] flex h-[calc(var(--vital-size)*0.8)] max-w-0 items-center gap-(--nk-space-2) self-center overflow-hidden rounded-r-(--nk-chip-radius) bg-(--nk-chip-bg) text-(length:--nk-text-label) leading-none [font-weight:var(--nk-weight-strong,600)] whitespace-nowrap text-(--nk-chip-fg) opacity-0",
        "-translate-x-1 transition-[opacity,transform] duration-[calc(var(--nk-time-slow)*var(--nk-motion,1))] ease-(--nk-ease-out) data-[open]:max-w-48 data-[open]:translate-x-0 data-[open]:pr-(--nk-space-3) data-[open]:pl-[0.75rem] data-[open]:opacity-100"
      )}
    >
      <span>{label}</span>
      <span className={cn("nk-num", up ? "text-(--vital,currentColor)" : "opacity-80")}>
        {up ? "+" : "−"}
        <NumberRoll value={Math.abs(total)} />
      </span>
    </span>
  )
}

const VitalChip = { Root, Row, Shape, Level, Icon, Label, Pop }

export { VitalChip }
