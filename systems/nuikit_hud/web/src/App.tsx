import { Surface, useNuiState, usePlayer, type NuiPlayer } from "nuikit-core/react";
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
} from "lucide-react";
import type { ReactNode } from "react";
import type { HudVehicle } from "./nui";
import { Speedometer } from "@/components/ui/speedometer";
import { Vital } from "@/components/ui/vital";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Bare text on the game world: a soft shadow instead of a panel (kit rule 8). */
const onGame = "[text-shadow:0_1px_2px_rgb(0_0_0/0.6)]";
const onGameMarks = "drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]";
/** Vital tracks sit on the game, not a panel: a dark track reads over a bright sky. */
const track = "[&_[data-slot=progress]]:bg-black/35";

export default function App() {
  const player = usePlayer();
  const vehicle = useNuiState("hud:vehicle", false);

  return (
    <Surface name="hud" layer="hud">
      {(settings) => (
        <div className="nk-edge absolute inset-0 text-foreground">
          <Status player={player} needs={settings?.needs !== false} />
          <Wallet player={player} />
          {vehicle && <Vehicle vehicle={vehicle} />}
        </div>
      )}
    </Surface>
  );
}

/** Bottom left: vitals, needs and voice. */
function Status({ player, needs }: { player: NuiPlayer; needs: boolean }) {
  return (
    <div className="absolute bottom-(--nk-edge) left-(--nk-edge) flex flex-col gap-3">
      <div className={cn("flex flex-col gap-2", onGameMarks)}>
        <Vital className={track} label="Health" value={player.health} tone="health" icon={<HeartPulseIcon />} />
        <Vital className={track} label="Armor" value={player.armor} tone="armor" icon={<ShieldIcon />} low={-1} />
        {needs && player.hunger !== undefined && <Vital className={track} label="Hunger" value={player.hunger} tone="hunger" icon={<UtensilsIcon />} />}
        {needs && player.thirst !== undefined && <Vital className={track} label="Thirst" value={player.thirst} tone="thirst" icon={<DropletIcon />} />}
        {needs && !!player.stress && <Vital className={track} label="Stress" value={player.stress} tone="stress" icon={<FlameIcon />} low={-1} />}
      </div>
      <Voice voice={player.voice} />
    </div>
  );
}

function Chip({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn("nk-chip nk-num [&_svg]:size-3.5 [&_svg]:shrink-0", className)}>
      {icon}
      {children}
    </span>
  );
}

function Voice({ voice }: { voice: NuiPlayer["voice"] }) {
  // The voice resource's own label wins; distances differ between native audio and 3D audio.
  const range = voice.mode ?? (voice.range === undefined ? null : `${Math.round(voice.range * 10) / 10} m`);
  if (!range && !voice.radio) return null;
  return (
    <div className="flex items-center gap-2">
      {range && (
        <Chip
          icon={<MicIcon className={cn("transition-colors", voice.talking ? "text-primary" : "opacity-60")} />}
          className={cn("transition-shadow", voice.talking && "ring-1 ring-primary")}
        >
          {range}
        </Chip>
      )}
      {voice.radio !== undefined && <Chip icon={<RadioIcon className="opacity-60" />}>{voice.radio} MHz</Chip>}
    </div>
  );
}

/** Top right: cash, bank and job. Hidden until a character is loaded. */
function Wallet({ player }: { player: NuiPlayer }) {
  if (!player.loaded || (player.cash === undefined && !player.job)) return null;
  const job = player.job;
  return (
    <div className={cn("absolute top-(--nk-edge) right-(--nk-edge) flex flex-col items-end gap-1 text-right", onGame)}>
      {player.cash !== undefined && (
        <div className="nk-num flex items-center gap-2 text-xl leading-7 font-semibold" aria-label="Cash">
          <WalletIcon className={cn("size-4 opacity-60", onGameMarks)} />
          {money.format(player.cash)}
        </div>
      )}
      {player.bank !== undefined && (
        <div className="nk-num flex items-center gap-2 text-sm font-medium opacity-80" aria-label="Bank">
          <LandmarkIcon className={cn("size-4 opacity-75", onGameMarks)} />
          {money.format(player.bank)}
        </div>
      )}
      {job && (
        <div className="mt-1 flex items-center gap-1.5 text-xs font-medium opacity-80">
          {job.onDuty !== undefined && (
            <span
              className={cn("size-1.5 rounded-full", job.onDuty ? "bg-primary" : "bg-foreground/40")}
              aria-label={job.onDuty ? "On duty" : "Off duty"}
            />
          )}
          {[job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ")}
        </div>
      )}
    </div>
  );
}

/** Bottom right while driving: speed, rpm, gear, fuel, seatbelt and engine warnings. */
function Vehicle({ vehicle }: { vehicle: HudVehicle }) {
  const unbuckled = !vehicle.seatbelt && vehicle.speed > 10;
  const engine = vehicle.engine < 35;
  return (
    <div className="absolute right-(--nk-edge) bottom-(--nk-edge) flex flex-col items-center gap-3">
      <Speedometer
        speed={vehicle.speed}
        rpm={vehicle.rpm}
        gear={vehicle.gear}
        fuel={vehicle.fuel}
        unit={vehicle.units === "kmh" ? "km/h" : "mph"}
        size={176}
        className={onGameMarks}
      />
      {(unbuckled || engine) && (
        <div className="flex gap-2">
          {unbuckled && <Chip icon={<TriangleAlertIcon className="text-destructive" />}>Seatbelt</Chip>}
          {engine && <Chip icon={<CarFrontIcon className="text-destructive" />}>Engine {vehicle.engine}%</Chip>}
        </div>
      )}
    </div>
  );
}
