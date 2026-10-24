"use client"

import * as React from "react"

import { ChevronLeftIcon, XIcon } from "lucide-react"

import { Stagger } from "nuikit-core/react"

import { cn, nkVariant, type NkVariantProps } from "@/lib/utils"
import { ActionBar, ActionBarItem } from "@/components/ui/action-bar"
import { Button } from "@/components/ui/button"
import { Fill } from "@/components/ui/fill"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"

/**
 * EdgeSheet — a full-height sheet flush to a screen edge: the pause menu's backdrop as a component.
 * Stock shadcn Sheet (Radix Dialog, tw-animate-css slide) in the theme's panel surface, no radius
 * or cut on the edges it touches, a hairline on its open edge, a token-only scrim falloff from the
 * screen edge, and the content in an inner column (48px from the screen edge, 24px from the open
 * edge). Several can be open at once (an inventory's two sides): it is non-modal by default and
 * never closes itself on an outside click, focus or Escape: the owner decides (`open`).
 *
 *   <EdgeSheet open={open} side="left" title="John Doe" description="17 / 50 slots" meter={52}>
 *     <EdgeSheetBody scroll>{slots}</EdgeSheetBody>
 *     <EdgeSheetFooter>{actions}</EdgeSheetFooter>
 *   </EdgeSheet>
 *
 * Motion (docs/design.md, Motion), the ox_lib context sheet's: it slides in from its edge over the
 * panel time × 2.2 (≤ 360ms), `delay` staggers a second sheet, the body fades up after the sheet,
 * and it slides back out faster (× 1.4, ≤ 200ms; Radix keeps it mounted until the exit ends).
 * `variant="floating"` (the default for menus and inventories) keeps it off the screen edges: inset by
 * --nk-screen-edge (1.5rem) on the top, bottom and its side, the whole nk-panel recipe (border all round, the
 * identity's radius or cut on every corner, the panel shadow), and a tighter column. `variant="flush"`
 * is the pause menu's backdrop: flush to the top, bottom and its edge, a hairline on the open edge only.
 *
 * Sub-pages swap in place: change `page` and the column fades to the new one inside the open sheet;
 * `onBack` puts a back button before the title, `onClose` a close button after it. Transform and opacity only; reduced motion
 * keeps the fade, `/nuikit motion off` shows and hides it at once.
 *
 * `meter` (0–100) traces a level along the header's bottom edge (a weight, a capacity), like a
 * vital along its chip: the hairline is the track, the fill is the brand, destructive from
 * `meterDanger` (default 90).
 *
 * Role: A sheet from a screen edge: an inventory side, a context menu.
 * Anatomy: edge-sheet (side) > column: header (title, description, actions; back as an ActionBarItem) > edge (a
 *   Fill, variant edge) > body
 * Props: open, side, modal, title, description, actions, density, shape, motion, back, anchor.
 * Level means: the edge line: a fill such as weight (EdgeSheetEdge value, 0–100).
 * Rules: The game stays visible beside it. Positioned on an edge, never centred with a transform.
 */

/** nk-title one step up: the heading face at section size (the pause title's family, one step down). */
const TITLE = { "--nk-panel-title-size": "var(--nk-text-section)" } as React.CSSProperties

type EdgeSheetProps = Omit<React.ComponentProps<typeof SheetContent>, "title" | "side"> & {
  open: boolean
  side?: "left" | "right"
  /** floating: inset from the screen edges, a panel on every side (default). flush: the pause menu's backdrop. */
  variant?: "floating" | "flush"
  /** floating only: as tall as its content (from the top edge down) instead of the full height. */
  fit?: boolean
  /** floating only (1.5): full height (default), or upper: as tall as its content, from the upper third down. */
  anchor?: "full" | "upper"
  /** Rem width of the whole sheet (the column is this minus 4.5rem). Default 36rem, the pause menu's. */
  width?: string
  /** Stagger after another sheet (ms at full motion). */
  delay?: number
  /** Trap focus and block the page behind (a sheet that is the only thing on screen). Default false. */
  modal?: boolean
  icon?: React.ReactNode
  title?: React.ReactNode
  description?: React.ReactNode
  /** Right of the title: a count, a weight, a close button. */
  actions?: React.ReactNode
  meter?: number
  meterDanger?: number
  /** Called when Radix would close it (it never closes itself): wire Escape here if you want it. */
  onOpenChange?: (open: boolean) => void
  /** Sub-page key: a new value swaps the column in place (a short fade), the sheet stays. */
  page?: React.Key
  /** A back button before the title (a sub-page). */
  onBack?: () => void
  /**
   * With `onBack` (1.5): the back control as an ActionBarItem with its key (Esc) instead of the chevron; a
   * string or node replaces the label ("Back"). The default theme's header (docs/design/ink.md §3, Sheet).
   */
  back?: boolean | React.ReactNode
  /** A close button after the title. */
  onClose?: () => void
}

