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
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { MenuRow } from "@/components/ui/menu-row";
import { list } from "@/lib/format";
import { HelpPanel, PlayerSummary, ServerSummary, Stage } from "./views/home";
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
        {/* the backdrop: the theme's surface, flush to the top, left and bottom edges; the menu sits in
            a column inside it, and the rest of the screen stays open for the game */}
        <aside className="pause-backdrop flex h-full w-[36rem] shrink-0 justify-end">
          <div className="pause-column flex h-full w-full max-w-[28rem] flex-col overflow-y-auto py-12 pr-12 pl-6">
            <header className="flex items-center gap-4">
              {server.logo ? (
                <div className="pause-logo flex size-12 shrink-0 items-center justify-center bg-foreground text-base font-semibold text-background">
                  {server.logo}
                </div>
              ) : null}
              <div className="min-w-0">
                <h1 className="nk-display truncate">{server.name || "Paused"}</h1>
                {server.tagline ? <p className="nk-label truncate text-muted-foreground">{server.tagline}</p> : null}
              </div>
            </header>

            <PlayerSummary player={player} data={data} />

            <nav className="flex flex-col" aria-label="Pause menu">
              {buttons.includes("resume") ? (
                <Button size="lg" autoFocus className="mb-2 h-12 justify-between px-4 text-base" onClick={() => run("resume")}>
                  <span className="flex items-center gap-3">
                    <PlayIcon />
                    Resume
                  </span>
                  <Kbd className="bg-primary-foreground/15 text-primary-foreground">Esc</Kbd>
                </Button>
              ) : null}
              <div className="flex flex-col divide-y divide-border">
                {buttons.map((b, i) => {
                  if (b === "disconnect" || b === "resume") return null;
                  const item = NAV[b];
                  if (!item) return null;
                  return (
                    <MenuRow key={b} autoFocus={i === 0} icon={<item.icon />} kbd={item.kbd} active={active(b)} onClick={() => run(b)} className="min-h-12 text-base">
                      {item.label}
                    </MenuRow>
                  );
                })}
                {buttons.includes("disconnect") ? <Disconnect /> : null}
              </div>
            </nav>

            <div className="mt-auto pt-6">
              <ServerSummary data={data} />
            </div>
          </div>
        </aside>

        {view === "home" ? (
          <Stage active={standIn} />
        ) : (
          <main className="pause-side flex min-w-0 flex-1 items-center px-12">
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
        <MenuRow tone="destructive" icon={<LogOutIcon />} className="min-h-12 text-base">
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
