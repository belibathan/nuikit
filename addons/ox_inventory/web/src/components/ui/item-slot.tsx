// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/item-slot.tsx, then run pnpm sync.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { LockIcon } from "lucide-react"

import { cn, nkState } from "@/lib/utils"

/**
 * ItemSlot — one square of an inventory, a shop, a hotbar or a crafting grid: the item's image
 * and name, a count, a hotkey number, a durability line, a price and stock, and the states a
 * drag-and-drop grid needs (empty, active, drop target, dragging, locked).
 *
 *   <div className="grid grid-cols-5 gap-2">
 *     <ItemSlot hotkey={1} image="/items/water.png" label="Water" count={3} />
 *     <ItemSlot image="/items/lockpick.png" label="Lockpick" durability={42} dropTarget />
 *     <ItemSlot />                                              // empty
 *   </div>
 *   <ItemSlot image={img} label="Radio" price={<Money amount={250} />} stock={12} />   // a shop
 *   <ItemSlot surface="hud" hotkey={2} image={img} count={2} active />               // the hotbar
 *
 * It fills its grid cell (`size="fill"`) unless you give it a size. With `onClick` it is a
 * button (focusable, Enter / Space); drag and drop stays with the caller (pass `dropTarget`,
 * `dragging`). Images are your URLs: an inventory's own item images, not theme colours.
 *
 * Role: One slot of an inventory, hotbar or shop.
 * Anatomy: item-slot > image | icon > name, count, hotkey, price, stock > durability line
 * Props: image, label, count, hotkey, durability, price, active, dropTarget, dragging, locked, surface, size.
 * Level means: durability, 0–100 as 0–1 (the line under the item).
 * Rules: data-state: focus (active or drop target), disabled (locked); the slot's own state is data-slot-state.
 *   Drag and drop stays with the caller.
 */

const itemSlotVariants = cva(
  "group/item-slot relative flex aspect-square min-w-0 flex-col rounded-(--nk-row-radius) p-[calc(var(--nk-space)*2)] text-left outline-none transition-opacity select-none",
  {
    variants: {
      surface: {
        /** A well in a panel (inventory, shop, stash). */
        panel: "",
        /** The game's HUD surface (a hotbar on the world). */
        // The surface itself (nk-hud, or primary when active) is picked in the component.
        hud: "nk-shadow rounded-(--nk-hud-radius) [clip-path:var(--nk-chip-clip)]",
      },
      size: {
        fill: "w-full",
        sm: "w-14",
        md: "w-20",
        lg: "w-24",
      },
    },
    defaultVariants: {
      surface: "panel",
      size: "fill",
    },
  }
)

type ItemSlotState = "empty" | "filled" | "active" | "drop-target" | "dragging" | "locked"

/** The one state a slot shows; drop target and dragging win over the rest, then locked, active. */
function itemSlotState({
  filled,
  active,
  dropTarget,
  dragging,
  locked,
}: {
  filled: boolean
  active?: boolean
  dropTarget?: boolean
  dragging?: boolean
  locked?: boolean
}): ItemSlotState {
  if (dropTarget) return "drop-target"
  if (dragging) return "dragging"
  if (locked) return "locked"
  if (!filled) return "empty"
  return active ? "active" : "filled"
}

/** Durability 0–100 (clamped, NaN → 0), and whether it's low (below 20). */
function durabilityLevel(value: number) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return { value: v, low: v < 20 }
}

type ItemSlotProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof itemSlotVariants> & {
    /** The item's image: a URL or your own element. No image and no label = an empty slot. */
    image?: string | React.ReactNode
    label?: React.ReactNode
    /** How many; shown top right when more than 1. */
    count?: number
    /** Hotbar key, top left. */
    hotkey?: React.ReactNode
    /** Shop stock, top left (instead of a hotkey). */
    stock?: React.ReactNode
    /** Shop price, top right (instead of the count): text or <Money>. */
    price?: React.ReactNode
    /** 0–100: a line along the bottom; destructive below 20. */
    durability?: number
    /** Selected (the hotbar's current slot, the item a menu is open for). */
    active?: boolean
    /** A dragged item is over this slot. */
    dropTarget?: boolean
    /** This slot's item is being dragged (it fades). */
    dragging?: boolean
    /** Can't be taken, bought or crafted: dimmed, greyed, with a lock. */
    locked?: boolean
    /** Makes it a button. */
    onClick?: React.MouseEventHandler<HTMLDivElement>
  }

