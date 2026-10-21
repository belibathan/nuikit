// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/empty-state.tsx, then run pnpm sync.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleAlertIcon, InboxIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

/**
 * EmptyState — what a list, a search or a screen shows when there's nothing (or something went
 * wrong): an icon, a short title, and one sentence saying what to do next (docs/design.md,
 * rule 9), with an optional action. Stock shadcn Empty, on the kit's scale.
 *
 *   <EmptyState title="No cars here" description="Buy one at the dealership or ask a friend for keys." />
 *   <EmptyState tone="error" title="Couldn't load your bank" description="Try again in a moment." action={<Button size="sm">Try again</Button>} />
 *
 * Named empty-state, not empty: stock shadcn already has `empty`, and this is built on it.
 */

const emptyStateVariants = cva("border-0 text-balance", {
  variants: {
    size: {
      /** Inside a panel body or a list. */
      panel: "gap-3 p-6",
      /** A whole screen or a large region. */
      screen: "gap-4 p-12",
    },
  },
  defaultVariants: {
    size: "panel",
  },
})

function EmptyState({
  className,
  size,
  tone = "empty",
  icon,
  title,
  description,
  action,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof emptyStateVariants> & {
    /** empty: nothing to show. error: something went wrong (destructive icon, announced). */
    tone?: "empty" | "error"
    /** Replaces the default icon; null for none. */
    icon?: React.ReactNode
    title: React.ReactNode
    /** One sentence: what to do next. */
    description?: React.ReactNode
    /** A button or two: try again, buy one, open the map. */
    action?: React.ReactNode
  }) {
  const error = tone === "error"
  const iconEl = icon === undefined ? error ? <CircleAlertIcon /> : <InboxIcon /> : icon
  return (
    <Empty
      data-slot="empty-state"
      data-tone={tone}
      role={error ? "alert" : undefined}
      className={cn(emptyStateVariants({ size }), className)}
      {...props}
    >
      <EmptyHeader className="gap-1.5">
        {iconEl !== null && iconEl !== false && (
          <EmptyMedia
            variant="icon"
            className={cn(
              "mb-1 [&_svg:not([class*='size-'])]:size-5",
              size === "screen" ? "size-12" : "size-10",
              error ? "bg-destructive/15 text-destructive" : "text-muted-foreground"
            )}
          >
            {iconEl}
          </EmptyMedia>
        )}
        {/* The weight spelled out (important): EmptyTitle's font-medium would beat nk-title's. A
            screen-size empty state titles at the section size. */}
        <EmptyTitle
          className={cn("nk-title [font-weight:var(--nk-heading-weight,600)]!", size === "screen" && "[--nk-heading-size:var(--nk-text-section)]")}
        >
          {title}
        </EmptyTitle>
        {description && <EmptyDescription className="text-sm leading-5 text-pretty">{description}</EmptyDescription>}
      </EmptyHeader>
      {(action || children) && (
        <EmptyContent className="flex-row justify-center gap-2">
          {action}
          {children}
        </EmptyContent>
      )}
    </Empty>
  )
}

export { EmptyState, emptyStateVariants }
