"use client"

import * as React from "react"
import { ArrowLeftIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * RadialMenu — the action wheel (the `radial` intent, docs/architecture.md §2). shadcn has no
 * radial primitive, so the wedges are SVG, styled like shadcn's menus: popover surface, border
 * hairlines, `accent` on the highlighted wedge. Items can open a submenu; the centre shows what
 * the highlighted item does, and becomes Back inside a submenu.
 *
 *   <RadialMenu
 *     label="Actions"
 *     items={[
 *       { id: "phone", label: "Phone", icon: <PhoneIcon /> },
 *       { id: "car", label: "Vehicle", icon: <CarIcon />, items: [{ id: "lock", label: "Lock", icon: <LockIcon /> }, …] },
 *       { id: "emote", label: "Emotes", icon: <SmileIcon />, disabled: true },
 *     ]}
 *     onSelect={run}
 *   />
 *
 * Pointer: the angle from the centre picks a wedge (the middle is a dead zone); click selects.
 * Keyboard (the wheel is focusable; keys only while it has focus): arrows rotate, Enter / Space
 * select, 1–9 pick directly, Backspace goes back. Escape is left to the surface (`onBack` on an
 * `escape: 'back'` surface can call the wheel's back through `ref`, or close it).
 *
 * `size` is the diameter in px at 1080p; it's laid out in rem, so it follows the NUI scale.
 */

type RadialMenuItem = {
  id: string
  label: string
  icon?: React.ReactNode
  /** A quieter line in the centre when highlighted. */
  description?: string
  disabled?: boolean
  /** Opens these instead of selecting. */
  items?: RadialMenuItem[]
}

type RadialMenuHandle = {
  /** Leave the current submenu. Returns false at the top level. */
  back: () => boolean
}

/**
 * Which wedge a point (relative to the centre, y down) is over, for `n` wedges starting at
 * 12 o'clock and going clockwise; null inside the dead zone (`deadZone` × radius).
 */
function radialIndex(x: number, y: number, n: number, radius: number, deadZone = 0.25) {
  if (n <= 0 || Math.hypot(x, y) < radius * deadZone) return null
  const angle = (Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)
  return Math.floor((angle / (Math.PI * 2)) * n + 0.5) % n
}

/** The next enabled index from `from` going `dir` (wrapping); null when none is enabled. */
function radialStep(items: readonly { disabled?: boolean }[], from: number | null, dir: 1 | -1) {
  const n = items.length
  if (!n) return null
  let i = from ?? (dir > 0 ? -1 : 0)
  for (let k = 0; k < n; k++) {
    i = (i + dir + n) % n
    if (!items[i]?.disabled) return i
  }
  return null
}

/** SVG path of a ring wedge between radii r0 and r1, angles a0 → a1 (radians). */
function wedgePath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${p(r1, a0)} A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`
}

const VB = 100 // viewBox units: radius 50
const INNER = 0.42 // inner radius as a share of the outer

const RadialMenu = React.forwardRef<
  RadialMenuHandle,
  Omit<React.ComponentProps<"div">, "onSelect" | "ref"> & {
    items: RadialMenuItem[]
    onSelect: (item: RadialMenuItem, path: RadialMenuItem[]) => void
    /** The centre's title when nothing is highlighted (the menu's name). */
    label?: string
    /** Diameter in px at 1080p (laid out in rem). */
    size?: number
    /** Highlighted on mount (previews, a controller's last choice). */
    defaultActive?: string
    /** Labels inside the wedges (default: when there are 8 items or fewer). */
    showLabels?: boolean
  }
>(function RadialMenu(
  { className, items, onSelect, label = "Select", size = 320, defaultActive, showLabels, style, onKeyDown, ...props },
  ref
) {
  const [path, setPath] = React.useState<RadialMenuItem[]>([])
  const level = path.length ? (path[path.length - 1]!.items ?? []) : items
  const [active, setActive] = React.useState<number | null>(() => {
    const i = items.findIndex((it) => it.id === defaultActive)
    return i >= 0 ? i : null
  })
  const root = React.useRef<HTMLDivElement>(null)
  const n = Math.max(level.length, 1)
  const labels = showLabels ?? level.length <= 8
  const current = active !== null ? level[active] : undefined

  const back = React.useCallback(() => {
    if (!path.length) return false
    const parent = path[path.length - 1]!
    const above = path.length > 1 ? (path[path.length - 2]!.items ?? []) : items
    setPath(path.slice(0, -1))
    setActive(Math.max(0, above.findIndex((it) => it.id === parent.id)))
    return true
  }, [path, items])
  React.useImperativeHandle(ref, () => ({ back }), [back])

  const choose = (i: number | null) => {
    const item = i !== null ? level[i] : undefined
    if (!item || item.disabled) return
    if (item.items?.length) {
      setPath([...path, item])
      setActive(null)
    } else onSelect(item, path)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const box = root.current!.getBoundingClientRect()
    const r = box.width / 2
    const i = radialIndex(e.clientX - box.left - r, e.clientY - box.top - r, level.length, r, INNER * 0.7)
    setActive(i !== null && !level[i]?.disabled ? i : null)
  }

  const r = VB / 2
  const inner = r * INNER
  const gap = 0.012

  return (
    <div
      ref={root}
      role="menu"
      aria-label={path.length ? path[path.length - 1]!.label : label}
      aria-activedescendant={current ? `radial-${current.id}` : undefined}
      tabIndex={0}
      data-slot="radial-menu"
      data-depth={path.length}
      className={cn("relative rounded-full text-popover-foreground outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50", className)}
      style={{ width: `${size / 16}rem`, height: `${size / 16}rem`, ...style }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setActive(null)}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.defaultPrevented) return
        const k = e.key
        if (k === "ArrowRight" || k === "ArrowDown") setActive((a) => radialStep(level, a, 1))
        else if (k === "ArrowLeft" || k === "ArrowUp") setActive((a) => radialStep(level, a, -1))
        else if (k === "Enter" || k === " ") choose(active)
        else if (k === "Backspace") {
          if (!back()) return
        } else if (/^[1-9]$/.test(k) && Number(k) <= level.length) choose(Number(k) - 1)
        else return
        e.preventDefault()
      }}
      {...props}
    >
      <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 size-full overflow-visible nk-shadow" aria-hidden>
        {level.map((item, i) => {
          const a0 = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2 + gap
          const a1 = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2 - gap
          return (
            <path
              key={item.id}
              data-slot="radial-menu-wedge"
              data-active={i === active || undefined}
              d={wedgePath(r, r, inner, r - 0.3, a0, a1)}
              strokeWidth={0.3}
              className={cn("fill-popover stroke-border transition-colors", i === active && "fill-accent", item.disabled && "opacity-50")}
              onClick={() => choose(i)}
            />
          )
        })}
      </svg>
      {level.map((item, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        const d = ((inner + r) / 2 / VB) * 100 // % of the box from the centre
        const on = i === active
        return (
          <div
            key={item.id}
            id={`radial-${item.id}`}
            role="menuitem"
            aria-disabled={item.disabled || undefined}
            aria-haspopup={item.items?.length ? "menu" : undefined}
            data-slot="radial-menu-item"
            data-active={on || undefined}
            className={cn(
              "pointer-events-none absolute flex w-[22%] flex-col items-center gap-1 text-center [&_svg:not([class*='size-'])]:size-5",
              on ? "text-accent-foreground" : "text-muted-foreground",
              item.disabled && "opacity-50"
            )}
            // transform, not Tailwind's translate-*: the individual `translate` property is Chromium 104+.
            style={{ left: `${50 + Math.cos(a) * d}%`, top: `${50 + Math.sin(a) * d}%`, transform: "translate(-50%, -50%)" }}
          >
            {item.icon}
            {labels && <span className={cn("w-full truncate text-xs leading-4 font-medium", !on && "text-popover-foreground/80")}>{item.label}</span>}
            {item.items?.length ? <span aria-hidden className="size-1 rounded-full bg-current opacity-60" /> : null}
          </div>
        )
      })}
      <button
        type="button"
        tabIndex={-1}
        data-slot="radial-menu-center"
        aria-label={path.length ? "Back" : undefined}
        onClick={() => back()}
        className={cn(
          "absolute top-1/2 left-1/2 grid aspect-square w-[34%] place-items-center rounded-full border bg-popover p-2 text-center text-popover-foreground shadow-md",
          path.length ? "cursor-pointer hover:bg-accent hover:text-accent-foreground" : "pointer-events-none"
        )}
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <span className="flex min-w-0 flex-col items-center gap-0.5">
          {path.length > 0 && !current && <ArrowLeftIcon className="size-4 text-muted-foreground" />}
          <span className="w-full truncate text-sm leading-5 font-semibold">
            {current?.label ?? (path.length ? path[path.length - 1]!.label : label)}
          </span>
          <span className="w-full truncate text-xs leading-4 text-muted-foreground">
            {current
              ? current.disabled
                ? "Not available"
                : (current.description ?? (current.items?.length ? `${current.items.length} more` : "Select to use"))
              : path.length
                ? "Back"
                : `${level.length} actions`}
          </span>
        </span>
      </button>
    </div>
  )
})

export { RadialMenu, radialIndex, radialStep, wedgePath, type RadialMenuItem, type RadialMenuHandle }
