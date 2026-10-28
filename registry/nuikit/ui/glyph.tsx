import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Glyph — the one key language (docs/design.md §6): keys, notice icons, tab marks, checked boxes, vital
 * chips, gears and telltales. A face (rim and top light) on a solid plate, the face slanted by
 * --nk-control-face-skew while the box stays upright. kit.css draws it on `data-slot="glyph"` (and on shadcn's Kbd,
 * which is the same glyph); a theme only sets --nk-control-* levers.
 *
 *   <Glyph>E</Glyph>
 *   <Glyph shape="square" size="md" tone="danger"><TriangleAlertIcon /></Glyph>
 *   <Glyph tag="Open door" land>E</Glyph>
 *   <Kbd>Esc</Kbd>                       // Glyph size sm with data-slot="kbd"
 *
 * States (data-state): focus switches the rim; hold presses by --nk-control-plate-press; confirm turns the face
 * white and pops; alert sets a danger rim and breathes; disabled is half opacity. `active` (on, selected,
 * checked) is the white face.
 *
 * Role: Keys, notice icons, tab marks, checked boxes, gears and telltales: one glyph.
 * Anatomy: glyph (plate ::before, face ::after) > glyph-legend; with a tag: glyph-group > glyph + glyph-tag (the
 *   plate extending right)
 * Props: size, shape, state, active, tone, tag, land.
 * Rules: Rims switch state, they never tween. Hard drops only: the plate is an offset, never a blur. A theme
 *   sets --nk-control-* values, never selectors.
 */

type GlyphState = "rest" | "focus" | "hold" | "confirm" | "alert" | "disabled"

type GlyphProps = Omit<React.ComponentProps<"span">, "children"> & {
  children?: React.ReactNode
  /** sm = --nk-height-key, md = --nk-height-chip, lg = --nk-height-control. */
  size?: "sm" | "md" | "lg"
  /** key: as wide as its legend. square: a square (icons). */
  shape?: "key" | "square"
  state?: GlyphState
  active?: boolean
  tone?: "neutral" | "info" | "success" | "warning" | "danger"
  /** The plate extending right with a label ("Open door"); it reveals after the glyph lands. */
  tag?: React.ReactNode
  /** Land from --nk-gesture-land when mounted. */
  land?: boolean
  /** The data-slot: "glyph", or "kbd" for the Kbd alias. */
  slot?: "glyph" | "kbd"
}

function Glyph({
  className,
  size = "sm",
  shape = "key",
  state,
  active,
  tone,
  tag,
  land,
  slot = "glyph",
  children,
  ...props
}: GlyphProps) {
  const legend = typeof children === "string" || typeof children === "number" ? <span data-slot="glyph-legend">{children}</span> : children
  const tile = (
    <span
      data-slot={slot}
      data-size={size}
      data-shape={shape}
      data-state={state && state !== "rest" ? state : undefined}
      data-active={active || undefined}
      data-tone={tone && tone !== "neutral" ? tone : undefined}
      data-land={land || undefined}
      data-tag={tag ? "" : undefined}
      className={cn(className)}
      {...props}
    >
      {legend}
    </span>
  )
  if (!tag) return tile
  return (
    <span data-slot="glyph-group" data-open>
      {tile}
      <span data-slot="glyph-tag">{tag}</span>
    </span>
  )
}

/** shadcn's Kbd as a Glyph: size sm, data-slot="kbd" (so every rule for kbd applies). */
function Kbd({ className, ...props }: Omit<GlyphProps, "slot">) {
  // shadcn's Kbd box (the kit's kbd rules paint it), at the key height
  return (
    <Glyph
      slot="kbd"
      size="sm"
      className={cn(
        "pointer-events-none inline-flex h-(--nk-height-key) w-fit min-w-(--nk-height-key) items-center justify-center gap-[var(--nk-control-legend-gap)] px-[var(--nk-control-legend-inset)] text-(length:--nk-text-key) select-none [&_svg:not([class*='size-'])]:size-(--nk-icon-sm)",
        className
      )}
      {...props}
    />
  )
}

/** Keys pressed together (Shift + E), gap-items apart. */
function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="kbd-group" className={cn("inline-flex items-center gap-(--nk-space-1)", className)} {...props} />
}

export { Glyph, Kbd, KbdGroup }
