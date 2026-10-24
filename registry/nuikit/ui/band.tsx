import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, nkVariant, type NkVariantProps } from "@/lib/utils"
import { toneVars } from "@/components/ui/fill"

/**
 * Band — a full-width band across the screen for a state the player is in, not a message they
 * read once: incapacitated, cuffed, spectating, in a cutscene. The band slab of design v2 §4.5
 * (`nk-slab-band`, docs/tokens.md#slabs): the game darkened behind it, tinted by the tone, with
 * tone hairlines above and below; a title in the display face and a caption under it.
 *
 *   <Band title="You are incapacitated" subtitle="Wait for EMS" />
 *   <Band tone="warning" title="Cuffed" subtitle="Officer Vale has you in custody" position="top" />
 *   <Band title="Downed">
 *     <Countdown seconds={42} surface="game" size="sm" />
 *   </Band>
 *
 * It pins itself to the bottom (or top) edge of the full-screen root, or sits in the flow with
 * `position="inline"`. Colours are the tone's theme token, so it follows every identity; text is
 * the world's (light over the game in every theme).
 *
 * Role: a state the player is in (down, cuffed, spectating), not a message read once.
 * Anatomy: band (nk-slab-band: the darkened game, a tint and two hairlines in the tone) > title (display face)
 *   > subtitle (caption) > children (a countdown, a hint).
 * Props: tone (danger | warning | success | info | brand | neutral; destructive = danger), hue, title, subtitle, position.
 * Rules: one band on screen; colours from the tone's or the hue's channels (toneVars()), never a literal;
 *   the text is the world's; it never takes the pointer.
 */
const bandVariants = cva("nk-slab-band nk-on-game pointer-events-none z-10", {
  variants: {
    position: {
      /** Pinned to the bottom edge, --nk-screen-edge above it (absolute: put it in the full-screen root). */
      bottom: "absolute inset-x-0 bottom-[var(--nk-screen-edge)]",
      /** Pinned to the top edge. */
      top: "absolute inset-x-0 top-[var(--nk-screen-edge)]",
      /** In the flow, as wide as its container. */
      inline: "relative",
    },
  },
  defaultVariants: {
    position: "bottom",
  },
})

type BandTone = "destructive" | "danger" | "warning" | "success" | "info" | "brand" | "neutral"

/** The theme channels behind each tone (docs/tokens.md); neutral is the darkened game alone. */
const TONE_RGB: Record<BandTone, string | null> = {
  destructive: "var(--destructive-rgb)",
  danger: "var(--destructive-rgb)",
  warning: "var(--warning-rgb)",
  success: "var(--success-rgb)",
  info: "var(--info-rgb)",
  brand: "var(--brand-rgb, var(--primary-rgb))",
  neutral: null,
}

function Band({
  className,
  position,
  tone = "destructive",
  title,
  subtitle,
  hue,
  children,
  style,
  density,
  shape,
  motion,
  ...props
}: NkVariantProps & Omit<React.ComponentProps<"div">, "title"> &
  VariantProps<typeof bandVariants> & {
    /** The colour of the state: destructive (default: down, incapacitated), warning, success, info, brand, or neutral. */
    tone?: BandTone
    /** One line: the state. */
    title?: React.ReactNode
    /** A caption under it: what to do, who did it. */
    subtitle?: React.ReactNode
    /** A role (police, ems…): the band in its colour instead of the tone's (1.5). */
    hue?: string
  }) {
  const rgb = hue ? "var(--hue)" : Object.prototype.hasOwnProperty.call(TONE_RGB, tone) ? TONE_RGB[tone] : TONE_RGB.destructive
  return (
    <div
      role="status"
      {...nkVariant({ density, shape, motion })}
      data-slot="band"
      {...toneVars({ tone, hue })}
      className={cn(bandVariants({ position }), className)}
      style={
        {
          ...(rgb ? { "--nk-slab-tone": rgb } : { "--nk-slab-band-tint": 0, "--nk-slab-band-edge": 0.25, "--nk-slab-tone": "var(--world-foreground-rgb, 255, 255, 255)" }),
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {title !== undefined && title !== null && (
        <p data-slot="band-title" className="nk-slab-band-title">
          {title}
        </p>
      )}
      {subtitle !== undefined && subtitle !== null && (
        <p data-slot="band-subtitle" className="nk-caption">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}

export { Band, bandVariants, type BandTone }
