import * as React from "react"

import { cn } from "@/lib/utils"
import { Stack } from "@/components/ui/stack"

/**
 * SheetSection — one group of rows in a sheet or panel body (docs/design.md §3, Sheet): a label, an
 * optional meta on the same line, then the rows. Sections are separated by a hairline.
 *
 *   <EdgeSheetBody scroll>
 *     <SheetSection label="Vehicles" meta="3 / 5">
 *       <MenuRow …>Sultan</MenuRow>
 *     </SheetSection>
 *   </EdgeSheetBody>
 *
 * Role: groups the rows of a sheet page under a short name (rows, not cards).
 * Anatomy: section > head (label role name, num-role meta, right-aligned) > rows (a Stack: none, or the items gap).
 * Props: label, meta, rows (the gap between rows: none | items).
 * Rules: one to three words for the label; the meta is a count or a total, never a sentence. The first section
 *   has no top pad, the last no hairline. Spacing from --nk-space-*, the hairline is --nk-plate-hair.
 */
function SheetSection({
  className,
  label,
  meta,
  rows = "none",
  children,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  /** The section's short name (label role). */
  label?: React.ReactNode
  /** Right of the label: a count, a total (num role). */
  meta?: React.ReactNode
  /** The gap between the rows: none (the rows touch, a list) or items (--nk-gap-items). */
  rows?: "none" | "items"
}) {
  return (
    <section
      data-slot="sheet-section"
      className={cn(
        "flex flex-col border-b border-(--nk-plate-hair) py-(--nk-space-4) first:pt-0 last:border-b-0 last:pb-0",
        className
      )}
      {...props}
    >
      {(label || meta) && (
        <div data-slot="sheet-section-head" className="flex items-center gap-(--nk-gap-cluster) pb-(--nk-space-2)">
          <p data-slot="sheet-section-label" className="nk-caption min-w-0 flex-1 truncate text-muted-foreground">
            {label}
          </p>
          {meta !== undefined && meta !== null && (
            <span data-slot="sheet-section-meta" className="nk-label nk-num shrink-0 text-muted-foreground">
              {meta}
            </span>
          )}
        </div>
      )}
      <Stack data-slot="sheet-section-rows" gap={rows === "items" ? "items" : "none"}>
        {children}
      </Stack>
    </section>
  )
}

export { SheetSection }
