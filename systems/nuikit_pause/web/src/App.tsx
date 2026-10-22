import { fetchNui, Surface, usePlayer, type NuiPlayer } from "nuikit-core/react";
import { CircleHelpIcon, InfoIcon, KeyboardIcon, LogOutIcon, MapIcon, PlayIcon, SettingsIcon, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
import { SheetTitle } from "@/components/ui/sheet";
import { list } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HelpPage, PlayerSummary, ServerSummary, Stage } from "./views/home";
import { InfoPage } from "./views/info";
import { KeysPage } from "./views/keys";
import { SettingsPage } from "./views/settings";
import { MapSheetPage, MapStage, useMapModel } from "./views/map";
import { PauseSheet, rise, SHEET_W } from "./views/sheet";

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
  const [streamer, setStreamer] = useState(!!data?.streamer);
  useEffect(() => setStreamer(!!data?.streamer), [data?.streamer]);
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
    if (b === "settings" && views?.settings) return toggle("settings");
    if (b === "info") return toggle("info");
    if (b === "help") return toggle("help");
    if (b !== "disconnect") void fetchNui(`pause:${b}`).catch(() => {});
  };

  const map = useMapModel(data, view === "map");
  // the sheet slides in once; the first page's rows rise in only then, never on navigation
  const navigated = useRef(false);
  if (view !== (data?.view ?? "home")) navigated.current = true;
  const first = !navigated.current;

  const buttons = list(data?.buttons).filter((b) => b !== "info" || (views?.info && list(data?.pages).length > 0));
  const server = data?.server ?? {};
  const home = () => go("home");

  let page: ReactNode;
  if (view === "map") page = <MapSheetPage model={map} onBack={home} />;
  else if (view === "keys") page = <KeysPage onBack={home} onChange={() => void fetchNui("pause:keybinds").catch(() => {})} />;
  else if (view === "info") page = <InfoPage pages={list(data?.pages)} onBack={home} />;
  else if (view === "settings")
    page = (
      <SettingsPage
        onBack={home}
        onValues={(v) => setStreamer(v.streamer === true)}
        onGame={() => void fetchNui("pause:settings").catch(() => {})}
      />
    );
  else if (view === "help") page = <HelpPage help={list(data?.help)} onBack={home} />;
  else
    page = (
      <div className="flex h-full min-h-0 justify-end">
        <div className="flex h-full w-full max-w-[28rem] flex-col overflow-y-auto py-12 pr-12 pl-6">
          <header className="flex items-center gap-4">
            {server.logo ? (
              <div className="pause-logo flex size-12 shrink-0 items-center justify-center bg-foreground text-base font-semibold text-background">
                {server.logo}
              </div>
            ) : null}
            <div className="min-w-0">
              <SheetTitle asChild>
                {/* up to two lines, a step smaller when long; an ellipsis only past that */}
                <h1
                  className="nk-display line-clamp-2 break-words"
                  style={(server.name ?? "").length > 14 ? ({ "--nk-display-size": "var(--nk-text-section)" } as CSSProperties) : undefined}
                >
                  {server.name || "Paused"}
                </h1>
              </SheetTitle>
              {server.tagline ? <p className="nk-label truncate text-muted-foreground">{server.tagline}</p> : null}
            </div>
          </header>

          <PlayerSummary player={player} data={data} streamer={streamer} />

          <nav className="flex flex-col" aria-label="Pause menu">
            {buttons.includes("resume") ? (
              <Button size="lg" autoFocus style={rise(first ? 0 : undefined).style} className={cn("mb-2 h-12 justify-between px-4 text-base", rise(first ? 0 : undefined).className)} onClick={() => run("resume")}>
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
                const r = rise(first ? i + 1 : undefined);
                return (
                  <MenuRow key={b} autoFocus={i === 0} icon={<item.icon />} kbd={item.kbd} onClick={() => run(b)} className={cn("min-h-12 text-base", r.className)} style={r.style}>
                    {item.label}
                  </MenuRow>
                );
              })}
              {buttons.includes("disconnect") ? <Disconnect rise={rise(first ? buttons.length : undefined)} /> : null}
            </div>
          </nav>

          <div className="mt-auto pt-6">
            <ServerSummary data={data} />
          </div>
        </div>
      </div>
    );

  return (
    <div className="pause-root absolute inset-0 overflow-hidden">
      <div className="pause-scrim absolute inset-0" data-stage={standIn || view === "map" || undefined} aria-hidden />
      {/* the world: the map's glass, or the open stage the focus camera frames the player in */}
      {view === "map" ? (
        <MapStage model={map} left={SHEET_W} />
      ) : (
        <div className="absolute inset-y-0 right-0 flex" style={{ left: SHEET_W }}>
          <Stage active={standIn} back={view !== "home"} />
        </div>
      )}
      <PauseSheet page={view} first={first}>
        {page}
      </PauseSheet>
    </div>
  );
}

function Disconnect({ rise: r }: { rise: ReturnType<typeof rise> }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <MenuRow tone="destructive" icon={<LogOutIcon />} className={cn("min-h-12 text-base", r.className)} style={r.style}>
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
