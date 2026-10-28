"use client"

import * as React from "react"
import { motionLevel, token, tokenMs } from "nuikit-core/motion"

import { cn, nkLevel } from "@/lib/utils"
import { NumberRoll } from "@/components/ui/text-roll"
import { CollapseMore } from "@/components/ui/collapse-stack"
import { Glyph } from "@/components/ui/glyph"
import { useCollapse, type UseCollapseOptions } from "@/hooks/use-collapse"

/**
 * VitalChip: the HUD's status chip as composable parts (shadcn-style). One anatomy under every theme: the keycap
 * (docs/design.md). A theme flattens or reshapes it with levers (--nk-control-face-skew, --nk-control-wall-height, radius
 * levers), never by swapping parts.
 *
 *   <VitalChip.Root value={hunger} tone="hunger">
 *     <VitalChip.Shape>
 *       <VitalChip.Icon><UtensilsIcon /></VitalChip.Icon>
 *       <VitalChip.Label>Hunger</VitalChip.Label>
 *     </VitalChip.Shape>
 *     <VitalChip.Pop label="Hunger" />
 *   </VitalChip.Root>
 *
 * Anatomy: tile (the kit Glyph as the face), icon, label (name, value), value, plate (slides out from behind the
 * face; the label sits on it), fill (the liquid rising inside the face, --level, scaleY, with a surface line and a
 * copy of the icon in the fill's ink), track (clips the plate), wall (the base, dropped by --nk-vital-chip-plate-drop).
 * `active` (the mic while talking) lights the face. Its room in a Row is measured once per open and FLIPped,
 * never per frame.
 *
 * Pop: a flag out of the chip's side on a change ("Hunger +25"), in line with the row, merged while it shows,
 * gone after ~1.5 s.
 *
 * Theme tokens choose the defaults: --nk-style-vital-icon (vital: the icon in the vital's colour; uniform: the chip's
 * ink), --nk-style-vital, --nk-style-vital-neighbours. Props win over tokens. Transform and opacity only for motion;
 * Chromium 103.
 *
 * Role: One vital on the HUD: health, armor, hunger, thirst, stress.
 * Props: value, tone, icon, open, active, alert, display, neighbours, format, max, side.
 * Level means: the vital, 0-100 as 0-1.
 * Rules: data-hue carries the vital's role (health, armor...). display: pill (icon, name, value) | value |
 *   icon (level as fill) | expand (opens on a change, settles after --nk-behavior-rest). neighbours (a chip that
 *   opens, in a Row): push | collapse | overlay. expand chips in a VitalChip.Row open through the row's collapse
 *   engine (useCollapse): batched, ordered, capped at max with +N.
 */

export type IconMode = "vital" | "uniform"
/**
 * What the chip shows (the owner's HUD customization): pill = icon + label + value; value = icon + value;
 * icon = the icon alone, the level as fill; expand = the icon, which opens to the pill when the value
 * changes and settles back after --nk-behavior-rest (2.5 s when that is 0). auto: the label shows while
 * the Root is open (the parts as composed).
 */
export type ChipDisplay = "auto" | "pill" | "value" | "icon" | "expand"
/**
 * How a chip that opens (voice while talking, an expand) treats the chips beside it in a VitalChip.Row:
 * push = they make way (its label takes room in the row); collapse = they close to their icons while
 * it's open; overlay = they never move (its label floats over them).
 */
export type ChipNeighbours = "push" | "collapse" | "overlay"

const DISPLAYS: ChipDisplay[] = ["auto", "pill", "value", "icon", "expand"]
const NEIGHBOURS: ChipNeighbours[] = ["push", "collapse", "overlay"]

export interface ChipStyle {
  icon: IconMode
  display: ChipDisplay
  neighbours: ChipNeighbours
}
const DEFAULT_STYLE: ChipStyle = { icon: "uniform", display: "auto", neighbours: "push" }

