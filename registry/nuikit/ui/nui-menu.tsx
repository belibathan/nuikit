"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { MenuRow, MenuRowList } from "@/components/ui/menu-row"
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel"

/**
 * NuiMenu — the keyboard-first list menu servers use for garages, jobs and interactions, from data: a Panel with
 * a header and a MenuRowList of MenuRows (the identity's row indicator slides to the active one). Arrow keys /
 * W S move, Enter / E select. Kept so old imports keep working; compose Panel + MenuRowList + MenuRow yourself.
 *
 *   <NuiMenu title="Garage" items={cars} onSelect={(car) => fetchNui("garage:spawn", car)} />
 *
 * @deprecated Use Panel + MenuRowList + MenuRow (`@/components/ui/panel`, `@/components/ui/menu-row`): the same
 *   rows every menu is made of. Removed in 0.10.0.
 *
 * Role: A keyboard-first list menu from data: Panel > MenuRowList > MenuRow.
 * Anatomy: Panel > PanelHeader (title, description) > PanelBody > MenuRowList > MenuRow (icon, label, description, meta)
 * Props: title, description, items, onSelect, global.
 * Rules: Arrows move, Enter selects; keys are read on window by default. The active row is the identity's row
 *   indicator (MenuRowList), never the hover accent.
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
}: Omit<React.ComponentProps<typeof Panel>, "onSelect" | "title"> & {
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
    <Panel
      data-slot="nui-menu"
      animate={false}
      className={className}
      onKeyDown={global ? undefined : onKey}
      tabIndex={global ? undefined : 0}
      {...props}
    >
      {(title || description) && <PanelHeader title={title} description={description} />}
      <PanelBody className="max-h-96 overflow-y-auto" ref={listRef}>
        <MenuRowList role="listbox" active={active}>
          {items.map((item, i) => (
            <MenuRow
              key={item.id}
              role="option"
              aria-selected={i === active}
              data-index={i}
              active={i === active}
              inert
              disabled={item.disabled}
              icon={item.icon}
              description={item.description}
              meta={item.meta}
              onMouseEnter={() => !item.disabled && setActive(i)}
              onClick={() => !item.disabled && onSelect(item)}
            >
              {item.label}
            </MenuRow>
          ))}
        </MenuRowList>
      </PanelBody>
    </Panel>
  )
}

export { NuiMenu, type NuiMenuItem }
