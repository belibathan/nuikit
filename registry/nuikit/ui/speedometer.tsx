import * as React from "react"
import { ArrowBigLeftIcon, ArrowBigRightIcon, FuelIcon } from "lucide-react"
import { motionLevel } from "nuikit-core/motion"

import { cn } from "@/lib/utils"
import { Dial, DIAL_REDLINE, dialDash, dialSegments, gaugeStroke } from "@/components/ui/dial"
import { TextRoll } from "@/components/ui/text-roll"
import { Tile } from "@/components/ui/tile"

/**
 * Speedometer — the vehicle gauge as refined in game (docs/design/baseline.md: the quality bar): a Dial of
 * --nk-speedometer-segments thick segments with small even gaps (digital, the default), or a thin arc over faint ticks
 * (arc), the speed big in the middle with its leading zeros dimmed (`0`64), the unit under it, the gear on a keycap
 * Tile seated in the arc's opening, fuel as thinner segments on the outer right-hand curve that drain downward,
 * and the turn signals inside the ring. Past the redline the segments are red (only lit ones; unlit look like the rest),
 * the dial and the gear data-state="alert". The dial sits on a soft scrim that fades out past the ring.
 *
 *   <Speedometer speed={87} rpm={0.62} gear={3} fuel={41} />
 *
 * Feed it from Lua at ~10Hz: NUI.send('hud:vehicle', { speed = 87, rpm = 0.62, gear = 3, fuel = 41 }). Live (the
 * game's frame rate, no React render): pass `live`, stream speed and rpm (NUI.stream) and paint them with
 * speedometerPainter(root): speed(v) rolls each digit that changed (up when it grows), rpm(v) switches the lit
 * segments (or the arc's dash) and the redline. See systems/nuikit_hud (hud/compact.tsx wraps it in a calm gate).
 *
 * Role: speed, rpm, gear and fuel while driving, drawn on the game (`surface="game"`) or a panel ("theme").
 * Anatomy: Dial (segments or arc + ticks, the redline, the soft disc) > fuel band (outer segments, the pump) >
 *   signals > readout (speed digits, unit) > foot (gear Tile, or `center`).
 * Props: speed, rpm, gear, fuel, unit, size (px at 1080p, laid out in rem), surface, redline, style (digital | arc),
 *   indicators, engine, center, live.
 * Level means: the rpm (0–1) lights the dial's segments from the left; fuel / 100 lights the band from the bottom.
 * Rules: past the redline (rpm ≥ 0.88 by default) the dial and the gear are data-state="alert"; fuel at or under
 *   15 is the danger colour, breathing. No glow filter; the segments switch, nothing tweens on the dash. The
 *   leading zeros are --nk-speedometer-digit-dim (0.26). Everything scales with `size`; levers are --nk-speedo-*.
 */

/** Past this rpm (0–1) the segments and the gear turn the redline. */
const SPEEDOMETER_REDLINE = DIAL_REDLINE
/** At or below this fuel (0–100) the band turns the danger colour. */
const SPEEDOMETER_LOW_FUEL = 15
/** The in-game gauge: 13.5rem at 1080p. */
const SPEEDOMETER_SIZE = 216
/** The dial's geometry in units of `size`, from the in-game cluster (hud/compact.tsx, a 156-unit viewBox). */
const SPEEDOMETER_GEOMETRY = {
  /** the rpm sweep (degrees) and where it starts, clockwise from the top */
  sweep: 256,
  start: -128,
  /** digital: thick segments with small even gaps */
  segments: 11,
  gap: 3,
  stroke: 9 / 156,
  inset: (78 - 64) / 156,
  /** arc: a thin arc over this many short ticks */
  ticks: 32,
  arcStroke: 3 / 156,
  arcInset: (78 - 70) / 156,
  /** fuel: thinner segments on the outer right-hand curve, from the full end (upper) to the empty end (lower) */
  fuel: { segments: 5, from: 56, to: 124, stroke: 4 / 156, inset: (78 - 74.5) / 156, iconAt: 136 },
  /** the readout's centre and the gear's, down from the top; the signals' centre and their spread */
  readout: 0.46,
  gear: 0.5 + 78 / 216,
  signals: { y: 0.46 + 30 / 216, dx: 56 / 216 },
} as const

/** The speed as three digits (up to 999) and how many of them are leading zeros (dimmed). */
function speedometerDigits(speed: number): { digits: string; lead: number } {
  const n = Math.min(999, Math.max(0, Math.round(Number.isFinite(speed) ? speed : 0)))
  const digits = String(n).padStart(3, "0")
  let lead = 0
  while (lead < digits.length - 1 && digits[lead] === "0") lead++
  return { digits, lead }
}