function ItemSlot({
  className,
  surface,
  size,
  image,
  label,
  count,
  hotkey,
  stock,
  price,
  durability,
  active = false,
  dropTarget = false,
  dragging = false,
  locked = false,
  onClick,
  onKeyDown,
  ...props
}: ItemSlotProps) {
  const filled = (image !== undefined && image !== null && image !== "") || (label !== undefined && label !== null && label !== "")
  const state = itemSlotState({ filled, active, dropTarget, dragging, locked })
  const hud = surface === "hud"
  const hudActive = hud && state === "active"
  const interactive = !!onClick && filled && !locked
  const corner = hotkey ?? stock
  const right = price ?? (count !== undefined && count > 1 ? count.toLocaleString() : null)
  const dur = durability !== undefined ? durabilityLevel(durability) : undefined

  return (
    <div
      data-slot="item-slot"
      data-slot-state={state}
      data-state={nkState({ disabled: locked, focus: active || dropTarget })}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-disabled={locked || undefined}
      aria-pressed={interactive && active ? true : undefined}
      aria-label={typeof label === "string" ? [label, count && count > 1 ? `${count}` : null].filter(Boolean).join(", ") : undefined}
      className={cn(
        itemSlotVariants({ surface, size }),
        !hud && (filled ? "bg-muted/60" : "bg-muted/25"),
        interactive && "cursor-pointer hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
        // A ring, not an outline: the base outline-none would win over outline-2.
        // On the HUD: the HUD surface, or primary with primary-foreground content when active
        // (never both: nk-hud sets its own background and colour).
        hud && (hudActive ? "bg-(--nk-chip-active-bg) text-(--nk-chip-active-fg) [box-shadow:var(--nk-chip-glow)]" : "nk-hud"),
        state === "active" && !hud && "ring-2 ring-(--nk-row-indicator-color) ring-inset",
        state === "drop-target" && "bg-accent ring-2 ring-(--nk-row-indicator-color) ring-inset",
        state === "dragging" && "opacity-40",
        state === "locked" && "opacity-50",
        className
      )}
      onClick={interactive ? onClick : undefined}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (interactive && !e.defaultPrevented && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          e.currentTarget.click()
        }
      }}
      {...props}
    >
      <div
        data-slot="item-slot-top"
        className={cn("nk-num flex h-3 shrink-0 items-center justify-between gap-1 text-(length:--nk-text-label) leading-none", hudActive ? "" : hud ? "opacity-75" : "text-muted-foreground")}
      >
        <span data-slot="item-slot-corner">{corner}</span>
        {right !== null && right !== undefined && (
          <span data-slot="item-slot-right" className={cn("[font-weight:var(--nk-type-label-weight,500)]", !hud && "text-foreground")}>
            {right}
          </span>
        )}
      </div>
      {filled && (
        <>
          <div className="grid min-h-0 flex-1 place-items-center">
            {typeof image === "string" ? (
              <img src={image} alt="" draggable={false} loading="lazy" className="size-3/5 object-contain" />
            ) : (
              image
            )}
          </div>
          {label !== undefined && !hud && (
            <div data-slot="item-slot-label" className="truncate text-center text-(length:--nk-text-label) leading-4 [font-weight:var(--nk-type-label-weight,500)]">
              {label}
            </div>
          )}
        </>
      )}
      {locked && (
        <LockIcon aria-hidden className="absolute right-1.5 bottom-1.5 size-3.5 text-muted-foreground" />
      )}
      {dur && (
        <div
          data-slot="item-slot-durability"
          role="meter"
          aria-label="Durability"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(dur.value)}
          className={cn(
            "absolute inset-x-2 bottom-1 h-0.5 overflow-hidden",
            hud ? "nk-track" : "bg-foreground/15"
          )}
        >
          <div
            className={cn(
              "h-full",
              dur.low ? "bg-destructive" : hudActive ? "bg-(--nk-chip-active-fg)" : hud ? "bg-hud-foreground" : "bg-foreground"
            )}
            style={{ width: `${dur.value}%` }}
          />
        </div>
      )}
    </div>
  )
}

export { ItemSlot, itemSlotVariants, itemSlotState, durabilityLevel, type ItemSlotState, type ItemSlotProps }
