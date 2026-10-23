import * as React from "react"

import { Chip, chipHudVariants, type ChipProps } from "@/components/ui/chip"

/**
 * HudChip — an always-on mark on the game world: Chip in its HUD material (`<Chip material="hud">`), kept so old
 * imports keep working. Same props, same markup (data-slot="hud-chip"), same look.
 *
 *   <HudChip icon={<MicIcon />} active={talking}>Normal</HudChip>   →   <Chip material="hud" icon={…} active={talking}>
 *
 * @deprecated Use `<Chip material="hud">` from `@/components/ui/chip`. Removed in 0.10.0.
 *
 * Role: A small fact on the HUD (voice range, radio, seatbelt): an alias of Chip's HUD material.
 * Anatomy: Chip material="hud" (pill | tile) > icon > text
 * Props: shape, state, active, icon, density, motion, hue.
 * Rules: Use Chip material="hud". Its shape prop is the form (pill, tile); corners follow data-nk-shape on an
 *   ancestor. warning is the theme's destructive; active is primary.
 */
function HudChip(props: Omit<ChipProps, "material">) {
  return <Chip material="hud" {...props} />
}

/** @deprecated Use chipHudVariants from `@/components/ui/chip`. */
const hudChipVariants = chipHudVariants

export { HudChip, hudChipVariants }
