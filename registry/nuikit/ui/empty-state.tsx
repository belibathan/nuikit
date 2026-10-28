import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleAlertIcon, InboxIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

/**
 * EmptyState — what a list, a search or a screen shows when there's nothing (or something went
 * wrong): an icon, a short title, and one sentence saying what to do next (docs/design.md §6),
 * with an optional action. Stock shadcn Empty, on the kit's scale.
 *
 *   <EmptyState title="No cars here" description="Buy one at the dealership or ask a friend for keys." />
 *   <EmptyState tone="error" title="Couldn't load your bank" description="Try again in a moment." action={<Button size="sm">Try again</Button>} />
 *
 * Named empty-state, not empty: stock shadcn already has `empty`, and this is built on it.
 *
 * Role: What a list, a search or a screen shows when there is nothing, or something went wrong.
 * Anatomy: empty-state > empty-state-header: empty-state-icon (EmptyMedia), empty-state-title (nk-text-title),
 *   empty-state-description (one sentence) > empty-state-actions
 * Props: size, tone, icon, title, description, action.
 * Rules: One sentence on what to do next. error is role alert and the danger tone.
 */

const emptyStateVariants = cva("border-0 text-balance", {
  variants: {
    size: {
      /** Inside a panel body or a list. */
      panel: "",
      /** A whole screen or a large region. */
      screen: "",
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
      data-size={size ?? "panel"}
      role={error ? "alert" : undefined}
      className={cn(emptyStateVariants({ size }), className)}
      {...props}
    >
      <EmptyHeader data-slot="empty-state-header">
        {iconEl !== null && iconEl !== false && (
          <EmptyMedia
            variant="icon"
            data-slot="empty-state-icon"
          >
            {iconEl}
          </EmptyMedia>
        )}
        <EmptyTitle data-slot="empty-state-title" className="nk-text-title">
          {title}
        </EmptyTitle>
        {description && (
          <EmptyDescription data-slot="empty-state-description" className="text-pretty">
            {description}
          </EmptyDescription>
        )}
      </EmptyHeader>
      {(action || children) && (
        <EmptyContent data-slot="empty-state-actions" className="flex-row justify-center">
          {action}
          {children}
        </EmptyContent>
      )}
    </Empty>
  )
}

export { EmptyState, emptyStateVariants }
