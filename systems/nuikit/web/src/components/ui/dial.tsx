// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/dial.tsx, then run pnpm sync.
import * as React from "react"

import { cn, nkLevel } from "@/lib/utils"
import { toneVars } from "@/components/ui/fill"

/**
 * Dial — the speedometer arc as a primitive (docs/design/ink.md §3, Dial): one SVG geometry with a track
 * arc, a value arc, ticks and an optional needle, and whatever you put inside (a readout, a gear Tile, a unit).
 * Speedometer composes it; a fuel or boost gauge is a Dial too, and so is ProgressRing: a Dial with `sweep={360}`.
 *
 *   <Dial level={rpm} redline={0.88}>
 *     <span className="nk-num">{speed}</span>
 *   </Dial>
 *   <Dial level={boost} segments={10} variant="digital" size="sm" hue="info" />
 *
 * Role: a level read at a glance on a round gauge (rpm, boost, a charge), on the game or on a panel.
 * Anatomy: root (data-slot="dial", --level) > svg (ticks, track arc, value arc or segments, needle) > center (children).
 * Props: level (0–1, or value / max), size (sm | md | lg or px at 1080p), variant (ticks | digital), ticks
 *   (the tick count lever, 0 for none), segments, segmentGap (degrees between them: the speedometer's even gaps; the
 *   track is segmented too), direction (cw: lit from the start; ccw: from the end, a fuel band draining down), paint
 *   (accent: the value in the accent's stops, like the speedometer), disc (true: a plate behind the arc; soft: the
 *   speedometer's scrim that fades out at the edge), redline (lit segments past it are red; unlit ones look like any other), needle, tone,
 *   hue, surface, sweep (256 a gauge, 360 a ring), start, thickness, inset, trackProps, valueProps.
 * Level means: how far the value has swept the arc, 0 at the start, 1 at the end of the sweep.
 * Rules: the value arc is data-driven (no CSS tween on the dash; a live gauge writes it with dialDash()); the
 *   needle moves by a rotate transform. Past the redline it is data-state="alert". Colours only from the
 *   gauge and fill tokens (--nk-gauge-*, --nk-fill-*, a hue); no glow filter, no drop shadow.
 */

/** The arc's sweep in degrees (a gap at the bottom): the speedometer's, as refined in game. */
const DIAL_SWEEP = 256
/** The default track thickness in the SVG's units (px at 1080p). */
const DIAL_STROKE = 3
/** Major and minor ticks around the sweep (0, 1/8 … 1). */
const DIAL_TICKS = 9
const DIAL_SIZE = { sm: 128, md: 192, lg: 256 } as const

/** A redline: a level (0–1), true (0.88, the speedometer's), or off. */
const DIAL_REDLINE = 0.88

/**
 * The gauge track thickness in the SVG's own units: --nk-gauge-width (a rem or px length at 1080p). The SVG is
 * laid out in rem and scales as a whole, so a rem length is ×16 user units. Falls back to DIAL_STROKE.
 */
function gaugeStroke(value: string | null | undefined) {
  const m = /^\s*(-?[\d.]+)(rem|px)\s*$/.exec(value ?? "")
  if (!m) return DIAL_STROKE
  const n = Number(m[1]) * (m[2] === "rem" ? 16 : 1)
  return Number.isFinite(n) && n > 0 ? Math.min(12, n) : DIAL_STROKE
}

function useGaugeStroke(ref: React.RefObject<HTMLElement | null>) {
  const [stroke, setStroke] = React.useState(DIAL_STROKE)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || typeof getComputedStyle !== "function") return
    setStroke(gaugeStroke(getComputedStyle(el).getPropertyValue("--nk-gauge-width")))
  }, [ref])
  return stroke
}

/** 0–1, NaN → 0. */
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0))

/**
 * The dial's geometry for a diameter (px at 1080p). The radius sits `inset` in from the edge (the default
 * stroke's, so dialDash() holds whatever --nk-gauge-width says); a ring (ProgressRing) passes its own.
 */
function dialGeometry(size: number = DIAL_SIZE.md, sweep = DIAL_SWEEP, inset = DIAL_STROKE) {
  const r = size / 2 - inset
  const circumference = 2 * Math.PI * r
  return { r, c: size / 2, circumference, arc: (circumference * sweep) / 360, start: 90 + (360 - sweep) / 2 }
}

