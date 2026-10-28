import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowDownRightIcon, ArrowUpRightIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Text, textVariants, type TextSize } from "@/components/ui/text"

/**
 * Stat — a label over a number that matters: cash, bank, players online, a fine, a timer.
 * Tabular figures in the identity's numeric face (nk-text-num); the label is a caption (nk-text-caption: the
 * identity's label case and tracking). Three sizes on the kit's type scale: sm (the body size),
 * md (the HUD value size, 18px+, the default) and display (nk-text-display: the number is the point).
 *
 *   <Stat icon={<WalletIcon />} label="Cash" value="$1,520" />
 *   <Stat label="Players online" value={42} meta="/ 128" size="sm" />
 *   <Stat label="Balance" value="$48,210" delta="-$250" trend="down" size="display" />
 *
 * `surface="game"` is for bare text on the game world (the HUD): white with a soft shadow, since
 * theme text can vanish over a bright sky.
 *
 * Role: A label over a number that matters: cash, players, a timer.
 * Anatomy: stat > label (caption, optional icon) > value (Text, num role) > meta > delta (trend tone)
 * Props: size, align, surface, label, value, icon, meta, delta, trend.
 * Rules: Numbers are tabular (num role); the label is a caption. Trend colours mean direction only (success up,
 *   destructive down).
 */
const statVariants = cva("flex min-w-0 flex-col", {
  variants: {
    size: {
      sm: "gap-(--nk-space-1)",
      md: "gap-[var(--nk-stat-gap)]",
      display: "gap-[var(--nk-stat-gap)]",
    },
    align: {
      start: "items-start text-left",
      end: "items-end text-right",
    },
    surface: {
      panel: "",
      game: "nk-on-game",
    },
  },
  defaultVariants: {
    size: "md",
    align: "start",
    surface: "panel",
  },
})

const STAT_VALUE = "flex min-w-0 items-baseline gap-(--nk-space-2)"

/** The value's classes: Text in the num role on the value ladder (sm, md, display), baseline-aligned with its meta. */
function statValueVariants({ size = "md" }: { size?: Exclude<TextSize, "inherit"> | null } = {}) {
  return cn(textVariants({ variant: "num", size: size ?? "md" }), STAT_VALUE)
}

function Stat({
  className,
  size,
  align,
  surface,
  label,
  value,
  icon,
  meta,
  delta,
  trend,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof statVariants> & {
    label: React.ReactNode
    value: React.ReactNode
    /** 14px icon before the label. */
    icon?: React.ReactNode
    /** Quiet text after the value: "/ 128", "kg", "per hour". */
    meta?: React.ReactNode
    /** A change: "+$500", "-3". Colour comes from `trend`. */
    delta?: React.ReactNode
    /** down = destructive; up = an up arrow, no colour (colour carries meaning, not mood). */
    trend?: "up" | "down"
  }) {
  const game = surface === "game"
  return (
    <div data-slot="stat" className={cn(statVariants({ size, align, surface }), className)} {...props}>
      <span
        data-slot="stat-label"
        className={cn(
          "nk-text-caption flex min-w-0 items-center gap-(--nk-space-2) [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[var(--nk-stat-label-icon)]",
          game && "text-world-foreground-muted",
          align === "end" && "flex-row-reverse"
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <Text variant="num" size={size ?? "md"} data-slot="stat-value" className={cn(STAT_VALUE, align === "end" && "justify-end")}>
        <span className="truncate">{value}</span>
        {meta !== undefined && (
          <span
            data-slot="stat-meta"
            className={cn(
              "shrink-0 text-(length:--nk-text-label) [font-weight:var(--nk-type-label-weight)]",
              "text-muted-foreground",
              size === "display" && "text-(length:--nk-text-label)"
            )}
          >
            {meta}
          </span>
        )}
      </Text>
      {delta !== undefined && (
        <span
          data-slot="stat-delta"
          data-trend={trend}
          className={cn(
            "nk-text-num flex items-center gap-[var(--nk-stat-gap)] text-(length:--nk-text-label) [font-weight:var(--nk-type-label-weight)] [&_svg]:size-[var(--nk-stat-label-icon)]",
            trend === "down" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {trend === "up" && <ArrowUpRightIcon aria-hidden />}
          {trend === "down" && <ArrowDownRightIcon aria-hidden />}
          {delta}
        </span>
      )}
    </div>
  )
}

export { Stat, statVariants, statValueVariants }
