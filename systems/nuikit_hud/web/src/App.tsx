import { Surface, useNuiState, usePlayer, type NuiPlayer } from "nuikit-core/react";
import {
  BriefcaseIcon,
  DropletIcon,
  FlameIcon,
  HeartPulseIcon,
  LandmarkIcon,
  MicIcon,
  RadioIcon,
  ShieldIcon,
  UtensilsIcon,
  WalletIcon,
} from "lucide-react";
import type { HudVehicle } from "./nui";
import { Badge } from "@/components/ui/badge";
import { Speedometer } from "@/components/ui/speedometer";
import { Vital } from "@/components/ui/vital";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function App() {
  const player = usePlayer();
  const vehicle = useNuiState("hud:vehicle", false);

  return (
    <Surface name="hud" layer="hud">
      {(settings) => (
        <>
          <Status player={player} needs={settings?.needs !== false} />
          <Wallet player={player} />
          {vehicle && <Vehicle vehicle={vehicle} />}
        </>
      )}
    </Surface>
  );
}

/** Bottom left: vitals, needs and voice. */
function Status({ player, needs }: { player: NuiPlayer; needs: boolean }) {
  return (
    <div className="absolute bottom-10 left-10 flex flex-col gap-2 rounded-xl border bg-background/60 p-3 backdrop-blur-sm">
      <Vital label="Health" value={player.health} tone="destructive" icon={<HeartPulseIcon />} />
      <Vital label="Armor" value={player.armor} icon={<ShieldIcon />} low={-1} />
      {needs && player.hunger !== undefined && <Vital label="Hunger" value={player.hunger} tone="chart-1" icon={<UtensilsIcon />} />}
      {needs && player.thirst !== undefined && <Vital label="Thirst" value={player.thirst} tone="chart-2" icon={<DropletIcon />} />}
      {needs && !!player.stress && <Vital label="Stress" value={player.stress} tone="chart-4" icon={<FlameIcon />} low={-1} />}
      <Voice voice={player.voice} />
    </div>
  );
}

function Voice({ voice }: { voice: NuiPlayer["voice"] }) {
  // The voice resource's own label wins; distances differ between native audio and 3D audio.
  const range = voice.mode ?? (voice.range === undefined ? null : `${Math.round(voice.range * 10) / 10} m`);
  if (!range && !voice.radio) return null;
  return (
    <div className="flex items-center gap-1.5 pt-1">
      {range && (
        <Badge variant={voice.talking ? "default" : "secondary"} className="transition-colors">
          <MicIcon />
          {range}
        </Badge>
      )}
      {voice.radio !== undefined && (
        <Badge variant="outline" className="tabular-nums">
          <RadioIcon />
          {voice.radio} MHz
        </Badge>
      )}
    </div>
  );
}

/** Top right: cash, bank and job. Hidden until a character is loaded. */
function Wallet({ player }: { player: NuiPlayer }) {
  if (!player.loaded || (player.cash === undefined && !player.job)) return null;
  return (
    <div className="absolute top-10 right-10 flex flex-col items-end gap-1.5 text-right">
      {player.cash !== undefined && (
        <div className="flex items-center gap-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground drop-shadow">
          <WalletIcon className="size-5 text-muted-foreground" />
          {money.format(player.cash)}
        </div>
      )}
      {player.bank !== undefined && (
        <div className="flex items-center gap-2 text-sm font-medium tabular-nums text-foreground/85 [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]">
          <LandmarkIcon className="size-4 text-muted-foreground" />
          {money.format(player.bank)}
        </div>
      )}
      {player.job && (
        <Badge variant="secondary" className="mt-1">
          <BriefcaseIcon />
          {player.job.label ?? player.job.name}
          {player.job.gradeLabel && <span className="text-muted-foreground">· {player.job.gradeLabel}</span>}
          {player.job.onDuty !== undefined && (
            <span className={cn("size-1.5 rounded-full", player.job.onDuty ? "bg-primary" : "bg-muted-foreground/50")} aria-label={player.job.onDuty ? "On duty" : "Off duty"} />
          )}
        </Badge>
      )}
    </div>
  );
}

/** Bottom right while driving: speed, rpm, gear, fuel, seatbelt and engine warnings. */
function Vehicle({ vehicle }: { vehicle: HudVehicle }) {
  const unbuckled = !vehicle.seatbelt && vehicle.speed > 10;
  const engine = vehicle.engine < 35;
  return (
    <div className="absolute right-10 bottom-10 flex flex-col items-center gap-2">
      <Speedometer speed={vehicle.speed} rpm={vehicle.rpm} gear={vehicle.gear} fuel={vehicle.fuel} unit={vehicle.units.toUpperCase()} size={180} />
      {(unbuckled || engine) && (
        <div className="flex gap-1.5">
          {unbuckled && <Badge variant="destructive">Seatbelt</Badge>}
          {engine && <Badge variant="destructive">Engine {vehicle.engine}%</Badge>}
        </div>
      )}
    </div>
  );
}