/** The value arc's stroke-dasharray for a level (0–1) on a dial of `size`: what a live gauge writes. */
function dialDash(level: number, size: number = DIAL_SIZE.md, sweep = DIAL_SWEEP) {
  const { circumference, arc } = dialGeometry(size, sweep)
  return `${arc * clamp01(level)} ${circumference}`
}

/** How many of `segments` are lit at a level (a segment lights once the level reaches its start). */
function dialSegments(level: number, segments: number) {
  const n = Math.max(0, Math.floor(segments))
  return Math.max(0, Math.min(n, Math.ceil(clamp01(level) * n - 1e-9)))
}

/** Literal class names, so Tailwind finds them. none: no surface of its own (a composite colours the track). */
const SURFACE = {
  game: { root: "nk-on-game", track: "stroke-(--nk-gauge-track-color)" },
  theme: { root: "text-foreground", track: "stroke-(--nk-fill-track)" },
  none: { root: "", track: "" },
} as const

type DialProps = Omit<React.ComponentProps<"div">, "children"> & {
  /** 0–1 (or `value` / `max`). */
  level?: number
  value?: number
  max?: number
  /** sm 128, md 192 (default), lg 256, or a diameter in px at 1080p (laid out in rem). */
  size?: keyof typeof DIAL_SIZE | number
  /** ticks: tick marks round the sweep (default). digital: the arc alone. */
  variant?: "ticks" | "digital"
  /** The tick count lever (major and minor alternate); 0 for none. Default 9. */
  ticks?: number
  /** Draw the value as this many segments instead of one arc (the track is segmented with it). */
  segments?: number
  /** Degrees between segments. Default: a hairline (the stroke + 2 units). */
  segmentGap?: number
  /** cw: segments light from the start of the sweep (default). ccw: from its end (a band that drains downward). */
  direction?: "cw" | "ccw"
  /** accent: the value painted in the accent's stops across the dial (the speedometer's level). */
  paint?: "tone" | "accent"
  /** A plate disc behind the arc: true is the HUD material on the game (the plate on a panel); soft is the
   *  speedometer's scrim, solid under the arc and fading out past it (--nk-dial-disc-opacity, --nk-dial-disc-reach). */
  disc?: boolean | "soft"
  /** Past this level (0–1; true = 0.88) the arc turns --nk-gauge-redline and the dial is data-state="alert". */
  redline?: number | boolean
  /** Force the alert (a live gauge that computes its own redline). */
  alert?: boolean
  /** A needle at the level (a rotate transform). */
  needle?: boolean
  tone?: "neutral" | "info" | "success" | "warning" | "danger"
  /** A role (health, police…): the value arc in its colour. */
  hue?: string
  /** game: on the world (HUD tokens). theme: on a panel. none: the composite colours it (trackProps, valueProps). */
  surface?: "game" | "theme" | "none"
  /** The arc's sweep in degrees: 240 (a gauge, the gap at the bottom), 360 (a ring). */
  sweep?: number
  /** Where the sweep starts, in degrees clockwise from 3 o'clock. Default: centred on the gap (-90, 12 o'clock, for a ring). */
  start?: number
  /** The arc's thickness in the SVG's units (px at 1080p). Default: --nk-gauge-width. */
  thickness?: number
  /** How far the arc sits in from the edge (px at 1080p). Default: the gauge stroke. */
  inset?: number
  /** Extra props for the track arc. */
  trackProps?: React.ComponentProps<"circle"> & Record<`data-${string}`, string | undefined>
  /** Extra props for the value arc (a live gauge's data-slot, say). */
  valueProps?: React.ComponentProps<"circle"> & Record<`data-${string}`, string | undefined>
  children?: React.ReactNode
}

