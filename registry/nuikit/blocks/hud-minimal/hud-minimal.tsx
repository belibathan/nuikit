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
} from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Chip } from "@/components/ui/chip"
import { useFormatMoney } from "@/components/ui/money"
import { Speedometer, speedometerPainter } from "@/components/ui/speedometer"
import { Stat } from "@/components/ui/stat"
import { VitalChip } from "@/components/ui/vital-chip"

import type { HudVehicle } from "./nui"

/**
 * HudMinimal — the always-on HUD: voice, vitals and needs as keycaps bottom left, cash, bank and job top
 * right, and the in-game speedometer bottom right while driving. Drawn straight on the game (docs/design.md
 * rule 8): bare marks with a shadow and HUD chips, no panels. Built from the kit: VitalChip (the keycap, a
 * vital opening on a change), Stat, Chip (material="hud"), Speedometer, Money.
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

/** Bottom left: voice first, then the vitals and needs, as keycaps (the in-game row). */
function HudStatus({ player, needs }: { player: NuiPlayer; needs: boolean }) {
  const range = player.voice.mode ?? (player.voice.range === undefined ? null : `${Math.round(player.voice.range * 10) / 10} m`)
  const vital = (tone: string, label: string, value: number | undefined, icon: React.ReactNode, extra?: { low?: number; high?: number }) =>
    value === undefined ? null : (
      <VitalChip.Root
        key={tone}
        value={value}
        tone={tone}
        alert={extra?.high !== undefined ? value >= extra.high : value <= (extra?.low ?? 20)}
        display="expand"
        role="meter"
        aria-label={`${label} ${Math.round(value)}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
      >
        <VitalChip.Shape>
          <VitalChip.Icon>{icon}</VitalChip.Icon>
          <VitalChip.Label>{label}</VitalChip.Label>
        </VitalChip.Shape>
      </VitalChip.Root>
    )
  return (
    <div className="nk-anchor-bl nk-shadow flex flex-col gap-3">
      <VitalChip.Row>
        {range && (
          <VitalChip.Root active={player.voice.talking === true} aria-label={player.voice.talking ? `Talking, ${range}` : `Voice range ${range}`}>
            <VitalChip.Shape>
              <VitalChip.Icon>
                <MicIcon />
              </VitalChip.Icon>
              <VitalChip.Label>{range}</VitalChip.Label>
            </VitalChip.Shape>
          </VitalChip.Root>
        )}
        {vital("health", "Health", player.health, <HeartPulseIcon />)}
        {vital("armor", "Armor", player.armor, <ShieldIcon />, { low: -1 })}
        {needs && vital("hunger", "Hunger", player.hunger, <UtensilsIcon />)}
        {needs && vital("thirst", "Thirst", player.thirst, <DropletIcon />)}
        {needs && vital("stress", "Stress", player.stress, <FlameIcon />, { high: 80 })}
        {player.voice.radio !== undefined && (
          <VitalChip.Root open aria-label={`Radio ${player.voice.radio} MHz`}>
            <VitalChip.Shape>
              <VitalChip.Icon>
                <RadioIcon />
              </VitalChip.Icon>
              <VitalChip.Label>
                <span className="nk-text-num">{player.voice.radio}</span>
              </VitalChip.Label>
            </VitalChip.Shape>
          </VitalChip.Root>
        )}
      </VitalChip.Row>
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
        <div data-slot="hud-minimal-job" className="nk-text-caption nk-on-game flex items-center gap-(--nk-space-2)">
          {job.onDuty !== undefined && (
            <Chip variant="dot" tone={job.onDuty ? "success" : undefined} aria-label={job.onDuty ? "On duty" : "Off duty"} />
          )}
          {[job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ")}
        </div>
      )}
    </div>
  )
}

/**
 * Bottom right while driving. The gauge starts at the speed and rpm "hud:vehicle" carried when it
 * appeared, then follows the live channels through the Speedometer's painter: written straight to the
 * gauge (digit reels, segments, the redline), no React render. React renders on gear, fuel, damage or
 * seatbelt.
 */
function HudVehicleGauge({ vehicle }: { vehicle: HudVehicle }) {
  const gauge = React.useRef<HTMLDivElement>(null)
  const painter = React.useRef<ReturnType<typeof speedometerPainter> | null>(null)
  const [start] = React.useState(() => ({ speed: vehicle.speed, rpm: vehicle.rpm }))
  React.useLayoutEffect(() => {
    painter.current = gauge.current ? speedometerPainter(gauge.current) : null
  }, [])

  useFollow("hud:vehicle:rpm", (rpm) => painter.current?.rpm(rpm), { start: start.rpm })
  useFollow("hud:vehicle:speed", (speed) => painter.current?.speed(speed), { start: start.speed, epsilon: 0.05 })

  const unbuckled = vehicle.seatbelt === false && (vehicle.moving ?? vehicle.speed > 10)
  const engine = vehicle.engine !== undefined && vehicle.engine < 35
  return (
    <div className="nk-anchor-br flex flex-col items-center gap-3">
      <Speedometer
        ref={gauge}
        live
        speed={start.speed}
        rpm={start.rpm}
        gear={vehicle.gear}
        fuel={vehicle.fuel}
        unit={vehicle.units === "kmh" ? "km/h" : "mph"}
        indicators={vehicle.indicators}
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