/** The rpm arc's stroke-dasharray for an rpm (0–1) on an `arc` speedometer of `size` (Dial's dialDash()). */
function speedometerDash(rpm: number, size = SPEEDOMETER_SIZE) {
  return dialDash(rpm, size, SPEEDOMETER_GEOMETRY.sweep)
}

/** How many of the dial's segments are lit at an rpm. */
function speedometerLit(rpm: number, segments: number = SPEEDOMETER_GEOMETRY.segments) {
  return dialSegments(rpm, segments)
}

const ROLL_MS = 170
const reels = new WeakMap<HTMLElement, { ch: string; at: number; busy: Animation[] }>()

/**
 * Roll one digit reel to `ch` (dir 1: up, the new glyph from below), outside React. Nothing queues: a new value
 * finishes the roll in flight and starts from there, in at most the time since the last change; a reel that
 * changes faster than it can roll snaps. Transform only; the reel's window clips vertically.
 */
function rollDigit(el: HTMLElement | null, ch: string, dir: 1 | -1) {
  if (!el) return
  const now = performance.now()
  let st = reels.get(el)
  if (!st) {
    st = { ch: el.textContent ?? "", at: 0, busy: [] }
    reels.set(el, st)
  }
  if (st.ch === ch) return
  const gap = now - st.at
  st.at = now
  st.ch = ch
  for (const a of st.busy) a.finish()
  st.busy = []
  while (el.childNodes.length > 1) el.removeChild(el.firstChild!)
  let glyph = el.firstElementChild as HTMLElement | null
  if (!glyph) {
    el.textContent = ""
    glyph = document.createElement("span")
    el.appendChild(glyph)
  }
  const ms = Math.min(ROLL_MS, gap - 10)
  if (motionLevel() !== "on" || ms < 60 || typeof glyph.animate !== "function") {
    glyph.textContent = ch
    return
  }
  const next = document.createElement("span")
  next.textContent = ch
  el.appendChild(next)
  const opts: KeyframeAnimationOptions = { duration: ms, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
  const out = glyph.animate([{ transform: "translateY(0)" }, { transform: `translateY(${-dir * 100}%)` }], { ...opts, fill: "forwards" })
  const into = next.animate([{ transform: `translateY(${dir * 100}%)` }, { transform: "translateY(0)" }], opts)
  const old = glyph
  out.onfinish = () => old.remove()
  st.busy = [out, into]
}

/**
 * A painter for a `live` speedometer: writes the DOM straight, no render. speed(v) rolls the digits that changed
 * and dims the leading zeros; rpm(v) toggles the lit segments (or writes the arc's dash) and the redline state.
 */
function speedometerPainter(root: HTMLElement, options: { redline?: number; size?: number } = {}) {
  const redline = options.redline ?? SPEEDOMETER_REDLINE
  const size = options.size ?? SPEEDOMETER_SIZE
  const digits = Array.from(root.querySelectorAll<HTMLElement>("[data-slot=speedometer-digit]"))
  const segs = Array.from(root.querySelectorAll<HTMLElement>("[data-slot=dial-segment]"))
  const arc = root.querySelector<SVGElement>("[data-slot=speedometer-rpm]")
  const state = { speed: "", lead: -1, lit: -1, red: false, dash: "" }
  return {
    speed(v: number) {
      const { digits: d, lead } = speedometerDigits(v)
      if (d === state.speed) return
      const dir: 1 | -1 = Number(d) >= Number(state.speed || 0) ? 1 : -1
      for (let i = 0; i < 3; i++) rollDigit(digits[i] ?? null, d[i]!, dir)
      state.speed = d
      if (lead !== state.lead) {
        state.lead = lead
        for (let i = 0; i < 3; i++) digits[i]?.toggleAttribute("data-dim", i < lead)
      }
    },
    rpm(v: number) {
      const x = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0))
      if (segs.length) {
        const lit = speedometerLit(x, segs.length)
        if (lit !== state.lit) {
          state.lit = lit
          for (let i = 0; i < segs.length; i++) {
            const on = i < lit
            segs[i]!.toggleAttribute("data-active", on)
            segs[i]!.style.opacity = on ? "1" : "0"
          }
        }
      } else if (arc) {
        const dash = speedometerDash(x, size)
        if (dash !== state.dash) {
          state.dash = dash
          arc.setAttribute("stroke-dasharray", dash)
        }
      }
      const red = x >= redline
      if (red !== state.red) {
        state.red = red
        if (red) root.setAttribute("data-state", "alert")
        else root.removeAttribute("data-state")
        for (const gear of root.querySelectorAll("[data-part=speedometer-gear]")) {
          if (red) gear.setAttribute("data-state", "alert")
          else gear.removeAttribute("data-state")
        }
      }
    },
  }
}

/** Gears in order, for the roll direction: R, N, 1 to 8. */
const gearOrder = (g: string) => (g === "R" ? -1 : g === "N" ? 0 : Number(g) || 0)

