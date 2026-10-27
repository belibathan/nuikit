"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { installPressFeel, useStaggerGroup, useStaggerItem } from "nuikit-core/react"
import { Slot } from "radix-ui"

import { cn, nkConfirm, nkState, nkVariant, type NkVariantProps } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Kbd, KbdGroup, Tile } from "@/components/ui/tile"
import { Progress } from "@/components/ui/progress"
import { meterColor, type MeterTone } from "@/components/ui/meter"
import { SelectionTile } from "@/components/ui/selection-tile"

/**
 * MenuRow — the action row every list is made of (docs/design.md, rule 5; the baseline, docs/design.md):
 * an icon in a tile (one icon size, one column) or an image, a title in the label voice, an optional description
 * in the body voice and progress, and one trailing thing: meta text, a
 * chevron, a Kbd, a checkbox or a value stepper. Selection is one language (the baseline's Selection
 * section): the pointer's hover, keyboard, controller and programmatic focus, and the list's active row all
 * light the row the same way, and the lit row sits on a Tile (the primary keycap's face and wall). In a
 * `MenuRowList` that Tile is one SelectionTile sliding between the rows; a row on its own draws it itself.
 * No focus ring, no per-row hover fill. The default look of the `menu` intent's items (docs/architecture.md §2).
 *
 *   <MenuRow icon={<MapIcon />} kbd="P" onClick={openMap}>Map</MenuRow>
 *   <MenuRow icon={<CarIcon />} description="Stored, 98% condition" meta="ZEN 01" chevron>Zentorno</MenuRow>
 *   <MenuRow image="/cars/sultan.png" progress={64} description="Fuel">Karin Sultan</MenuRow>
 *   <MenuRow checked={hud} onCheckedChange={setHud}>Show HUD</MenuRow>
 *   <MenuRow value="Medium" valueTone="muted" onStep={(d) => cycle(d)}>Voice range</MenuRow>
 *   <MenuRow readOnly description="Set by your job">Callsign</MenuRow>
 *   <MenuRow tone="destructive" icon={<LogOutIcon />}>Disconnect</MenuRow>
 *   <MenuRow readOnly description="Officer, on duty" actions={<Button size="icon-sm" variant="ghost" aria-label="Promote" …/>}>Lee</MenuRow>
 *
 * A checkbox or stepper row is a focusable div (a button can't hold one): Enter / Space toggle
 * it, Left / Right step it. `actions` are trailing controls that act on the row (promote, fire,
 * track): the row is a div too, the controls are reached with Tab, and a click or key on one
 * never fires the row's own click, toggle or step.
 *
 * `inert` (not the HTML attribute: the row stays clickable and focusable) turns hover off: in
 * game CEF keeps :hover matched after Lua takes focus away, so a UI that drives the highlight
 * itself sets it and hover changes nothing (background, text, icon, chevron). `readOnly` is a row
 * you read, not use: no highlight, no click, not dimmed.
 *
 * `MenuRowList` holds the rows of a list: one SelectionTile slides to the lit row (the hovered or focused one,
 * else `active`, the row the UI drives: keys, Lua) instead of each row marking itself. Rows sit
 * --nk-list-gap apart, so the tile's wall never touches the next row, and the list pads its sides by
 * --nk-list-pad-x (the tile's inset plus its skew overhang), so the face never touches the panel's edge:
 *
 *   <MenuRowList active={i}>{items.map((it, j) => <MenuRow key={it.id} active={j === i}>…</MenuRow>)}</MenuRowList>
 *
 * `MenuRowDetails` is the card beside a hovered row: an image and metadata (label, value,
 * progress, each bar in its own colour). `menuMetadata()` reads ox_lib's metadata shapes into its
 * items, keeping each item's colorScheme. `menuRowColor()` turns a tone, a library colour name or
 * a CSS colour into what the bars paint with (`progressColor`, an item's `color`).
 *
 * `as="div"` (1.5) renders the row as a focusable div with the row's look (a row inside another control, a
 * row a parent drives), and `kbd` takes one key or a list (["Shift", "E"]): the kbd trail, Tiles gap-items apart.
 *
 * Role: the one action row every list is made of (menus, sheets, settings, pickers).
 * Anatomy: the lit tile (the list's SelectionTile, or the row's own ::before wall and ::after face) > lead (an icon Tile in the icon column, or an image) > body (a
 *   label-voice title over a body-voice description, an optional progress line) > trail (meta, the kbd trail, a checkbox, a stepper, actions, a chevron).
 * Props: icon, iconSpace, image, description, progress, meta, kbd, chevron, active, checked, value, onStep,
 *   readOnly, alert, inert, actions, as, asChild, tone; MenuRowList: active, indicator, bleed.
 * Level means: progress, the row's progress line (0–100 of its value, drawn 0–1).
 * Rules: one trailing thing per row; height --nk-height-row, padding --nk-row-pad-y / -x, gaps --nk-row-gap; rows of a
 *   list sit --nk-list-gap apart and the list pads its sides by --nk-list-pad-x (inset + skew overhang) so the lit
 *   tile never touches the panel edge; hover, focus and active are one lit state (data-lit): the Tile under it, the
 *   content slid by --nk-gesture-lift, the icon tile lit; no focus ring; attention is data-state="alert"; a trailing
 *   key is a Tile (Kbd), never text.
 */
