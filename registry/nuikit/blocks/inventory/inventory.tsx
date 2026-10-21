import * as React from "react"
import { fetchNui, Surface } from "nuikit-core/react"
import {
  ArchiveIcon,
  BackpackIcon,
  BandageIcon,
  BanknoteIcon,
  BatteryFullIcon,
  CircleDotIcon,
  CoffeeIcon,
  CookieIcon,
  CrosshairIcon,
  CupSodaIcon,
  FileTextIcon,
  FlashlightIcon,
  FuelIcon,
  KeyRoundIcon,
  type LucideIcon,
  PackageIcon,
  RadioIcon,
  SandwichIcon,
  ShirtIcon,
  SmartphoneIcon,
  WrenchIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ItemSlot } from "@/components/ui/item-slot"
import { Meter } from "@/components/ui/meter"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"

import type { HotbarData, InventoryAnswer, InventoryContainer, InventoryData, InventoryIcon, InventoryItem, InventoryRef } from "./nui"

/**
 * Inventory — the player's items and, when there is one, a second container side by side: drag to
 * move (Shift drags half, Ctrl drags one), drop on another item to stack or swap, a tooltip with
 * the details, a weight meter per side, use from the footer or with a double click, and the first
 * slots as the hotbar (keys 1…n, and a HUD strip Lua shows when one is used). Lua and the server
 * decide every move. Built from the kit: Panel, ItemSlot, Meter, with stock Button and Spinner.
 *
 *   <InventorySurface />                                // wired: nk.surface('inventory' | 'hotbar', …)
 *   <Inventory data={data} onMove={…} onUse={…} />      // a still, or your own wiring
 *   <Hotbar data={data} />
 *
 * Drag and drop is pointer-driven (HTML5 drag and drop is unreliable in the game's browser).
 */
function InventorySurface() {
  return (
    <>
      <Surface name="hotbar" layer="hud" input="none">
        {(data) => (data ? <Hotbar data={data} /> : null)}
      </Surface>
      <Surface name="inventory" layer="panel" exclusive hides={["hotbar"]}>
        {(data) =>
          data ? (
            <Inventory
              data={data}
              onMove={(from, to, count) =>
                fetchNui("inventory:move", { from, to, count }).catch(() => ({ ok: false, error: "The inventory didn't answer. Try again." }))
              }
              onUse={(slot) => fetchNui("inventory:use", { slot }).catch(() => ({ ok: false, error: "The inventory didn't answer. Try again." }))}
            />
          ) : null
        }
      </Surface>
    </>
  )
}

