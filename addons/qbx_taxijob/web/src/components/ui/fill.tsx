// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/fill.tsx, then run pnpm sync.
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Fill — status as a level filling left to right (docs/design/ink.md §3): a track, a bar scaled from the
 * left (transform only), a leading edge. One implementation for holds, row sweeps, meters and timers.
 * kit.css draws it (`.nk-fill` / `data-slot="fill"`); a theme sets --nk-fill-color, -track, -edge, -alert.
 *
 *   <Fill level={0.4} />
 *   <Fill level={health} hue="health" alertAt={0.2} />
 *   <Fill level={fuel} tone="warning" variant="edge" />
 *
 * Colour: `hue` (a role, data-hue) or an ancestor's data-hue, then `tone`, then --nk-fill-color. At or under
 * `alertAt` (true: the theme's --nk-behavior-alert, 0.2) it is data-state="alert" (--nk-fill-alert).
 *
 * A timed fill (a run, a drain) animates its bar and edge with fillTargets() under useLinearRun; `tween={false}`
 * drops the level's ease, for a level something else draws every frame (a hold) or a run.
 *
 * It is the one level bar of the kit: Meter's segments and slab line, Countdown's line, Notice's time line,
 * KeyPrompt's hold, ActionBar's hold, EdgeSheet's edge and the speedometer's fuel are all a Fill. A composite
 * restyles it with classes (track, height) and --nk-fill-color, never its own bar.
 *
 * Role: A level as a bar that fills: holds, sweeps, meters, timers.
 * Anatomy: track > bar (::before, scaleX(--level)) > edge (::after)
 * Props: level, tone, hue, color, alertAt, alert, variant, tween.
 * Level means: 0–1, set inline as --level.
 * Rules: Transform only: the bar scales, never width. Colour: hue, then tone, then --nk-fill-color; alert wins.
 *   The track, height and colour are levers (--nk-fill-track, --nk-fill-height, --nk-fill-color), so a composite
 *   sets them instead of drawing a second bar.
 */

type FillTone = "neutral" | "info" | "success" | "warning" | "danger"

/** The one alert rule: a level at or under the threshold is an alert. `true` = the theme's default (0.2). */
function alertAt(level: number | undefined, threshold: number | boolean | undefined = true): boolean {
  if (level === undefined || !Number.isFinite(level) || threshold === false) return false
  const t = threshold === true ? 0.2 : threshold
  return level <= t
}

/** `tone` (meaning) and `hue` (a role) as the attributes every coloured primitive reads. destructive / error alias danger. */
function toneVars({ tone, hue }: { tone?: string; hue?: string }): { "data-tone"?: string; "data-hue"?: string } {
  const t = tone === "destructive" || tone === "error" ? "danger" : tone
  return { "data-tone": t || undefined, "data-hue": hue || undefined }
}

/**
 * A Fill's bar and edge as useLinearRun targets: the bar scales from `from` to `to` (0–1), the edge follows its
 * front. One run, both layers, so a theme with a visible edge (--nk-fill-edge) never sees it lag the bar.
 */
function fillTargets(el: Element | null | undefined, from: number, to: number) {
  const a = Math.max(0, Math.min(1, from))
  const b = Math.max(0, Math.min(1, to))
  return [
    { el, pseudoElement: "::before", keyframes: [{ transform: `scaleX(${a})` }, { transform: `scaleX(${b})` }] },
    { el, pseudoElement: "::after", keyframes: [{ transform: `translateX(${(a - 1) * 100}%)` }, { transform: `translateX(${(b - 1) * 100}%)` }] },
  ]
}

function Fill({
  className,
  level = 0,
  tone,
  hue,
  alertAt: threshold = false,
  alert,
  variant = "bar",
  tween = true,
  color,
  style,
  ...props
}: Omit<React.ComponentProps<"span">, "children" | "color"> & {
  /**
   * The bar's own colour (a CSS colour or var()): sets --nk-fill-color and opts out of an ancestor's data-hue, so a
   * composite's tone stays its own inside a hued subtree. Its own hue, tone and alert still win.
   */
  color?: string
  /** 0–1. */
  level?: number
  tone?: FillTone | "destructive" | "error"
  /** A role from ROLE_SETS (health, armor, police, legendary…). */
  hue?: string
  /** Alert at or under this level; true = 0.2 (--nk-behavior-alert). Off by default. */
  alertAt?: number | boolean
  /** Force the alert (a level that alerts high, like a weight over its limit). Wins over alertAt. */
  alert?: boolean
  /** bar: the track (--nk-fill-height). edge: a 2px line (a sheet's edge). */
  variant?: "bar" | "edge"
  /** Ease level changes (--nk-time-fill). false: a level drawn every frame, or a run (fillTargets). */
  tween?: boolean
}) {
  const v = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0
  return (
    <span
      data-slot="fill"
      data-variant={variant === "bar" ? undefined : variant}
      data-state={(alert ?? alertAt(v, threshold)) ? "alert" : undefined}
      data-tween={tween ? undefined : "off"}
      data-color={color ? "" : undefined}
      {...toneVars({ tone, hue })}
      aria-hidden
      // the class too: a composite may rename data-slot (meter-segment) and keep the Fill's drawing
      className={cn("nk-fill", className)}
      style={{ "--level": String(v), ...(color && { "--nk-fill-color": color }), ...style } as React.CSSProperties}
      {...props}
    />
  )
}

export { Fill, alertAt, toneVars, fillTargets, type FillTone }