function Dial({
  className,
  level: levelProp,
  value,
  max = 1,
  size: sizeProp = "md",
  variant = "ticks",
  ticks = DIAL_TICKS,
  segments,
  segmentGap,
  direction = "cw",
  paint = "tone",
  disc = false,
  redline: redlineProp = false,
  alert: alertProp,
  needle = false,
  tone,
  hue,
  surface = "game",
  sweep = DIAL_SWEEP,
  start: startProp,
  thickness,
  inset,
  trackProps,
  valueProps,
  style,
  children,
  ...props
}: DialProps) {
  const root = React.useRef<HTMLDivElement>(null)
  const gauge = useGaugeStroke(root)
  const stroke = thickness ?? gauge
  const size = typeof sizeProp === "number" ? sizeProp : (DIAL_SIZE[sizeProp] ?? DIAL_SIZE.md)
  const level = clamp01(levelProp ?? (value !== undefined && max > 0 ? value / max : 0))
  const threshold = redlineProp === true ? DIAL_REDLINE : redlineProp === false ? undefined : redlineProp
  const alert = alertProp ?? (threshold !== undefined && level > threshold)
  const ring = sweep >= 360
  const geo = dialGeometry(size, Math.max(1, Math.min(360, sweep)), inset)
  const { r, c, circumference, arc } = geo
  const start = startProp ?? (ring ? -90 : geo.start)
  const s = SURFACE[surface] ?? SURFACE.game
  const accentId = `nk-dial-accent-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const accentPaint = paint === "accent" && !hue && (!tone || tone === "neutral")
  // one arc turns the redline whole past it; segments keep their colour, only the red zone's are red
  const accent = accentPaint && !alert
  const valueClass = alert ? "stroke-(--nk-gauge-redline)" : accent ? "" : "stroke-[var(--hue-solid,var(--nk-gauge-fill))]"
  const valueStroke = accent ? `url(#${accentId})` : undefined
  const segClass = accentPaint ? "" : "stroke-[var(--hue-solid,var(--nk-gauge-fill))]"
  const segStroke = accentPaint ? `url(#${accentId})` : undefined
  const tickCount = variant === "digital" ? 0 : Math.max(0, Math.floor(ticks))
  const segs = segments !== undefined && segments > 1 ? Math.floor(segments) : 0
  const lit = segs ? dialSegments(level, segs) : 0
  const isLit = (i: number) => (direction === "ccw" ? segs - 1 - i < lit : i < lit)
  /** past the redline (by its start) */
  const isRed = (i: number) => threshold !== undefined && i / segs >= threshold - 1e-6
  // the gap between segments, in user units along the arc: the lever's degrees, else a hairline
  const segLen = segs ? arc / segs : 0
  const segGap = segmentGap !== undefined ? Math.min(segLen * 0.8, (2 * Math.PI * r * Math.max(0, segmentGap)) / 360) : Math.min(segLen / 3, stroke + 2)

  return (
    <div
      ref={root}
      data-slot="dial"
      data-variant={variant}
      data-state={alert ? "alert" : undefined}
      {...toneVars({ tone: tone === "neutral" ? undefined : tone, hue })}
      className={cn("relative shrink-0", s.root, className)}
      style={{ width: `${size / 16}rem`, height: `${size / 16}rem`, ...nkLevel(level), ...style }}
      {...props}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden className="absolute inset-0 size-full overflow-visible">
        {accentPaint && (
          <defs>
            <linearGradient id={accentId} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={size} y2={0}>
              <stop offset="0" style={{ stopColor: "var(--nk-accent-from, var(--nk-gauge-fill))" }} />
              <stop offset="0.5" style={{ stopColor: "var(--nk-accent-via, var(--nk-gauge-fill))" }} />
              <stop offset="1" style={{ stopColor: "var(--nk-accent-to, var(--nk-gauge-fill))" }} />
            </linearGradient>
          </defs>
        )}
        {disc === "soft" && (
          <>
            <defs>
              <radialGradient id={`${accentId}-disc`}>
                <stop offset="0" style={{ stopColor: "var(--scrim, #000)", stopOpacity: "var(--nk-dial-disc-opacity, var(--nk-hud-alpha, var(--nk-hud-opacity, 0.55)))" }} />
                <stop offset="0.58" style={{ stopColor: "var(--scrim, #000)", stopOpacity: "var(--nk-dial-disc-opacity, var(--nk-hud-alpha, var(--nk-hud-opacity, 0.55)))" }} />
                <stop offset="1" style={{ stopColor: "var(--scrim, #000)", stopOpacity: 0 }} />
              </radialGradient>
            </defs>
            {/* the scrim reaches past the arc (the speedometer's plate, 1.17× the dial) and fades out there */}
            <circle data-slot="dial-disc" data-variant="soft" cx={c} cy={c} r={size * 0.585} fill={`url(#${accentId}-disc)`} />
          </>
        )}
        {disc === true && (
          <circle
            data-slot="dial-disc"
            cx={c}
            cy={c}
            r={Math.max(0, r + stroke / 2)}
            className={surface === "game" || surface === "none" ? "fill-(--nk-chip-bg)" : "fill-(--nk-plate-bg)"}
          />
        )}
        {tickCount > 1 && (
          <g data-slot="dial-ticks">
            {Array.from({ length: tickCount }, (_, i) => {
              const at = i / (tickCount - 1)
              const a = ((start + sweep * at) * Math.PI) / 180
              const r1 = r - stroke / 2 - 3
              const r2 = r1 - (i % 2 === 0 ? 7 : 4)
              return (
                <line
                  key={i}
                  x1={c + Math.cos(a) * r1}
                  y1={c + Math.sin(a) * r1}
                  x2={c + Math.cos(a) * r2}
                  y2={c + Math.sin(a) * r2}
                  strokeWidth={i % 2 === 0 ? 2 : 1.5}
                  className={
                    threshold !== undefined && at > threshold
                      ? "stroke-(--nk-gauge-redline) [stroke-opacity:var(--nk-gauge-ticks,1)]"
                      : i % 2 === 0
                        ? "stroke-(--nk-gauge-tick-major)"
                        : "stroke-(--nk-gauge-tick)"
                  }
                />
              )
            })}
          </g>
        )}
        {segs > 0 ? (
          // segmented: the track is the same segments, unlit (the speedometer's dim pieces); unlit red-zone pieces
          // look like every other unlit piece, only lit ones past the redline are red
          <g data-slot="dial-track" {...(trackProps as React.ComponentProps<"g">)}>
            {Array.from({ length: segs }, (_, i) => (
              <circle
                key={i}
                data-red={isRed(i) || undefined}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                strokeWidth={stroke}
                className={cn(s.track, (trackProps as { className?: string } | undefined)?.className)}
                strokeDasharray={`${Math.max(0, segLen - segGap)} ${circumference}`}
                transform={`rotate(${start + (sweep * i) / segs + (segGap / 2 / (2 * Math.PI * r)) * 360} ${c} ${c})`}
              />
            ))}
          </g>
        ) : (
          <circle
            data-slot="dial-track"
            cx={c}
            cy={c}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className={s.track}
            strokeDasharray={ring ? undefined : `${arc} ${circumference}`}
            transform={`rotate(${start} ${c} ${c})`}
            {...trackProps}
          />
        )}
        {segs > 0 ? (
          <g data-slot="dial-segments">
            {Array.from({ length: segs }, (_, i) => (
              <circle
                key={i}
                data-slot="dial-segment"
                data-index={i}
                data-active={isLit(i) || undefined}
                data-red={isRed(i) || undefined}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                strokeWidth={stroke}
                className={cn(isRed(i) ? "stroke-(--nk-gauge-redline)" : segClass, (valueProps as { className?: string } | undefined)?.className)}
                stroke={isRed(i) ? undefined : segStroke}
                style={{ opacity: isLit(i) ? 1 : 0 }}
                strokeDasharray={`${Math.max(0, segLen - segGap)} ${circumference}`}
                transform={`rotate(${start + (sweep * i) / segs + (segGap / 2 / (2 * Math.PI * r)) * 360} ${c} ${c})`}
              />
            ))}
          </g>
        ) : (
          <circle
            data-slot="dial-value"
            cx={c}
            cy={c}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className={valueClass}
            stroke={valueStroke}
            strokeDasharray={`${arc * level} ${circumference}`}
            transform={`rotate(${start} ${c} ${c})`}
            {...valueProps}
          />
        )}
        {needle && (
          <line
            data-slot="dial-needle"
            x1={c}
            y1={c}
            x2={c + r - stroke}
            y2={c}
            strokeWidth={2}
            className="stroke-(--nk-gauge-needle) transition-transform duration-(--nk-time-fast) ease-(--nk-ease-standard)"
            style={{ transformOrigin: `${c}px ${c}px`, transform: `rotate(${start + sweep * level}deg)` }}
          />
        )}
      </svg>
      {children !== undefined && children !== null && (
        <div data-slot="dial-center" className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}

export { Dial, dialGeometry, dialDash, dialSegments, gaugeStroke, DIAL_SWEEP, DIAL_STROKE, DIAL_TICKS, DIAL_SIZE, DIAL_REDLINE, type DialProps }