const ICONS: Record<InventoryIcon, LucideIcon> = {
  drink: CupSodaIcon,
  coffee: CoffeeIcon,
  food: SandwichIcon,
  snack: CookieIcon,
  phone: SmartphoneIcon,
  radio: RadioIcon,
  medical: BandageIcon,
  tool: WrenchIcon,
  key: KeyRoundIcon,
  box: PackageIcon,
  shirt: ShirtIcon,
  fuel: FuelIcon,
  light: FlashlightIcon,
  battery: BatteryFullIcon,
  money: BanknoteIcon,
  weapon: CrosshairIcon,
  ammo: CircleDotIcon,
  document: FileTextIcon,
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

/** How many a drag takes: all of them, half with Shift (at least one), one with Ctrl. */
function dragCount(count: number, mods: { shift?: boolean; ctrl?: boolean } = {}) {
  if (count <= 1) return count
  if (mods.ctrl) return 1
  if (mods.shift) return Math.max(1, Math.floor(count / 2))
  return count
}

/** The container's weight in grams. */
function containerWeight(c: InventoryContainer) {
  return list(c.items).reduce((w, i) => w + (i.weight ?? 0) * i.count, 0)
}

/** Grams as "350 g", "1.5 kg", "30 kg". */
function formatWeight(grams: number) {
  const g = Number.isFinite(grams) ? Math.max(0, grams) : 0
  if (g < 1000) return `${Math.round(g)} g`
  const kg = g / 1000
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`
}

function ItemImage({ item, className }: { item: InventoryItem; className?: string }) {
  if (item.image) return <img src={item.image} alt="" draggable={false} className={cn("size-3/5 object-contain", className)} />
  const Icon = ICONS[item.icon as InventoryIcon] ?? PackageIcon
  return <Icon className={cn("size-7 text-muted-foreground", className)} />
}

/** A drag: what, how many, and where it started (the ghost's first position). */
type Drag = { from: InventoryRef; item: InventoryItem; count: number; x?: number; y?: number }
type Hover = { item: InventoryItem; left: number; top: number }

function Inventory({
  data,
  onMove,
  onUse,
  autoFocus = true,
  defaultSelected,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: InventoryData
  /** Ask Lua to move `count` from one slot to another; resolve with its answer. */
  onMove?: (from: InventoryRef, to: InventoryRef, count: number) => Promise<InventoryAnswer> | void
  /** Ask Lua to use the item in the player's `slot`. */
  onUse?: (slot: number) => Promise<InventoryAnswer> | void
  /** Focus the first item when it opens (off for stills next to other content). */
  autoFocus?: boolean
  /** A slot of the player's to start selected (stills). */
  defaultSelected?: number
}) {
  const [selected, setSelected] = React.useState<InventoryRef | null>(defaultSelected ? { container: data.player.id, slot: defaultSelected } : null)
  const [drag, setDrag] = React.useState<Drag | null>(null)
  const [over, setOver] = React.useState<InventoryRef | null>(null)
  const [hover, setHover] = React.useState<Hover | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const root = React.useRef<HTMLDivElement>(null)
  const ghost = React.useRef<HTMLDivElement>(null)
  const press = React.useRef<(Drag & { x: number; y: number }) | null>(null)
  const dragging = React.useRef<Drag | null>(null)
  const swallowClick = React.useRef(false)
  const send = React.useRef(onMove)
  send.current = onMove

  const ask = (call: Promise<InventoryAnswer> | void) => {
    setBusy(true)
    setError(null)
    void Promise.resolve(call)
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't work.")
      })
      .finally(() => setBusy(false))
  }
  const askRef = React.useRef(ask)
  askRef.current = ask

  // Pointer-driven drag: a press on an item becomes a drag once it moves 4px; the drop target is
  // whatever slot is under the pointer on release. Escape (or leaving the window) cancels it.
  React.useEffect(() => {
    const slotAt = (x: number, y: number): InventoryRef | null => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-inv-container]")
      return el ? { container: el.dataset.invContainer!, slot: Number(el.dataset.invSlot) } : null
    }
    const place = (x: number, y: number) => {
      if (ghost.current) {
        ghost.current.style.left = `${x}px`
        ghost.current.style.top = `${y}px`
      }
    }
    const end = () => {
      press.current = null
      dragging.current = null
      setDrag(null)
      setOver(null)
    }
    const move = (e: PointerEvent) => {
      const p = press.current
      if (p && !dragging.current && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 4) {
        dragging.current = { from: p.from, item: p.item, count: p.count, x: e.clientX, y: e.clientY }
        setDrag(dragging.current)
        setHover(null)
      }
      if (!dragging.current) return
      place(e.clientX, e.clientY)
      const at = slotAt(e.clientX, e.clientY)
      setOver((o) => (o?.container === at?.container && o?.slot === at?.slot ? o : at))
    }
    const up = (e: PointerEvent) => {
      const d = dragging.current
      if (d) {
        swallowClick.current = true
        const to = slotAt(e.clientX, e.clientY)
        if (to && !(to.container === d.from.container && to.slot === d.from.slot) && send.current) {
          askRef.current(send.current(d.from, to, d.count))
        }
      }
      end()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragging.current) {
        e.preventDefault() // nuikit leaves a handled Escape alone: the inventory stays open
        end()
      }
    }
    const noNative = (e: DragEvent) => e.preventDefault()
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("blur", end)
    window.addEventListener("keydown", key, true)
    window.addEventListener("dragstart", noNative)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("blur", end)
      window.removeEventListener("keydown", key, true)
      window.removeEventListener("dragstart", noNative)
    }
  }, [])

  React.useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => root.current?.querySelector<HTMLElement>("[data-inv-container][role=button]")?.focus(), 0)
    return () => clearTimeout(t)
  }, [autoFocus])

  const player = data.player
  const other = data.other
  const hotbar = data.hotbar ?? 5
  const pick = selected?.container === player.id ? list(player.items).find((i) => i.slot === selected.slot) : undefined

  const use = (item?: InventoryItem) => {
    if (!item?.usable || !onUse || busy) return
    ask(onUse(item.slot))
  }

  const pane = (c: InventoryContainer, side: "player" | "other") => {
    const bySlot = new Map(list(c.items).map((i) => [i.slot, i]))
    const weight = containerWeight(c)
    const Icon = side === "player" ? BackpackIcon : ArchiveIcon
    return (
      <Panel size="auto" data-side={side} className="nk-enter">
        <PanelHeader
          icon={<Icon />}
          title={c.label}
          actions={
            c.maxWeight ? (
              <span className="nk-num text-sm text-muted-foreground">
                {formatWeight(weight)} / {formatWeight(c.maxWeight)}
              </span>
            ) : undefined
          }
          tabs={c.maxWeight ? <Meter value={weight} max={c.maxWeight} high={90} aria-label={`${c.label} weight`} /> : undefined}
        />
        <PanelBody scroll className="max-h-[28rem]">
          <div
            className="grid grid-cols-5 gap-2 p-1"
            onKeyDown={(e) => {
              const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 5, ArrowUp: -5 }[e.key]
              if (!step) return
              const slots = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-inv-container]")]
              const next = slots[slots.indexOf(document.activeElement as HTMLElement) + step]
              if (!next) return
              e.preventDefault()
              next.focus()
            }}
          >
            {Array.from({ length: c.slots }, (_, n) => {
              const slot = n + 1
              const item = bySlot.get(slot)
              const ref = { container: c.id, slot }
              const isSel = selected?.container === c.id && selected.slot === slot
              const isFrom = drag?.from.container === c.id && drag.from.slot === slot
              const isOver = !!drag && over?.container === c.id && over.slot === slot && !isFrom
              return (
                <ItemSlot
                  key={slot}
                  size="md"
                  data-inv-container={c.id}
                  data-inv-slot={slot}
                  tabIndex={item ? undefined : -1}
                  image={item ? <ItemImage item={item} /> : undefined}
                  label={item?.label}
                  count={item?.count}
                  durability={item?.durability}
                  hotkey={side === "player" && slot <= hotbar ? slot : undefined}
                  active={isSel && !drag}
                  dragging={isFrom}
                  dropTarget={isOver}
                  onPointerDown={(e) => {
                    if (e.button !== 0 || !item) return
                    press.current = { from: ref, item, count: dragCount(item.count, { shift: e.shiftKey, ctrl: e.ctrlKey }), x: e.clientX, y: e.clientY }
                  }}
                  onPointerEnter={(e) => {
                    if (!item || dragging.current) return
                    const r = e.currentTarget.getBoundingClientRect()
                    // Right of the slot, or left of it near the screen's right edge (the tooltip is 15rem).
                    const width = 15 * parseFloat(getComputedStyle(document.documentElement).fontSize) + 8
                    setHover({ item, left: r.right + width > window.innerWidth ? r.left - width : r.right + 8, top: Math.min(r.top, window.innerHeight - 220) })
                  }}
                  onPointerLeave={() => setHover(null)}
                  onClick={() => {
                    if (swallowClick.current) {
                      swallowClick.current = false
                      return
                    }
                    if (isSel && side === "player") use(item)
                    else setSelected(ref)
                  }}
                />
              )
            })}
          </div>
        </PanelBody>
        {side === "player" && (
          <PanelFooter className="flex items-center gap-3">
            <p role={error ? "alert" : undefined} className={cn("min-w-0 flex-1 truncate text-sm", error ? "text-destructive" : "text-muted-foreground")}>
              {error ?? (pick ? `${pick.label}${pick.count > 1 ? ` × ${pick.count}` : ""}` : "Drag to move. Shift drags half, Ctrl one.")}
            </p>
            <Button size="sm" disabled={!pick?.usable || busy} onClick={() => use(pick)}>
              {busy && <Spinner />}
              Use
            </Button>
          </PanelFooter>
        )}
      </Panel>
    )
  }

  return (
    <div
      ref={root}
      data-slot="inventory"
      className={cn("absolute inset-0 flex items-center justify-center gap-4 p-6", drag && "cursor-grabbing", className)}
      {...props}
    >
      <div className="flex items-start gap-4">
        {pane(player, "player")}
        {other && pane(other, "other")}
      </div>

      {drag && (
        // The pointer moves it (no re-render); this first position never changes, so React leaves it.
        <div ref={ghost} aria-hidden data-slot="inventory-ghost" className="pointer-events-none fixed z-50 -mt-10 -ml-10" style={{ left: drag.x, top: drag.y }}>
          <ItemSlot size="md" className="nk-panel" image={<ItemImage item={drag.item} />} label={drag.item.label} count={drag.count} />
        </div>
      )}

      {hover && !drag && <ItemTooltip item={hover.item} style={{ left: hover.left, top: hover.top }} />}
    </div>
  )
}

/** The details of an item, next to its slot. */
function ItemTooltip({ item, className, ...props }: React.ComponentProps<"div"> & { item: InventoryItem }) {
  const info = Object.entries(item.info ?? {})
  return (
    <div role="tooltip" data-slot="inventory-tooltip" className={cn("nk-panel pointer-events-none fixed z-40 flex w-60 flex-col gap-2 p-3", className)} {...props}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-medium">{item.label}</span>
        {item.count > 1 && <span className="nk-num text-sm text-muted-foreground">× {item.count}</span>}
      </div>
      {item.description && <p className="text-xs leading-4 text-muted-foreground">{item.description}</p>}
      {(item.weight !== undefined || info.length > 0) && (
        <dl className="flex flex-col gap-1 text-xs leading-4">
          {item.weight !== undefined && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Weight</dt>
              <dd className="nk-num">{formatWeight(item.weight * item.count)}</dd>
            </div>
          )}
          {info.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="nk-num truncate">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {item.durability !== undefined && <Meter label="Condition" value={item.durability} low={20} valueText={`${Math.round(item.durability)}%`} />}
    </div>
  )
}

/** The first slots on the game, for a moment when a hotbar key is used. Display only. */
function Hotbar({ data, className, ...props }: Omit<React.ComponentProps<"div">, "children"> & { data: HotbarData }) {
  const size = data.size ?? 5
  const bySlot = new Map(list(data.items).map((i) => [i.slot, i]))
  return (
    <div data-slot="inventory-hotbar" className={cn("nk-edge absolute inset-0", className)} {...props}>
      <div className="nk-anchor-b nk-enter flex gap-2">
        {Array.from({ length: size }, (_, n) => {
          const item = bySlot.get(n + 1)
          return (
            <ItemSlot
              key={n}
              surface="hud"
              size="md"
              hotkey={n + 1}
              image={item ? <ItemImage item={item} className={data.active === n + 1 ? "text-primary-foreground" : undefined} /> : undefined}
              label={item?.label}
              count={item?.count}
              durability={item?.durability}
              active={data.active === n + 1}
            />
          )
        })}
      </div>
    </div>
  )
}

export { Hotbar, Inventory, InventorySurface, ItemTooltip, containerWeight, dragCount, formatWeight }
