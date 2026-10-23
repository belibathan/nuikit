import * as React from "react"
import { Surface, useFollow, useNuiState, usePlayer, type NuiPlayer } from "nuikit-core/react"
import {
  CarFrontIcon,
  DropletIcon,
  FlameIcon,
  HeartPulseIcon,
  LandmarkIcon,
  MicIcon,
  RadioIcon,
  ShieldIcon,
  TriangleAlertIcon,
  UtensilsIcon,
  WalletIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Chip } from "@/components/ui/chip"
import { Meter } from "@/components/ui/meter"
import { useFormatMoney } from "@/components/ui/money"
import { SPEEDOMETER_REDLINE, Speedometer, speedometerDash } from "@/components/ui/speedometer"
import { Stat } from "@/components/ui/stat"

import type { HudVehicle } from "./nui"

/**
 * HudMinimal — the always-on HUD: vitals and needs with voice bottom left, cash, bank and job top
 * right, and a speedometer bottom right while driving. Drawn straight on the game (docs/design.md
 * rule 8): bare marks with a shadow and HUD chips, no panels. Built from the kit: Meter, Stat,
 * Chip (material="hud"), Speedometer, Money.
 *
 *   <HudMinimalSurface />                                   // wired: nk.surface('hud') + nk.player in Lua
 *   <HudMinimal player={player} vehicle={vehicle} />        // a still, for previews
 *
 * The player comes from nuikit's bridge (usePlayer), so it works on Qbox, QBCore, ESX and
 * standalone without changes. Speed and rpm are live values: Lua streams them and the gauge follows
 * at the game's frame rate without a React render.
 */
function HudMinimalSurface({ needs = true }: { needs?: boolean }) {
  const player = usePlayer()
  const vehicle = useNuiState("hud:vehicle", false)
  return (
    <Surface name="hud" layer="hud">
      <HudMinimal player={player} vehicle={vehicle} needs={needs} />
    </Surface>
  )
}

function HudMinimal({
  player,
  vehicle,
  needs = true,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  player: NuiPlayer
  vehicle?: HudVehicle | false
  /** Show hunger, thirst and stress when the framework has them. */
  needs?: boolean
}) {
  return (
    <div data-slot="hud-minimal" className={cn("nk-edge absolute inset-0 text-hud-foreground", className)} {...props}>
      <HudStatus player={player} needs={needs} />
      <HudWallet player={player} />
      {vehicle && <HudVehicleGauge vehicle={vehicle} />}
    </div>
  )
}

/** Bottom left: vitals, needs and voice. */
function HudStatus({ player, needs }: { player: NuiPlayer; needs: boolean }) {
  return (
    <div className="nk-anchor-bl flex flex-col gap-3">
      <div className="nk-shadow flex w-32 flex-col gap-2">
        <Meter aria-label="Health" icon={<HeartPulseIcon />} value={player.health} low={20} tone="health" track="game" size="sm" />
        <Meter aria-label="Armor" icon={<ShieldIcon />} value={player.armor} tone="armor" track="game" size="sm" />
        {needs && player.hunger !== undefined && (
          <Meter aria-label="Hunger" icon={<UtensilsIcon />} value={player.hunger} low={20} tone="hunger" track="game" size="sm" />
        )}
        {needs && player.thirst !== undefined && (
          <Meter aria-label="Thirst" icon={<DropletIcon />} value={player.thirst} low={20} tone="thirst" track="game" size="sm" />
        )}
        {needs && !!player.stress && (
          <Meter aria-label="Stress" icon={<FlameIcon />} value={player.stress} high={80} tone="stress" track="game" size="sm" />
        )}
      </div>
      <HudVoice voice={player.voice} />
    </div>
  )
}

function HudVoice({ voice }: { voice: NuiPlayer["voice"] }) {
  // the voice resource's own name for the range wins ("Whisper", "Normal", "Shouting")
  const range = voice.mode ?? (voice.range === undefined ? null : `${Math.round(voice.range * 10) / 10} m`)
  if (!range && voice.radio === undefined) return null
  return (
    <div className="flex items-center gap-2">
      {range && (
        <Chip material="hud" icon={<MicIcon />} active={voice.talking} aria-label={voice.talking ? "Talking" : "Voice range"}>
          {range}
        </Chip>
      )}
      {voice.radio !== undefined && <Chip material="hud" icon={<RadioIcon />}>{voice.radio} MHz</Chip>}
    </div>
  )
}

