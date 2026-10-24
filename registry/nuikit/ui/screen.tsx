"use client"

import * as React from "react"

import { useViewport } from "nuikit-core/react"

import { cn } from "@/lib/utils"

/**
 * Screen — the root of every page's layout (docs/design/layout.md). Full screen, click-through, and the owner
 * of the levers every zone inside reads: the 16:9 content box (`--nk-screen-ratio`; on an ultrawide the zones
 * sit at the box's edges, `bleed` uses the whole width), the safe area (`--nk-screen-safe-x/y`, rem), the density and
 * the aspect class (`data-nk-aspect` on <html>: 4-3, 16-10, 16-9, 21-9, 32-9, from useViewport). The UI scale is
 * rem itself (index.css: the NUI scale × --nk-scale, floored by --nk-screen-scale-min).
 *
 *   <Screen>
 *     <Zone at="tr" clear>{notices}</Zone>
 *     <Zone at="l"><EdgeSheet … /></Zone>
 *   </Screen>
 *
 * Role: The page root: the content box, the safe area, the aspect class every zone reads.
 * Anatomy: screen (absolute, inset 0) > zone…
 * Props: bleed, ratio, safe, density, as.
 * Rules: One Screen per page. Levers, never literals: a theme or a server sets the values. Nothing inside is
 *   placed with fixed coordinates; it goes in a Zone.
 */
type ScreenProps = React.HTMLAttributes<HTMLElement> & {
  /** Use the whole width on an ultrawide (no 16:9 box) for everything inside. */
  bleed?: boolean
  /** The content box's width / height (default the theme's --nk-screen-ratio, 16:9). */
  ratio?: number
  /** Safe area inside the box, in rem (default the theme's --nk-screen-safe-x / --nk-screen-safe-y). */
  safe?: { x?: number; y?: number }
  /** compact | comfortable: the density of everything inside (the theme's otherwise). */
  density?: "compact" | "comfortable"
  as?: React.ElementType
}

function Screen({ bleed, ratio, safe, density, as: Comp = "div", className, style, ...props }: ScreenProps) {
  const vp = useViewport()
  const vars: Record<string, string> = {}
  if (ratio !== undefined && ratio > 0) vars["--nk-screen-ratio"] = String(ratio)
  if (safe?.x !== undefined) vars["--nk-screen-safe-x"] = `${safe.x}rem`
  if (safe?.y !== undefined) vars["--nk-screen-safe-y"] = `${safe.y}rem`
  return (
    <Comp
      data-slot="screen"
      data-aspect={vp.aspect}
      data-nk-bleed={bleed || undefined}
      data-nk-density={density}
      className={cn(className)}
      style={{ ...vars, ...style } as React.CSSProperties}
      {...props}
    />
  )
}

export { Screen, type ScreenProps }
