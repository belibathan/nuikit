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
 * `alertAt` (true: the theme's --nk-alert-threshold, 0.2) it is data-state="alert" (--nk-fill-alert).
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

function Fill({
  className,
  level = 0,
  tone,
  hue,
  alertAt: threshold = false,
  variant = "bar",
  style,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /** 0–1. */
  level?: number
  tone?: FillTone | "destructive" | "error"
  /** A role from ROLE_SETS (health, armor, police, legendary…). */
  hue?: string
  /** Alert at or under this level; true = 0.2 (--nk-alert-threshold). Off by default. */
  alertAt?: number | boolean
  /** bar: the track (--nk-fill-height). edge: a 2px line (a sheet's edge). */
  variant?: "bar" | "edge"
}) {
  const v = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0
  return (
    <span
      data-slot="fill"
      data-variant={variant === "bar" ? undefined : variant}
      data-state={alertAt(v, threshold) ? "alert" : undefined}
      {...toneVars({ tone, hue })}
      aria-hidden
      className={cn(className)}
      style={{ "--level": String(v), ...style } as React.CSSProperties}
      {...props}
    />
  )
}

export { Fill, alertAt, toneVars, type FillTone }
