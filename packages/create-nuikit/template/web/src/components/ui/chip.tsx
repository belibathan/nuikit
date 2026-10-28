import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, nkVariant, type NkVariantProps } from "@/lib/utils"
import { toneVars } from "@/components/ui/fill"

/**
 * Chip — a short status on one line (docs/design.md §6, foundation), in one of two materials:
 *
 * - `material="panel"` (default): on a panel. --nk-h-chip tall, --nk-chip-radius corners (never a pill), the label
 *   style, an --nk-icon-md icon; a hairline rim (fill hair), a tint or a solid. kit.css draws it on
 *   `data-slot="chip"`.
 * - `material="hud"`: on the game world (voice range, radio, a seatbelt warning). No panel, no border: the kit's
 *   dark game surface (nk-chip), so it reads over any sky with any theme. `active` (talking, the selected slot)
 *   is the theme's primary rising from the bottom; `state="warning"` (or tone danger) is destructive. Drawn on
 *   `data-slot="hud-chip"`.
 *
 *   <Chip icon={<BadgeCheckIcon />} tone="success">On duty</Chip>
 *   <Chip fill="tint" tone="warning">Seatbelt</Chip>
 *   <Chip variant="dot" tone="success" aria-label="Online" />
 *   <Chip material="hud" icon={<MicIcon />} active={talking}>Normal</Chip>
 *   <Chip material="hud" icon={<TriangleAlertIcon />} tone="danger">Seatbelt</Chip>
 *
 * Role: A tag, a status dot, a fact on the HUD: one chip.
 * Anatomy: chip (panel) > icon > label; hud-chip (hud, pill) > hud-chip-icon > label
 * Props: material, tone, fill, icon, variant, shape, state, active, density, motion.
 * Rules: No pills on a panel: the chip radius, or the dot at the key radius; on the HUD the corners follow
 *   data-nk-shape. Colour means something: tone only (the HUD's warning is destructive, active is primary).
 */

/** The HUD material (nk-chip / nk-hud): its form and state. */
const chipVariants = cva("shrink-0 [&_svg]:pointer-events-none [&_svg]:shrink-0", {
    variants: {
      shape: {
        /** icon + short text, --nk-height-chip tall. */
        pill: "nk-chip nk-text-num [&_svg:not([class*='size-'])]:size-(--nk-chip-icon-size)",
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

type ChipProps = Omit<NkVariantProps, "shape"> &
  React.ComponentProps<"span"> &
  VariantProps<typeof chipVariants> & {
    /** panel (default): on a panel, the hairline chip. hud: on the game world (nk-chip). */
    material?: "panel" | "hud"
    tone?: "neutral" | "info" | "success" | "warning" | "danger" | "destructive" | "error"
    /** panel: hair (a rim, the default), tint or solid. */
    fill?: "hair" | "tint" | "solid"
    icon?: React.ReactNode
    /** panel: chip, or dot (the status dot). */
    variant?: "chip" | "dot"
    /** hud: shorthand for state="active" (talking, selected). */
    active?: boolean
  }

function Chip({ material = "panel", ...props }: ChipProps) {
  return material === "hud" ? <HudMaterial {...props} /> : <PanelMaterial {...props} />
}

function PanelMaterial({ className, tone, fill = "hair", icon, variant = "chip", shape: _shape, state: _state, active: _active, density, motion, children, ...props }: Omit<ChipProps, "material">) {
  const dot = variant === "dot"
  return (
    <span
      {...nkVariant({ density, motion })}
      data-slot="chip"
      data-variant={dot ? "dot" : undefined}
      data-fill={fill === "hair" ? undefined : fill}
      {...toneVars({ tone: tone === "neutral" ? undefined : tone })}
      role={dot && props["aria-label"] ? "img" : undefined}
      className={cn(className)}
      {...props}
    >
      {!dot && icon}
      {!dot && children}
    </span>
  )
}

function HudMaterial({ className, shape, state, active, tone, icon, children, fill: _fill, variant: _variant, density, motion, ...props }: Omit<ChipProps, "material">) {
  const danger = tone === "danger" || tone === "destructive" || tone === "error"
  const s = state ?? (active ? "active" : danger ? "warning" : "default")
  return (
    <span {...nkVariant({ density, motion })} data-slot="hud-chip" data-state={s} className={cn(chipVariants({ shape, state: s }), className)} {...props}>
      {icon && (
        <span data-slot="hud-chip-icon" className="flex">
          {icon}
        </span>
      )}
      {children !== undefined && children !== null && children !== false && <span className="truncate">{children}</span>}
    </span>
  )
}

export { Chip, chipVariants }
