import * as React from "react"

import { cn } from "@/lib/utils"
import { toneVars } from "@/components/ui/fill"

/**
 * Chip — a short status on one line (docs/design/ink.md §3): --nk-h-chip tall, --nk-r-chip corners (never a
 * pill), the label role, an --nk-icon-md icon. kit.css draws it on `data-slot="chip"`; a theme sets tokens.
 *
 *   <Chip icon={<BadgeCheckIcon />} tone="success">On duty</Chip>
 *   <Chip hue="legendary" fill="tint">Legendary</Chip>
 *   <Chip count={3}>Items</Chip>
 *   <Chip variant="dot" tone="success" aria-label="Online" />
 *
 * `tone` is meaning (neutral | info | success | warning | danger), `hue` a role; `fill` is hair (a rim, the
 * default), tint or solid. `variant="dot"` is a square of --nk-space-2 at --nk-r-key: the status dot.
 *
 * Role: A tag, a count, a status dot: one chip.
 * Anatomy: icon > label > count
 * Props: tone, hue, fill, icon, count, variant.
 * Rules: No pills: r-chip, or the dot at r-key. Colour means something: tone or hue only.
 */
function Chip({
  className,
  tone,
  hue,
  fill = "hair",
  icon,
  count,
  variant = "chip",
  children,
  ...props
}: React.ComponentProps<"span"> & {
  tone?: "neutral" | "info" | "success" | "warning" | "danger" | "destructive" | "error"
  hue?: string
  fill?: "hair" | "tint" | "solid"
  icon?: React.ReactNode
  /** A number after the label (tabular). */
  count?: React.ReactNode
  variant?: "chip" | "dot"
}) {
  const dot = variant === "dot"
  return (
    <span
      data-slot="chip"
      data-variant={dot ? "dot" : undefined}
      data-fill={fill === "hair" ? undefined : fill}
      {...toneVars({ tone: tone === "neutral" ? undefined : tone, hue })}
      role={dot && props["aria-label"] ? "img" : undefined}
      className={cn(className)}
      {...props}
    >
      {!dot && icon}
      {!dot && children}
      {!dot && count !== undefined && <span data-slot="chip-count">{count}</span>}
    </span>
  )
}

export { Chip }
