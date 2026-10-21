"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"

/**
 * NuiMenu — the keyboard-first list menu servers use for garages, jobs and interactions.
 * A shadcn Card holding Items; the highlighted row uses `accent`, like shadcn's menus.
 * Arrow keys / W S move, Enter / E select.
 *
 *   <NuiMenu title="Garage" items={cars} onSelect={(car) => fetchNui("garage:spawn", car)} />
 */
type NuiMenuItem = {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  /** Right-aligned meta, e.g. "$500" or "3/5". */
  meta?: React.ReactNode
  disabled?: boolean
}

function NuiMenu<T extends NuiMenuItem>({
  className,
  title,
  description,
  items,
  onSelect,
  global = true,
  ...props
}: Omit<React.ComponentProps<typeof Card>, "onSelect" | "title"> & {
  title?: React.ReactNode
  description?: React.ReactNode
  items: T[]
  onSelect: (item: T) => void
  /** Listen to keys on window (default). NUI usually has nothing else focused. */
  global?: boolean
}) {
  const [active, setActive] = React.useState(() => Math.max(0, items.findIndex((i) => !i.disabled)))
  const listRef = React.useRef<HTMLDivElement>(null)

  const move = React.useCallback(
    (dir: 1 | -1) => {
      setActive((i) => {
        for (let step = 1; step <= items.length; step++) {
          const next = (i + dir * step + items.length) % items.length
          if (!items[next]?.disabled) return next
        }
        return i
      })
    },
    [items]
  )

  const onKey = React.useCallback(
    (e: KeyboardEvent | React.KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "arrowdown" || k === "s") (e.preventDefault(), move(1))
      else if (k === "arrowup" || k === "w") (e.preventDefault(), move(-1))
      else if (k === "enter" || k === "e") {
        const item = items[active]
        if (item && !item.disabled) (e.preventDefault(), onSelect(item))
      }
    },
    [active, items, move, onSelect]
  )

  React.useEffect(() => {
    if (!global) return
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [global, onKey])

  // Keep the highlighted row visible without scrolling the page around it.
  React.useEffect(() => {
    const list = listRef.current
    const row = list?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    if (!list || !row) return
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight
  }, [active])

  return (
    <Card
      data-slot="nui-menu"
      className={cn("nk-panel w-80 gap-0 overflow-hidden py-0", className)}
      onKeyDown={global ? undefined : onKey}
      tabIndex={global ? undefined : 0}
      {...props}
    >
      {(title || description) && (
        <CardHeader className="border-b px-4 py-3 [.border-b]:pb-3">
          {title && <CardTitle className="nk-title">{title}</CardTitle>}
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </CardHeader>
      )}
      <ItemGroup ref={listRef} role="listbox" className="relative max-h-96 gap-1 overflow-y-auto p-1.5">
        {items.map((item, i) => (
          <Item
            key={item.id}
            asChild
            size="sm"
            data-index={i}
            data-selected={i === active || undefined}
            data-active={i === active || undefined}
            className="nk-row text-left data-[selected]:bg-accent data-[selected]:text-accent-foreground aria-disabled:opacity-50"
          >
            <button
              type="button"
              role="option"
              aria-selected={i === active}
              aria-disabled={item.disabled || undefined}
              disabled={item.disabled}
              onMouseEnter={() => !item.disabled && setActive(i)}
              onClick={() => !item.disabled && onSelect(item)}
            >
              {item.icon && <ItemMedia variant="icon">{item.icon}</ItemMedia>}
              <ItemContent className="gap-0.5">
                <ItemTitle>{item.label}</ItemTitle>
                {item.description && <ItemDescription className="line-clamp-1 text-xs">{item.description}</ItemDescription>}
              </ItemContent>
              {item.meta && <ItemActions className="text-xs text-muted-foreground tabular-nums">{item.meta}</ItemActions>}
            </button>
          </Item>
        ))}
      </ItemGroup>
    </Card>
  )
}

export { NuiMenu, type NuiMenuItem }
