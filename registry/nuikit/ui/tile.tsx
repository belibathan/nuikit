import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Tile — the one key language (docs/design/ink.md §3): keys, notice icons, tab marks, checked boxes, vital
 * chips, gears and telltales. A face (rim and top light) on a solid plate, the face slanted by
 * --nk-tile-face-skew while the box stays upright. kit.css draws it on `data-slot="tile"` (and on shadcn's Kbd,
 * which is the same tile); a theme only sets --nk-tile-*. Graphite: today's keycap, no plate, no slant.
 *
 *   <Tile>E</Tile>
 *   <Tile shape="square" size="md" tone="danger"><TriangleAlertIcon /></Tile>
 *   <Tile state="hold" level={0.6}>F</Tile>
 *   <Tile tag="Open door" tagOpen={near}>E</Tile>
 *   <Kbd>Esc</Kbd>                       // Tile size sm with data-slot="kbd"
 *
 * States (data-state): focus switches the rim; hold presses by --nk-tile-plate-press and fills (`level`); confirm
 * turns the face white and pops; alert sets a danger rim and breathes; disabled is half opacity. `active`
 * (on, selected, checked) is the white face.
 *
 * Role: Keys, notice icons, tab marks, checked boxes, gears and telltales: one tile.
 * Anatomy: plate (::before) > face (::after: rim, light) > tile-fill (hold) > legend > tile-tag (the plate
 *   extending right)
 * Props: size, shape, state, active, level, tone, hue, tag, tagOpen, plate, land.
 * Rules: Rims switch state, they never tween. Hard drops only: the plate is an offset, never a blur. A theme
 *   sets --nk-tile-* values, never selectors.
 */

type TileState = "rest" | "focus" | "hold" | "confirm" | "alert" | "disabled"

type TileProps = Omit<React.ComponentProps<"span">, "children"> & {
  children?: React.ReactNode
  /** sm = --nk-height-key, md = --nk-height-chip, lg = --nk-height-control. */
  size?: "sm" | "md" | "lg"
  /** key: as wide as its legend. square: a square (icons). */
  shape?: "key" | "square"
  state?: TileState
  active?: boolean
  /** Hold progress, 0–1 (drawn while state is hold, or whenever set). */
  level?: number
  tone?: "neutral" | "info" | "success" | "warning" | "danger"
  /** A role (health, police, legendary…): colours the legend and rim. */
  hue?: string
  /** The plate extending right with a label ("Open door"). */
  tag?: React.ReactNode
  /** Whether the tag is open (it reveals after the tile lands). Default true. */
  tagOpen?: boolean
  /** The HUD's dimmer plate. */
  plate?: "default" | "dim"
  /** Land from --nk-gesture-land when mounted. */
  land?: boolean
  /** The data-slot: "tile", or "kbd" for the Kbd alias. */
  slot?: "tile" | "kbd"
}

function Tile({
  className,
  size = "sm",
  shape = "key",
  state,
  active,
  level,
  tone,
  hue,
  tag,
  tagOpen = true,
  plate,
  land,
  slot = "tile",
  style,
  children,
  ...props
}: TileProps) {
  const lv = level === undefined || !Number.isFinite(level) ? undefined : Math.max(0, Math.min(1, level))
  const legend = typeof children === "string" || typeof children === "number" ? <span data-slot="tile-legend">{children}</span> : children
  const tile = (
    <span
      data-slot={slot}
      data-size={size}
      data-shape={shape}
      data-state={state && state !== "rest" ? state : undefined}
      data-active={active || undefined}
      data-tone={tone && tone !== "neutral" ? tone : undefined}
      data-hue={hue || undefined}
      data-plate={plate === "dim" ? "dim" : undefined}
      data-land={land || undefined}
      data-tag={tag ? "" : undefined}
      className={cn(className)}
      style={lv === undefined ? style : ({ "--level": String(lv), ...style } as React.CSSProperties)}
      {...props}
    >
      {legend}
      {lv !== undefined && <span data-slot="tile-fill" aria-hidden />}
    </span>
  )
  if (!tag) return tile
  return (
    <span data-slot="tile-group" data-open={tagOpen || undefined}>
      {tile}
      <span data-slot="tile-tag">{tag}</span>
    </span>
  )
}

/** shadcn's Kbd as a Tile: size sm, data-slot="kbd" (so every rule for kbd applies). */
function Kbd({ className, ...props }: Omit<TileProps, "slot">) {
  // shadcn's Kbd box (the kit's kbd rules paint it), at the key height
  return (
    <Tile
      slot="kbd"
      size="sm"
      className={cn(
        "pointer-events-none inline-flex h-(--nk-height-key) w-fit min-w-(--nk-height-key) items-center justify-center gap-[var(--nk-tile-legend-gap)] px-[var(--nk-tile-legend-inset)] text-(length:--nk-text-key) select-none [&_svg:not([class*='size-'])]:size-(--nk-icon-sm)",
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

export { Tile, Kbd, KbdGroup, type TileProps, type TileState }
