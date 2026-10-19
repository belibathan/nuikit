import { ArrowRight, Delete, Lock, MicOff, Radio as RadioIcon, Settings, Star, Unplug } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
          <RadioIcon className="size-5" />
        </span>
        <div className="text-sm font-semibold tracking-wide">{soft(t("notconnected"))}</div>
        <div className="text-muted-foreground text-xs">{soft(t("channels"))} · {soft(t("radio"))}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="gap-1.5">
          <span className="bg-primary size-1.5 rounded-full" />
          {soft(t("header"))}
        </Badge>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleFav}
          disabled={isFav && !removable}
          aria-pressed={isFav}
          aria-label={t("favorites")}
          className="disabled:opacity-100"
        >
          {isFav && !removable ? <Lock className="text-muted-foreground" /> : <Star className={cn(isFav && "fill-current")} />}
        </Button>
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <div className="text-muted-foreground text-[11px] tracking-wider uppercase">{soft(t("frequency"))}</div>
        <div className="radio-lcd text-5xl leading-none font-bold">{String(ch)}</div>
        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
          <span>MHz</span>
          {label && (
            <>
              <span>·</span>
              <span className="text-foreground truncate font-medium">{label}</span>
            </>
          )}
        </div>
      </div>
      <Button variant="destructive" size="sm" onClick={() => void post("leave")}>
        <Unplug />
        {soft(t("disconnect"))}
      </Button>
    </div>
  );
}

function ChannelList({ channels }: { channels: number[] }) {
  const { data, t } = useCtx();
  if (channels.length === 0) return <p className="text-muted-foreground py-8 text-center text-xs">{t("nuikit_empty")}</p>;
  return (
    <ScrollArea className="h-full [&_[data-slot=scroll-area-viewport]>div]:!block">
      <div className="flex flex-col">
        {channels.map((ch, i) => {
          const { label } = channelLabel(ch, data.channelName);
          const current = data.onRadio && data.channel === ch;
          return (
            <button
              key={`${ch}:${i}`}
              type="button"
              onClick={() => void post("join", ch)}
              className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="min-w-0 flex-1">
                <span className="radio-lcd block text-base leading-tight font-semibold">{ch} MHz</span>
                {label && <span className="text-muted-foreground block truncate text-[11px]">{label}</span>}
              </span>
              {current ? <Badge variant="secondary">●</Badge> : <ArrowRight className="text-muted-foreground size-4" />}
            </button>
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
        <TabsTrigger value="favourite">{soft(t("favorites"))}</TabsTrigger>
        <TabsTrigger value="recomended">{soft(t("recommended"))}</TabsTrigger>
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
      <div className="bg-muted/60 flex h-11 items-center gap-2 rounded-md border px-3">
        <span className={cn("radio-lcd flex-1 truncate text-2xl font-bold", !text && "text-muted-foreground")}>{text || "000.00"}</span>
        <span className="text-muted-foreground text-xs">MHz</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-1.5">
        {keys.map((k) => (
          <Button
            key={k}
            variant="secondary"
            className="radio-lcd h-full min-h-0 py-0 text-base font-semibold"
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
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{soft(t("members"))}</span>
        <Badge variant="outline" className="radio-lcd">
          {data.channel} MHz · {entries.length}
        </Badge>
      </div>
      <div className="min-h-0 flex-1 rounded-md border">
        {entries.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-xs">{t("nuikit_empty")}</p>
        ) : (
          <ScrollArea className="h-full [&_[data-slot=scroll-area-viewport]>div]:!block">
            <div className="flex flex-col p-1">
              {entries.map(([id, m]) => {
                const isOff = isMuted(muted, id);
                return (
                  <div key={id} className="flex items-center gap-2 rounded px-2 py-1">
                    <span className={cn("size-2 shrink-0 rounded-full", m.isTalking ? "bg-primary" : "bg-muted-foreground/30")} />
                    <span className={cn("min-w-0 flex-1 truncate text-xs", m.isTalking && "font-semibold")}>{m.name}</span>
                    <Button
                      variant={isOff ? "secondary" : "ghost"}
                      size="icon-xs"
                      onClick={() => void toggleMute(id)}
                      aria-pressed={isOff}
                      className={cn(!isOff && "text-muted-foreground")}
                    >
                      <MicOff />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
      <div className="flex gap-1.5">
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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs font-normal">{label}</Label>
      {children}
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
        <div className="flex flex-col gap-3 pr-2">
          <div className="text-xs font-semibold">{t("radio_settings")}</div>
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-normal">{t("nuikit_size")}</Label>
            <Slider
              min={25}
              max={75}
              step={1}
              value={[radioSize]}
              disabled={moveMode}
              onValueChange={([v]) => {
                setRadioSize(v);
                setUser({ radioSizeMultiplier: v });
              }}
              onValueCommit={([v]) => commitSize(v, overlaySize)}
            />
          </div>
          <Row label={t("move_radio")}>
            <Switch checked={moveMode} onCheckedChange={setMoveMode} />
          </Row>
          <Row label={t("allow_move")}>
            <Switch
              checked={!!u.allowMovement}
              onCheckedChange={(v) => {
                setUser({ allowMovement: v });
                void post("allowMovement", v);
              }}
            />
          </Row>
          <Row label={t("enableClicks")}>
            <Switch
              checked={!!u.enableClicks}
              onCheckedChange={(v) => {
                setUser({ enableClicks: v });
                void post("enableClicks", v);
              }}
            />
          </Row>
          {withOverlay && (
            <>
              <Separator />
              <div className="text-xs font-semibold">{t("overlay_settings")}</div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="radio-name" className="text-xs font-normal">
                  {t("nuikit_name")}
                </Label>
                <Input id="radio-name" value={name} maxLength={64} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-normal">{t("nuikit_overlay_size")}</Label>
                <Slider
                  min={25}
                  max={75}
                  step={1}
                  value={[overlaySize]}
                  disabled={moveMode}
                  onValueChange={([v]) => {
                    setOverlaySize(v);
                    setUser({ overlaySizeMultiplier: v });
                  }}
                  onValueCommit={([v]) => commitSize(radioSize, v)}
                />
              </div>
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
