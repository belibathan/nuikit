// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/collapse-stack.tsx, then run pnpm sync.
"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useCollapse, type UseCollapseOptions } from "@/hooks/use-collapse"

/**
 * CollapseStack — a row of clustered indicators on the collapse engine (useCollapse): at rest each item is its
 * icon; a change opens its chip for --nk-rest-delay; changes within the batch window (400 ms) open together and
 * close together; open chips lead the row, critical first, then the biggest change; at most `max`, then "+N".
 *
 *   <CollapseStack
 *     items={[{ key: "hunger", value: hunger, critical: hunger < 20 }, { key: "thirst", value: thirst }]}
 *     renderItem={(item, { open, delta }) => <VitalChip.Root value={item.value} tone={item.key} open={open}>…</VitalChip.Root>}
 *   />
 *
 * The row never re-orders the DOM: open chips move to the front with CSS `order`, so nothing remounts.
 *
 * Role: Clustered indicators (vitals, voice, job status) that stay icons until something changes.
 * Anatomy: collapse-stack > collapse-stack-item (your chip, via renderItem) > collapse-stack-more (+N)
 * Props: items, renderItem, max, restDelay, batchMs, min, optOut.
 * Rules: At rest only icons; a change opens a chip for --nk-rest-delay. Changes within the batch window (400
 *   ms) open and close together. Critical first, then the biggest change; at most max, then +N. Order moves
 *   with CSS order; the DOM never re-orders, nothing remounts.
 */
type CollapseItem = { key: string; value: number; critical?: boolean }
type CollapseItemState = { open: boolean; delta: number; rank: number }

function CollapseStack<T extends CollapseItem>({
  items,
  renderItem,
  max,
  restDelay,
  batchMs,
  min,
  optOut,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> &
  UseCollapseOptions & {
    items: readonly T[]
    renderItem: (item: T, state: CollapseItemState) => React.ReactNode
  }) {
  const c = useCollapse({ max, restDelay, batchMs, min, optOut })
  const { report } = c
  // report each value when it (or its critical flag) changes
  const signature = items.map((i) => `${i.key}:${i.value}:${i.critical ? 1 : 0}`).join("|")
  React.useEffect(() => {
    for (const i of items) report(i.key, i.value, { critical: i.critical })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, report])
  return (
    <div data-slot="collapse-stack" className={cn("flex items-center gap-(--nk-space-2)", className)} {...props}>
      {items.map((item, i) => {
        const rank = c.rank(item.key)
        return (
          <div key={item.key} data-slot="collapse-stack-item" data-open={rank >= 0 || undefined} style={{ order: rank >= 0 ? rank - 100 : i }} className="flex">
            {renderItem(item, { open: rank >= 0, delta: c.delta(item.key), rank })}
          </div>
        )
      })}
      {c.overflow > 0 && <CollapseMore count={c.overflow} style={{ order: -50 }} />}
    </div>
  )
}

/** "+N": the open chips past `max`. */
function CollapseMore({ count, className, ...props }: React.ComponentProps<"span"> & { count: number }) {
  return (
    <span
      data-slot="collapse-stack-more"
      className={cn(
        "nk-num inline-flex h-(--nk-chip-height) items-center rounded-(--nk-chip-radius) bg-(--nk-chip-bg) px-2 text-(length:--nk-text-label) [font-weight:var(--nk-weight-strong,600)] text-(--nk-chip-fg)",
        className
      )}
      {...props}
    >
      +{count}
    </span>
  )
}

export { CollapseStack, CollapseMore, type CollapseItem, type CollapseItemState }
