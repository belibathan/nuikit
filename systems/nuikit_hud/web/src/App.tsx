import { emit, onNui, Surface, useFollow, useNuiState, usePlayer, type NuiPlayer } from "nuikit-core/react";
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
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Minimap, useMinimapFrame } from "./minimap";
import type { HudVehicle, MinimapFrame, MinimapState } from "./nui";
import { HudChip } from "@/components/ui/hud-chip";
import { Meter } from "@/components/ui/meter";
import { SPEEDOMETER_REDLINE, Speedometer, speedometerDash } from "@/components/ui/speedometer";
import { Stat } from "@/components/ui/stat";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Marks drawn straight on the game get a soft shadow instead of a panel (kit rule 8). */
const onGameMarks = "drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]";

export default function App() {
  const player = usePlayer();
  const vehicle = useNuiState("hud:vehicle", false);
  const frame = useMinimapFrame();
  const map = useNuiState("hud:minimap", null as unknown as MinimapState) as MinimapState | null;
  // the vitals step aside for a map in the bottom-left corner
  const beside = frame && map?.visible && frame.x < 0.5 && frame.y > 0.5 ? frame : null;

  return (
    <Surface name="hud" layer="hud">
      {(settings) => (
        <div className="nk-edge absolute inset-0 text-foreground">
          {frame && map && <Minimap frame={frame} state={map} />}
          <Status player={player} needs={settings?.needs !== false} beside={beside} />
          <Wallet player={player} />
          {vehicle && <Vehicle vehicle={vehicle} />}
        </div>
      )}
    </Surface>
  );
}

/** Bottom left: vitals, needs and voice; beside the minimap when it sits in that corner. */
function Status({ player, needs, beside }: { player: NuiPlayer; needs: boolean; beside: MinimapFrame | null }) {
  const style: CSSProperties | undefined = beside
    ? { left: `calc(${(beside.x + beside.w) * 100}% + 1rem)`, bottom: `${(1 - beside.y - beside.h) * 100}%` }
    : undefined;
  return (
    <div className={cn("flex flex-col gap-3", beside ? "absolute" : "nk-anchor-bl")} style={style}>
      <div className={cn("flex w-32 flex-col gap-2", onGameMarks)}>
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
      <Voice voice={player.voice} />
    </div>
  );
}

function Voice({ voice }: { voice: NuiPlayer["voice"] }) {
  // The voice resource's own label wins; distances differ between native audio and 3D audio.
  const range = voice.mode ?? (voice.range === undefined ? null : `${Math.round(voice.range * 10) / 10} m`);
  if (!range && voice.radio === undefined) return null;
  return (
    <div className="flex items-center gap-2">
      {range && (
        <HudChip icon={<MicIcon />} active={voice.talking} aria-label={voice.talking ? "Talking" : "Voice range"}>
          {range}
        </HudChip>
      )}
      {voice.radio !== undefined && <HudChip icon={<RadioIcon />}>{voice.radio} MHz</HudChip>}
    </div>
  );
}

/** Top right: cash, bank and job. Hidden until a character is loaded. */
function Wallet({ player }: { player: NuiPlayer }) {
  if (!player.loaded || (player.cash === undefined && player.bank === undefined && !player.job)) return null;
  const job = player.job;
  return (
    <div className="nk-anchor-tr flex flex-col items-end gap-2">
      {player.cash !== undefined && <Stat surface="game" align="end" icon={<WalletIcon />} label="Cash" value={money.format(player.cash)} />}
      {player.bank !== undefined && (
        <Stat surface="game" align="end" size="sm" icon={<LandmarkIcon />} label="Bank" value={money.format(player.bank)} />
      )}
      {job && (
        <div className="nk-shadow flex items-center gap-1.5 text-xs font-medium text-hud-foreground">
          {job.onDuty !== undefined && (
            <span className={cn("size-1.5 rounded-full", job.onDuty ? "bg-primary" : "bg-hud-foreground/40")} aria-label={job.onDuty ? "On duty" : "Off duty"} />
          )}
          {[job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ")}
        </div>
      )}
    </div>
  );
}

const GAUGE = 176;

// main.lua's live channels have spoken (always, in game). Our own echoes below don't count.
let live = false;
let echoing = false;
onNui("hud:vehicle:rpm", () => {
  if (!echoing) live = true;
});
function echo(speed: number, rpm: number) {
  echoing = true;
  try {
    emit("hud:vehicle:speed", speed);
    emit("hud:vehicle:rpm", rpm);
  } finally {
    echoing = false;
  }
}

/**
 * Bottom right while driving: speed, rpm, gear, fuel, seatbelt and engine warnings. Speed and rpm are
 * live values (main.lua streams them): they glide at the game's frame rate, written straight to the
 * gauge without a React render. React renders on gear, fuel, damage or seatbelt, and on the redline.
 */
function Vehicle({ vehicle }: { vehicle: HudVehicle }) {
  const gauge = useRef<HTMLDivElement>(null);
  // the gauge's speed and rpm props stay where it started, so React never overwrites the live values
  const [start] = useState(() => ({ speed: vehicle.speed, rpm: vehicle.rpm }));
  const [redline, setRedline] = useState(vehicle.rpm > SPEEDOMETER_REDLINE);
  const red = useRef(redline);

  useFollow(
    "hud:vehicle:rpm",
    (rpm) => {
      const arc = gauge.current?.querySelector<SVGElement>('[data-slot="speedometer-rpm"]');
      if (arc) {
        arc.style.transition = "none";
        arc.style.strokeDasharray = speedometerDash(rpm, GAUGE);
      }
      const over = rpm > SPEEDOMETER_REDLINE;
      if (over !== red.current) setRedline((red.current = over));
    },
    { start: start.rpm },
  );
  useFollow(
    "hud:vehicle:speed",
    (speed) => {
      // React's own text node, so a later render finds it in place
      const text = gauge.current?.querySelector('[data-slot="speedometer-speed"]')?.firstChild;
      const shown = String(Math.round(speed));
      if (text && text.nodeValue !== shown) text.nodeValue = shown;
    },
    { start: start.speed, epsilon: 0.05 },
  );
  // Without the live channels (the dev mocks, the bench), a fresh hud:vehicle moves the gauge. In
  // game the streams are newer than the speed and rpm it carries, so it never does.
  const seen = useRef(false);
  useEffect(() => {
    if (!seen.current) {
      seen.current = true;
      return;
    }
    if (!live) echo(vehicle.speed, vehicle.rpm);
  }, [vehicle.speed, vehicle.rpm]);

  const unbuckled = !vehicle.seatbelt && (vehicle.moving ?? vehicle.speed > 10);
  const engine = vehicle.engine < 35;
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
        className={onGameMarks}
      />
      {(unbuckled || engine) && (
        <div className="flex gap-2">
          {unbuckled && (
            <HudChip icon={<TriangleAlertIcon />} state="warning">
              Seatbelt
            </HudChip>
          )}
          {engine && (
            <HudChip icon={<CarFrontIcon />} state="warning">
              Engine {vehicle.engine}%
            </HudChip>
          )}
        </div>
      )}
    </div>
  );
}
