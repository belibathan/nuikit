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
        <span className="truncate text-xs font-medium" title={message}>
          {message}
        </span>
      </div>
    );
  }
  return (
    <div className="text-muted-foreground -mx-3 -mt-3 mb-3 flex h-8 shrink-0 items-center gap-3 border-b px-3 text-xs">
      <span className="nk-num text-foreground font-semibold">{data.time ?? "--:--"}</span>
      <span className="ml-auto flex items-center gap-1.5">
        {data.insideJammerZone ? (
          <>
            <SignalZero className="text-destructive size-4" />
            <span className="text-destructive font-medium">{t("nuikit_jammed")}</span>
          </>
        ) : (
          <Signal className={cn("size-4", data.onRadio && "text-foreground")} />
        )}
      </span>
      <span className="flex items-center gap-1">
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
      className={cn("text-muted-foreground h-12 min-w-0 flex-1 flex-col gap-1 px-1 text-xs font-medium", active && "bg-accent text-accent-foreground")}
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
      <span className="nk-num text-muted-foreground w-8 text-right text-xs">{volume}</span>
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
    <div className="relative pt-10">
      {/* antenna */}
      <div className="bg-muted absolute top-0 left-8 h-14 w-5 rounded-t-md border border-b-0" />
      <section
        className={cn(
          "nk-panel relative flex w-72 flex-col gap-3 rounded-[1.75rem] p-3",
          moveMode && "outline-primary cursor-move outline-2 outline-offset-2",
        )}
      >
        {/* speaker slot */}
        <div className="relative flex h-3 items-center justify-center">
          <div className="bg-muted h-1 w-12 rounded-full" />
          {moveMode && <Move className="text-primary absolute right-2 size-4" />}
        </div>

        <div className="bg-background relative h-[18.75rem] overflow-hidden rounded-2xl border p-3">
          {charged ? (
            <div className="flex h-full flex-col">
              <StatusBar message={message} />
              {tab !== "home" && (
                <button
                  type="button"
                  onClick={() => setTab("home")}
                  className="text-muted-foreground hover:text-foreground -mt-1 mb-2 flex h-6 shrink-0 items-center gap-1 self-start text-xs font-medium outline-none"
                >
                  <ChevronLeft className="-ml-1 size-4" />
                  {t("nuikit_back")}
                </button>
              )}
              <div className="min-h-0 flex-1">{screen}</div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <BatteryWarning className="text-destructive size-6" />
              <span className="text-destructive text-sm font-medium">{soft(t("nuikit_no_charge"))}</span>
            </div>
          )}
        </div>

        {charged && (
          <>
            <Volume />
            <div className="flex gap-1">
              <NavKey icon={ListMusic} label={soft(t("channels"))} tab="channels" />
              <NavKey icon={Grid3x3} label={soft(t("radio"))} tab="keypad" />
              {never ? (
                <NavKey icon={Settings} label={soft(t("settings"))} tab="settings" />
              ) : (
                <NavKey icon={UsersRound} label={soft(t("members"))} tab="members" disabled={!data.onRadio} />
              )}
            </div>
            <div className="text-muted-foreground flex h-5 items-center justify-center gap-1.5 text-xs">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{data.street || "—"}</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
