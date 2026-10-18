"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * RadialMenu — the action wheel. shadcn has no radial primitive, so this one is SVG,
 * styled exactly like shadcn's menus: popover surface, border, `accent` on the
 * highlighted wedge. Mouse angle or arrow keys pick; click / Enter confirms.
 *
 *   <RadialMenu items={[{ id: "phone", label: "Phone", icon: <PhoneIcon /> }, …]} onSelect={run} />
 */
type RadialMenuItem = {
  id: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

function RadialMenu({
  className,
  items,
  onSelect,
  size = 320,
  style,
  ...props
}: Omit<React.ComponentProps<"div">, "onSelect"> & {
  items: RadialMenuItem[]
  onSelect: (item: RadialMenuItem) => void
  /** Diameter in px. */
  size?: number
}) {
  const [active, setActive] = React.useState<number | null>(null)
  const ref = React.useRef<HTMLDivElement>(null)
  const n = Math.max(items.length, 1)
  const r = size / 2
  const inner = r * 0.42
  const gap = 0.012

  const onPointerMove = (e: React.PointerEvent) => {
    const box = ref.current!.getBoundingClientRect()
    const x = e.clientX - box.left - r
    const y = e.clientY - box.top - r
    if (Math.hypot(x, y) < inner * 0.6) return setActive(null)
    const angle = (Math.atan2(y, x) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)
    const i = Math.floor((angle / (Math.PI * 2)) * n + 0.5) % n
    setActive(items[i]?.disabled ? null : i)
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setActive((a) => ((a ?? -1) + 1) % n)
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") setActive((a) => ((a ?? 0) - 1 + n) % n)
      else if (e.key === "Enter" && active !== null && items[active] && !items[active]!.disabled) onSelect(items[active]!)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active, items, n, onSelect])

  const current = active !== null ? items[active] : null

  return (
    <div
      ref={ref}
      data-slot="radial-menu"
      className={cn("relative select-none text-popover-foreground", className)}
      style={{ width: size, height: size, ...style }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setActive(null)}
      onClick={() => current && !current.disabled && onSelect(current)}
      {...props}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 overflow-visible">
        {items.map((item, i) => {
          const a0 = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2 + gap
          const a1 = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2 - gap
          return (
            <path
              key={item.id}
              data-slot="radial-menu-item"
              data-selected={i === active || undefined}
              d={wedge(r, r, inner, r - 1, a0, a1)}
              className={cn(
                "fill-popover stroke-border transition-colors data-[selected]:fill-accent",
                item.disabled && "opacity-50"
              )}
              strokeWidth={1}
            />
          )
        })}
      </svg>
      {items.map((item, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2
        const d = (inner + r) / 2
        return (
          <div
            key={item.id}
            className={cn(
              "pointer-events-none absolute grid size-10 place-items-center [&_svg:not([class*='size-'])]:size-5",
              i === active ? "text-accent-foreground" : "text-muted-foreground"
            )}
            style={{ left: r + Math.cos(a) * d - 20, top: r + Math.sin(a) * d - 20 }}
          >
            {item.icon}
          </div>
        )
      })}
      <div
        className="absolute grid place-items-center rounded-full border bg-popover text-center shadow-md"
        style={{ left: r - inner * 0.82, top: r - inner * 0.82, width: inner * 1.64, height: inner * 1.64 }}
      >
        <div className="px-2">
          <div className="text-sm font-medium">{current?.label ?? "Select"}</div>
          <div className="text-xs text-muted-foreground">{current ? "Click to use" : `${items.length} actions`}</div>
        </div>
      </div>
    </div>
  )
}

function wedge(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => `${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M ${p(r1, a0)} A ${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`
}

export { RadialMenu, type RadialMenuItem }