const menuRowVariants = cva(
  [
    "group/menu-row nk-row w-full cursor-default text-left outline-none select-none",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-(--nk-icon-md)",
  ],
  {
    variants: {
      tone: {
        default: "",
        destructive: "text-destructive",
      },
      // whether the pointer lights the row (data-hover); the look is the one lit state (kit.css), never a fill here
      hover: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      tone: "default",
      hover: true,
    },
  }
)

/** 0–100, NaN → 0. */
const clampPercent = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0))

type MenuRowProps = Omit<React.ComponentProps<"button">, "value" | "inert"> &
  VariantProps<typeof menuRowVariants> & {
    icon?: React.ReactNode
    /** Keep the icon column without an icon (rows of a list where some have one: every title starts on one line). */
    iconSpace?: boolean
    /** A thumbnail instead of the icon: an item, a car, a face. A URL or your own element. */
    image?: string | React.ReactNode
    description?: React.ReactNode
    /** A slim bar under the label, 0–100. */
    progress?: number
    /**
     * The bar's colour, like Meter's: a tone ("success", "chart-2", "health"), a library colour
     * name (ox's "green", "red.6") or a CSS colour ("#4dabf7"). Default: primary.
     */
    progressColor?: string
    /** Right-aligned text: a price, a count, a plate. Tabular. */
    meta?: React.ReactNode
    /** The key that triggers this row (a Tile Kbd), or keys pressed together: the kbd trail. */
    kbd?: React.ReactNode | readonly React.ReactNode[]
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
    /** Needs attention (overdue, low, wanted): data-state="alert". */
    alert?: boolean
    /** Hover changes nothing; the row is still clickable and focusable (see above). */
    inert?: boolean
    /** Trailing controls that act on the row (icon buttons). Keyboard-reachable; their events stay theirs. */
    actions?: React.ReactNode
    /** Render your own element (a link) with the row's styles. */
    asChild?: boolean
    /** div: a focusable div with the row's look instead of a button (1.5). Default: button (or a div when it must be). */
    as?: "button" | "div"
  }

