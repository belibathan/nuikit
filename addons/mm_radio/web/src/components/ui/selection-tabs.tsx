// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/selection-tabs.tsx, then run pnpm sync.
"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { SelectionTile } from "@/components/ui/selection-tile"
import { Tabs, TabsContent, TabsList as ShadcnTabsList, TabsTrigger as ShadcnTabsTrigger } from "@/components/ui/tabs"

/**
 * Selection tabs — shadcn's Tabs / TabsList / TabsTrigger / TabsContent with ONE SelectionTile per list that slides
 * to the active trigger (a measured FLIP on --nk-selection-time / --nk-selection-ease). The lit trigger wears the
 * keycap tile (solid, or tinted under --nk-style-fill: soft; kit.css paints the ink), triggers sit --nk-list-gap
 * apart, arrow keys move the tile (Radix roving focus), reduced motion jumps. Same API as stock shadcn; import it in
 * place of `@/components/ui/tabs`.
 *
 *   <Tabs value={v} onValueChange={setV}><TabsList><TabsTrigger value="a">A</TabsTrigger>…</TabsList>
 *     <TabsContent value="a">…</TabsContent></Tabs>
 *   <SegmentedControl value={v} onValueChange={setV} options={[{ value: "a", label: "A" }, …]} />
 *
 * Role: tabs and segmented choices as one list with one sliding keycap.
 * Anatomy: tabs-list (the list, data-nk-sel) > selection-tile + tabs-trigger…; tabs-content beside it.
 * Props: Tabs, TabsList, TabsTrigger, TabsContent as shadcn; SegmentedControl: options, value, defaultValue, onValueChange, stretch.
 * Rules: one tile per list; transform and opacity only; the trigger paints no fill of its own; no focus ring.
 */

function TabsList({ className, children, ...props }: React.ComponentProps<typeof ShadcnTabsList>) {
  return (
    <ShadcnTabsList
      data-selection-tabs="list"
      className={cn("relative h-auto", className)}
      {...props}
    >
      <SelectionTile shape="tile" items="[data-slot=tabs-trigger]" lit="[data-state=active]" pointer={false} />
      {children}
    </ShadcnTabsList>
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof ShadcnTabsTrigger>) {
  return <ShadcnTabsTrigger data-selection-tabs="trigger" className={cn("h-auto", className)} {...props} />
}

type SegmentedOption = { value: string; label: React.ReactNode; disabled?: boolean }

type SegmentedControlProps = Omit<React.ComponentProps<typeof Tabs>, "children" | "onChange"> & {
  options: SegmentedOption[]
  /** Controlled value; with `defaultValue` it is the uncontrolled start. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Fill the width, options sharing it equally (default). False packs them to their labels. */
  stretch?: boolean
  listClassName?: string
  triggerClassName?: string
}

/** The same sliding tile with a value prop and no panels. */
function SegmentedControl({ options, stretch = true, listClassName, triggerClassName, className, defaultValue, ...props }: SegmentedControlProps) {
  const controlled = props.value !== undefined
  return (
    <Tabs
      data-slot="segmented-control"
      className={className}
      {...(controlled ? {} : { defaultValue: defaultValue ?? options[0]?.value })}
      {...props}
    >
      <TabsList className={cn(stretch && "w-full", listClassName)}>
        {options.map((o) => (
          <TabsTrigger key={o.value} value={o.value} disabled={o.disabled} className={cn(stretch && "flex-1", triggerClassName)}>
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, SegmentedControl, type SegmentedOption, type SegmentedControlProps }
