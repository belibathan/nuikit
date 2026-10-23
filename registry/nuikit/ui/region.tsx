"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

/**
 * Region — a content column inside a zone or a surface (docs/design/layout.md): a max width
 * (`--nk-region-max`, 28rem), the padding scale (`--nk-region-pad`, the surface padding), and three slots:
 * header, body (scrolls with the kit's scrollbar when `scroll`), footer (pinned to the bottom when `fill`).
 *
 *   <Region fill scroll header={<h2 className="nk-title">Settings</h2>} footer={<Button>Save</Button>}>
 *     {rows}
 *   </Region>
 *
 * Role: A content column: header, a body that may scroll, footer, on the spacing levers.
 * Anatomy: region (flex column, max width, padding) > region-header > region-body (scroll-area) > region-footer
 * Props: header, footer, scroll, fill, pad, max, as.
 * Rules: Width and padding are levers (--nk-region-max, --nk-region-pad). One scroll per region, in its body.
 */
type RegionProps = Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
  header?: React.ReactNode
  footer?: React.ReactNode
  /** The body scrolls (the kit's scrollbar) instead of growing. */
  scroll?: boolean
  /** As tall as its container: the body takes the rest, the footer sits at the bottom. */
  fill?: boolean
  /** Padding: the surface padding (default), tight (space-4) or none. */
  pad?: "surface" | "tight" | "none"
  /** Max width (a CSS length). Default --nk-region-max. */
  max?: string
  as?: React.ElementType
}

function Region({ header, footer, scroll, fill, pad, max, as: Comp = "div", className, style, children, ...props }: RegionProps) {
  return (
    <Comp
      data-slot="region"
      data-fill={fill || undefined}
      data-pad={pad && pad !== "surface" ? pad : undefined}
      className={cn(className)}
      style={{ ...(max ? { "--nk-region-max": max } : null), ...style } as React.CSSProperties}
      {...props}
    >
      {header != null && (
        <header data-slot="region-header" className="flex shrink-0 flex-col gap-(--nk-space-1) pb-(--nk-space-4)">
          {header}
        </header>
      )}
      {scroll ? (
        <ScrollArea data-slot="region-body" className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]>div]:!block">
          {children}
        </ScrollArea>
      ) : (
        <div data-slot="region-body">{children}</div>
      )}
      {footer != null && (
        <footer data-slot="region-footer" className="flex items-center gap-(--nk-gap-cluster) pt-(--nk-space-4)">
          {footer}
        </footer>
      )}
    </Comp>
  )
}

export { Region, type RegionProps }
