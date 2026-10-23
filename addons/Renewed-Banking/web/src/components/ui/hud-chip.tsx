// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/hud-chip.tsx, then run pnpm sync.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, nkVariant, type NkVariantProps } from "@/lib/utils"

/**
 * HudChip — an always-on mark on the game world (docs/design.md, rule 8): voice range, radio
 * channel, a seatbelt warning, a hotbar slot. No panel, no border: the kit's dark game surface
 * (nk-chip / nk-hud), so it reads over any sky with any theme.
 *
 *   <HudChip icon={<MicIcon />} active={talking}>Normal</HudChip>
 *   <HudChip icon={<RadioIcon />}>101 MHz</HudChip>
 *   <HudChip icon={<TriangleAlertIcon />} state="warning">Seatbelt</HudChip>
 *   <HudChip shape="tile" icon={<PillIcon />}>3</HudChip>
 *
 * `shape` is the chip's form (pill or tile); its corners follow `data-nk-shape` on any ancestor (kit variants).
 * `active` (talking, the selected slot) is the theme's primary; `warning` is destructive.
 *
 * Role: A small fact on the HUD: voice range, radio, seatbelt.
 * Anatomy: hud-chip (pill | tile) > icon > text
 * Props: shape, state, active, icon, density, motion, hue.
 * Rules: Its shape prop is the form (pill, tile); corners follow data-nk-shape on an ancestor. warning is the
 *   theme's destructive; active is primary. data-hue carries its role; the theme colours it.
 */
const hudChipVariants = cva(
  "nk-num shrink-0 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      shape: {
        /** 28px pill: icon + short text. */
        pill: "nk-chip [&_svg:not([class*='size-'])]:size-3.5",
        /** 48px square tile: icon over a short label. */
        tile: "nk-hud inline-flex size-12 flex-col items-center justify-center gap-(--nk-space-1) text-(length:--nk-text-label) leading-4 [font-weight:var(--nk-type-label-weight,500)] [&_svg:not([class*='size-'])]:size-5",
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
  }
)

function HudChip({
  className,
  shape,
  state,
  active,
  icon,
  children,
  hue,
  density,
  motion,
  ...props
}: Omit<NkVariantProps, "shape"> & React.ComponentProps<"span"> &
  VariantProps<typeof hudChipVariants> & {
    icon?: React.ReactNode
    /** The role it shows (police, ems, health, rare…): data-hue, which the theme's role ramps colour (tokens 1.4). */
    hue?: string
    /** Shorthand for state="active" (talking, selected). */
    active?: boolean
  }) {
  const s = state ?? (active ? "active" : "default")
  return (
    <span
      {...nkVariant({ density, motion })}
      data-slot="hud-chip"
      data-hue={hue}
      data-state={s}
      className={cn(hudChipVariants({ shape, state: s }), className)}
      {...props}
    >
      {icon && (
        <span data-slot="hud-chip-icon" className="flex">
          {icon}
        </span>
      )}
      {children !== undefined && children !== null && children !== false && <span className="truncate">{children}</span>}
    </span>
  )
}

export { HudChip, hudChipVariants }
