import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Stat — a label over a number that matters: cash, bank, players online, a fine, a timer.
 * Tabular figures in the identity's numeric face (nk-num); the label is a caption (nk-caption: the
 * identity's label case and tracking). Three sizes on the kit's type scale: sm (the body size),
 * md (the HUD value size, 18px+, the default) and display (nk-display: the number is the point).
 *
 *   <Stat icon={<WalletIcon />} label="Cash" value="$1,520" />
 *   <Stat label="Players online" value={42} meta="/ 128" size="sm" />
 *   <Stat label="Balance" value="$48,210" delta="-$250" trend="down" size="display" />
 *
 * `surface="game"` is for bare text on the game world (the HUD): white with a soft shadow, since
 * theme text can vanish over a bright sky.
 *
 * Role: A label over a number that matters: cash, players, a timer.
 * Anatomy: stat > label (caption, optional icon) > value (num role) > meta > delta (trend tone)
 * Props: size, align, surface, label, value, icon, meta, delta, trend.
 * Rules: Numbers are tabular (num role); the label is a caption. Trend colours mean direction only (success up,
 *   destructive down).
 */
const statVariants = cva("flex min-w-0 flex-col", {
  variants: {
    size: {
      sm: "gap-(--nk-space-1)",
      md: "gap-1",
      display: "gap-1",
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

const statValueVariants = cva("nk-num flex min-w-0 items-baseline gap-(--nk-space-2)", {
  variants: {
    size: {
      sm: "text-(length:--nk-text-base) leading-5 [font-weight:var(--nk-weight-strong,600)]",
      md: "text-(length:--nk-hud-value-size) leading-7 [font-weight:var(--nk-weight-strong,600)]",
      // display type in the numeric face (nk-display sets the heading font; numbers keep theirs)
      display: "nk-display [font-family:var(--nk-num-font)]!",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

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
          "nk-caption flex min-w-0 items-center gap-(--nk-space-2) [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
          game && "text-world-foreground-muted",
          align === "end" && "flex-row-reverse"
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span data-slot="stat-value" className={cn(statValueVariants({ size }), align === "end" && "justify-end")}>
        <span className="truncate">{value}</span>
        {meta !== undefined && (
          <span
            data-slot="stat-meta"
            className={cn(
              "shrink-0 text-(length:--nk-text-label) [font-weight:var(--nk-type-label-weight,500)]",
              "text-muted-foreground",
              size === "display" && "text-(length:--nk-text-label)"
            )}
          >
            {meta}
          </span>
        )}
      </span>
      {delta !== undefined && (
        <span
          data-slot="stat-delta"
          data-trend={trend}
          className={cn(
            "nk-num flex items-center gap-1 text-(length:--nk-text-label) [font-weight:var(--nk-type-label-weight,500)] [&_svg]:size-3.5",
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
