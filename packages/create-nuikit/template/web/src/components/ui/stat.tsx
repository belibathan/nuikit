import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Stat — a label over a number that matters: cash, bank, players online, a fine, a timer.
 * Tabular figures (nk-num); the label is sentence case (nk-label). Three sizes on the kit's type
 * scale: sm (14px), md (20px, the default) and display (32px, the number is the point).
 *
 *   <Stat icon={<WalletIcon />} label="Cash" value="$1,520" />
 *   <Stat label="Players online" value={42} meta="/ 128" size="sm" />
 *   <Stat label="Balance" value="$48,210" delta="-$250" trend="down" size="display" />
 *
 * `surface="game"` is for bare text on the game world (the HUD): white with a soft shadow, since
 * theme text can vanish over a bright sky.
 */
const statVariants = cva("flex min-w-0 flex-col", {
  variants: {
    size: {
      sm: "gap-0.5",
      md: "gap-1",
      display: "gap-1",
    },
    align: {
      start: "items-start text-left",
      end: "items-end text-right",
    },
    surface: {
      panel: "",
      game: "nk-shadow text-white",
    },
  },
  defaultVariants: {
    size: "md",
    align: "start",
    surface: "panel",
  },
})

const statValueVariants = cva("nk-num flex min-w-0 items-baseline gap-1.5", {
  variants: {
    size: {
      sm: "text-sm leading-5 font-semibold",
      md: "text-xl leading-7 font-semibold",
      display: "nk-display",
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
          "nk-label flex min-w-0 items-center gap-1.5 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
          game && "text-white/80",
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
              "shrink-0 text-xs font-medium",
              game ? "text-white/80" : "text-muted-foreground",
              size === "display" && "text-sm"
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
            "nk-num flex items-center gap-1 text-xs font-medium [&_svg]:size-3.5",
            trend === "down" ? "text-destructive" : game ? "text-white/80" : "text-muted-foreground"
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
