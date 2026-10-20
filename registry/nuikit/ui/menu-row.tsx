"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Kbd } from "@/components/ui/kbd"
import { Progress } from "@/components/ui/progress"

/**
 * MenuRow — the 40px action row every list is made of (docs/design.md, rule 5): an icon or an
 * image, a label, an optional description and progress, and one trailing thing: meta text, a
 * chevron, a Kbd, a checkbox or a value stepper. Highlight is the theme's accent, like shadcn's
 * menus. The default look of the `menu` intent's items (docs/architecture.md §2).
 *
 *   <MenuRow icon={<MapIcon />} kbd="P" onClick={openMap}>Map</MenuRow>
 *   <MenuRow icon={<CarIcon />} description="Stored, 98% condition" meta="ZEN 01" chevron>Zentorno</MenuRow>
 *   <MenuRow image="/cars/sultan.png" progress={64} description="Fuel">Karin Sultan</MenuRow>
 *   <MenuRow checked={hud} onCheckedChange={setHud}>Show HUD</MenuRow>
 *   <MenuRow value="Medium" valueTone="muted" onStep={(d) => cycle(d)}>Voice range</MenuRow>
 *   <MenuRow readOnly description="Set by your job">Callsign</MenuRow>
 *   <MenuRow tone="destructive" icon={<LogOutIcon />}>Disconnect</MenuRow>
 *
 * A checkbox or stepper row is a focusable div (a button can't hold one): Enter / Space toggle
 * it, Left / Right step it.
 *
 * `inert` (not the HTML attribute: the row stays clickable and focusable) turns hover off: in
 * game CEF keeps :hover matched after Lua takes focus away, so a UI that drives the highlight
 * itself sets it and hover changes nothing (background, text, icon, chevron). `readOnly` is a row
 * you read, not use: no highlight, no click, not dimmed.
 *
 * `MenuRowDetails` is the card beside a hovered row: an image and metadata (label, value,
 * progress). `menuMetadata()` reads ox_lib's metadata shapes into its items.
 */
const menuRowVariants = cva(
  [
    "group/menu-row nk-row w-full cursor-default text-left font-medium outline-none select-none",
    "focus-visible:bg-accent focus-visible:text-accent-foreground",
    "data-[active]:bg-accent data-[active]:text-accent-foreground",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      tone: {
        default: "",
        destructive: "text-destructive focus-visible:text-destructive data-[active]:text-destructive",
      },
      hover: {
        true: "hover:bg-accent hover:text-accent-foreground",
        false: "",
      },
    },
    compoundVariants: [{ tone: "destructive", hover: true, className: "hover:text-destructive" }],
    defaultVariants: {
      tone: "default",
      hover: true,
    },
  }
)

/** Icons and secondary text follow the row into its highlight (keyboard and active always; hover unless inert). */
const ON_HIGHLIGHT = "group-focus-visible/menu-row:text-accent-foreground group-data-[active]/menu-row:text-accent-foreground"
const ON_HOVER = "group-hover/menu-row:text-accent-foreground"

/** In many themes muted = accent, so a Kbd would vanish into the highlight: lift it off it. */
const KBD_ON_HIGHLIGHT = "group-focus-visible/menu-row:bg-background/60 group-data-[active]/menu-row:bg-background/60"
const KBD_ON_HOVER = "group-hover/menu-row:bg-background/60"

type MenuRowProps = Omit<React.ComponentProps<"button">, "value" | "inert"> &
  VariantProps<typeof menuRowVariants> & {
    icon?: React.ReactNode
    /** A thumbnail instead of the icon: an item, a car, a face. A URL or your own element. */
    image?: string | React.ReactNode
    description?: React.ReactNode
    /** A slim bar under the label, 0–100. */
    progress?: number
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
    /** muted: the stepper value is quiet until the row is highlighted (lists of many steppers). */
    valueTone?: "default" | "muted"
    /** Shown, not used: no highlight, no click, not dimmed. */
    readOnly?: boolean
    /** Hover changes nothing; the row is still clickable and focusable (see above). */
    inert?: boolean
    /** Render your own element (a link) with the row's styles. */
    asChild?: boolean
  }

