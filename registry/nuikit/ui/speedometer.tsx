import * as React from "react"

import { Dial, DIAL_REDLINE, dialDash, gaugeStroke } from "@/components/ui/dial"
import { Fill } from "@/components/ui/fill"
import { Tile } from "@/components/ui/tile"

/**
 * Speedometer — the vehicle HUD gauge: a Dial (the rpm arc, ticks, the redline) with the speed in the num role,
 * the unit, a gear Tile and a fuel Fill. Its look is the gauge tokens (docs/tokens.md): --nk-gauge-fill for
 * rpm, --nk-gauge-redline past it, tick marks (--nk-gauge-tick, off when the identity sets --nk-gauge-ticks: 0),
 * the track thickness (--nk-gauge-width) and the numeral face (--nk-gauge-font).
 *
 *   <Speedometer speed={87} rpm={0.62} gear={3} fuel={41} />
 *
 * Feed it from Lua at ~10Hz: NUI.send('hud:vehicle', { speed = 87, rpm = 0.62, gear = 3, fuel = 41 }). Live (the
 * game's frame rate, no React render): stream speed and rpm (NUI.stream) and follow them with useFollow, writing
 * [data-slot=speedometer-rpm] (style.strokeDasharray = speedometerDash(rpm, size)) and
 * [data-slot=speedometer-speed]; pass `redline` yourself. See systems/nuikit_hud.
 *
 * Role: speed, rpm, gear and fuel while driving, drawn on the game (`surface="game"`) or a panel ("theme").
 * Anatomy: Dial (ticks, track, rpm arc) > center (speed num, unit caption) > foot (gear Tile, fuel Fill).
 * Props: speed, rpm, gear, fuel, unit, size (px at 1080p, laid out in rem), surface, redline.
 * Level means: the rpm arc's level is rpm (0–1); the fuel line's is fuel / 100.
 * Rules: past the redline (rpm > 0.88 by default) the dial and the gear are data-state="alert"; fuel under 15
 *   is an alert Fill. No glow filter; the arc is data-driven, never tweened.
 */

/** Past this rpm (0–1) the arc and the gear turn the redline. */
const SPEEDOMETER_REDLINE = DIAL_REDLINE
/** Below this fuel (0–100) the fuel line turns destructive. */
const SPEEDOMETER_LOW_FUEL = 15

/** The rpm arc's stroke-dasharray for an rpm (0–1) on a speedometer of `size` (Dial's dialDash()). */
function speedometerDash(rpm: number, size = 192) {
  return dialDash(rpm, size)
}

function Speedometer({
  className,
  speed,
  rpm,
  gear = "N",
  fuel,
  unit = "mph",
  size = 192,
  surface = "game",
  redline: redlineProp,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  speed: number
  /** 0–1 */
  rpm: number
  gear?: number | "R" | "N"
  /** 0–100 */
  fuel?: number
  unit?: string
  /** Diameter in px at 1080p. */
  size?: number
  /** game: on the world (HUD tokens). theme: on a panel. */
  surface?: "game" | "theme"
  /** Past the redline; by default rpm > 0.88. For a live gauge whose rpm you write yourself. */
  redline?: boolean
}) {
  const value = Math.max(0, Math.min(1, Number.isFinite(rpm) ? rpm : 0))
  const redline = redlineProp ?? value > SPEEDOMETER_REDLINE
  const low = fuel !== undefined && fuel < SPEEDOMETER_LOW_FUEL

  return (
    <Dial
      level={value}
      size={size}
      surface={surface}
      redline={SPEEDOMETER_REDLINE}
      alert={redline}
      valueProps={{ "data-slot": "speedometer-rpm" }}
      className={className}
      {...props}
      data-slot="speedometer"
      // Not data-surface: nuikit-core's surfaces own that attribute (position: fixed, full screen).
      data-variant={surface}
    >
      <span
        data-slot="speedometer-speed"
        className="nk-num leading-none [font-family:var(--nk-gauge-font)] [font-weight:var(--nk-weight-display,700)]"
        // a quarter of the dial: 48px on the default 192px gauge
        style={{ fontSize: `${size / 64}rem` }}
      >
        {Math.round(speed)}
      </span>
      <span data-slot="speedometer-unit" className="nk-caption mt-(--nk-space-1)">
        {unit}
      </span>
      <span data-slot="speedometer-foot" className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-(--nk-space-2)">
        <Tile size="md" data-part="speedometer-gear" state={redline ? "alert" : undefined} className="nk-num [font-family:var(--nk-gauge-font)]" aria-label="Gear">
          {gear === 0 ? "R" : gear}
        </Tile>
        {fuel !== undefined && (
          <Fill
            role="meter"
            aria-hidden={false}
            aria-label="Fuel"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.max(0, Math.min(100, fuel)))}
            data-part="speedometer-fuel"
            level={fuel / 100}
            alertAt={low ? 1 : false}
            className="w-12"
          />
        )}
      </span>
    </Dial>
  )
}

export { Speedometer, speedometerDash, gaugeStroke, SPEEDOMETER_REDLINE, SPEEDOMETER_LOW_FUEL }