/** The reel window: glyphs stacked, clipped vertically only (italic glyphs overhang sideways). */
/** A digit: dimmed while it is a leading zero. */
const DIGIT = "transition-opacity duration-(--nk-time-base) ease-out data-dim:opacity-(--nk-speedometer-digit-dim,0.26)"
/** A live reel window: glyphs stacked, clipped vertically only (italic glyphs overhang sideways). */
const REEL = "inline-grid py-[0.08em] -my-[0.08em] [clip-path:inset(0_-0.5em)] [&>span]:[grid-area:1/1]"

type SpeedometerProps = Omit<React.ComponentProps<"div">, "children"> & {
  speed: number
  /** 0–1 */
  rpm: number
  gear?: number | string
  /** 0–100 */
  fuel?: number
  unit?: string
  /** Diameter in px at 1080p (the in-game 216 = 13.5rem). */
  size?: number
  /** game: on the world (HUD tokens). theme: on a panel. */
  surface?: "game" | "theme"
  /** Past the redline; by default rpm ≥ 0.88. For a live gauge whose rpm you write yourself. */
  redline?: boolean
  /** digital (default): thick segments. arc: a thin arc over short ticks (--nk-style-gauge: arc). */
  style?: "digital" | "arc"
  /** The turn signals, as bits: 1 left, 2 right (3 both). Undefined draws none. */
  indicators?: number
  /** false dims the dial (the engine is off). */
  engine?: boolean
  /** Replaces the gear in the arc's opening (a boat's heading). */
  center?: React.ReactNode
  /** Plain digit reels for speedometerPainter() to roll, instead of React-driven TextRolls. */
  live?: boolean
}

