import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

/**
 * Vital — a player stat (health, armor, hunger…): an icon and a shadcn Progress.
 * The tone only picks which theme token colors it.
 *
 *   <Vital value={health} tone="destructive" icon={<HeartIcon />} label="Health" />
 */
const vitalVariants = cva(
  "flex items-center gap-2 [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        default:
          "text-primary [&_[data-slot=progress]]:bg-primary/20 [&_[data-slot=progress-indicator]]:bg-primary",
        destructive:
          "text-destructive [&_[data-slot=progress]]:bg-destructive/20 [&_[data-slot=progress-indicator]]:bg-destructive",
        "chart-1":
          "text-chart-1 [&_[data-slot=progress]]:bg-chart-1/20 [&_[data-slot=progress-indicator]]:bg-chart-1",
        "chart-2":
          "text-chart-2 [&_[data-slot=progress]]:bg-chart-2/20 [&_[data-slot=progress-indicator]]:bg-chart-2",
        "chart-3":
          "text-chart-3 [&_[data-slot=progress]]:bg-chart-3/20 [&_[data-slot=progress-indicator]]:bg-chart-3",
        "chart-4":
          "text-chart-4 [&_[data-slot=progress]]:bg-chart-4/20 [&_[data-slot=progress-indicator]]:bg-chart-4",
        "chart-5":
          "text-chart-5 [&_[data-slot=progress]]:bg-chart-5/20 [&_[data-slot=progress-indicator]]:bg-chart-5",
      },
      size: {
        default: "w-32 [&_[data-slot=progress]]:h-1",
        sm: "w-20 [&_[data-slot=progress]]:h-1",
      },
    },
    defaultVariants: {
      tone: "default",
      size: "default",
    },
  }
)

function Vital({
  className,
  tone,
  size,
  value,
  icon,
  label,
  low = 20,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof vitalVariants> & {
    /** 0–100 */
    value: number
    icon?: React.ReactNode
    /** Accessible name, e.g. "Health". */
    label?: string
    /** At or below this the icon pulses. -1 disables. */
    low?: number
  }) {
  const v = Math.max(0, Math.min(100, value))
  const critical = low >= 0 && v <= low

  return (
    <div
      data-slot="vital"
      data-critical={critical || undefined}
      className={cn(vitalVariants({ tone, size }), className)}
      {...props}
    >
      {icon && (
        <span data-slot="vital-icon" className={cn("flex", critical && "animate-pulse")}>
          {icon}
        </span>
      )}
      <Progress value={v} aria-label={label} />
    </div>
  )
}

export { Vital, vitalVariants }
