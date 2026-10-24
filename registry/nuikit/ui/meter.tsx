import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, nkLevel, nkVariant, type NkVariantProps } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Fill, fillTargets } from "@/components/ui/fill"
import { useLinearRun } from "@/hooks/use-linear-run"

/**
 * Meter — a slim bar for any level: health, fuel, weight, players online, engine. A shadcn
 * Progress coloured by one theme token, on a theme track (in a panel) or a dark game track (on the
 * world, where a tinted track vanishes over a bright sky). Thresholds turn it destructive.
 *
 *   <Meter icon={<HeartPulseIcon />} aria-label="Health" value={health} tone="destructive" track="game" low={20} />
 *   <Meter label="Weight" value={22.4} max={30} valueText="22.4 / 30 kg" high={90} />
 *   <Meter label="Armor" value={armor} segments={4} />
 *
 * With a `label` or `valueText` it stacks a label row over the bar; with only an icon it is one line.
 *
 * Status tones (`success`, `warning`, `info`, `destructive`) come from the theme. A library's own
 * colour goes through `meterColor()`: names it knows (ox's Mantine `green`, `red.6`, …) become a
 * tone, so they follow the theme; anything else is passed through as `color`.
 *
 *   <Meter {...meterColor(option.colorScheme)} value={option.progress} />
 *
 * With `duration` the bar fills on its own over that many ms and `onComplete` fires from a timer
 * (never an animation event, so it still fires with motion off). Restart it with a new `key`. The fill
 * is one linear compositor animation (Web Animations, transform only) that reaches 100% exactly at
 * `duration`: no React render while it runs. It plays at every motion level: progress is information.
 *
 * Fills move with transforms only (the bar translates, segments scale on X): never `width`.
 *
 * Role: A level on a bar: health, fuel, weight, a timed action.
 * Anatomy: meter (label row: icon, label, value text) > bar (shadcn Progress) or segments (one Fill each) > slab:
 *   label, cancel key, thin line (a Fill on the slab track). A timed run is useLinearRun.
 * Props: value, max, low, high, tone, track, segments, duration, variant, size, density, shape, motion, hue,
 *   threshold.
 * Level means: value / max; a timed run fills 0 → 1 over duration (--level is its end state).
 * Rules: Data is value/max or --level, never a variant. Thresholds turn it destructive; tone never encodes
 *   data. A timed run completes from a timer, so it finishes with motion off.
 */