function MenuRow({
  className,
  tone,
  icon,
  iconSpace = false,
  image,
  description,
  progress,
  progressColor,
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
  alert = false,
  inert = false,
  actions,
  disabled,
  asChild = false,
  as,
  hover,
  children,
  onClick,
  onKeyDown,
  density,
  shape,
  motion,
  ...props
}: NkVariantProps & MenuRowProps) {
  // inside a <Stagger> (a sheet, a list) the row rises in with the others and folds out with them
  const inGroup = useStaggerGroup() !== null
  const staggerRef = useStaggerItem<HTMLElement>(undefined, { appear: true, animate: inGroup ? "rise" : false })
  const userRef = (props as { ref?: React.Ref<HTMLElement> }).ref
  const ref = React.useCallback(
    (el: HTMLElement | null) => {
      staggerRef(el)
      if (typeof userRef === "function") userRef(el)
      else if (userRef) (userRef as React.MutableRefObject<HTMLElement | null>).current = el
    },
    [staggerRef, userRef]
  )
  React.useEffect(() => installPressFeel(), [])
  const isCheck = checked !== undefined
  const isStepper = onStep !== undefined
  const hasActions = actions !== undefined && actions !== null && actions !== false
  const asDiv = as === "div" || isCheck || isStepper || readOnly || hasActions
  const hovers = hover ?? !(inert || readOnly)
  // secondary text; the lit row's ink (kit.css, the Selection section) takes it over
  const quiet = "text-muted-foreground"

  const step = (dir: -1 | 1) => !disabled && !readOnly && onStep?.(dir)
  const toggle = () => !disabled && !readOnly && onCheckedChange?.(!checked)

  const lead =
    image !== undefined && image !== null ? (
      <span data-slot="menu-row-image" className="flex size-[var(--nk-menu-row-image-size)] shrink-0 overflow-hidden rounded-(--nk-tile-face-radius) bg-muted">
        {typeof image === "string" ? <img src={image} alt="" className="size-full object-cover" /> : image}
      </span>
    ) : (
      icon ? (
        // the icon column: one icon size in a small tile (the tile lights with the row)
        <span data-slot="menu-row-icon">
          <Tile size="md" shape="square" aria-hidden>
            {icon}
          </Tile>
        </span>
      ) : (
        iconSpace && <span data-slot="menu-row-icon" aria-hidden />
      )
    )

  const label = (
    <>
      {lead}
      <span data-slot="menu-row-body">
        <span data-slot="menu-row-title" className="truncate">{children}</span>
        {description && (
          <span data-slot="menu-row-description" className={cn("truncate", quiet)}>
            {description}
          </span>
        )}
        {progress !== undefined && (
          <ProgressLine
            data-slot="menu-row-progress"
            value={progress}
            color={progressColor}
            label={typeof children === "string" ? children : undefined}
            className="mt-(--nk-space-2) mb-(--nk-space-1) h-[var(--nk-menu-row-progress-height)]"
          />
        )}
      </span>
      {meta !== undefined && (
        <span data-slot="menu-row-meta" className={cn("nk-num shrink-0 text-(length:--nk-text-label)", quiet)}>
          {meta}
        </span>
      )}
      {kbd !== undefined && kbd !== null && <MenuRowKbd keys={kbd} />}
      {isCheck && <Checkbox checked={checked} disabled={disabled} tabIndex={-1} aria-hidden className="pointer-events-none" />}
      {isStepper && (
        <span data-slot="menu-row-stepper" className="flex shrink-0 items-center gap-[var(--nk-menu-row-gap)]">
          <span
            className={cn("rounded-(--nk-radius-key) p-(--nk-space-1)", quiet, hovers && "hover:bg-background/50 hover:text-foreground")}
            onClick={(e) => (e.stopPropagation(), step(-1))}
            aria-hidden
          >
            <ChevronLeftIcon />
          </span>
          <span data-slot="menu-row-value" data-tone={valueTone} className={cn("nk-num min-w-[var(--nk-menu-row-value-width)] text-center text-(length:--nk-text-label)", valueTone === "muted" && quiet)}>
            {value}
          </span>
          <span
            className={cn("rounded-(--nk-radius-key) p-(--nk-space-1)", quiet, hovers && "hover:bg-background/50 hover:text-foreground")}
            onClick={(e) => (e.stopPropagation(), step(1))}
            aria-hidden
          >
            <ChevronRightIcon />
          </span>
        </span>
      )}
      {hasActions && (
        <span
          data-slot="menu-row-actions"
          // a control on a highlighted row would vanish into the accent: lift its hover off it
          className="flex shrink-0 items-center gap-[var(--nk-menu-row-gap)] [&>button:hover]:bg-background/50 [&>button:hover]:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </span>
      )}
      {chevron && <ChevronRightIcon data-slot="menu-row-chevron" className={quiet} />}
    </>
  )

  const shared = {
    ...nkVariant({ density, shape, motion }),
    "data-slot": "menu-row",
    "data-active": (active && !readOnly) || undefined,
    "data-state": nkState({ disabled, alert, focus: active && !readOnly }),
    "data-inert": inert || undefined,
    "data-tone": tone === "destructive" ? "destructive" : undefined,
    // the pointer lights a row that hovers the way the keyboard does (baseline: one selection language)
    "data-hover": (hovers && !readOnly) || undefined,
    "data-readonly": readOnly || undefined,
    className: cn(menuRowVariants({ tone, hover: hovers }), className),
  }

  if (asDiv) {
    return (
      <div
        {...shared}
        {...(props as React.ComponentProps<"div">)}
        ref={ref as React.Ref<HTMLDivElement>}
        role={isCheck ? "menuitemcheckbox" : "menuitem"}
        aria-checked={isCheck ? checked : undefined}
        aria-valuetext={isStepper && (typeof value === "string" || typeof value === "number") ? String(value) : undefined}
        aria-disabled={disabled || undefined}
        aria-readonly={readOnly || undefined}
        tabIndex={disabled || readOnly ? -1 : 0}
        onClick={(e) => {
          if (readOnly) return
          nkConfirm(e.currentTarget)
          onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>)
          if (isCheck) toggle()
        }}
        onKeyDown={(e) => {
          // keys on an action control are its own (the event still bubbles to a list's navigation)
          if (readOnly || e.target !== e.currentTarget) return
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
      <Slot.Root
        {...shared}
        aria-disabled={disabled || undefined}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => (nkConfirm(e.currentTarget), onClick?.(e))}
        onKeyDown={onKeyDown}
        {...props}
        ref={ref}
      >
        {children}
      </Slot.Root>
    )
  }

  return (
    <button
      type="button"
      {...shared}
      disabled={disabled}
      onClick={(e) => (nkConfirm(e.currentTarget), onClick?.(e))}
      onKeyDown={onKeyDown}
      {...props}
      ref={ref as React.Ref<HTMLButtonElement>}
    >
      {label}
    </button>
  )
}

