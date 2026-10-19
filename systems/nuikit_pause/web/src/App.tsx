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
import { useState } from "react";
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
import { MenuRow } from "@/components/ui/menu-row";
import { Meter } from "@/components/ui/meter";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Separator } from "@/components/ui/separator";
import { Stat } from "@/components/ui/stat";
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
              <h1 className="truncate text-xl leading-6 font-semibold tracking-tight">{server.name || "Paused"}</h1>
              {server.tagline ? <p className="truncate text-sm text-muted-foreground">{server.tagline}</p> : null}
            </div>
          </header>

          <nav className="pause-nav mt-12 flex flex-col gap-0.5" aria-label="Pause menu">
            {buttons.map((b, i) => {
              if (b === "disconnect") return null;
              const item = NAV[b];
              if (!item) return null;
              return (
                <MenuRow
                  key={b}
                  autoFocus={i === 0}
                  icon={<item.icon />}
                  kbd={item.kbd}
                  active={b === "help" && view === "help"}
                  onClick={() => run(b)}
                >
                  {item.label}
                </MenuRow>
              );
            })}
            {buttons.includes("disconnect") ? (
              <>
                <Separator className="my-3" />
                <Disconnect />
              </>
            ) : null}
          </nav>

          <dl className="mt-auto flex flex-col gap-2 text-sm">
            {links.map((l) => (
              <div key={l.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{l.label}</dt>
                <dd className="truncate font-medium">{l.value}</dd>
              </div>
            ))}
          </dl>
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
        <MenuRow tone="destructive" icon={<LogOutIcon />}>
          Disconnect
        </MenuRow>
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
  const showMoney = player.loaded && (player.cash !== undefined || player.bank !== undefined);

  return (
    <Panel>
      <PanelHeader
        icon={
          <Avatar className="size-10">
            <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">{initials(name)}</AvatarFallback>
          </Avatar>
        }
        title={name}
        description={
          <span className="flex items-center gap-1.5">
            <span className="truncate">{role}</span>
            {job?.onDuty !== undefined ? (
              <span
                className={cn("size-1.5 shrink-0 rounded-full", job.onDuty ? "bg-primary" : "bg-muted-foreground/50")}
                aria-label={job.onDuty ? "On duty" : "Off duty"}
              />
            ) : null}
          </span>
        }
      />

      {showMoney ? (
        <PanelBody variant="form" className="grid grid-cols-2">
          <Stat icon={<WalletIcon />} label="Cash" value={player.cash !== undefined ? money.format(player.cash) : "—"} />
          <Stat icon={<LandmarkIcon />} label="Bank" value={player.bank !== undefined ? money.format(player.bank) : "—"} />
        </PanelBody>
      ) : null}

      <PanelFooter className="flex-col items-stretch gap-3">
        {players !== undefined && max ? (
          <Meter icon={<UsersIcon />} label="Players online" value={players} max={max} valueText={`${players} / ${max}`} size="sm" />
        ) : (
          <div className="flex items-center gap-1.5">
            <UsersIcon className="size-4 text-muted-foreground" />
            <span className="nk-label flex-1">Players online</span>
            <span className="nk-num text-xs font-medium">{players ?? "—"}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="nk-label">Server ID</span>
          <span className="nk-num text-xs font-medium">{data?.serverId ?? "—"}</span>
        </div>
      </PanelFooter>
    </Panel>
  );
}

function Help({ help }: { help: PauseData["help"] }) {
  return (
    <Panel>
      <PanelHeader title="Controls" description="Change yours in Key bindings." />
      <PanelBody>
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
      </PanelBody>
    </Panel>
  );
}
