import { ArrowRight, Delete, Lock, MicOff, Radio as RadioIcon, Settings, Star, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckboxField, SliderField, TextField } from "@/components/ui/form-field";
import { MenuRow } from "@/components/ui/menu-row";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/selection-tabs";
import { channelLabel, soft } from "@/lib/locale";
import { post } from "@/lib/nui";
import { isMuted, nums, type MutedList } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCtx } from "./context";

/** Joined channel as the big LCD readout. */
export function Home() {
  const { data, t, update } = useCtx();
  const on = !!data.onRadio;
  const ch = data.channel ?? 0;
  const { label } = channelLabel(ch, data.channelName);
  const favs = nums(data.favourite);
  const mine = nums(data.userData?.favourite);
  const isFav = favs.includes(ch);
  const removable = isFav && mine.includes(ch);

  const toggleFav = () => {
    if (!isFav) {
      update((d) => ({ ...d, favourite: [...nums(d.favourite), ch], userData: { ...d.userData, favourite: [...nums(d.userData?.favourite), ch] } }));
      void post("addFav", ch);
    } else if (removable) {
      update((d) => ({ ...d, favourite: nums(d.favourite).filter((c) => c !== ch), userData: { ...d.userData, favourite: nums(d.userData?.favourite).filter((c) => c !== ch) } }));
      void post("removeFav", ch);
    }
  };

  if (!on) {
    return (
      <EmptyState className="h-full justify-center" icon={<RadioIcon />} title={soft(t("notconnected"))} description={t("nuikit_offline_hint")} />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-8 items-center justify-between">
        <span className="nk-label text-foreground flex items-center gap-2">
          <Chip variant="dot" tone="success" />
          {soft(t("header"))}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleFav}
          disabled={isFav && !removable}
          aria-pressed={isFav}
          aria-label={t("favorites")}
          className={cn("disabled:opacity-100", !isFav && "text-muted-foreground")}
        >
          {isFav && !removable ? <Lock className="text-muted-foreground" /> : <Star className={cn(isFav && "fill-current")} />}
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <span className="nk-label">{soft(t("frequency"))}</span>
        <div className="flex items-baseline gap-2">
          <span className="radio-lcd nk-num text-(length:--nk-text-display) leading-none">{String(ch)}</span>
          <span className="nk-label text-muted-foreground">MHz</span>
        </div>
        {label && <span className="nk-title truncate">{label}</span>}
      </div>
      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => void post("leave")}>
        <Unplug />
        {soft(t("disconnect"))}
      </Button>
    </div>
  );
}

