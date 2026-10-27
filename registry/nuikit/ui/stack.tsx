import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Stack — layout on the gap levers (docs/design.md, foundation): a flex column (Stack) or a centred
 * row (Cluster) whose gap is a named lever, never a number: none, key (--nk-space-1, keys in a combination),
 * items (--nk-gap-items, rows and actions), cluster (--nk-gap-cluster, an icon and its text, chips in a row),
 * section (--nk-space-4) and surface (--nk-gap-surface). A theme's density re-derives every lever, so a
 * composite laid out on Stack follows it.
 *
 *   <Stack gap="items">{rows}</Stack>
 *   <Cluster gap="cluster" className="ml-auto">{buttons}</Cluster>
 *
 * Role: The gaps between things, from the spacing levers: columns of rows, rows of chips and buttons.
 * Anatomy: stack (flex; column or row) > children
 * Props: direction, gap, align, justify, wrap, as.
 * Rules: Gaps are levers (--nk-gap-*, --nk-space-*), never a literal. Cluster is a centred row with the cluster
 *   gap; Stack a column with none.
 */
const stackVariants = cva("flex", {
  variants: {
    direction: {
      column: "flex-col",
      row: "flex-row",
    },
    gap: {
      none: "",
      key: "gap-(--nk-space-1)",
      items: "gap-(--nk-gap-items)",
      cluster: "gap-(--nk-gap-cluster)",
      section: "gap-(--nk-space-4)",
      surface: "gap-(--nk-gap-surface)",
    },
    align: {
      stretch: "",
      start: "items-start",
      center: "items-center",
      end: "items-end",
      baseline: "items-baseline",
    },
    justify: {
      start: "",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    },
    wrap: {
      true: "flex-wrap",
      false: "",
    },
  },
  defaultVariants: {
    direction: "column",
    gap: "none",
    align: "stretch",
    justify: "start",
    wrap: false,
  },
})

type StackProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof stackVariants> & {
    /** The element. Default div. */
    as?: React.ElementType
  }

function Stack({ as: Comp = "div", direction, gap, align, justify, wrap, className, ...props }: StackProps) {
  return <Comp data-slot="stack" className={cn(stackVariants({ direction, gap, align, justify, wrap }), className)} {...props} />
}

/** A centred row on the cluster gap: an icon and its text, chips, a footer's buttons. */
function Cluster({ gap = "cluster", align = "center", ...props }: Omit<StackProps, "direction">) {
  return <Stack direction="row" gap={gap} align={align} {...props} />
}

export { Stack, Cluster, stackVariants, type StackProps }
