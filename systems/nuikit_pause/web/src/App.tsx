import { fetchNui, Surface, usePlayer, type NuiPlayer } from "nuikit-core/react";
import {
  BriefcaseIcon,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
        <aside className="pause-rail flex h-full w-[420px] shrink-0 flex-col px-14 py-16">
          <header className="flex items-center gap-4">
            {server.logo ? (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold tracking-tight text-primary-foreground shadow-lg">
                {server.logo}
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">{server.name ?? "Paused"}</h1>
              {server.tagline ? (
                <p className="mt-0.5 text-xs font-medium tracking-[0.32em] text-muted-foreground uppercase">{server.tagline}</p>
              ) : null}
            </div>
          </header>

          <nav className="mt-14 flex flex-col gap-1" aria-label="Pause menu">
            {buttons.map((b, i) => {
              if (b === "disconnect") return null;
              const item = NAV[b];
              if (!item) return null;
              const Icon = item.icon;
              const active = b === "help" && view === "help";
              return (
                <Button
                  key={b}
                  autoFocus={i === 0}
                  variant={active ? "secondary" : "ghost"}
                  size="lg"
                  onClick={() => run(b)}
                  className="pause-nav h-12 w-full justify-start gap-3 px-4 text-base"
                  style={{ animationDelay: `${80 + i * 35}ms` }}
                >
                  <Icon className="size-5 text-muted-foreground" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.kbd ? <Kbd>{item.kbd}</Kbd> : null}
                </Button>
              );
            })}
          </nav>

          {buttons.includes("disconnect") ? (
            <>
              <Separator className="my-4 opacity-60" />
              <Disconnect />
            </>
          ) : null}

          <div className="mt-auto flex flex-col gap-3">
            {links.map((l) => (
              <div key={l.label} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="truncate font-medium text-foreground/90">{l.value}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* right: the player, or the help sheet */}
        <main className="flex flex-1 items-center justify-end px-16">
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
        <Button
          variant="ghost"
          size="lg"
          className="pause-nav h-12 w-full justify-start gap-3 px-4 text-base text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/15"
        >
          <LogOutIcon className="size-5" />
          <span className="flex-1 text-left">Disconnect</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="pause-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Leave the server?</AlertDialogTitle>
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

  return (
    <Card className="pause-card w-[380px] gap-0 py-0 shadow-2xl">
      <CardHeader className="flex flex-row items-center gap-4 border-b px-6 py-6">
        <Avatar className="size-14">
          <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-1.5">
          <CardTitle className="truncate text-xl">{name}</CardTitle>
          {job ? (
            <Badge variant="secondary" className="max-w-full">
              <BriefcaseIcon />
              <span className="truncate">{job.label ?? job.name}</span>
              {job.gradeLabel ? <span className="text-muted-foreground">· {job.gradeLabel}</span> : null}
              {job.onDuty !== undefined ? (
                <span
                  className={cn("size-1.5 rounded-full", job.onDuty ? "bg-primary" : "bg-muted-foreground/50")}
                  aria-label={job.onDuty ? "On duty" : "Off duty"}
                />
              ) : null}
            </Badge>
          ) : (
            <CardDescription>{player.loaded ? "Civilian" : "No character loaded"}</CardDescription>
          )}
        </div>
      </CardHeader>

      {player.loaded && (player.cash !== undefined || player.bank !== undefined) ? (
        <CardContent className="grid grid-cols-2 gap-px bg-border p-0">
          <Stat icon={<WalletIcon />} label="Cash" value={player.cash !== undefined ? money.format(player.cash) : "—"} />
          <Stat icon={<LandmarkIcon />} label="Bank" value={player.bank !== undefined ? money.format(player.bank) : "—"} />
        </CardContent>
      ) : null}

      <CardFooter className="flex flex-col items-stretch gap-3 border-t px-6 py-5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <UsersIcon className="size-4" />
            Players online
          </span>
          <span className="font-medium tabular-nums">
            {players ?? "—"}
            {max ? <span className="text-muted-foreground"> / {max}</span> : null}
          </span>
        </div>
        {players !== undefined && max ? <Progress value={Math.min(100, (players / max) * 100)} className="h-1" /> : null}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Server ID</span>
          <span className="font-mono font-medium tabular-nums">{data?.serverId ?? "—"}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-card px-6 py-5">
      <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase [&_svg]:size-3.5">
        {icon}
        {label}
      </span>
      <span className="truncate text-xl font-semibold tracking-tight tabular-nums">{value}</span>
    </div>
  );
}

function Help({ help }: { help: PauseData["help"] }) {
  return (
    <Card className="pause-card w-[380px] shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl">Controls</CardTitle>
        <CardDescription>Keys this server uses. Change yours in Key bindings.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col">
        {help.length ? (
          help.map((h, i) => (
            <div key={h.key + h.label}>
              {i > 0 ? <Separator /> : null}
              <div className="flex items-center justify-between py-2.5 text-sm">
                <span>{h.label}</span>
                <Kbd className="min-w-8">{h.key}</Kbd>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No controls listed.</p>
        )}
      </CardContent>
    </Card>
  );
}
