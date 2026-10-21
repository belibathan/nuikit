import { fetchNui, Surface, usePlayer, type NuiPlayer } from "nuikit-core/react";
import { CircleHelpIcon, InfoIcon, KeyboardIcon, LogOutIcon, MapIcon, PlayIcon, SettingsIcon, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { PauseButton, PauseData, PauseView } from "./nui";
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
import { MenuRow } from "@/components/ui/menu-row";
import { Separator } from "@/components/ui/separator";
import { list } from "@/lib/format";
import { HelpPanel, Home } from "./views/home";
import { InfoPanel } from "./views/info";
import { KeysPanel } from "./views/keys";
import { MapView } from "./views/map";

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
  keybinds: { label: "Key bindings", icon: KeyboardIcon },
  info: { label: "Info", icon: InfoIcon },
  settings: { label: "Settings", icon: SettingsIcon },
  help: { label: "Help", icon: CircleHelpIcon },
};

type Side = PauseView | "help";

function Pause({ data, player }: { data: PauseData; player: NuiPlayer }) {
  const views = data?.views;
  const [view, setView] = useState<Side>(data?.view ?? "home");
  const [standIn, setStandIn] = useState(!!data?.preview);
  useEffect(() => setStandIn(!!data?.preview), [data?.preview]);

  const go = useCallback((next: Side) => {
    setView(next);
    // Lua runs the cameras; "help" is only a panel here, Home as far as Lua is concerned
    const lua: PauseView = next === "help" ? "home" : next;
    void fetchNui("pause:view", { view: lua })
      .then((r) => r?.preview !== undefined && setStandIn(!!r.preview))
      .catch(() => {});
  }, []);

  // In a sub-view Esc goes back Home instead of closing the menu (nuikit skips a handled Escape).
  useEffect(() => {
    if (view === "home") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("[role=alertdialog]")) return; // the dialog's own Escape
      e.preventDefault();
      go("home");
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [view, go]);

  const run = (b: PauseButton) => {
    const toggle = (v: Side) => go(view === v ? "home" : v);
    if (b === "map" && views?.map) return go("map");
    if (b === "keybinds" && views?.keys) return toggle("keys");
    if (b === "info") return toggle("info");
    if (b === "help") return toggle("help");
    if (b !== "disconnect") void fetchNui(`pause:${b}`).catch(() => {});
  };

  if (view === "map") return <MapView data={data} onBack={() => go("home")} />;

  const buttons = list(data?.buttons).filter((b) => b !== "info" || (views?.info && list(data?.pages).length > 0));
  const server = data?.server ?? {};
  const active = (b: PauseButton) =>
    (b === "keybinds" && view === "keys") || (b === "info" && view === "info") || (b === "help" && view === "help");

  return (
    <div className="pause-root absolute inset-0 overflow-hidden">
      <div className="pause-scrim absolute inset-0" data-stage={standIn || undefined} aria-hidden />

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
              {/* the server's name in the identity's display face (reference screens), at the title size */}
              <h1 className="nk-display truncate text-xl leading-6">{server.name || "Paused"}</h1>
              {server.tagline ? <p className="truncate text-sm text-muted-foreground">{server.tagline}</p> : null}
            </div>
          </header>

          <nav className="pause-nav mt-12 flex flex-col gap-0.5" aria-label="Pause menu">
            {buttons.map((b, i) => {
              if (b === "disconnect") return null;
              const item = NAV[b];
              if (!item) return null;
              return (
                <MenuRow key={b} autoFocus={i === 0} icon={<item.icon />} kbd={item.kbd} active={active(b)} onClick={() => run(b)}>
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
            {list(data?.links).map((l) => (
              <div key={l.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{l.label}</dt>
                <dd className="truncate font-medium">{l.value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        {view === "home" ? (
          <Home data={data} player={player} standIn={standIn} />
        ) : (
          <main className="flex flex-1 items-center justify-end px-12">
            {view === "keys" && <KeysPanel onChange={() => void fetchNui("pause:keybinds").catch(() => {})} />}
            {view === "info" && <InfoPanel pages={list(data?.pages)} />}
            {view === "help" && <HelpPanel help={list(data?.help)} />}
          </main>
        )}
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