/** The kbd trail: one key, or keys pressed together (a KbdGroup). */
function MenuRowKbd({ keys, className }: { keys: React.ReactNode | readonly React.ReactNode[]; className?: string }) {
  if (!Array.isArray(keys)) return <Kbd data-part="menu-row-kbd" className={className}>{keys as React.ReactNode}</Kbd>
  return (
    <KbdGroup data-part="menu-row-kbd" className="shrink-0">
      {keys.map((k, i) => (
        <Kbd key={i} className={className}>
          {k}
        </Kbd>
      ))}
    </KbdGroup>
  )
}

type MenuMetadataItem = {
  label?: React.ReactNode
  value?: React.ReactNode
  progress?: number
  /** The bar's colour: a tone, a library colour name ("green", "red.6") or a CSS colour. */
  color?: string
}

/**
 * ox_lib's metadata in any of its shapes to MenuRowDetails items: a list of strings, a record of
 * label → value, or a list of { label, value, progress, colorScheme }. Each item keeps its own
 * colorScheme (as `color`). Anything else gives no items.
 */
function menuMetadata(meta: unknown): MenuMetadataItem[] {
  const text = (v: unknown) => (v === undefined || v === null ? undefined : typeof v === "object" ? JSON.stringify(v) : String(v))
  if (!meta || typeof meta !== "object") return []
  if (Array.isArray(meta)) {
    return meta.flatMap((m): MenuMetadataItem[] => {
      if (typeof m === "string" || typeof m === "number") return [{ value: String(m) }]
      if (m && typeof m === "object" && "label" in m) {
        const o = m as { label: unknown; value?: unknown; progress?: unknown; colorScheme?: unknown }
        const p = Number(o.progress)
        const item: MenuMetadataItem = {
          label: text(o.label),
          value: text(o.value),
          progress: o.progress !== undefined && Number.isFinite(p) ? p : undefined,
        }
        if (typeof o.colorScheme === "string" && o.colorScheme.trim()) item.color = o.colorScheme.trim()
        return [item]
      }
      return []
    })
  }
  return Object.entries(meta as Record<string, unknown>).map(([label, value]) => ({ label, value: text(value) }))
}

/** Theme variables behind each tone (docs/tokens.md). */
const TONE_VAR: Record<MeterTone, string> = {
  primary: "--primary",
  foreground: "--foreground",
  destructive: "--destructive",
  success: "--success",
  warning: "--warning",
  info: "--info",
  "chart-1": "--chart-1",
  "chart-2": "--chart-2",
  "chart-3": "--chart-3",
  "chart-4": "--chart-4",
  "chart-5": "--chart-5",
  health: "--vital-health",
  armor: "--vital-armor",
  hunger: "--vital-hunger",
  thirst: "--vital-thirst",
  stress: "--vital-stress",
}

/** Colour names that mean "no colour": the muted tone. */
const MUTED_NAMES = new Set(["muted", "dark", "gray", "grey"])

/**
 * A progress colour as a CSS value: a tone ("success", "chart-2") or a name a library uses
 * (ox's Mantine "green", "red.6", through meterColor()) becomes `var(--token)`, so it follows the
 * theme; a CSS colour ("#4dabf7", "rgb(…)") passes through; anything else is undefined (the
 * default primary bar). `muted` (and ox's greys, `dark.3`, `gray.6`: what a bar gets when the script
 * set no colour) is `--muted-foreground`, so an uncoloured bar stays quiet beside coloured ones.
 */