function pickOf<T extends string>(list: readonly T[], v: string, d: T): T {
  const s = v.trim().replace(/["']/g, "") as T
  return list.includes(s) ? s : d
}

/** The theme's chip style from the computed tokens (defaults: today's look). */
function readChipStyle(get: (name: string) => string): ChipStyle {
  return {
    icon: pickOf(["vital", "uniform"] as const, get("--nk-style-vital-icon"), DEFAULT_STYLE.icon),
    display: pickOf(DISPLAYS, get("--nk-style-vital"), DEFAULT_STYLE.display),
    neighbours: pickOf(NEIGHBOURS, get("--nk-style-vital-neighbours"), DEFAULT_STYLE.neighbours),
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

/**
 * FLIP for a row of chips: run `mutate` (a chip taking or giving room), then slide every other chip from where it
 * was. Layout is read twice per change (before, after), never per frame; the row's width itself never animates
 * (transform and opacity only).
 */
function flipRow(row: Element | null, mutate: () => void) {
  if (!row || motionLevel(row) === "off") return mutate()
  const kids = Array.from(row.children) as HTMLElement[]
  const before = kids.map((k) => (k.dataset.gone !== undefined ? null : k.getBoundingClientRect().left))
  mutate()
  const after = kids.map((k) => (k.dataset.gone !== undefined ? null : k.getBoundingClientRect().left))
  kids.forEach((k, i) => {
    const a = before[i]
    const b = after[i]
    if (a == null || b == null || Math.abs(a - b) < 0.5) return
    k.animate([{ transform: `translateX(${(a - b).toFixed(1)}px)` }, { transform: "translateX(0)" }], { duration: tokenMs("--nk-time-slow", 300) || 300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", composite: "add" })
  })
}

// ───────────────────────────────── parts

interface Ctx {
  value?: number
  tone?: string
  style: ChipStyle
  open: boolean
  /** the label floats over the row (neighbours: overlay) */
  float: boolean
  /** what the label says besides its children: the value, formatted */
  valueText: React.ReactNode | null
  /** value: the label is the value alone */
  valueOnly: boolean
  active: boolean
  alert: boolean
  side?: "left" | "right"
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

/** --nk-behavior-alert (tokens 1.4: 0.2): a vital at or under it is critical. */
function alertThreshold() {
  const n = parseFloat(token("--nk-behavior-alert"))
  return Number.isFinite(n) ? n : 0.2
}
function useChip() {
  const c = React.useContext(ChipCtx)
  if (!c) throw new Error("VitalChip parts go inside <VitalChip.Root>")
  return c
}

/** expand: true from a change of the value until --nk-behavior-rest (2.5 s when 0) after the last one. */
function useExpand(value: number | undefined) {
  const [on, setOn] = React.useState(false)
  const last = React.useRef(value)
  React.useEffect(() => {
    if (value === undefined || last.current === value) return
    const first = last.current === undefined
    last.current = value
    if (first) return
    setOn(true)
    const t = setTimeout(() => setOn(false), tokenMs("--nk-behavior-rest", 0) || 2500)
    return () => clearTimeout(t)
  }, [value])
  return on
}

type RootProps = React.ComponentProps<"div"> & {
  /** 0–100; leave out for a chip without a level (voice, radio) */
  value?: number
  /** the vital: its --vital-<tone> colours the level (and the icon unless uniform) */
  tone?: string
  icon?: IconMode
  /** the label shows (inline / tag / flag; the keycap's plate slides out) */
  open?: boolean
  /** on (the mic while talking, N on a compass): the keycap's face lights white, the icon turns to the dark ink */
  active?: boolean
  /** past its threshold: the alert state (danger rim, breathing, the level in the danger colour); default: value at or under --nk-behavior-alert */
  alert?: boolean
  /** which way the keycap's plate slides out: away from the corner it is anchored to. Default: an ancestor's data-corner, else right. */
  side?: "left" | "right"
  /** what it shows: pill, value, icon, expand (see ChipDisplay); default the theme's --nk-style-vital */
  display?: ChipDisplay
  /** when it opens, what the chips beside it in a Row do (see ChipNeighbours) */
  neighbours?: ChipNeighbours
  /** the value as text (pill, value, expand); default the rounded number */
  format?: (value: number) => React.ReactNode
}

function Root({ ref, value, tone, icon, open = false, active, alert, side, display, neighbours, format, className, style, children, ...props }: RootProps) {
  const theme = useChipStyle()
  const mode = display ?? theme.display
  const chip: ChipStyle = {
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
  const critical = alert ?? (value !== undefined && value <= alertThreshold() * 100)
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
  return (
    <ChipCtx.Provider value={{ value, tone, style: chip, open: isOpen, float: chip.neighbours === "overlay", valueText, valueOnly: mode === "value", active: !!active, alert: critical, side }}>
      <div
        ref={ref}
        data-slot="vital-chip"
        data-hue={tone}
        data-shape="keycap"
        data-level="fill"
        data-icon={chip.icon}
        data-open={isOpen || undefined}
        data-active={active || undefined}
        data-state={critical ? "alert" : undefined}
        data-side={side}
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

/** The chip's body: the keycap. */
function Shape({ className, children, ...props }: React.ComponentProps<"span">) {
  return <Keycap className={className} {...props}>{children}</Keycap>
}

/** The in-game keycap: the kit's Glyph face over a sliding plate, the liquid inside the face, the label on the plate. */
function Keycap({ className, children, ...props }: React.ComponentProps<"span">) {
  const { value, open, active, alert, side: sideProp, style, valueText, valueOnly } = useChip()
  const root = React.useRef<HTMLSpanElement>(null)
  const text = React.useRef<HTMLSpanElement>(null)
  const [side, setSide] = React.useState<"left" | "right">(sideProp ?? "right")
  const v = value === undefined ? undefined : Math.max(0, Math.min(1, value / 100))
  const level = v
  // the plate reads the name and the value ("HEALTH 100") whenever there is a value
  const plateValue = valueText ?? (value === undefined ? null : Math.round(value))
  // the plate slides away from the corner the row is anchored to (an ancestor's data-corner), read once per mount
  React.useLayoutEffect(() => {
    if (sideProp) return setSide(sideProp)
    const corner = root.current?.closest<HTMLElement>("[data-corner]")?.dataset.corner
    setSide(corner?.endsWith("right") ? "left" : "right")
  }, [sideProp])
  React.useLayoutEffect(() => {
    root.current?.parentElement?.setAttribute("data-side", side)
  }, [side])
  // the label is measured once per open / close or label change, never per frame (and again once the display
  // font has loaded, since a label measured before it is too narrow)
  const measure = React.useCallback(() => {
    const t = root.current
    const l = text.current
    if (!t || !l) return
    const w = l.offsetWidth
    t.style.setProperty("--nk-vital-chip-tag", `${w}px`)
    // push: the chip takes the plate's room in the row (its margin), its neighbours sliding aside (Row FLIPs it)
    const chip = t.parentElement
    if (!chip || style.neighbours !== "push") return
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const room = t.hasAttribute("data-open") ? `${(w + rem).toFixed(1)}px` : "0px"
    if (chip.style.getPropertyValue("--nk-vital-chip-room") !== room) flipRow(chip.parentElement, () => chip.style.setProperty("--nk-vital-chip-room", room))
  }, [style.neighbours])
  React.useLayoutEffect(measure, [measure, open, children, valueText])
  React.useLayoutEffect(() => {
    let live = true
    void document.fonts?.ready.then(() => live && measure())
    // a theme's own fonts load after the page's: measure again when they arrive
    const again = () => live && measure()
    document.fonts?.addEventListener?.("loadingdone", again)
    return () => {
      live = false
      document.fonts?.removeEventListener?.("loadingdone", again)
    }
  }, [measure])
  // the icon (and an inline label, which the keycap draws on its plate instead)
  const icon = React.Children.toArray(children).filter((c) => !(React.isValidElement(c) && c.type === Label))
  return (
    <span
      ref={root}
      data-slot="vital-chip-shape"
      data-shape="keycap"
      data-open={open || undefined}
      data-active={active || undefined}
      data-state={alert ? "alert" : undefined}
      data-side={side}
      data-level={level === undefined ? undefined : ""}
      className={cn("relative block shrink-0 text-(--nk-control-face-ink)", className)}
      {...props}
    >
      {/* the base: the tile's own wall, always there, dropped straight down by --nk-vital-chip-plate-drop */}
      <span aria-hidden data-slot="vital-chip-wall" />
      {/* the track clips the plate from the face's centre outwards; the plate slides out on open */}
      <span aria-hidden data-slot="vital-chip-track">
        <span data-slot="vital-chip-plate" />
      </span>
      <Glyph aria-hidden data-slot="glyph" data-part="vital-chip-face" size="md" shape="square" state={alert ? "alert" : undefined} active={active}>
        <span data-slot="vital-chip-level" style={level === undefined ? undefined : ({ "--level": level.toFixed(3) } as React.CSSProperties)}>
          {level !== undefined && <span data-slot="vital-chip-liquid" />}
          {level !== undefined && <span data-slot="vital-chip-line" />}
          <span data-slot="vital-chip-lit" />
        </span>
        {icon}
      </Glyph>
      <span ref={text} data-slot="vital-chip-label" data-attach="plate" data-open={open || undefined} className="nk-scan">
        {valueOnly ? (
          <span className="nk-num">{plateValue}</span>
        ) : (
          <>
            <KeycapName>{children}</KeycapName>
            {plateValue !== null && <span className="nk-num">{plateValue}</span>}
          </>
        )}
      </span>
    </span>
  )
}

/** The Label children of a keycap (its name), written on the plate. */
function KeycapName({ children }: { children: React.ReactNode }) {
  const names = React.Children.toArray(children).filter((c) => React.isValidElement(c) && c.type === Label) as React.ReactElement<{ children?: React.ReactNode }>[]
  if (!names.length) return null
  return <span data-slot="vital-chip-name">{names[0]!.props.children}</span>
}

/** Kept for API symmetry: the level is drawn by Shape from the Root's value and style. */
function Level() {
  return null
}

/**
 * The icon, centred on the shape: in the vital's colour, or the chip's ink when the theme says uniform. Over a
 * solid liquid fill it stays legible: a second copy in the fill's ink (--nk-level-fill-ink) is clipped to the part
 * under the surface (kit.css shows it for a fill level under the solid fill style).
 */
function Icon({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span data-slot="vital-chip-icon" className={cn("relative flex items-center justify-center", className)} {...props}>
      {children}
      {/* over a solid fill the icon keeps its contrast: a copy in the fill's ink, clipped to the part under the level */}
      <span data-slot="vital-chip-icon-ink" aria-hidden>
        {children}
      </span>
    </span>
  )
}

/**
 * The chip's text (voice range, radio channel, a vital's name). Put it inside Shape: the keycap reads its children
 * as the name and writes it, with the value, on its plate. It draws nothing itself.
 */
function Label(_props: React.ComponentProps<"span">) {
  return null
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
        "pointer-events-none relative z-0 data-[open]:-ml-(--nk-vital-chip-pop-overlap) flex h-[calc(var(--nk-vital-chip-size)*0.8)] max-w-0 items-center gap-(--nk-space-2) self-center overflow-hidden rounded-r-(--nk-chip-radius) bg-(--nk-chip-bg) text-(length:--nk-text-label) leading-none [font-weight:var(--nk-type-weight-strong)] whitespace-nowrap text-(--nk-chip-fg) opacity-0",
        "-translate-x-1 transition-[opacity,transform] duration-[calc(var(--nk-time-slow)*var(--nk-motion))] ease-(--nk-ease-enter) data-[open]:max-w-(--nk-vital-chip-pop-max-width) data-[open]:translate-x-0 data-[open]:pr-(--nk-space-3) data-[open]:pl-(--nk-vital-chip-pop-pad) data-[open]:opacity-100"
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

/** A letter on the face (a gear, a compass mark), in the scan voice. */
function Letter({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="vital-chip-glyph" className={cn("nk-scan", className)} {...props} />
}

const VitalChip = { Root, Row, Shape, Level, Icon, Label, Pop, Letter }

export { VitalChip }
