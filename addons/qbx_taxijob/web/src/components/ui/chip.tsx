// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/chip.tsx, then run pnpm sync.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, nkVariant, type NkVariantProps } from "@/lib/utils"
import { toneVars } from "@/components/ui/fill"

/**
 * Chip — a short status on one line (docs/design/components.md, foundation), in one of two materials:
 *
 * - `material="panel"` (default): on a panel. --nk-height-chip tall, --nk-radius-chip corners (never a pill), the label
 *   role, an --nk-icon-md icon; a hairline rim (fill hair), a tint or a solid. kit.css draws it on
 *   `data-slot="chip"`.
 * - `material="hud"`: on the game world (voice range, radio, a seatbelt warning, a hotbar slot). No panel, no
 *   border: the kit's dark game surface (nk-chip, or nk-hud for `shape="tile"`), so it reads over any sky with
 *   any theme. `active` (talking, the selected slot) is the theme's primary rising from the bottom; `state=
 *   "warning"` (or tone danger) is destructive. Drawn on `data-slot="hud-chip"`. This was HudChip.
 *
 *   <Chip icon={<BadgeCheckIcon />} tone="success">On duty</Chip>
 *   <Chip hue="legendary" fill="tint">Legendary</Chip>
 *   <Chip count={3}>Items</Chip>
 *   <Chip variant="dot" tone="success" aria-label="Online" />
 *   <Chip material="hud" icon={<MicIcon />} active={talking}>Normal</Chip>
 *   <Chip material="hud" icon={<TriangleAlertIcon />} tone="danger">Seatbelt</Chip>
 *   <Chip material="hud" shape="tile" icon={<PillIcon />}>3</Chip>
 *
 * Role: A tag, a count, a status dot, a fact on the HUD: one chip.
 * Anatomy: chip (panel: data-slot="chip"; hud: data-slot="hud-chip", pill | tile) > icon > label > count
 * Props: material, tone, hue, fill, icon, count, variant, shape, state, active, density, motion.
 * Rules: No pills on a panel: r-chip, or the dot at r-key; on the HUD the corners follow data-nk-shape. Colour means
 *   something: tone or hue only (the HUD's warning is destructive, active is primary). data-hue carries a role.
 */

/** The HUD material (nk-chip / nk-hud): its form and state. */
const chipHudVariants = cva("nk-num shrink-0 [&_svg]:pointer-events-none [&_svg]:shrink-0", {
  variants: {
    shape: {
      /** 28px pill: icon + short text. */
      pill: "nk-chip [&_svg:not([class*='size-'])]:size-3.5",
      /** 48px square tile: icon over a short label. */
      tile: "nk-hud inline-flex size-12 flex-col items-center justify-center gap-(--nk-space-1) text-(length:--nk-text-label) leading-4 [font-weight:var(--nk-type-label-weight)] [&_svg:not([class*='size-'])]:size-5",
    },
    state: {
      default: "[&_[data-slot=hud-chip-icon]]:opacity-75",
      active: "nk-chip-active",
      warning: "bg-destructive text-destructive-foreground",
    },
  },
  defaultVariants: {
    shape: "pill",
    state: "default",
  },
})

type ChipTone = "neutral" | "info" | "success" | "warning" | "danger" | "destructive" | "error"

type ChipProps = Omit<NkVariantProps, "shape"> &
  React.ComponentProps<"span"> &
  VariantProps<typeof chipHudVariants> & {
    /** panel (default): on a panel, the hairline chip. hud: on the game world (nk-chip / nk-hud). */
    material?: "panel" | "hud"
    tone?: ChipTone
    hue?: string
    /** panel: hair (a rim, the default), tint or solid. */
    fill?: "hair" | "tint" | "solid"
    icon?: React.ReactNode
    /** A number after the label (tabular). */
    count?: React.ReactNode
    /** panel: chip, or dot (the status dot). */
    variant?: "chip" | "dot"
    /** hud: shorthand for state="active" (talking, selected). */
    active?: boolean
  }

function Chip({ material = "panel", ...props }: ChipProps) {
  return material === "hud" ? <HudMaterial {...props} /> : <PanelMaterial {...props} />
}

function PanelMaterial({
  className,
  tone,
  hue,
  fill = "hair",
  icon,
  count,
  variant = "chip",
  shape: _shape,
  state: _state,
  active: _active,
  density,
  motion,
  children,
  ...props
}: Omit<ChipProps, "material">) {
  const dot = variant === "dot"
  return (
    <span
      {...nkVariant({ density, motion })}
      data-slot="chip"
      data-variant={dot ? "dot" : undefined}
      data-fill={fill === "hair" ? undefined : fill}
      {...toneVars({ tone: tone === "neutral" ? undefined : tone, hue })}
      role={dot && props["aria-label"] ? "img" : undefined}
      className={cn(className)}
      {...props}
    >
      {!dot && icon}
      {!dot && children}
      {!dot && count !== undefined && <span data-slot="chip-count">{count}</span>}
    </span>
  )
}

function HudMaterial({
  className,
  shape,
  state,
  active,
  tone,
  icon,
  count,
  children,
  hue,
  fill: _fill,
  variant: _variant,
  density,
  motion,
  ...props
}: Omit<ChipProps, "material">) {
  const danger = tone === "danger" || tone === "destructive" || tone === "error"
  const s = state ?? (active ? "active" : danger ? "warning" : "default")
  return (
    <span
      {...nkVariant({ density, motion })}
      data-slot="hud-chip"
      data-hue={hue}
      data-state={s}
      className={cn(chipHudVariants({ shape, state: s }), className)}
      {...props}
    >
      {icon && (
        <span data-slot="hud-chip-icon" className="flex">
          {icon}
        </span>
      )}
      {children !== undefined && children !== null && children !== false && <span className="truncate">{children}</span>}
      {count !== undefined && <span data-slot="chip-count">{count}</span>}
    </span>
  )
}

export { Chip, chipHudVariants, type ChipProps, type ChipTone }
