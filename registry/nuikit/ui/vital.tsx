import * as React from "react"

import { cn } from "@/lib/utils"
import { Meter, type MeterTone } from "@/components/ui/meter"

/**
 * Vital — a player stat (health, armor, hunger…) as an icon and a bar: a preset of Meter, kept so old imports
 * keep working. `value` is 0–100, `tone` picks the theme token (health, armor, hunger, thirst and stress use the
 * --vital-* tokens), and at or under `low` it is the Meter's alert (destructive, the icon blinks).
 *
 *   <Vital value={health} tone="health" icon={<HeartIcon />} label="Health" />
 *   → <Meter value={health} tone="health" icon={<HeartIcon />} aria-label="Health" low={20} className="w-32" />
 *
 * @deprecated Use `<Meter>` from `@/components/ui/meter` (the same bar, with labels, segments and runs).
 *   Removed in 0.10.0.
 *
 * Role: A player stat as an icon and a bar: an alias of Meter.
 * Anatomy: Meter (icon > bar)
 * Props: value, icon, label, low, tone, size.
 * Level means: value / 100: how full the stat is.
 * Rules: Use Meter. At or under low it is data-state="alert". Colours from the vital tokens, never a literal.
 */
type VitalTone = "default" | Exclude<MeterTone, "primary" | "foreground" | "success" | "warning" | "info">

function Vital({
  className,
  tone = "default",
  size = "default",
  value,
  icon,
  label,
  low = 20,
  ...props
}: Omit<React.ComponentProps<typeof Meter>, "tone" | "size" | "value" | "low"> & {
  /** 0–100 */
  value: number
  icon?: React.ReactNode
  /** Accessible name, e.g. "Health". */
  label?: string
  /** At or below this it is the alert. -1 disables. */
  low?: number
  tone?: VitalTone | null
  size?: "default" | "sm" | null
}) {
  return (
    <Meter
      value={value}
      icon={icon}
      aria-label={label}
      low={low >= 0 ? low : undefined}
      tone={!tone || tone === "default" ? "primary" : tone}
      className={cn(size === "sm" ? "w-20" : "w-32", className)}
      {...props}
    />
  )
}

/** @deprecated Vital's old class recipe; Meter draws it now. Returns its width class. */
function vitalVariants({ size }: { tone?: VitalTone | null; size?: "default" | "sm" | null } = {}) {
  return size === "sm" ? "w-20" : "w-32"
}

export { Vital, vitalVariants }