// The bar's thickness is the identity's (--nk-fill-height: --nk-fill-height, 4px in Graphite);
// sm and lg step it down and up from there.
const meterVariants = cva("min-w-0", {
  variants: {
    size: {
      sm: "[--meter-h:max(0.125rem,calc(var(--nk-fill-height)*0.75))]",
      default: "[--meter-h:var(--nk-fill-height)]",
      lg: "[--meter-h:calc(var(--nk-fill-height)*1.5)]",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

type MeterTone =
  | "primary"
  | "foreground"
  | "destructive"
  | "success"
  | "warning"
  | "info"
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5"
  | "health"
  | "armor"
  | "hunger"
  | "thirst"
  | "stress"

/** A tone, or "hue" (tokens 1.5): the role colour of data-hue on the meter (`hue`) or its nearest ancestor; --nk-fill-color without one. */
type MeterFill = MeterTone | "hue"

/** Literal class names, so Tailwind finds them. */
const TONES: Record<MeterFill, { text: string; fill: string; track: string }> = {
  primary: { text: "text-primary", fill: "bg-primary", track: "bg-primary/20" },
  foreground: { text: "text-foreground", fill: "bg-foreground", track: "bg-foreground/15" },
  destructive: { text: "text-destructive", fill: "bg-destructive", track: "bg-destructive/20" },
  // tokens v1 status (docs/tokens.md)
  success: { text: "text-success", fill: "bg-success", track: "bg-success/20" },
  warning: { text: "text-warning", fill: "bg-warning", track: "bg-warning/20" },
  info: { text: "text-info", fill: "bg-info", track: "bg-info/20" },
  "chart-1": { text: "text-chart-1", fill: "bg-chart-1", track: "bg-chart-1/20" },
  "chart-2": { text: "text-chart-2", fill: "bg-chart-2", track: "bg-chart-2/20" },
  "chart-3": { text: "text-chart-3", fill: "bg-chart-3", track: "bg-chart-3/20" },
  "chart-4": { text: "text-chart-4", fill: "bg-chart-4", track: "bg-chart-4/20" },
  "chart-5": { text: "text-chart-5", fill: "bg-chart-5", track: "bg-chart-5/20" },
  // tokens v1 vitals (docs/tokens.md)
  health: { text: "text-vital-health", fill: "bg-vital-health", track: "bg-vital-health/20" },
  armor: { text: "text-vital-armor", fill: "bg-vital-armor", track: "bg-vital-armor/20" },
  hunger: { text: "text-vital-hunger", fill: "bg-vital-hunger", track: "bg-vital-hunger/20" },
  thirst: { text: "text-vital-thirst", fill: "bg-vital-thirst", track: "bg-vital-thirst/20" },
  stress: { text: "text-vital-stress", fill: "bg-vital-stress", track: "bg-vital-stress/20" },
  hue: { text: "text-[var(--hue-solid,var(--nk-fill-color))]", fill: "bg-[var(--hue-solid,var(--nk-fill-color))]", track: "bg-[var(--hue-tint,var(--nk-fill-track))]" },
}

const FILL: Record<MeterFill, string> = {
  primary: "[&_[data-slot=progress-indicator]]:bg-primary",
  foreground: "[&_[data-slot=progress-indicator]]:bg-foreground",
  destructive: "[&_[data-slot=progress-indicator]]:bg-destructive",
  success: "[&_[data-slot=progress-indicator]]:bg-success",
  warning: "[&_[data-slot=progress-indicator]]:bg-warning",
  info: "[&_[data-slot=progress-indicator]]:bg-info",
  "chart-1": "[&_[data-slot=progress-indicator]]:bg-chart-1",
  "chart-2": "[&_[data-slot=progress-indicator]]:bg-chart-2",
  "chart-3": "[&_[data-slot=progress-indicator]]:bg-chart-3",
  "chart-4": "[&_[data-slot=progress-indicator]]:bg-chart-4",
  "chart-5": "[&_[data-slot=progress-indicator]]:bg-chart-5",
  health: "[&_[data-slot=progress-indicator]]:bg-vital-health",
  armor: "[&_[data-slot=progress-indicator]]:bg-vital-armor",
  hunger: "[&_[data-slot=progress-indicator]]:bg-vital-hunger",
  thirst: "[&_[data-slot=progress-indicator]]:bg-vital-thirst",
  stress: "[&_[data-slot=progress-indicator]]:bg-vital-stress",
  hue: "[&_[data-slot=progress-indicator]]:bg-[var(--hue-solid,var(--nk-fill-color))]",
}

/** Each tone as the Fill colour lever (--nk-fill-color) for the parts drawn as a Fill (segments). "hue" reads the
 * role from data-hue (the Fill's own rule), so it sets nothing. */
const FILL_COLOR: Record<MeterFill, string | undefined> = {
  primary: "var(--primary)",
  foreground: "var(--foreground)",
  destructive: "var(--destructive)",
  success: "var(--success)",
  warning: "var(--warning)",
  info: "var(--info)",
  "chart-1": "var(--chart-1)",
  "chart-2": "var(--chart-2)",
  "chart-3": "var(--chart-3)",
  "chart-4": "var(--chart-4)",
  "chart-5": "var(--chart-5)",
  health: "var(--vital-health)",
  armor: "var(--vital-armor)",
  hunger: "var(--vital-hunger)",
  thirst: "var(--vital-thirst)",
  stress: "var(--vital-stress)",
  hue: undefined,
}

/** A library colour (`color`), carried in --meter-fill so no colour is mixed inline. */
const CUSTOM = { text: "text-(color:--meter-fill)", fill: "bg-(--meter-fill)", track: "bg-foreground/15" }
const CUSTOM_FILL = "[&_[data-slot=progress-indicator]]:bg-(--meter-fill)"

type MeterLevel = "normal" | "low" | "high"

/**
 * Where a value sits: its percentage of `max` (clamped 0–100, NaN → 0) and whether it has crossed
 * a threshold. `low` and `high` are percentages; at or below `low` (health, fuel) or at or above
 * `high` (stress, weight) the level is no longer normal.
 */
function meterLevel(value: number, { max = 100, low, high }: { max?: number; low?: number; high?: number } = {}) {
  const raw = max > 0 && Number.isFinite(value) ? (value / max) * 100 : 0
  const percent = Math.max(0, Math.min(100, raw))
  const level: MeterLevel =
    low !== undefined && percent <= low ? "low" : high !== undefined && percent >= high ? "high" : "normal"
  return { percent, level }
}

/** How full each of `count` equal segments is (0–100) for an overall percentage. */
function segmentFills(percent: number, count: number) {
  const n = Math.max(1, Math.floor(count))
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0))
  return Array.from({ length: n }, (_, i) => Math.max(0, Math.min(100, (p - (i * 100) / n) * n)))
}

/** Library colour names that mean a theme tone (Mantine's palette, as ox_lib passes it, and plain words). */
const NAMED_TONES: Record<string, MeterTone> = {
  red: "destructive",
  pink: "destructive",
  danger: "destructive",
  error: "destructive",
  destructive: "destructive",
  green: "success",
  teal: "success",
  lime: "success",
  success: "success",
  yellow: "warning",
  orange: "warning",
  warning: "warning",
  blue: "info",
  cyan: "info",
  indigo: "info",
  info: "info",
  violet: "stress",
  grape: "stress",
  gray: "foreground",
  dark: "foreground",
  primary: "primary",
}

/**
 * A library's colour as Meter props: a name it knows ("green", "red.6", "success") becomes a
 * theme `tone`; a CSS colour ("#4dabf7", "rgb(…)") is passed through as `color`; anything else
 * (or nothing) gives no props, so the meter keeps its default.
 */
function meterColor(input?: string | null): { tone?: MeterTone; color?: string } {
  const v = (input ?? "").trim()
  if (!v) return {}
  const name = v.toLowerCase().replace(/\.\d+$/, "")
  if (NAMED_TONES[name]) return { tone: NAMED_TONES[name] }
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) || /^(rgb|rgba|hsl|hsla)\(/i.test(v)) return { color: v }
  return {}
}

/**
 * The keyframes of segment `i` of `count` in a timed run: empty until its share of the run starts,
 * full when it ends (one linear run over the whole duration, so segments hand over exactly).
 */
function segmentKeyframes(i: number, count: number): Keyframe[] {
  const n = Math.max(1, Math.floor(count))
  const from = Math.max(0, Math.min(1, i / n))
  const to = Math.max(0, Math.min(1, (i + 1) / n))
  return [
    { transform: "scaleX(0)", offset: 0 },
    { transform: "scaleX(0)", offset: from },
    { transform: "scaleX(1)", offset: to },
    { transform: "scaleX(1)", offset: 1 },
  ]
}

/** The edge of segment `i` in a timed run: the Fill's ::after, following the front of its bar. */
function segmentEdgeKeyframes(i: number, count: number): Keyframe[] {
  return segmentKeyframes(i, count).map((f) => ({ ...f, transform: f.transform === "scaleX(1)" ? "translateX(0%)" : "translateX(-100%)" }))
}

/** The bar's keyframes in a timed run: shadcn Progress draws a level by translating its fill. */
const BAR_KEYFRAMES: Keyframe[] = [{ transform: "translateX(-100%)" }, { transform: "translateX(0%)" }]

/** The theme variable behind each tone (its `-rgb` channels colour the slab line). */
const TONE_VAR: Record<MeterFill, string> = {
  primary: "--brand",
  foreground: "--foreground",
  destructive: "--destructive",
  success: "--success",
  warning: "--warning",
  info: "--info",
  "chart-1": "--chart-1",
  "chart-2": "--chart-2",
  "chart-3": "--chart-3",
  "chart-4": "--chart-4",
  "chart-5": "--chart-5",
  health: "--vital-health",
  armor: "--vital-armor",
  hunger: "--vital-hunger",
  thirst: "--vital-thirst",
  stress: "--vital-stress",
  hue: "--hue",
}

/** Calls `onCancel` when `key` is pressed (any case) while mounted; never while typing in a field. */
function useCancelKey(key: string | undefined, onCancel?: () => void) {
  const cancel = React.useRef(onCancel)
  React.useEffect(() => {
    cancel.current = onCancel
  })
  const armed = !!key && onCancel !== undefined
  React.useEffect(() => {
    if (!armed || !key) return
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.repeat || (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))) return
      if (e.key.toLowerCase() === key.toLowerCase()) cancel.current?.()
    }
    window.addEventListener("keydown", down)
    return () => window.removeEventListener("keydown", down)
  }, [key, armed])
}