function Speedometer({
  className,
  speed,
  rpm,
  gear = "N",
  fuel,
  unit = "mph",
  size = SPEEDOMETER_SIZE,
  surface = "game",
  redline: redlineProp,
  style: gaugeStyle = "digital",
  indicators,
  engine = true,
  center,
  live = false,
  ...props
}: SpeedometerProps) {
  const G = SPEEDOMETER_GEOMETRY
  // `live`: speedometerPainter() owns the rpm, the redline and every data-state it writes. The props are not
  // read, so a React re-render (10 Hz hud:vehicle, a stale v.rpm) can never re-light, re-red or un-clear them.
  const value = live ? 0 : Math.max(0, Math.min(1, Number.isFinite(rpm) ? rpm : 0))
  const redline = live ? false : (redlineProp ?? value >= SPEEDOMETER_REDLINE)
  const fuelNow = fuel === undefined ? undefined : Math.round(Math.max(0, Math.min(100, fuel)))
  const low = fuelNow !== undefined && fuelNow <= SPEEDOMETER_LOW_FUEL
  const digital = gaugeStyle !== "arc"
  const g = String(gear === 0 ? "R" : gear)
  const prevGear = React.useRef(g)
  const gearDir = React.useRef<"up" | "down">("up")
  if (g !== prevGear.current) {
    gearDir.current = gearOrder(g) >= gearOrder(prevGear.current) ? "up" : "down"
    prevGear.current = g
  }
  const { digits, lead } = speedometerDigits(speed)
  const prevSpeed = React.useRef(digits)
  const speedDir = Number(digits) >= Number(prevSpeed.current) ? "up" : "down"
  prevSpeed.current = digits
  const rem = (n: number) => `${((n * size) / 16).toFixed(4)}rem`
  const fuelRad = ((G.fuel.iconAt - 90) * Math.PI) / 180
  const fuelR = 0.5 - G.fuel.inset

  return (
    <Dial
      level={value}
      size={size}
      surface={surface}
      sweep={G.sweep}
      start={G.start - 90}
      variant={digital ? "digital" : "ticks"}
      ticks={digital ? 0 : G.ticks}
      segments={digital ? G.segments : undefined}
      segmentGap={G.gap}
      thickness={size * (digital ? G.stroke : G.arcStroke)}
      inset={size * (digital ? G.inset : G.arcInset)}
      paint="accent"
      disc="soft"
      redline={SPEEDOMETER_REDLINE}
      alert={redline}
      valueProps={{ "data-slot": "speedometer-rpm" }}
      className={cn("select-none data-off:opacity-60", className)}
      {...props}
      data-slot="speedometer"
      data-style={digital ? "digital" : "arc"}
      data-off={!engine || undefined}
      // Not data-surface: nuikit-core's surfaces own that attribute (position: fixed, full screen).
      data-variant={surface}
    >
      {fuelNow !== undefined && (
        <>
          <Dial
            role="meter"
            aria-label="Fuel"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fuelNow}
            data-part="speedometer-fuel"
            data-state={low ? "alert" : undefined}
            level={fuelNow / 100}
            size={size}
            surface="none"
            sweep={G.fuel.to - G.fuel.from}
            start={G.fuel.from - 90}
            variant="digital"
            ticks={0}
            segments={G.fuel.segments}
            segmentGap={G.gap}
            direction="ccw"
            thickness={size * G.fuel.stroke}
            inset={size * G.fuel.inset}
            trackProps={{ className: "stroke-(--nk-gauge-track-color)!" }}
            valueProps={{ className: cn("transition-opacity duration-(--nk-time-fill) ease-out", low ? "stroke-(--nk-gauge-redline-color)! [animation:nk-breathe_var(--nk-time-pulse,1000ms)_var(--nk-ease-breathe,ease-in-out)_infinite] motion-reduce:[animation:none]" : "stroke-current! [stroke-opacity:0.95]") }}
            className="absolute inset-0"
          />
          <span
            data-part="speedometer-fuel-icon"
            data-state={low ? "alert" : undefined}
            aria-hidden
            className="absolute flex -translate-x-1/2 -translate-y-1/2 opacity-70 transition-colors duration-(--nk-time-slow) ease-out data-[state=alert]:text-(--nk-gauge-redline-color) data-[state=alert]:opacity-100 [&_svg]:size-(--nk-icon-sm)"
            style={{ left: rem(0.5 + fuelR * Math.cos(fuelRad)), top: rem(0.5 + fuelR * Math.sin(fuelRad)) }}
          >
            <FuelIcon />
          </span>
        </>
      )}
      {indicators !== undefined &&
        ([1, 2] as const).map((bit) => {
          const on = (indicators & bit) === bit
          return (
            <span
              key={bit}
              data-part="speedometer-signal"
              data-side={bit === 1 ? "left" : "right"}
              data-on={on || undefined}
              aria-label={on ? `Indicator ${bit === 1 ? "left" : "right"}` : undefined}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 text-(--role-success,var(--success)) opacity-0 data-on:opacity-100 data-on:[animation:nk-blink_calc(680ms*var(--nk-motion,1))_steps(1)_infinite] [&_svg]:size-(--nk-icon-md) [&_svg]:fill-current [&_svg]:stroke-none"
              style={{ left: rem(0.5 + (bit === 1 ? -G.signals.dx : G.signals.dx)), top: rem(G.signals.y) }}
            >
              {bit === 1 ? <ArrowBigLeftIcon /> : <ArrowBigRightIcon />}
            </span>
          )
        })}
      <div data-slot="speedometer-readout" className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ top: rem(G.readout) }}>
        <span
          data-slot="speedometer-speed"
          aria-label="Speed"
          className="nk-num flex leading-none [font-family:var(--nk-gauge-font)] [font-weight:var(--nk-type-weight-display,700)] [letter-spacing:var(--nk-speedometer-digit-tracking,0.01em)] pr-[0.15em]"
          // the in-game face: 3.625rem on the 216px gauge
          style={{ fontSize: rem(0.2685) }}
        >
          {[0, 1, 2].map((i) =>
            live ? (
              <span key={i} data-slot="speedometer-digit" data-dim={i < lead || undefined} className={cn(DIGIT, REEL)}>
                <span>{digits[i]}</span>
              </span>
            ) : (
              <span key={i} data-slot="speedometer-digit" data-dim={i < lead || undefined} className={DIGIT}>
                <TextRoll value={digits[i]!} direction={speedDir} align="center" />
              </span>
            )
          )}
        </span>
        <TextRoll
          data-slot="speedometer-unit"
          value={unit}
          align="center"
          className="nk-scan mt-(--nk-space-1) uppercase leading-none [letter-spacing:0.08em] [font-weight:var(--nk-type-weight-display,700)]"
          style={{ fontSize: rem(0.06) }}
        />
      </div>
      <div data-slot="speedometer-foot" className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: rem(G.gear) }}>
        {center ?? (
          <Tile
            size="md"
            shape="square"
            data-part="speedometer-gear"
            data-gear={g}
            state={redline ? "alert" : undefined}
            tone={g === "R" ? "warning" : undefined}
            className={cn("nk-scan [font-weight:800] [letter-spacing:0.02em] uppercase", g === "N" && "opacity-70")}
            // the in-game glyph: 0.62 of the face
            style={{ fontSize: "calc(var(--nk-height-chip) * 0.62)" }}
            aria-label="Gear"
          >
            <TextRoll value={g} direction={gearDir.current} align="center" />
          </Tile>
        )}
      </div>
    </Dial>
  )
}

export {
  Speedometer,
  speedometerDash,
  speedometerDigits,
  speedometerLit,
  speedometerPainter,
  rollDigit,
  gaugeStroke,
  SPEEDOMETER_REDLINE,
  SPEEDOMETER_LOW_FUEL,
  SPEEDOMETER_SIZE,
  SPEEDOMETER_GEOMETRY,
  type SpeedometerProps,
}
