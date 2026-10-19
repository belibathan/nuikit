import { fetchNui, Surface, usePlayer, type NuiPlayer } from "nuikit-core/react";
import {
  CircleHelpIcon,
  KeyboardIcon,
  LandmarkIcon,
  LogOutIcon,
  MapIcon,
  PlayIcon,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { PauseButton, PauseData } from "./nui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const list = <T,>(v: T[] | undefined | Record<string, never>): T[] => (Array.isArray(v) ? v : []);

export default function App() {
  // Subscribed here, not in <Pause>: bridge.lua only sends the player when it changes, so a
  // listener that mounts with the menu would miss it.
  const player = usePlayer();
  return (
    <Surface name="pause" layer="modal" input="full" exclusive hides={["hud"]} blockedBy={["dead"]}>
      {(data) => <Pause data={data} player={player} />}
    </Surface>
  );
}

const NAV: Record<Exclude<PauseButton, "disconnect">, { label: string; icon: LucideIcon; kbd?: string }> = {
  resume: { label: "Resume", icon: PlayIcon, kbd: "Esc" },
  map: { label: "Map", icon: MapIcon, kbd: "P" },
  settings: { label: "Settings", icon: SettingsIcon },
  keybinds: { label: "Key bindings", icon: KeyboardIcon },
  help: { label: "Help", icon: CircleHelpIcon },
};

function Pause({ data, player }: { data: PauseData; player: NuiPlayer }) {
  const [view, setView] = useState<"player" | "help">("player");
  const buttons = list(data?.buttons);
  const help = list(data?.help);
  const links = list(data?.links);
  const server = data?.server ?? {};

  const run = (b: PauseButton) => {
    if (b === "help") return setView((v) => (v === "help" ? "player" : "help"));
    if (b !== "disconnect") void fetchNui(`pause:${b}`).catch(() => {});
  };

  return (
    <div className="pause-root absolute inset-0 overflow-hidden">
      <div className="pause-scrim absolute inset-0" aria-hidden />

      <div className="relative flex h-full">
        {/* left: who we are and where to go */}
        <aside className="pause-rail flex h-full w-80 shrink-0 flex-col px-12 py-12">
          <header className="flex items-center gap-3">
            {server.logo ? (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                {server.logo}
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-xl leading-6 font-semibold tracking-tight">{server.name ?? "Paused"}</h1>
              {server.tagline ? <p className="truncate text-sm text-muted-foreground">{server.tagline}</p> : null}
            </div>
          </header>

          <nav className="pause-nav mt-12 flex flex-col gap-0.5" aria-label="Pause menu">
            {buttons.map((b, i) => {
              if (b === "disconnect") return null;
              const item = NAV[b];
              if (!item) return null;
              const Icon = item.icon;
              const active = b === "help" && view === "help";
              return (
                <button
                  key={b}
                  autoFocus={i === 0}
                  onClick={() => run(b)}
                  className={cn(
                    "nk-row w-full text-left font-medium outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                    active && "bg-accent text-accent-foreground",
                  )}
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  {item.kbd ? <Kbd>{item.kbd}</Kbd> : null}
                </button>
              );
            })}
            {buttons.includes("disconnect") ? (
              <>
                <Separator className="my-3" />
                <Disconnect />
              </>
            ) : null}
          </nav>

          <div className="mt-auto flex flex-col gap-2">
            {links.map((l) => (
              <div key={l.label} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="truncate font-medium">{l.value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* right: the player, or the help sheet */}
        <main className="flex flex-1 items-center justify-end px-12">
          {view === "help" ? <Help help={help} /> : <PlayerCard player={player} data={data} />}
        </main>
      </div>
    </div>
  );
}

function Disconnect() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="nk-row w-full text-left font-medium text-destructive outline-none hover:bg-accent focus-visible:bg-accent">
          <LogOutIcon className="size-4" />
          <span className="flex-1">Disconnect</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="nk-panel nk-enter gap-4 p-6 data-[size=default]:sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="nk-title">Leave the server?</AlertDialogTitle>
          <AlertDialogDescription>Your character is saved. You can reconnect from the server list at any time.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => void fetchNui("pause:disconnect").catch(() => {})}>
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function PlayerCard({ player, data }: { player: NuiPlayer; data: PauseData }) {
  const name = (player.loaded && player.name) || data?.playerName || "Player";
  const job = player.loaded ? player.job : undefined;
  const players = data?.players;
  const max = data?.maxPlayers;
  const role = job ? [job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ") : player.loaded ? "Civilian" : "No character loaded";

  return (
    <section className="nk-panel nk-enter w-80 overflow-hidden">
      <header className="nk-panel-header gap-3">
        <Avatar className="size-10">
          <AvatarFallback className="bg-muted text-sm font-semibold">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="nk-title truncate">{name}</h2>
          <p className="nk-label flex items-center gap-1.5 truncate">
            {role}
            {job?.onDuty !== undefined ? (
              <span className={cn("size-1.5 rounded-full", job.onDuty ? "bg-primary" : "bg-muted-foreground/50")} aria-label={job.onDuty ? "On duty" : "Off duty"} />
            ) : null}
          </p>
        </div>
      </header>

      {player.loaded && (player.cash !== undefined || player.bank !== undefined) ? (
        <div className="grid grid-cols-2 gap-4 px-4 py-4">
          <Stat icon={<WalletIcon />} label="Cash" value={player.cash !== undefined ? money.format(player.cash) : "—"} />
          <Stat icon={<LandmarkIcon />} label="Bank" value={player.bank !== undefined ? money.format(player.bank) : "—"} />
        </div>
      ) : null}

      <footer className="flex flex-col gap-3 border-t px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground">
            <UsersIcon className="size-4" />
            Players online
          </span>
          <span className="nk-num font-medium">
            {players ?? "—"}
            {max ? <span className="text-muted-foreground"> / {max}</span> : null}
          </span>
        </div>
        {players !== undefined && max ? <Progress value={Math.min(100, (players / max) * 100)} className="h-1" /> : null}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Server ID</span>
          <span className="nk-num font-medium">{data?.serverId ?? "—"}</span>
        </div>
      </footer>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="nk-label flex items-center gap-1.5 [&_svg]:size-3.5">
        {icon}
        {label}
      </span>
      <span className="nk-num truncate text-xl font-semibold">{value}</span>
    </div>
  );
}

function Help({ help }: { help: PauseData["help"] }) {
  return (
    <section className="nk-panel nk-enter w-80 overflow-hidden">
      <header className="nk-panel-header flex-col items-start gap-0.5">
        <h2 className="nk-title">Controls</h2>
        <p className="nk-label">Change yours in Key bindings.</p>
      </header>
      <div className="nk-panel-body">
        {help.length ? (
          help.map((h) => (
            <div key={h.key + h.label} className="nk-row justify-between">
              <span>{h.label}</span>
              <Kbd className="min-w-8">{h.key}</Kbd>
            </div>
          ))
        ) : (
          <p className="nk-row text-muted-foreground">This server hasn't listed its controls.</p>
        )}
      </div>
    </section>
  );
}
