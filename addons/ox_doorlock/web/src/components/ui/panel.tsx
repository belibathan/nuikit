// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/panel.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, nkVariant, type NkVariantProps } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

/**
 * Panel — the one floating surface (docs/design.md, rule 1): menus, inventories, shops and cards
 * on top of the game. The kit's nk-panel recipe with props; colours come from the theme's popover.
 *
 *   <Panel>
 *     <PanelHeader icon={<CarIcon />} title="Garage" description="Legion Square" actions={<Badge>3</Badge>} />
 *     <PanelBody scroll className="max-h-96">{rows}</PanelBody>
 *     <PanelFooter>…</PanelFooter>
 *   </Panel>
 *
 * A header with `tabs` (or a search, or a meter) becomes two rows: the title row, then that.
 *
 * Role: The one floating surface: a menu, a form, a list on the game.
 * Anatomy: panel > panel-header (icon, title, description, actions) > panel-body (list | form) > panel-footer
 * Props: size, selected, animate, density, shape, motion.
 * Rules: One primary action per panel. Rows inside, not cards. Positioned by anchors and zones, never absolute
 *   pixels.
 */
const panelVariants = cva("nk-panel flex flex-col overflow-hidden", {
  variants: {
    size: {
      sm: "w-[var(--nk-panel-width-sm)]",
      default: "w-[var(--nk-panel-width)]",
      lg: "w-[var(--nk-panel-width-lg)]",
      auto: "w-max",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

function Panel({
  className,
  size,
  selected = false,
  animate = true,
  density,
  shape,
  motion,
  ...props
}: NkVariantProps & React.ComponentProps<"section"> &
  VariantProps<typeof panelVariants> & {
    /** Mark it as the chosen one of several (an outline: nk-panel's depth is a box-shadow). */
    selected?: boolean
    /** Fade in with nk-enter when it mounts. */
    animate?: boolean
  }) {
  return (
    <section
      {...nkVariant({ density, shape, motion })}
      data-slot="panel"
      data-selected={selected || undefined}
      className={cn(
        panelVariants({ size }),
        animate && "nk-enter",
        selected && "outline-2 -outline-offset-1 outline-(--nk-row-accent)",
        className
      )}
      {...props}
    />
  )
}

function PanelHeader({
  className,
  icon,
  title,
  description,
  actions,
  tabs,
  children,
  ...props
}: Omit<React.ComponentProps<"header">, "title"> & {
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  /** Right-aligned: a count, a Badge, a ghost icon Button. */
  actions?: React.ReactNode
  /** A second row under the title: TabsList, a search Input, a Meter. */
  tabs?: React.ReactNode
}) {
  const row = (
    <>
      {icon && (
        <span
          data-slot="panel-icon"
          className="flex shrink-0 text-muted-foreground [&_svg:not([class*='size-'])]:size-(--nk-icon-md)"
        >
          {icon}
        </span>
      )}
      {(title || description) && (
        <div className="flex min-w-0 flex-1 flex-col gap-(--nk-space-1)">
          {title && <PanelTitle>{title}</PanelTitle>}
          {description && <PanelDescription>{description}</PanelDescription>}
        </div>
      )}
      {children}
      {actions && (
        <div data-slot="panel-actions" className="ml-auto flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </>
  )

  if (tabs) {
    return (
      <header data-slot="panel-header" className={cn("nk-panel-header-stack", className)} {...props}>
        <div className="nk-panel-title-row">{row}</div>
        {tabs}
      </header>
    )
  }
  return (
    <header data-slot="panel-header" className={cn("nk-panel-header", className)} {...props}>
      {row}
    </header>
  )
}

function PanelTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="panel-title" className={cn("nk-title truncate", className)} {...props} />
}

function PanelDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="panel-description" className={cn("nk-label truncate", className)} {...props} />
}

const panelBodyVariants = cva("", {
  variants: {
    variant: {
      /** Rows: 8px around 40px rows. */
      list: "nk-panel-body flex flex-col gap-(--nk-space-1)",
      /** Fields and text: 16px, 16px between groups. */
      form: "flex flex-col gap-[calc(var(--nk-space-unit)*4)] p-[calc(var(--nk-space-unit)*4)]",
    },
  },
  defaultVariants: {
    variant: "list",
  },
})

function PanelBody({
  className,
  variant,
  scroll = false,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof panelBodyVariants> & {
    /**
     * Scroll inside a shadcn ScrollArea. Bound it with a max-h-* (or flex-1 in a panel of fixed
     * height) on this component: the viewport inherits that limit.
     */
    scroll?: boolean
  }) {
  if (!scroll) {
    return (
      <div data-slot="panel-body" className={cn(panelBodyVariants({ variant }), className)} {...props}>
        {children}
      </div>
    )
  }
  return (
    <ScrollArea
      data-slot="panel-body"
      className={cn("min-h-0 [&>[data-slot=scroll-area-viewport]]:max-h-[inherit] [&>[data-slot=scroll-area-viewport]>div]:!block", className)}
      {...(props as React.ComponentProps<typeof ScrollArea>)}
    >
      <div className={panelBodyVariants({ variant })}>{children}</div>
    </ScrollArea>
  )
}

function PanelFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return <footer data-slot="panel-footer" className={cn("nk-panel-footer", className)} {...props} />
}

export { Panel, PanelHeader, PanelTitle, PanelDescription, PanelBody, PanelFooter, panelVariants, panelBodyVariants }
