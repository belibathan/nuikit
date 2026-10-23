import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  ChevronLeft,
  Grid3x3,
  ListMusic,
  MapPin,
  Move,
  Settings,
  Signal,
  SignalZero,
  UsersRound,
  Volume1,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Slider } from "@/components/ui/slider";
import { soft } from "@/lib/locale";
import { post } from "@/lib/nui";
import { cn } from "@/lib/utils";
import { useCtx, type Tab } from "./context";
import { Channels, Home, Keypad, Members, SettingsScreen } from "./screens";

function BatteryIcon({ level }: { level: number }) {
  const I = level >= 80 ? BatteryFull : level >= 40 ? BatteryMedium : level >= 20 ? BatteryLow : BatteryWarning;
  return <I className={cn("size-4", level < 20 && "text-destructive")} />;
}

/** Status bar: clock, signal, battery; a notify message takes it over for its duration. */
function StatusBar({ message }: { message: string | null }) {
  const { data, t } = useCtx();
  const battery = Math.round(Number(data.battery ?? 100));
  if (message) {
    return (
      <div className="bg-accent text-accent-foreground -mx-3 -mt-3 mb-3 flex h-8 shrink-0 items-center overflow-hidden px-3">
        <span className="nk-label truncate" title={message}>
          {message}
        </span>
      </div>
    );
  }
  return (
    <div className="text-muted-foreground -mx-3 -mt-3 mb-3 flex h-8 shrink-0 items-center gap-3 border-b px-3 nk-label">
      <span className="nk-num text-foreground">{data.time ?? "--:--"}</span>
      <span className="ml-auto flex items-center gap-2">
        {data.insideJammerZone ? (
          <>
            <SignalZero className="text-destructive size-4" />
            <span className="text-destructive">{t("nuikit_jammed")}</span>
          </>
        ) : (
          <Signal className={cn("size-4", data.onRadio && "text-foreground")} />
        )}
      </span>
      <span className="flex items-center gap-2">
        <BatteryIcon level={battery} />
        <span className="nk-num">{battery}%</span>
      </span>
    </div>
  );
}

function NavKey({ icon: Icon, label, tab, disabled }: { icon: LucideIcon; label: string; tab: Tab; disabled?: boolean }) {
  const { tab: current, setTab } = useCtx();
  const active = current === tab;
  return (
    <Button
      variant="ghost"
      disabled={disabled}
      onClick={() => setTab(active ? "home" : tab)}
      className={cn("text-muted-foreground h-12 min-w-0 flex-1 flex-col gap-1 px-1 nk-label", active && "bg-accent text-accent-foreground")}
      aria-pressed={active}
    >
      <Icon className="size-4" />
      <span className="max-w-full truncate">{label}</span>
    </Button>
  );
}

function Volume() {
  const { data, update, t } = useCtx();
  const on = !!data.onRadio;
  const volume = Math.round(Number(data.volume ?? 30));
  const last = useRef(volume || 30);
  if (volume > 0) last.current = volume;
  const Icon = volume === 0 ? VolumeX : volume > 50 ? Volume2 : Volume1;

  const toggleMute = () => {
    if (!on) return;
    const next = volume === 0 ? last.current : 0;
    update((d) => ({ ...d, volume: next }));
    void post("toggleMute", next);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleMute}
        disabled={!on}
        aria-label={t("nuikit_volume")}
        aria-pressed={volume === 0}
        className="text-muted-foreground"
      >
        <Icon />
      </Button>
      <Slider
        className="flex-1"
        min={0}
        max={100}
        step={1}
        value={[volume]}
        disabled={!on}
        onValueChange={([v]) => update((d) => ({ ...d, volume: v }))}
        onValueCommit={([v]) => void post("volumeChange", v)}
        aria-label={t("nuikit_volume")}
      />
      <span className="nk-num nk-label text-muted-foreground w-8 text-right">{volume}</span>
    </div>
  );
}

/** The handheld. Positioned by the caller. */
export function Handheld() {
  const ctx = useCtx();
  const { data, t, tab, setTab, moveMode } = ctx;
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onMsg = (e: Event) => {
      const { msg, duration } = (e as CustomEvent<{ msg?: string; duration?: number }>).detail ?? {};
      if (!msg) return;
      setMessage(String(msg));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(null), Number(duration) || 5000);
    };
    window.addEventListener("radio:notify", onMsg);
    return () => window.removeEventListener("radio:notify", onMsg);
  }, []);

  const charged = Number(data.battery ?? 100) > 0;
  const never = data.overlay === "never";
  const screen = { home: <Home />, channels: <Channels />, keypad: <Keypad />, members: <Members />, settings: <SettingsScreen /> }[tab];

  return (
    <Panel size="auto" animate={false} selected={moveMode} className={cn("relative h-[34rem] w-72 gap-3 p-3", moveMode && "cursor-move")}>
        {moveMode && <Move className="text-primary absolute top-3 right-3 size-4" />}

        <div className="bg-background relative min-h-0 flex-1 overflow-hidden rounded-(--nk-r-surface) border p-3">
          {charged ? (
            <div className="flex h-full flex-col">
              <StatusBar message={message} />
              {tab !== "home" && (
                <button
                  type="button"
                  onClick={() => setTab("home")}
                  className="nk-label text-muted-foreground hover:text-foreground -mt-1 mb-2 flex h-6 shrink-0 items-center gap-2 self-start outline-none"
                >
                  <ChevronLeft className="size-4" />
                  {t("nuikit_back")}
                </button>
              )}
              <div className="min-h-0 flex-1">{screen}</div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <BatteryWarning className="text-destructive size-6" />
              <span className="nk-body text-destructive">{soft(t("nuikit_no_charge"))}</span>
            </div>
          )}
        </div>

        {charged && (
          <>
            <Volume />
            <div className="flex gap-2">
              <NavKey icon={ListMusic} label={soft(t("channels"))} tab="channels" />
              <NavKey icon={Grid3x3} label={soft(t("radio"))} tab="keypad" />
              {never ? (
                <NavKey icon={Settings} label={soft(t("settings"))} tab="settings" />
              ) : (
                <NavKey icon={UsersRound} label={soft(t("members"))} tab="members" disabled={!data.onRadio} />
              )}
            </div>
            <div className="text-muted-foreground flex h-5 items-center justify-center gap-2 nk-label">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{data.street || "—"}</span>
            </div>
          </>
        )}
    </Panel>
  );
}