function Meter({
  className,
  size,
  value: valueProp = 0,
  max: maxProp = 100,
  low,
  high,
  tone: toneProp = "primary",
  hue,
  threshold,
  color,
  track = "theme",
  label,
  icon,
  valueText,
  segments,
  duration,
  onComplete,
  variant = "bar",
  cancelKey,
  cancelLabel = "Cancel",
  onCancel,
  style,
  density,
  shape,
  motion,
  ...props
}: NkVariantProps & Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof meterVariants> & {
    /** The level, 0–max. Ignored when `duration` is set. */
    value?: number
    max?: number
    /** Percentage at or below which the meter turns destructive (health, fuel). */
    low?: number
    /** Percentage at or above which the meter turns destructive (stress, weight). */
    high?: number
    tone?: MeterFill
    /**
     * A role (health, armor, police, legendary…; ROLE_SETS): data-hue on the meter, and the fill in its colour.
     * Wins over `tone`; `color` and thresholds still win over it.
     */
    hue?: string
    /**
     * The alert threshold as a level (0–1): at or under it the meter is data-state="alert" (destructive).
     * `true` = the theme's default, 0.2 (--nk-behavior-alert). The same rule as `low`, in the level's units.
     */
    threshold?: number | boolean
    /** theme: on a panel. game: a dark track on the game world. */
    track?: "theme" | "game"
    label?: React.ReactNode
    icon?: React.ReactNode
    /** Shown at the end of the label row: "72%", "22.4 / 30 kg". */
    valueText?: React.ReactNode
    /** Split the bar into equal plates (armor, battery). */
    segments?: number
    /**
     * A colour from a library that no tone covers (a CSS colour; see meterColor()). Overrides
     * `tone`; thresholds still win. Theme tracks turn neutral, since its tint can't be mixed inline.
     */
    color?: string
    /** Fill on its own over this many ms (value and max are ignored). */
    duration?: number
    /** With `duration`: called once when the time is up, from a timer. */
    onComplete?: () => void
    /**
     * bar (default): the bar, with an optional label row. slab: the timed-progress slab on the game
     * (design v2 §4.5, `nk-slab-stack`): the label, the cancel key and its verb, a thin line. The
     * successor of `task-progress`: `<Meter variant="slab" label="Repairing" duration={5000}
     * cancelKey="X" onCancel={cancel} />`.
     */
    variant?: "bar" | "slab"
    /** slab: the key that cancels, shown as a key chip; with `onCancel` the meter listens for it. */
    cancelKey?: string
    /** slab: the verb after the cancel key. Default "Cancel". */
    cancelLabel?: React.ReactNode
    /** slab: called when `cancelKey` is pressed (KeyboardEvent.key, any case). */
    onCancel?: () => void
  }) {
  const root = React.useRef<HTMLDivElement>(null)
  const segmented = !!segments && segments > 1
  const slab = variant === "slab"
  // a timed run (Motion): the bar's indicator, each segment's Fill (its share of the run), or the slab line's Fill
  const done = useLinearRun(root, {
    duration,
    onComplete,
    release: true,
    targets: (el) => {
      if (slab) return fillTargets(el.querySelector("[data-slot=meter-line]"), 0, 1)
      if (segmented) {
        const segs = Array.from(el.querySelectorAll("[data-slot=meter-segment]"))
        return segs.flatMap((seg, i) => {
          return [
            { el: seg, pseudoElement: "::before", keyframes: segmentKeyframes(i, segs.length) },
            { el: seg, pseudoElement: "::after", keyframes: segmentEdgeKeyframes(i, segs.length) },
          ]
        })
      }
      return [{ el: el.querySelector("[data-slot=progress-indicator]"), keyframes: BAR_KEYFRAMES }]
    },
  })
  const timed = duration !== undefined && duration > 0
  const value = timed ? (done ? duration : 0) : valueProp
  const max = timed ? duration : maxProp
  const { percent, level } = meterLevel(value, { max, low, high })
  const drawn = percent
  const tone: MeterFill = hue ? "hue" : toneProp
  // one alert rule (fill.tsx alertAt): a level at or under the threshold; true = the theme's 0.2
  const t15 = threshold === true ? 0.2 : typeof threshold === "number" ? threshold : undefined
  const critical = level !== "normal" || (t15 !== undefined && percent / 100 <= t15)
  const custom = !!color && !critical
  const t = custom ? CUSTOM : TONES[critical ? "destructive" : tone] ?? TONES.primary
  const trackClass = track === "game" ? "nk-track" : t.track
  const fillClass = custom ? CUSTOM_FILL : FILL[critical ? "destructive" : tone] ?? FILL.primary
  // Timed: the animation draws the fill; React only sets the end state, with no transition.
  const timedClass = timed && "[&_[data-slot=progress-indicator]]:transition-none"
  // the level contract: --level is the value (0–1); a timed run draws on the compositor and --level is
  // its end state
  const rootStyle = {
    ...nkLevel(percent / 100),
    ...style,
    ...(custom && { "--meter-fill": color }),
  } as React.CSSProperties
  const stacked = label !== undefined || valueText !== undefined
  // flex-1 only beside an icon: in the stacked column it would collapse the bar's height to 0
  const grow = stacked ? "w-full" : "flex-1"

  useCancelKey(variant === "slab" ? cancelKey : undefined, onCancel)

  if (variant === "slab") {
    const toneVar = custom ? undefined : (TONE_VAR[critical ? "destructive" : tone] ?? TONE_VAR.primary)
    return (
      <div
        {...nkVariant({ density, shape, motion })}
        data-slot="meter"
        data-variant="slab"
        data-hue={hue || undefined}
        data-state={critical ? "alert" : undefined}
        data-level={level}
        data-complete={(timed && percent >= 100) || undefined}
        className={cn("nk-slab-stack", className)}
        ref={root}
        style={
          {
            ...nkLevel(percent / 100),
            ...style,
            ...(toneVar
              ? { "--nk-slab-tone": toneVar === "--brand" ? "var(--brand-rgb, var(--primary-rgb))" : toneVar === "--hue" ? "var(--hue, var(--brand-rgb, var(--primary-rgb)))" : `var(${toneVar}-rgb)` }
              : { "--nk-slab-line-fill": color }),
          } as React.CSSProperties
        }
        {...props}
      >
        {(label !== undefined || valueText !== undefined || cancelKey) && (
          <div data-slot="meter-label-row" className="nk-slab-stack-row">
            <span data-slot="meter-label" className="nk-caption min-w-0 truncate">
              {label}
            </span>
            {valueText !== undefined && (
              <span data-slot="meter-value" className="nk-num">
                {valueText}
              </span>
            )}
            {cancelKey && (
              <>
                <kbd data-slot="meter-cancel-key" className="nk-slab-key">
                  {cancelKey}
                </kbd>
                <span data-slot="meter-cancel-label">{cancelLabel}</span>
              </>
            )}
          </div>
        )}
        <Fill
          role="progressbar"
          aria-hidden={false}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          aria-label={typeof label === "string" ? label : props["aria-label"]}
          data-slot="meter-line"
          level={drawn / 100}
          tween={!timed}
          // the slab line's track and height (nk-slab-line); its bar is the Fill's, in the slab's tone, with its glow
          color="rgb(var(--nk-slab-tone))"
          className="nk-slab-line after:hidden before:[box-shadow:0_0_0.5rem_rgba(var(--nk-slab-tone),var(--nk-surface-glow))]"
        />
      </div>
    )
  }

  const bar =
    segmented ? (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={typeof label === "string" ? label : props["aria-label"]}
        className={cn("flex min-w-0 gap-(--nk-space-1)", grow)}
      >
        {segmentFills(drawn, segments).map((fill, i) => (
          // each plate is a Fill on the meter's track, in the meter's colour (hue: the role, read by the Fill)
          <Fill
            key={i}
            data-slot="meter-segment"
            level={fill / 100}
            tween={!timed}
            alert={critical}
            color={custom ? "var(--meter-fill)" : FILL_COLOR[critical ? "destructive" : tone]}
            className={cn("h-(--meter-h) flex-1", trackClass)}
          />
        ))}
      </div>
    ) : (
      <Progress
        value={drawn}
        // shadcn's Progress keeps `value` for its indicator and never hands it to Radix's root,
        // so the root has no aria-valuenow: give it one.
        aria-valuenow={Math.round(percent)}
        aria-label={typeof label === "string" ? label : props["aria-label"]}
        className={cn("h-(--meter-h) min-w-0", grow, trackClass, fillClass, timedClass)}
      />
    )

  const iconEl = icon && (
    <span
      data-slot="meter-icon"
      className={cn("flex shrink-0 [&_svg:not([class*='size-'])]:size-4", t.text, critical && "nk-blink")}
    >
      {icon}
    </span>
  )

  return (
    <div
      {...nkVariant({ density, shape, motion })}
      data-slot="meter"
      data-hue={hue || undefined}
      data-state={critical ? "alert" : undefined}
      data-level={level}
      data-complete={(timed && percent >= 100) || undefined}
      className={cn(meterVariants({ size }), stacked ? "flex flex-col gap-(--nk-space-2)" : "flex items-center gap-2", className)}
      ref={root}
      style={rootStyle}
      {...props}
    >
      {stacked ? (
        <>
          <div className="flex min-w-0 items-center gap-(--nk-space-2)">
            {iconEl}
            {label !== undefined && <span data-slot="meter-label" className="nk-caption min-w-0 flex-1 truncate">{label}</span>}
            {valueText !== undefined && (
              <span data-slot="meter-value" className={cn("nk-num ml-auto shrink-0 text-(length:--nk-caption-size) leading-4 [font-weight:var(--nk-type-label-weight)]", critical && "text-destructive")}>
                {valueText}
              </span>
            )}
          </div>
          {bar}
        </>
      ) : (
        <>
          {iconEl}
          {bar}
        </>
      )}
    </div>
  )
}

export { Meter, meterVariants, meterLevel, segmentFills, meterColor, segmentKeyframes, type MeterTone, type MeterFill, type MeterLevel }
