// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/radial-menu.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { ArrowLeftIcon, XIcon } from "lucide-react"

import { cn, nkState } from "@/lib/utils"

/**
 * RadialMenu — the action wheel (the `radial` intent, docs/architecture.md §2). shadcn has no
 * radial primitive, so the wedges are SVG, styled like shadcn's menus: popover surface, border
 * hairlines, `accent` on the highlighted wedge. Items can open a submenu; the centre shows what
 * the highlighted item does, and is a button: Back inside a submenu, Close at the root when
 * `onClose` is given (as ox_lib's wheel does; without it the root centre is a label).
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
 * The lit wedge is ONE element (the list's selection tile, in a circle): a wedge-shaped face drawn once and turned
 * to the pointed item by `rotate()` on the ladder (`--nk-indicator-time`, `--nk-indicator-ease`), the short way
 * round, so the highlight travels with the pointer or the arrows instead of jumping wedge to wedge. Reduced motion
 * and motion off jump (kit.css nk-indicator). The items never paint a fill of their own.
 *
 * Pointer: the angle from the centre picks a wedge (the middle is a dead zone); click selects.
 * Keyboard (the wheel is focusable; keys only while it has focus): arrows rotate, Enter / Space
 * select, 1–9 pick directly, Backspace goes back (and closes at the root when `onClose` is given).
 * Escape is left to the surface (`onBack` on an `escape: 'back'` surface can call the wheel's
 * back through `ref`, or close it).
 *
 * `size` is the diameter in px at 1080p; it's laid out in rem, so it follows the NUI scale.
 *
 * Role: The action wheel.
 * Anatomy: radial-menu > wedges > radial-menu-indicator (the lit wedge, one, turning) > radial-menu-item (icon, label) > centre
 * Props: items, active, size, label, onSelect, onClose.
 * Rules: Items draw data-state: focus (the pointed wedge), disabled. One lit wedge per wheel, turned by transform
 *   (never a fill per wedge). Sub-menus open in place; Escape goes back a level.
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

/** What the centre button does: back in a submenu, close at the root when the wheel can close, else nothing. */
function radialCenterAction(depth: number, canClose: boolean): "back" | "close" | null {
  if (depth > 0) return "back"
  return canClose ? "close" : null
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

/** The unwound angle the lit wedge turns to: from `deg` to `target` (mod 360) the short way round. */
function radialTurn(deg: number, target: number) {
  let delta = (((target - deg) % 360) + 360) % 360
  if (delta > 180) delta -= 360
  return deg + delta
}

/** SVG path of a ring wedge between radii r0 and r1, angles a0 → a1 (radians). */
function wedgePath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${p(r1, a0)} A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`
}

const VB = 100 // viewBox units: radius 50
/** Turn about the wheel's centre as translate-rotate-translate in user units: no transform-box or origin needed (CEF 103 safe). */
function radialSpin(deg: number) {
  const c = VB / 2
  return `translate(${c}px, ${c}px) rotate(${deg}deg) translate(${-c}px, ${-c}px)`
}
const INNER = 0.42 // inner radius as a share of the outer

const RadialMenu = React.forwardRef<
  RadialMenuHandle,
  Omit<React.ComponentProps<"div">, "onSelect" | "ref"> & {
    items: RadialMenuItem[]
    onSelect: (item: RadialMenuItem, path: RadialMenuItem[]) => void
    /** The centre closes the wheel at the root (a submenu's centre still goes up a level). */
    onClose?: () => void
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
  { className, items, onSelect, onClose, label = "Select", size = 320, defaultActive, showLabels, style, onKeyDown, ...props },
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
  const centre = radialCenterAction(path.length, !!onClose)
  const onCentre = () => {
    if (centre === "back") back()
    else if (centre === "close") onClose?.()
  }

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

  // the lit wedge: one path at item 0's place, turned to the active item the short way round (an unwound angle,
  // so 7 → 0 on an 8-wheel is +45°, not −315°); it fades where it is when nothing is lit and when the level changes
  const lit = React.useRef<SVGPathElement>(null)
  const turn = React.useRef({ deg: 0, level })
  React.useLayoutEffect(() => {
    const el = lit.current
    if (!el) return
    const t = turn.current
    const fresh = t.level !== level
    t.level = level
    if (active === null) {
      el.style.opacity = "0"
      return
    }
    const target = (active * 360) / n
    t.deg = fresh ? target : radialTurn(t.deg, target)
    if (fresh || el.style.opacity === "0") {
      // appearing: no glide from a stale place
      el.style.transition = "none"
      el.style.transform = radialSpin(t.deg)
      void el.getBoundingClientRect()
      el.style.transition = ""
    } else el.style.transform = radialSpin(t.deg)
    el.style.opacity = ""
  }, [active, n, level])

  return (
    <div
      ref={root}
      role="menu"
      aria-label={path.length ? path[path.length - 1]!.label : label}
      aria-activedescendant={current ? `radial-${current.id}` : undefined}
      tabIndex={0}
      data-slot="radial-menu"
      data-depth={path.length}
      className={cn(
        // nuikit-ignore-next-line radius/pill: the radial menu is a circle (its wedges and centre are round by geometry)
        "relative rounded-full text-popover-foreground outline-none select-none",
        className
      )}
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
          if (!centre) return
          onCentre()
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
              className={cn("fill-(--nk-panel-bg) stroke-(--nk-panel-border)", item.disabled && "opacity-50")}
              onClick={() => choose(i)}
            />
          )
        })}
        {level.length > 0 && (
          <path
            ref={lit}
            data-slot="radial-menu-indicator"
            aria-hidden
            d={wedgePath(r, r, inner, r - 0.3, (-0.5 / n) * Math.PI * 2 - Math.PI / 2 + gap, (0.5 / n) * Math.PI * 2 - Math.PI / 2 - gap)}
            strokeWidth={0.3}
            className="nk-indicator fill-(--nk-sel-face) stroke-(--nk-sel-face)"
            style={{ position: "static", transformOrigin: "0 0", transform: radialSpin(0), opacity: 0 }}
          />
        )}
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
            data-state={nkState({ disabled: item.disabled, focus: on })}
            className={cn(
              "pointer-events-none absolute flex w-[22%] flex-col items-center gap-1 text-center [&_svg:not([class*='size-'])]:size-5",
              on ? "text-(--nk-sel-ink)" : "text-muted-foreground",
              item.disabled && "opacity-50"
            )}
            // transform, not Tailwind's translate-*: the individual `translate` property is Chromium 104+.
            style={{ left: `${50 + Math.cos(a) * d}%`, top: `${50 + Math.sin(a) * d}%`, transform: "translate(-50%, -50%)" }}
          >
            {item.icon}
            {labels && <span className={cn("w-full truncate text-(length:--nk-text-label) leading-4 [font-weight:var(--nk-type-label-weight,500)]", !on && "text-popover-foreground/80")}>{item.label}</span>}
            {item.items?.length ? <span aria-hidden className="size-1 rounded-(--nk-r-key) bg-current opacity-60" /> : null}
          </div>
        )
      })}
      <button
        type="button"
        tabIndex={-1}
        data-slot="radial-menu-center"
        aria-label={centre === "back" ? "Back" : centre === "close" ? "Close" : undefined}
        data-action={centre ?? undefined}
        onClick={onCentre}
        className={cn(
          // nuikit-ignore-next-line radius/pill: the round centre of the circle
          "absolute top-1/2 left-1/2 grid aspect-square w-[34%] place-items-center rounded-full border border-(--nk-panel-border) bg-(--nk-panel-bg) p-2 text-center text-(--nk-panel-fg) [box-shadow:var(--nk-panel-edge),var(--nk-panel-shadow)]",
          centre ? "cursor-pointer hover:bg-accent hover:text-accent-foreground" : "pointer-events-none"
        )}
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <span className="flex min-w-0 flex-col items-center gap-(--nk-space-1)">
          {!current && centre === "back" && <ArrowLeftIcon className="size-4 text-muted-foreground" />}
          {!current && centre === "close" && <XIcon className="size-4 text-muted-foreground" />}
          <span className="w-full truncate text-(length:--nk-text-label) leading-5 [font-weight:var(--nk-weight-strong,600)]">
            {current?.label ?? (path.length ? path[path.length - 1]!.label : label)}
          </span>
          <span className="w-full truncate text-(length:--nk-text-label) leading-4 text-muted-foreground">
            {current
              ? current.disabled
                ? "Not available"
                : (current.description ?? (current.items?.length ? `${current.items.length} more` : "Select to use"))
              : centre === "back"
                ? "Back"
                : centre === "close"
                  ? "Close"
                  : `${level.length} actions`}
          </span>
        </span>
      </button>
    </div>
  )
})

export { RadialMenu, radialCenterAction, radialIndex, radialSpin, radialStep, radialTurn, wedgePath, type RadialMenuItem, type RadialMenuHandle }
