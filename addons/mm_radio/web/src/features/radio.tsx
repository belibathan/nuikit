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
import { Card } from "@/components/ui/card";
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

/** LCD status bar: clock, signal, battery; a notify message takes it over for its duration. */
function StatusBar({ message }: { message: string | null }) {
  const { data, t } = useCtx();
  const battery = Math.round(Number(data.battery ?? 100));
  if (message) {
    return (
      <div className="bg-primary text-primary-foreground -mx-3 -mt-3 mb-2 flex h-8 items-center overflow-hidden rounded-t-xl px-3">
        <span className="truncate text-xs font-semibold" title={message}>
          {message}
        </span>
      </div>
    );
  }
  return (
    <div className="text-muted-foreground -mx-3 -mt-3 mb-2 flex h-8 items-center gap-2 border-b px-3 text-xs">
      <span className="radio-lcd text-foreground font-semibold">{data.time ?? "--:--"}</span>
      <span className="ml-auto flex items-center gap-1">
        {data.insideJammerZone ? (
          <>
            <SignalZero className="text-destructive size-4" />
            <span className="text-destructive text-[10px] font-semibold uppercase">{t("nuikit_jammed")}</span>
          </>
        ) : (
          <Signal className={cn("size-4", data.onRadio ? "text-foreground" : "")} />
        )}
      </span>
      <span className="flex items-center gap-1">
        <BatteryIcon level={battery} />
        <span className="radio-lcd">{battery}%</span>
      </span>
    </div>
  );
}

function NavKey({ icon: Icon, label, tab, disabled }: { icon: LucideIcon; label: string; tab: Tab; disabled?: boolean }) {
  const { tab: current, setTab } = useCtx();
  const active = current === tab;
  return (
    <Button
      variant={active ? "default" : "secondary"}
      disabled={disabled}
      onClick={() => setTab(active ? "home" : tab)}
      className="h-auto flex-1 flex-col gap-1 py-2 text-[10px] font-medium"
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
      <Button variant="ghost" size="icon-sm" onClick={toggleMute} disabled={!on} aria-label={t("nuikit_volume")} aria-pressed={volume === 0}>
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
      <span className="radio-lcd text-muted-foreground w-8 text-right text-xs">{volume}</span>
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
    <div className="relative pt-12">
      {/* antenna */}
      <div className="bg-muted absolute top-0 left-8 h-16 w-6 rounded-t-lg border border-b-0" />
      <div className="bg-muted-foreground/40 absolute top-2 left-[2.6rem] h-1 w-2 rounded-full" />
      <Card className={cn("relative w-[280px] gap-3 rounded-[28px] p-3 shadow-2xl", moveMode && "ring-primary cursor-move ring-2")}>
        {/* speaker grille */}
        <div className="flex items-center gap-2 px-2">
          <div className="flex flex-1 flex-col gap-1 py-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-muted h-1 rounded-full" />
            ))}
          </div>
          {moveMode && <Move className="text-primary size-4" />}
        </div>

        <div className="bg-background relative h-[300px] overflow-hidden rounded-xl border p-3 shadow-inner">
          {charged ? (
            <div className="flex h-full flex-col">
              <StatusBar message={message} />
              {tab !== "home" && (
                <button
                  type="button"
                  onClick={() => setTab("home")}
                  className="text-muted-foreground hover:text-foreground -mt-0.5 mb-1.5 flex items-center gap-0.5 self-start text-[11px] outline-none"
                >
                  <ChevronLeft className="size-3.5" />
                  {t("nuikit_back")}
                </button>
              )}
              <div className="min-h-0 flex-1">{screen}</div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <BatteryWarning className="text-destructive size-8" />
              <span className="text-destructive text-xs font-bold tracking-widest uppercase">{t("nuikit_no_charge")}</span>
            </div>
          )}
        </div>

        {charged && (
          <>
            <Volume />
            <div className="flex gap-1.5">
              <NavKey icon={ListMusic} label={soft(t("channels"))} tab="channels" />
              <NavKey icon={Grid3x3} label={soft(t("radio"))} tab="keypad" />
              {never ? (
                <NavKey icon={Settings} label={soft(t("settings"))} tab="settings" />
              ) : (
                <NavKey icon={UsersRound} label={soft(t("members"))} tab="members" disabled={!data.onRadio} />
              )}
            </div>
            <div className="text-muted-foreground flex items-center justify-center gap-1.5 pb-1 text-[11px]">
              <MapPin className="size-3" />
              <span className="truncate">{data.street || "—"}</span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