function MenuRow({
  className,
  tone,
  icon,
  image,
  description,
  progress,
  meta,
  kbd,
  chevron = false,
  active = false,
  checked,
  onCheckedChange,
  value,
  onStep,
  valueTone = "default",
  readOnly = false,
  inert = false,
  disabled,
  asChild = false,
  hover,
  children,
  onClick,
  onKeyDown,
  ...props
}: MenuRowProps) {
  const isCheck = checked !== undefined
  const isStepper = onStep !== undefined
  const asDiv = isCheck || isStepper || readOnly
  const hovers = hover ?? !(inert || readOnly)
  // readOnly rows never highlight, not even when told to.
  const lit = readOnly ? "" : cn(ON_HIGHLIGHT, hovers && ON_HOVER)
  const kbdLit = readOnly ? "" : cn(KBD_ON_HIGHLIGHT, hovers && KBD_ON_HOVER)
  const quiet = cn("text-muted-foreground", lit)

  const step = (dir: -1 | 1) => !disabled && !readOnly && onStep?.(dir)
  const toggle = () => !disabled && !readOnly && onCheckedChange?.(!checked)

  const lead =
    image !== undefined && image !== null ? (
      <span data-slot="menu-row-image" className="flex size-8 shrink-0 overflow-hidden rounded-md bg-muted">
        {typeof image === "string" ? <img src={image} alt="" className="size-full object-cover" /> : image}
      </span>
    ) : (
      icon && (
        <span data-slot="menu-row-icon" className={cn("flex", tone === "destructive" ? "" : quiet)}>
          {icon}
        </span>
      )
    )

  const label = (
    <>
      {lead}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{children}</span>
        {description && (
          <span data-slot="menu-row-description" className={cn("truncate text-xs leading-4 font-normal", quiet)}>
            {description}
          </span>
        )}
        {progress !== undefined && (
          <Progress
            data-slot="menu-row-progress"
            value={Math.max(0, Math.min(100, Number.isFinite(progress) ? progress : 0))}
            aria-label={typeof children === "string" ? children : undefined}
            className="mt-1.5 mb-0.5 h-1"
          />
        )}
      </span>
      {meta !== undefined && (
        <span data-slot="menu-row-meta" className={cn("nk-num shrink-0 text-xs", quiet)}>
          {meta}
        </span>
      )}
      {kbd !== undefined && <Kbd className={kbdLit}>{kbd}</Kbd>}
      {isCheck && <Checkbox checked={checked} disabled={disabled} tabIndex={-1} aria-hidden className="pointer-events-none" />}
      {isStepper && (
        <span data-slot="menu-row-stepper" className="flex shrink-0 items-center gap-1">
          <span
            className={cn("rounded-sm p-0.5", quiet, hovers && "hover:bg-background/50 hover:text-foreground")}
            onClick={(e) => (e.stopPropagation(), step(-1))}
            aria-hidden
          >
            <ChevronLeftIcon />
          </span>
          <span data-slot="menu-row-value" data-tone={valueTone} className={cn("nk-num min-w-12 text-center text-sm", valueTone === "muted" && quiet)}>
            {value}
          </span>
          <span
            className={cn("rounded-sm p-0.5", quiet, hovers && "hover:bg-background/50 hover:text-foreground")}
            onClick={(e) => (e.stopPropagation(), step(1))}
            aria-hidden
          >
            <ChevronRightIcon />
          </span>
        </span>
      )}
      {chevron && <ChevronRightIcon data-slot="menu-row-chevron" className={quiet} />}
    </>
  )

  const shared = {
    "data-slot": "menu-row",
    "data-active": (active && !readOnly) || undefined,
    "data-inert": inert || undefined,
    "data-readonly": readOnly || undefined,
    className: cn(menuRowVariants({ tone, hover: hovers }), readOnly && "focus-visible:bg-transparent", className),
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
        aria-readonly={readOnly || undefined}
        tabIndex={disabled || readOnly ? -1 : 0}
        onClick={(e) => {
          if (readOnly) return
          onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>)
          if (isCheck) toggle()
        }}
        onKeyDown={(e) => {
          if (readOnly) return
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

type MenuMetadataItem = { label?: React.ReactNode; value?: React.ReactNode; progress?: number }

/**
 * ox_lib's metadata in any of its shapes to MenuRowDetails items: a list of strings, a record of
 * label → value, or a list of { label, value, progress }. Anything else gives no items.
 */
function menuMetadata(meta: unknown): MenuMetadataItem[] {
  const text = (v: unknown) => (v === undefined || v === null ? undefined : typeof v === "object" ? JSON.stringify(v) : String(v))
  if (!meta || typeof meta !== "object") return []
  if (Array.isArray(meta)) {
    return meta.flatMap((m): MenuMetadataItem[] => {
      if (typeof m === "string" || typeof m === "number") return [{ value: String(m) }]
      if (m && typeof m === "object" && "label" in m) {
        const o = m as { label: unknown; value?: unknown; progress?: unknown }
        const p = Number(o.progress)
        return [{ label: text(o.label), value: text(o.value), progress: o.progress !== undefined && Number.isFinite(p) ? p : undefined }]
      }
      return []
    })
  }
  return Object.entries(meta as Record<string, unknown>).map(([label, value]) => ({ label, value: text(value) }))
}

/**
 * The card beside a hovered row: an image, a title and metadata rows (label and value, or a bar).
 * Place it yourself (next to the panel, its top on the row: see docs/design.md, first-row alignment).
 */
function MenuRowDetails({
  className,
  image,
  title,
  items = [],
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  image?: string | React.ReactNode
  title?: React.ReactNode
  items?: readonly MenuMetadataItem[]
}) {
  return (
    <div data-slot="menu-row-details" className={cn("nk-panel nk-enter flex w-64 flex-col overflow-hidden", className)} {...props}>
      {image !== undefined && image !== null && (
        <div data-slot="menu-row-details-image" className="aspect-video w-full overflow-hidden bg-muted">
          {typeof image === "string" ? <img src={image} alt="" className="size-full object-cover" /> : image}
        </div>
      )}
      {(title || items.length > 0 || children) && (
        <div className="flex flex-col gap-2 p-3">
          {title && <p className="nk-title truncate">{title}</p>}
          {items.length > 0 && (
            <dl className="flex flex-col gap-1.5 text-xs leading-4">
              {items.map((m, i) => (
                <div key={i} data-slot="menu-row-details-item" className="flex flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    {m.label !== undefined && <dt className="truncate font-medium text-muted-foreground">{m.label}</dt>}
                    {m.value !== undefined && <dd className={cn("nk-num truncate", m.label !== undefined && "ml-auto")}>{m.value}</dd>}
                  </div>
                  {m.progress !== undefined && <Progress value={Math.max(0, Math.min(100, m.progress))} className="h-1" />}
                </div>
              ))}
            </dl>
          )}
          {children}
        </div>
      )}
    </div>
  )
}

export { MenuRow, MenuRowDetails, menuRowVariants, menuMetadata, type MenuRowProps, type MenuMetadataItem }