function menuRowColor(input?: string | null): string | undefined {
  const v = (input ?? "").trim()
  if (!v) return undefined
  if (MUTED_NAMES.has(v.toLowerCase().replace(/\.\d+$/, ""))) return "var(--muted-foreground)"
  if (Object.prototype.hasOwnProperty.call(TONE_VAR, v)) return `var(${TONE_VAR[v as MeterTone]})`
  const m = meterColor(v)
  if (m.tone) return `var(${TONE_VAR[m.tone]})`
  return m.color
}

/**
 * The slim bar a row or a details item draws. A colour rides in --menu-row-progress and is painted
 * by a class, so nothing is mixed in an inline style (Chromium 103); a coloured bar gets a neutral
 * track (the colour's own tint can't be mixed inline).
 */
function ProgressLine({
  value,
  color,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Progress>, "color"> & { value: number; color?: string; label?: string }) {
  const fill = menuRowColor(color)
  return (
    <Progress
      value={clampPercent(value)}
      // shadcn's Progress never hands `value` to Radix's root: give the root its aria-valuenow.
      aria-valuenow={Math.round(clampPercent(value))}
      aria-label={label}
      data-color={color}
      style={fill ? ({ "--menu-row-progress": fill } as React.CSSProperties) : undefined}
      className={cn(fill && "bg-foreground/15 [&_[data-slot=progress-indicator]]:bg-(--menu-row-progress)", className)}
      {...props}
    />
  )
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
    <div data-slot="menu-row-details" className={cn("nk-panel nk-enter flex w-(--nk-menu-row-details-width) flex-col overflow-hidden", className)} {...props}>
      {image !== undefined && image !== null && (
        <div data-slot="menu-row-details-image" className="aspect-video w-full overflow-hidden bg-muted">
          {typeof image === "string" ? <img src={image} alt="" className="size-full object-cover" /> : image}
        </div>
      )}
      {(title || items.length > 0 || children) && (
        <div className="flex flex-col gap-2 p-3">
          {title && <p className="nk-title truncate">{title}</p>}
          {items.length > 0 && (
            <dl className="flex flex-col gap-(--nk-space-2) text-(length:--nk-text-label) leading-4">
              {items.map((m, i) => (
                <div key={i} data-slot="menu-row-details-item" className="flex flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    {m.label !== undefined && <dt className="nk-caption truncate">{m.label}</dt>}
                    {m.value !== undefined && <dd className={cn("nk-num truncate", m.label !== undefined && "ml-auto")}>{m.value}</dd>}
                  </div>
                  {m.progress !== undefined && (
                    <ProgressLine
                      data-slot="menu-row-details-progress"
                      value={m.progress}
                      color={m.color}
                      label={typeof m.label === "string" ? m.label : undefined}
                      className="h-1"
                    />
                  )}
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

/**
 * The rows of one list, --nk-list-gap apart, with one SelectionTile sliding to the lit row: the hovered or
 * focused one, else `active` (an index among the rows; null or undefined: none). The rows change state
 * instantly; only the tile moves, and a held key jumps instead of trailing. `indicator={false}` leaves each
 * lit row drawing its own tile.
 *
 * The list keeps the lit tile off its container's edge: inline padding of --nk-list-pad-x, by default the tile's
 * inset plus its skew overhang (--nk-tile-key-overhang: half a row's height × tan(--nk-tile-face-skew); 0.25rem for the
 * stock -12deg), so a sheet or panel that puts the list flush never clips the face's slanted corner. `bleed`
 * drops the padding (a list whose container already pads).
 */
const LIST_PAD = "[padding-inline:var(--nk-list-pad-x)]"

function MenuRowList({
  active,
  indicator = true,
  bleed = false,
  className,
  children,
  density,
  shape,
  motion,
  ...props
}: NkVariantProps & React.ComponentProps<"div"> & { active?: number | null; indicator?: boolean; bleed?: boolean }) {
  return (
    <div {...nkVariant({ density, shape, motion })} data-slot="menu-row-list" className={cn("nk-list", !bleed && LIST_PAD, className)} {...props}>
      {indicator && <SelectionTile shape="tile" data-part="menu-row-indicator" items="[data-slot=menu-row]" pointer="[data-hover]" active={active} />}
      {children}
    </div>
  )
}

export {
  MenuRow,
  MenuRowDetails,
  MenuRowList,
  menuRowVariants,
  menuMetadata,
  menuRowColor,
  type MenuRowProps,
  type MenuMetadataItem,
}