/** Top right: cash, bank and job, once a character is loaded. */
function HudWallet({ player }: { player: NuiPlayer }) {
  const fmt = useFormatMoney()
  const job = player.job
  if (!player.loaded || (player.cash === undefined && player.bank === undefined && !job)) return null
  return (
    <div className="nk-anchor-tr flex flex-col items-end gap-2">
      {player.cash !== undefined && <Stat surface="game" align="end" icon={<WalletIcon />} label="Cash" value={fmt(player.cash)} />}
      {player.bank !== undefined && (
        <Stat surface="game" align="end" size="sm" icon={<LandmarkIcon />} label="Bank" value={fmt(player.bank)} />
      )}
      {job && (
        // a caption on the game (the identity's label style); duty is a status dot, never primary
        <div data-slot="hud-minimal-job" className="nk-caption nk-on-game flex items-center gap-(--nk-space-2)">
          {job.onDuty !== undefined && (
            <Chip variant="dot" tone={job.onDuty ? "success" : undefined} aria-label={job.onDuty ? "On duty" : "Off duty"} />
          )}
          {[job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ")}
        </div>
      )}
    </div>
  )
}

const GAUGE = 176

/**
 * Bottom right while driving. The gauge starts at the speed and rpm "hud:vehicle" carried when it
 * appeared, then follows the live channels: written straight to the gauge, no React render. React
 * renders on gear, fuel, damage or seatbelt, and when the rpm crosses the redline.
 */
function HudVehicleGauge({ vehicle }: { vehicle: HudVehicle }) {
  const gauge = React.useRef<HTMLDivElement>(null)
  const [start] = React.useState(() => ({ speed: vehicle.speed, rpm: vehicle.rpm }))
  const [redline, setRedline] = React.useState(vehicle.rpm > SPEEDOMETER_REDLINE)
  const red = React.useRef(redline)

  useFollow(
    "hud:vehicle:rpm",
    (rpm) => {
      const arc = gauge.current?.querySelector<SVGElement>("[data-slot=speedometer-rpm]")
      if (arc) {
        arc.style.transition = "none"
        arc.style.strokeDasharray = speedometerDash(rpm, GAUGE)
      }
      const over = rpm > SPEEDOMETER_REDLINE
      if (over !== red.current) setRedline((red.current = over))
    },
    { start: start.rpm }
  )
  useFollow(
    "hud:vehicle:speed",
    (speed) => {
      // React's own text node, so a later render finds it in place
      const text = gauge.current?.querySelector("[data-slot=speedometer-speed]")?.firstChild
      const shown = String(Math.round(speed))
      if (text && text.nodeValue !== shown) text.nodeValue = shown
    },
    { start: start.speed, epsilon: 0.05 }
  )

  const unbuckled = vehicle.seatbelt === false && (vehicle.moving ?? vehicle.speed > 10)
  const engine = vehicle.engine !== undefined && vehicle.engine < 35
  return (
    <div className="nk-anchor-br flex flex-col items-center gap-3">
      <Speedometer
        ref={gauge}
        speed={start.speed}
        rpm={start.rpm}
        redline={redline}
        gear={vehicle.gear}
        fuel={vehicle.fuel}
        unit={vehicle.units === "kmh" ? "km/h" : "mph"}
        size={GAUGE}
        className="nk-shadow"
      />
      {(unbuckled || engine) && (
        <div className="flex gap-2">
          {unbuckled && (
            <Chip material="hud" icon={<TriangleAlertIcon />} state="warning">
              Seatbelt
            </Chip>
          )}
          {engine && (
            <Chip material="hud" icon={<CarFrontIcon />} state="warning">
              Engine {vehicle.engine}%
            </Chip>
          )}
        </div>
      )}
    </div>
  )
}

export { HudMinimal, HudMinimalSurface }
