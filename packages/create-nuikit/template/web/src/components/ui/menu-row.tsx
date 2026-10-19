"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Kbd } from "@/components/ui/kbd"

/**
 * MenuRow — the 40px action row every list is made of (docs/design.md, rule 5): an icon, a label,
 * an optional description and one trailing thing: meta text, a chevron, a Kbd, a checkbox or a
 * value stepper. Highlight is the theme's accent, like shadcn's menus.
 *
 *   <MenuRow icon={<MapIcon />} kbd="P" onClick={openMap}>Map</MenuRow>
 *   <MenuRow icon={<CarIcon />} description="Stored, 98% condition" meta="ZEN 01" chevron>Zentorno</MenuRow>
 *   <MenuRow checked={hud} onCheckedChange={setHud}>Show HUD</MenuRow>
 *   <MenuRow value="Medium" onStep={(d) => cycle(d)}>Voice range</MenuRow>
 *   <MenuRow tone="destructive" icon={<LogOutIcon />}>Disconnect</MenuRow>
 *
 * A checkbox or stepper row is a focusable div (a button can't hold one): Enter / Space toggle
 * it, Left / Right step it.
 */
const menuRowVariants = cva(
  [
    "group/menu-row nk-row w-full cursor-default text-left font-medium outline-none select-none",
    "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
    "data-[active]:bg-accent data-[active]:text-accent-foreground",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      tone: {
        default: "",
        destructive:
          "text-destructive hover:text-destructive focus-visible:text-destructive data-[active]:text-destructive",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
)

/** Icons and secondary text follow the row into its highlight. */
const onHighlight =
  "group-hover/menu-row:text-accent-foreground group-focus-visible/menu-row:text-accent-foreground group-data-[active]/menu-row:text-accent-foreground"

type MenuRowProps = Omit<React.ComponentProps<"button">, "value"> &
  VariantProps<typeof menuRowVariants> & {
    icon?: React.ReactNode
    description?: React.ReactNode
    /** Right-aligned text: a price, a count, a plate. Tabular. */
    meta?: React.ReactNode
    /** The key that triggers this row, as a shadcn Kbd. */
    kbd?: React.ReactNode
    /** A chevron: this row opens something. */
    chevron?: boolean
    /** Highlighted (keyboard selection, the open section). */
    active?: boolean
    /** Makes it a checkbox row. */
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    /** Makes it a stepper row showing this value between ‹ and ›. */
    value?: React.ReactNode
    onStep?: (direction: -1 | 1) => void
    /** Render your own element (a link) with the row's styles. */
    asChild?: boolean
  }

function MenuRow({
  className,
  tone,
  icon,
  description,
  meta,
  kbd,
  chevron = false,
  active = false,
  checked,
  onCheckedChange,
  value,
  onStep,
  disabled,
  asChild = false,
  children,
  onClick,
  onKeyDown,
  ...props
}: MenuRowProps) {
  const isCheck = checked !== undefined
  const isStepper = onStep !== undefined
  const asDiv = isCheck || isStepper

  const step = (dir: -1 | 1) => !disabled && onStep?.(dir)
  const toggle = () => !disabled && onCheckedChange?.(!checked)

  const label = (
    <>
      {icon && (
        <span data-slot="menu-row-icon" className={cn("flex text-muted-foreground", tone !== "destructive" && onHighlight)}>
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{children}</span>
        {description && (
          <span data-slot="menu-row-description" className={cn("truncate text-xs leading-4 font-normal text-muted-foreground", onHighlight)}>
            {description}
          </span>
        )}
      </span>
      {meta !== undefined && (
        <span data-slot="menu-row-meta" className={cn("nk-num shrink-0 text-xs text-muted-foreground", onHighlight)}>
          {meta}
        </span>
      )}
      {kbd !== undefined && <Kbd>{kbd}</Kbd>}
      {isCheck && (
        <Checkbox checked={checked} disabled={disabled} tabIndex={-1} aria-hidden className="pointer-events-none" />
      )}
      {isStepper && (
        <span data-slot="menu-row-stepper" className="flex shrink-0 items-center gap-1">
          <span
            className={cn("rounded-sm p-0.5 text-muted-foreground hover:bg-background/50 hover:text-foreground", onHighlight)}
            onClick={(e) => (e.stopPropagation(), step(-1))}
            aria-hidden
          >
            <ChevronLeftIcon />
          </span>
          <span className="nk-num min-w-12 text-center text-sm">{value}</span>
          <span
            className={cn("rounded-sm p-0.5 text-muted-foreground hover:bg-background/50 hover:text-foreground", onHighlight)}
            onClick={(e) => (e.stopPropagation(), step(1))}
            aria-hidden
          >
            <ChevronRightIcon />
          </span>
        </span>
      )}
      {chevron && <ChevronRightIcon className={cn("text-muted-foreground", onHighlight)} />}
    </>
  )

  const shared = {
    "data-slot": "menu-row",
    "data-active": active || undefined,
    className: cn(menuRowVariants({ tone }), className),
  }

  if (asDiv) {
    return (
      <div
        {...shared}
        {...(props as React.ComponentProps<"div">)}
        role={isCheck ? "menuitemcheckbox" : "menuitem"}
        aria-checked={isCheck ? checked : undefined}
        aria-valuetext={isStepper && (typeof value === "string" || typeof value === "number") ? String(value) : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onClick={(e) => {
          onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>)
          if (isCheck) toggle()
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e as unknown as React.KeyboardEvent<HTMLButtonElement>)
          if (e.defaultPrevented) return
          if (isCheck && (e.key === "Enter" || e.key === " ")) (e.preventDefault(), toggle())
          else if (isStepper && e.key === "ArrowLeft") (e.preventDefault(), step(-1))
          else if (isStepper && e.key === "ArrowRight") (e.preventDefault(), step(1))
        }}
      >
        {label}
      </div>
    )
  }

  if (asChild) {
    return (
      <Slot.Root {...shared} aria-disabled={disabled || undefined} onClick={onClick} onKeyDown={onKeyDown} {...props}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <button type="button" {...shared} disabled={disabled} onClick={onClick} onKeyDown={onKeyDown} {...props}>
      {label}
    </button>
  )
}

export { MenuRow, menuRowVariants, type MenuRowProps }