function EdgeSheet({
  open,
  side = "left",
  variant = "floating",
  fit = false,
  anchor = "full",
  width = "36rem",
  delay = 0,
  modal = false,
  icon,
  title,
  description,
  actions,
  meter,
  meterDanger = 90,
  onOpenChange,
  page,
  onBack,
  back,
  onClose,
  className,
  style,
  children,
  density,
  shape,
  motion,
  ...props
}: NkVariantProps & EdgeSheetProps) {
  const left = side === "left"
  const keep = (e: Event) => e.preventDefault()
  return (
    <Sheet open={open} modal={modal} onOpenChange={onOpenChange}>
      <SheetContent
        {...nkVariant({ density, shape, motion })}
        data-slot="edge-sheet"
        side={side}
        showCloseButton={false}
        onOpenAutoFocus={keep}
        onCloseAutoFocus={keep}
        onInteractOutside={keep}
        onEscapeKeyDown={modal ? undefined : keep}
        style={{ "--edge-sheet-width": width, "--edge-sheet-delay": `${delay}ms`, ...style } as React.CSSProperties}
        data-variant={variant}
        className={cn(
          "z-40 w-(--edge-sheet-width) max-w-none gap-0 sm:max-w-none",
          variant === "floating"
            ? // the panel recipe, off the edges: --nk-screen-edge from the top, bottom and its side
              cn("nk-panel h-auto", anchor === "upper" ? "top-[28vh] bottom-auto max-h-[calc(72vh-var(--nk-screen-edge,1.5rem))]" : fit ? "top-(--nk-screen-edge,1.5rem) bottom-auto max-h-[calc(100%-var(--nk-screen-edge,1.5rem)*2)]" : "inset-y-(--nk-screen-edge,1.5rem)", left ? "left-(--nk-screen-edge,1.5rem)" : "right-(--nk-screen-edge,1.5rem)")
            : // the surface: the theme's panel, flush, a hairline on the open edge only
              cn(
                "border-(--nk-panel-border) bg-(--nk-panel-bg) text-(--nk-panel-fg) shadow-(--nk-panel-shadow)",
                left
                  ? "border-r-(length:--nk-line-width) bg-[linear-gradient(90deg,rgba(var(--scrim-rgb),0.22)_0%,rgba(var(--scrim-rgb),0)_70%)]"
                  : "border-l-(length:--nk-line-width) bg-[linear-gradient(270deg,rgba(var(--scrim-rgb),0.22)_0%,rgba(var(--scrim-rgb),0)_70%)]"
              ),
          // motion: the ladder, never raw ms; exits faster, eases in. A staggered sheet holds its first
          // frame (off-screen) through the delay: without the fill it drew in place for the delay, then
          // jumped out and slid in (a blink, then a second entrance). The exit never waits.
          "data-[state=open]:duration-[min(calc(var(--nk-time-base)*2.2),360ms)] data-[state=open]:ease-(--nk-ease-enter)",
          "data-[state=open]:[animation-delay:calc(var(--edge-sheet-delay)*var(--nk-motion,1))] data-[state=open]:[animation-fill-mode:both]",
          "data-[state=closed]:duration-[min(calc(var(--nk-time-base)*1.4),200ms)] data-[state=closed]:ease-(--nk-ease-exit)",
          className
        )}
        {...props}
      >
        {/* its rows, slots and cards enter in sequence when it opens and fold out (last first) when it closes */}
        <Stagger on={open !== false} budget={300}>
        <div
          key={page}
          data-slot="edge-sheet-column"
          className={cn(
            "flex h-full min-h-0 w-full flex-col",
            variant === "floating" ? "p-6" : cn("py-12", left ? "pr-6 pl-12" : "pr-12 pl-6"),
            page !== undefined && "nk-enter"
          )}
        >
          {(title || icon || actions || onBack || onClose) && (
            <header data-slot="edge-sheet-header" className="flex flex-col gap-1 pb-4">
              <div className="flex min-h-[var(--nk-edge-sheet-header-height,2rem)] items-center gap-3">
                {onBack && back ? (
                  <ActionBar className="-ml-2 shrink-0">
                    <ActionBarItem keys={["Esc"]} label={back === true ? "Back" : back} onClick={onBack} aria-label="Back" />
                  </ActionBar>
                ) : onBack && (
                  <Button variant="ghost" size="icon-sm" className="-ml-2 shrink-0 text-muted-foreground" onClick={onBack} aria-label="Back">
                    <ChevronLeftIcon />
                  </Button>
                )}
                {icon && !onBack && <span className="flex shrink-0 text-muted-foreground [&_svg:not([class*='size-'])]:size-(--nk-icon-lg)">{icon}</span>}
                <SheetTitle className="nk-title min-w-0 flex-1 truncate" style={TITLE}>
                  {title}
                </SheetTitle>
                {actions && <div data-slot="edge-sheet-actions" className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
                {onClose && (
                  <Button variant="ghost" size="icon-sm" className="-mr-2 shrink-0 text-muted-foreground" onClick={onClose} aria-label="Close">
                    <XIcon />
                  </Button>
                )}
              </div>
              {description ? (
                <SheetDescription className="nk-label truncate">{description}</SheetDescription>
              ) : (
                <SheetDescription className="sr-only">{typeof title === "string" ? title : ""}</SheetDescription>
              )}
            </header>
          )}
          <EdgeSheetEdge value={meter} danger={meterDanger} />
          {children}
        </div>
        </Stagger>
      </SheetContent>
    </Sheet>
  )
}

/**
 * The header's bottom edge: the hairline as a Fill's track (variant edge), with a level traced along it
 * (scaleX: nothing repaints), in the Fill colour; alert at or over `danger`.
 */
function EdgeSheetEdge({ value, danger = 90, className }: { value?: number; danger?: number; className?: string }) {
  const v = value === undefined || !Number.isFinite(value) ? undefined : Math.max(0, Math.min(100, value))
  return (
    <Fill
      data-slot="edge-sheet-edge"
      variant="edge"
      level={v === undefined ? 0 : v / 100}
      alert={v !== undefined && v >= danger}
      color="var(--brand, var(--primary))"
      // no level: the hairline alone (no edge mark at its start)
      className={cn("shrink-0", v === undefined && "after:hidden", className)}
      style={{ "--nk-fill-track": "var(--nk-panel-border)" } as React.CSSProperties}
    />
  )
}

/**
 * The sheet's content: fills the column and fades up after the sheet has slid in. `scroll` wraps it
 * in a stock ScrollArea (`onViewportScroll` gets its viewport on every scroll, for paging).
 */
function EdgeSheetBody({
  className,
  scroll = false,
  onViewportScroll,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & { scroll?: boolean; onViewportScroll?: (viewport: HTMLDivElement) => void }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const onScroll = React.useRef(onViewportScroll)
  onScroll.current = onViewportScroll
  React.useEffect(() => {
    const el = ref.current?.querySelector<HTMLDivElement>("[data-slot=scroll-area-viewport]")
    if (!el) return
    const on = () => onScroll.current?.(el)
    el.addEventListener("scroll", on, { passive: true })
    return () => el.removeEventListener("scroll", on)
  }, [scroll])
  const enter = { animationDelay: "calc((var(--edge-sheet-delay, 0ms) + var(--nk-time-base) * 1.5) * var(--nk-motion, 1))", ...style }
  if (!scroll) {
    return (
      <div data-slot="edge-sheet-body" className={cn("nk-rise min-h-0 flex-1 pt-4", className)} style={enter} {...props}>
        {children}
      </div>
    )
  }
  return (
    <div ref={ref} data-slot="edge-sheet-body" className={cn("nk-rise -mr-3 flex min-h-0 flex-1 flex-col", className)} style={enter} {...props}>
      <ScrollArea className="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:pt-4 [&>[data-slot=scroll-area-viewport]]:pr-3 [&>[data-slot=scroll-area-viewport]]:pb-4">
        {children}
      </ScrollArea>
    </div>
  )
}

function EdgeSheetFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return <footer data-slot="edge-sheet-footer" className={cn("flex shrink-0 items-center gap-2 border-t border-(--nk-panel-border) pt-4", className)} {...props} />
}

export { EdgeSheet, EdgeSheetBody, EdgeSheetEdge, EdgeSheetFooter, type EdgeSheetProps }