function ChannelList({ channels }: { channels: number[] }) {
  const { data, t } = useCtx();
  if (channels.length === 0) return <EmptyState title={t("nuikit_no_channels")} />;
  return (
    <ScrollArea className="h-full [&_[data-slot=scroll-area-viewport]>div]:!block">
      <div className="flex flex-col gap-1">
        {channels.map((ch, i) => {
          const { label } = channelLabel(ch, data.channelName);
          const current = !!data.onRadio && data.channel === ch;
          return (
            <MenuRow
              key={`${ch}:${i}`}
              onClick={() => void post("join", ch)}
              aria-current={current || undefined}
              active={current}
              description={label || undefined}
              chevron={!current}
              meta={current ? <Chip variant="dot" tone="success" aria-label="Joined" /> : undefined}
            >
              <span className="radio-lcd">{ch} MHz</span>
            </MenuRow>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function Channels() {
  const { data, t } = useCtx();
  return (
    <Tabs defaultValue="favourite" className="h-full gap-2">
      <TabsList className="w-full">
        <TabsTrigger value="favourite" className="nk-label">{soft(t("favorites"))}</TabsTrigger>
        <TabsTrigger value="recomended" className="nk-label">{soft(t("recommended"))}</TabsTrigger>
      </TabsList>
      <TabsContent value="favourite" className="min-h-0">
        <ChannelList channels={nums(data.favourite)} />
      </TabsContent>
      <TabsContent value="recomended" className="min-h-0">
        <ChannelList channels={nums(data.recomended)} />
      </TabsContent>
    </Tabs>
  );
}

/** Next keypad text, or the old one when the key would make it invalid. */
export function pressKey(text: string, key: string, max: number | undefined): string {
  if (key === "back") return text.slice(0, -1);
  if (key === "clear") return "";
  if (key === ".") return text.includes(".") ? text : (text || "0") + ".";
  if (!/^\d$/.test(key)) return text;
  const [, dec] = text.split(".");
  if (dec !== undefined && dec.length >= 2) return text; // the server only keeps 2 decimals
  if (text === "0") return key;
  const next = text + key;
  if (max && parseFloat(next) > max) return text;
  return next;
}

export function Keypad() {
  const { data, t } = useCtx();
  const [text, setText] = useState("");
  const join = () => {
    if (!text || !(parseFloat(text) > 0)) return;
    void post("join", text.replace(/\.$/, ""));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "Enter") return join();
      const k = e.key === "Backspace" ? "back" : e.key === "Delete" ? "clear" : e.key === "," ? "." : e.key;
      setText((s) => pressKey(s, k, data.maxChannel));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"];
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-10 shrink-0 items-baseline gap-2 border-b px-1 pt-1">
        <span className={cn("radio-lcd nk-num flex-1 truncate text-(length:--nk-text-title) leading-8", !text && "text-muted-foreground/60")}>{text || "000.00"}</span>
        <span className="nk-label text-muted-foreground">MHz</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-2">
        {keys.map((k) => (
          <Button
            key={k}
            variant="ghost"
            className="radio-lcd nk-num hover:bg-accent h-full min-h-0 py-0"
            onClick={() => setText((s) => pressKey(s, k, data.maxChannel))}
            aria-label={k === "back" ? "Backspace" : k}
          >
            {k === "back" ? <Delete /> : k}
          </Button>
        ))}
      </div>
      <Button size="sm" onClick={join} disabled={!text || !(parseFloat(text) > 0)}>
        {t("nuikit_join")}
        <ArrowRight />
      </Button>
    </div>
  );
}

export function Members() {
  const { data, t, members, overlayOn, setOverlayOn, setTab } = useCtx();
  const [muted, setMuted] = useState<MutedList>(null);
  useEffect(() => {
    void post<MutedList>("getMutedList").then((m) => setMuted(m ?? null));
  }, []);
  const entries = Object.entries(members);

  const toggleMute = async (id: string) => {
    const res = await post<MutedList>("togglemutePlayer", Number(id));
    if (res !== null && res !== undefined) setMuted(res);
  };
  const toggleOverlay = () => {
    const next = !overlayOn;
    setOverlayOn(next);
    void post("showPlayerList", next);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-6 shrink-0 items-center justify-between px-2">
        <span className="nk-title">{soft(t("members"))}</span>
        <span className="nk-label nk-num" aria-label={`${entries.length} on ${data.channel} MHz`}>
          {entries.length}
        </span>
      </div>
      <div className="min-h-0 flex-1">
        {entries.length === 0 ? (
          <EmptyState title={t("nuikit_no_members")} />
        ) : (
          <ScrollArea className="h-full [&_[data-slot=scroll-area-viewport]>div]:!block">
            <div className="flex flex-col gap-1">
              {entries.map(([id, m]) => {
                const isOff = isMuted(muted, id);
                return (
                  <MenuRow
                    key={id}
                    readOnly
                    icon={<Chip variant="dot" tone={m.isTalking ? "success" : undefined} aria-label={m.isTalking ? "Talking" : undefined} />}
                    actions={
                      <Button
                        variant={isOff ? "secondary" : "ghost"}
                        size="icon-sm"
                        aria-label={isOff ? "Unmute" : "Mute"}
                        onClick={() => void toggleMute(id)}
                        aria-pressed={isOff}
                        className={cn(!isOff && "text-muted-foreground")}
                      >
                        <MicOff />
                      </Button>
                    }
                  >
                    <span className={cn("truncate", !m.isTalking && "text-muted-foreground")}>{m.name}</span>
                  </MenuRow>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={toggleOverlay}>
          {soft(overlayOn ? t("hide_overlay") : t("show_overlay"))}
        </Button>
        <Button variant="secondary" size="icon-sm" onClick={() => setTab("settings")} aria-label={t("settings")}>
          <Settings />
        </Button>
      </div>
    </div>
  );
}

export function SettingsScreen() {
  const { data, t, update, moveMode, setMoveMode, setTab } = useCtx();
  const u = data.userData ?? {};
  const [name, setName] = useState(u.name ?? "");
  const [radioSize, setRadioSize] = useState(u.radioSizeMultiplier ?? 50);
  const [overlaySize, setOverlaySize] = useState(u.overlaySizeMultiplier ?? 50);
  const withOverlay = data.overlay !== "never";

  const commitSize = (radio: number, overlay: number) => void post("updateRadioSize", { radio, overlay });
  const setUser = (patch: Partial<typeof u>) => update((d) => ({ ...d, userData: { ...d.userData, ...patch } }));

  return (
    <div className="flex h-full flex-col gap-2">
      <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block">
        <div className="flex flex-col gap-3 pr-3 pb-1">
          <div className="nk-label">{soft(t("radio_settings"))}</div>
          <SliderField
            label={t("nuikit_size")}
            min={25}
            max={75}
            step={1}
            value={radioSize}
            disabled={moveMode}
            onValueChange={(v) => {
              setRadioSize(v);
              setUser({ radioSizeMultiplier: v });
            }}
            onCommit={(v) => commitSize(v, overlaySize)}
          />
          <CheckboxField variant="switch" label={t("move_radio")} checked={moveMode} onCheckedChange={setMoveMode} />
          <CheckboxField
            variant="switch"
            label={t("allow_move")}
            checked={!!u.allowMovement}
            onCheckedChange={(v) => {
              setUser({ allowMovement: v });
              void post("allowMovement", v);
            }}
          />
          <CheckboxField
            variant="switch"
            label={t("enableClicks")}
            checked={!!u.enableClicks}
            onCheckedChange={(v) => {
              setUser({ enableClicks: v });
              void post("enableClicks", v);
            }}
          />
          {withOverlay && (
            <>
              <Separator />
              <div className="nk-label">{soft(t("overlay_settings"))}</div>
              <TextField label={t("nuikit_name")} value={name} maxLength={64} showCount={false} onValueChange={setName} />
              <SliderField
                label={t("nuikit_overlay_size")}
                min={25}
                max={75}
                step={1}
                value={overlaySize}
                disabled={moveMode}
                onValueChange={(v) => {
                  setOverlaySize(v);
                  setUser({ overlaySizeMultiplier: v });
                }}
                onCommit={(v) => commitSize(radioSize, v)}
              />
            </>
          )}
        </div>
      </ScrollArea>
      <Button
        size="sm"
        onClick={() => {
          void post("saveData", { name, radioId: data.radioId }); // may never reply
          setTab(withOverlay ? "members" : "home");
        }}
      >
        {soft(t("save"))}
      </Button>
    </div>
  );
}
