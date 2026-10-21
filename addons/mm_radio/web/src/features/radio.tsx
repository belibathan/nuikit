import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  ChevronLeft,
  Grid3x3,
  ListMusic,
  MapPin,
  Radio as RadioIcon,
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
import { EmptyState } from "@/components/ui/empty-state";
import { FormField, useFormField } from "@/components/ui/form-field";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
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

/** The header's right side: clock, signal (or jammed), battery. */
function Status() {
  const { data, t } = useCtx();
  const battery = Math.round(Number(data.battery ?? 100));
  return (
    <>
      <span className="nk-num text-sm font-medium">{data.time ?? "--:--"}</span>
      {data.insideJammerZone ? (
        <span className="flex items-center gap-1 text-destructive" title={t("nuikit_jammed")}>
          <SignalZero className="size-4" />
          <span className="nk-label text-destructive">{t("nuikit_jammed")}</span>
        </span>
      ) : (
        <Signal className={cn("size-4", data.onRadio ? "text-foreground" : "text-muted-foreground")} aria-label={data.onRadio ? "On a channel" : "Off"} />
      )}
      <span className={cn("flex items-center gap-1 text-muted-foreground", battery < 20 && "text-destructive")}>
        <BatteryIcon level={battery} />
        <span className="nk-num text-xs">{battery}%</span>
      </span>
    </>
  );
}

function NavKey({ icon: Icon, label, tab, disabled }: { icon: LucideIcon; label: string; tab: Tab; disabled?: boolean }) {
  const { tab: current, setTab } = useCtx();
  const active = current === tab;
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={() => setTab(active ? "home" : tab)}
      className={cn("h-11 min-w-0 flex-1 flex-col gap-0.5 px-1 text-xs text-muted-foreground", active && "bg-accent text-accent-foreground")}
      aria-pressed={active}
    >
      <Icon />
      <span className="truncate">{label}</span>
    </Button>
  );
}

/**
 * A slider that posts once, when let go (mm_radio quirk 8), inside a kit FormField row. form-field's
 * SliderField has no commit callback, so the control is wired here with the field's ids.
 */
export function CommitSlider({
  label,
  value,
  min,
  max,
  disabled,
  onValueChange,
  onValueCommit,
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onValueChange: (v: number) => void;
  onValueCommit: (v: number) => void;
  className?: string;
}) {
  return (
    <FormField label={label} valueText={<span className="nk-num">{value}</span>} disabled={disabled} className={className}>
      <SliderControl value={value} min={min} max={max} onValueChange={onValueChange} onValueCommit={onValueCommit} />
    </FormField>
  );
}

function SliderControl({ value, min, max, onValueChange, onValueCommit }: { value: number; min: number; max: number; onValueChange: (v: number) => void; onValueCommit: (v: number) => void }) {
  const f = useFormField();
  const box = useRef<HTMLDivElement>(null);
  // the thumb (role=slider) takes focus: name it from the field's label (vendor/ stays stock)
  useEffect(() => {
    box.current?.querySelectorAll<HTMLElement>('[role="slider"]').forEach((thumb) => thumb.setAttribute("aria-labelledby", f.labelId));
  });
  return (
    <div ref={box} className="flex h-5 items-center">
      <Slider id={f.id} disabled={f.disabled} min={min} max={max} step={1} value={[value]} onValueChange={([v]) => onValueChange(v ?? min)} onValueCommit={([v]) => onValueCommit(v ?? min)} />
    </div>
  );
}

/** Volume and mute, under the screen: disabled off-channel, posts on release. */
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
    <div className="flex items-center gap-2 border-t px-[calc(var(--nk-space)*4)] py-[calc(var(--nk-space)*2)]">
      <Button variant="ghost" size="icon-sm" onClick={toggleMute} disabled={!on} aria-label={t("nuikit_volume")} aria-pressed={volume === 0} className="-ml-2 text-muted-foreground">
        <Icon />
      </Button>
      <Slider className="flex-1" min={0} max={100} step={1} value={[volume]} disabled={!on} onValueChange={([v]) => update((d) => ({ ...d, volume: v }))} onValueCommit={([v]) => void post("volumeChange", v)} aria-label={t("nuikit_volume")} />
      <span className="nk-num w-7 text-right text-xs text-muted-foreground">{volume}</span>
    </div>
  );
}

/** The handheld: a kit Panel. Positioned and scaled by the caller. */
export function Handheld() {
  const { data, t, tab, setTab, moveMode } = useCtx();
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
    <Panel size="sm" animate={false} selected={moveMode} className={cn("w-80", moveMode && "cursor-move")}>
      <PanelHeader
        icon={<RadioIcon />}
        title={soft(t("radio"))}
        description={
          message ? (
            <span role="status" className="text-foreground">
              {message}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{data.street || "—"}</span>
            </span>
          )
        }
        actions={<Status />}
        className="[&_[data-slot=panel-actions]]:gap-1.5"
      />
      {charged ? (
        <>
          <PanelBody variant="form" className="min-h-[19rem] gap-[calc(var(--nk-space)*3)]">
            {tab !== "home" && (
              <Button variant="ghost" size="xs" onClick={() => setTab("home")} className="-mt-1 -ml-2 self-start text-muted-foreground">
                <ChevronLeft />
                {t("nuikit_back")}
              </Button>
            )}
            <div className="flex min-h-0 flex-1 flex-col">{screen}</div>
          </PanelBody>
          <Volume />
          <PanelFooter className="gap-1 p-[calc(var(--nk-space)*2)]">
            <NavKey icon={ListMusic} label={soft(t("channels"))} tab="channels" />
            <NavKey icon={Grid3x3} label={soft(t("radio"))} tab="keypad" />
            {never ? <NavKey icon={Settings} label={soft(t("settings"))} tab="settings" /> : <NavKey icon={UsersRound} label={soft(t("members"))} tab="members" disabled={!data.onRadio} />}
          </PanelFooter>
        </>
      ) : (
        <PanelBody variant="form" className="min-h-[19rem] justify-center">
          <EmptyState tone="error" icon={<BatteryWarning />} title={soft(t("nuikit_no_charge"))} description={t("nuikit_no_charge_hint")} />
        </PanelBody>
      )}
    </Panel>
  );
}
