import {
  ArrowDownIcon,
  ArrowDownLeftIcon,
  ArrowDownRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpLeftIcon,
  ArrowUpRightIcon,
  BackpackIcon,
  CarIcon,
  CarFrontIcon,
  DropletIcon,
  EyeIcon,
  FlameIcon,
  FuelIcon,
  HeartPulseIcon,
  LandmarkIcon,
  LogOutIcon,
  MapIcon,
  MicIcon,
  PillIcon,
  PlayIcon,
  RadioIcon,
  ShieldIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UsersIcon,
  UtensilsIcon,
  WalletIcon,
  WarehouseIcon,
  WrenchIcon,
} from "lucide-react";
import { applyTheme, clearTheme } from "nuikit-core/react";
import { useEffect, useState, type ReactNode } from "react";
import { Command } from "@/components/code";
import { Scene } from "@/components/scene";
import { Footer, Nav, SITE, ThemePicker } from "@/components/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HudChip } from "@/components/ui/hud-chip";
import { MenuRow } from "@/components/ui/menu-row";
import { Meter } from "@/components/ui/meter";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Stat } from "@/components/ui/stat";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Notice, Notices, useNotices, type NoticePosition, type NoticeStatus } from "@/components/ui/notice";
import { cn } from "@/lib/utils";
import { themes } from "@/themes";

export function ComponentsPage() {
  // Start on the compiled default theme, so the nuikit tokens shadcn doesn't have (success,
  // warning, info, hud, scrim, vitals) have values before anyone touches the picker.
  useEffect(() => {
    const vars = applyTheme(themes[0]!.css, document.documentElement, "dark");
    return () => clearTheme(vars);
  }, []);
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight">Components</h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            What every nuikit screen is made of: stock shadcn/ui composed with the{" "}
            <a href="/design" className="text-foreground underline underline-offset-4">
              kit
            </a>
            . Each preview sits on a game scene at its in-game size at 1080p, and every state is a prop. Switch the theme: nothing here has a colour of
            its own.
          </p>
          <ThemePicker className="mt-6" />
        </header>

        <Section
          name="panel"
          title="Panel"
          text="The one floating surface: a header with title, description and actions (and an optional second row for tabs), a scrolling body, a footer."
        >
          <GaragePanel />
          <WardrobePanel />
          <Panel size="sm" selected>
            <PanelHeader title="Niko Bellic" description="LSPD, Sergeant" actions={<Badge variant="secondary">Selected</Badge>} />
            <PanelBody variant="form">
              <div className="grid grid-cols-2 gap-4">
                <Stat icon={<WalletIcon />} label="Cash" value="$1,520" size="sm" />
                <Stat icon={<LandmarkIcon />} label="Bank" value="$48,210" size="sm" />
              </div>
            </PanelBody>
          </Panel>
        </Section>

        <Section
          name="menu-row"
          title="Menu row"
          text="The 40px action row: icon, label, description, and one trailing thing: meta, a chevron, a key, a checkbox or a stepper. Active, disabled, destructive."
        >
          <RowsPanel />
        </Section>

        <Section
          name="stat"
          title="Stat"
          text="A label over a number that matters. Three sizes on the type scale, meta and a delta; on a panel, or straight on the game."
        >
          <Panel size="auto">
            <PanelHeader title="Account" description="Fleeca, Legion Square" />
            <PanelBody variant="form" className="w-[26rem]">
              <Stat label="Balance" value="$48,210" delta="-$250 today" trend="down" size="display" />
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                <Stat icon={<WalletIcon />} label="Cash" value="$1,520" delta="+$500" trend="up" />
                <Stat icon={<UsersIcon />} label="Players" value={42} meta="/ 128" />
                <Stat label="Server ID" value={7} size="sm" />
              </div>
            </PanelBody>
          </Panel>
          <div className="flex flex-col items-end gap-1 self-start">
            <Stat surface="game" align="end" icon={<WalletIcon />} label="Cash" value="$1,520" />
            <Stat surface="game" align="end" icon={<LandmarkIcon />} label="Bank" value="$48,210" size="sm" />
          </div>
        </Section>

        <Section
          name="meter"
          title="Meter"
          text="A slim bar on a theme track (panels) or a dark game track (the world). Thresholds turn it destructive; segments split it into plates."
        >
          <Panel>
            <PanelHeader icon={<BackpackIcon />} title="Backpack" description="18 of 30 slots" />
            <PanelBody variant="form">
              <Meter label="Weight" value={27.4} max={30} valueText="27.4 / 30 kg" high={90} />
              <Meter icon={<FuelIcon />} label="Fuel" value={12} valueText="12%" low={15} tone="foreground" />
              <Meter icon={<UsersIcon />} label="Players online" value={42} max={128} valueText="42 / 128" size="sm" />
              <Meter icon={<ShieldIcon />} label="Armor" value={62} valueText="62%" segments={4} tone="chart-2" />
            </PanelBody>
          </Panel>
          <div className="flex w-36 flex-col gap-2 self-end drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]">
            <Meter aria-label="Health" icon={<HeartPulseIcon />} value={14} low={20} tone="destructive" track="game" size="sm" />
            <Meter aria-label="Armor" icon={<ShieldIcon />} value={40} track="game" size="sm" />
            <Meter aria-label="Hunger" icon={<UtensilsIcon />} value={72} tone="chart-1" track="game" size="sm" />
            <Meter aria-label="Thirst" icon={<DropletIcon />} value={58} tone="chart-2" track="game" size="sm" />
            <Meter aria-label="Stress" icon={<FlameIcon />} value={84} high={80} tone="chart-4" track="game" size="sm" />
          </div>
        </Section>

        <Section
          name="hud-chip"
          title="HUD chip"
          text="Always-on marks on the game: a pill with an icon and short text, or a square tile. Active is primary (talking, selected); warning is destructive."
        >
          <div className="flex flex-col items-start gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <HudChip icon={<MicIcon />}>Normal</HudChip>
              <HudChip icon={<MicIcon />} active>
                Shouting
              </HudChip>
              <HudChip icon={<RadioIcon />}>101 MHz</HudChip>
              <HudChip icon={<TriangleAlertIcon />} state="warning">
                Seatbelt
              </HudChip>
              <HudChip icon={<CarFrontIcon />} state="warning">
                Engine 28%
              </HudChip>
            </div>
            <div className="flex gap-2">
              <HudChip shape="tile" icon={<PillIcon />}>
                3
              </HudChip>
              <HudChip shape="tile" icon={<UtensilsIcon />} active>
                2
              </HudChip>
              <HudChip shape="tile" icon={<WrenchIcon />}>
                1
              </HudChip>
              <HudChip shape="tile" icon={<FuelIcon />} state="warning">
                0
              </HudChip>
              <HudChip shape="tile" />
            </div>
          </div>
        </Section>

        <Section
          name="notice"
          title="Notice"
          text="A notification on the game: status icon, title, description, and a line that empties as its time runs out (it pauses while hovered). A stack pins them to any corner or edge; the newest sits nearest the edge."
        >
          <NoticeStates />
        </Section>

        <Section
          name="notice"
          title="Notice stack"
          text="useNotices() is the queue: notify() shows one, the same id updates it in place, and each goes when its time is up. Pick a status, then a position."
          install={false}
          stageClassName="min-h-[40rem] items-center"
        >
          <NoticeDemo />
        </Section>
      </main>
      <Footer />
    </div>
  );
}

function Section({
  name,
  title,
  text,
  install = true,
  stageClassName,
  children,
}: {
  name: string;
  title: string;
  text: string;
  /** false for a second section of the same item (one id, one install command). */
  install?: boolean;
  stageClassName?: string;
  children: ReactNode;
}) {
  return (
    <section id={install ? name : undefined} className="mt-20 scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 text-muted-foreground text-pretty">{text}</p>
        </div>
        {install && <Command className="h-10 w-full max-w-md text-xs">{`npx shadcn add ${SITE}/r/${name}.json`}</Command>}
      </div>
      <div className="relative isolate mt-6 overflow-hidden rounded-xl border bg-black">
        <Scene />
        <div className={cn("relative flex min-h-80 flex-wrap items-start justify-center gap-8 p-10", stageClassName)}>{children}</div>
      </div>
    </section>
  );
}

const CARS = [
  { name: "Pegassi Zentorno", note: "Stored, 98% condition", plate: "ZEN 01" },
  { name: "Bravado Buffalo", note: "Out, last seen in Vinewood", plate: "BUF 22" },
  { name: "Karin Sultan", note: "Impounded, $250 to release", plate: "SUL 07" },
  { name: "Declasse Vigero", note: "Stored, 64% condition", plate: "VIG 13" },
  { name: "Obey Tailgater", note: "Stored, 100% condition", plate: "TAI 88" },
  { name: "Dinka Blista", note: "Stored, 71% condition", plate: "BLI 04" },
];

function GaragePanel() {
  const [active, setActive] = useState(0);
  return (
    <Panel>
      <PanelHeader icon={<WarehouseIcon />} title="Garage" description="Legion Square" actions={<Badge variant="secondary">6 cars</Badge>} />
      <PanelBody scroll className="max-h-64">
        {CARS.map((c, i) => (
          <MenuRow
            key={c.plate}
            icon={<CarIcon />}
            description={c.note}
            meta={c.plate}
            active={i === active}
            onMouseEnter={() => setActive(i)}
          >
            {c.name}
          </MenuRow>
        ))}
      </PanelBody>
      <PanelFooter>
        <Button variant="outline" size="sm">
          Close
        </Button>
        <Button size="sm" className="ml-auto">
          Take out
        </Button>
      </PanelFooter>
    </Panel>
  );
}

function WardrobePanel() {
  const [nose, setNose] = useState([40]);
  return (
    <Tabs defaultValue="face" className="gap-0">
      <Panel>
        <PanelHeader
          title="Character"
          actions={
            <span className="nk-label flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden />
              Unsaved changes
            </span>
          }
          tabs={
            <TabsList className="w-full">
              <TabsTrigger value="face">Face</TabsTrigger>
              <TabsTrigger value="hair">Hair</TabsTrigger>
              <TabsTrigger value="clothes">Clothes</TabsTrigger>
            </TabsList>
          }
        />
        <PanelBody variant="form">
          <div className="nk-field">
            <div className="nk-field-label">
              <span className="truncate">Nose width</span>
              <span className="nk-num ml-auto text-muted-foreground">{(nose[0]! / 100).toFixed(2)}</span>
            </div>
            <Slider value={nose} onValueChange={setNose} max={100} step={1} />
          </div>
          <div className="nk-field">
            <div className="nk-field-label">
              <span className="truncate">Jaw</span>
              <span className="truncate text-muted-foreground">Bone width</span>
              <span className="nk-num ml-auto text-muted-foreground">0.15</span>
            </div>
            <Slider defaultValue={[15]} max={100} step={1} />
          </div>
        </PanelBody>
        <PanelFooter>
          <Button variant="ghost" size="sm">
            Discard
          </Button>
          <Button size="sm" className="ml-auto">
            Save
          </Button>
        </PanelFooter>
      </Panel>
    </Tabs>
  );
}

const RANGES = ["Whisper", "Normal", "Shouting"];

function RowsPanel() {
  const [hud, setHud] = useState(true);
  const [map, setMap] = useState(false);
  const [range, setRange] = useState(1);
  return (
    <>
      <Panel>
        <PanelHeader title="Rows" description="Hover, or Tab through them" />
        <PanelBody>
          <MenuRow icon={<PlayIcon />} kbd="Esc">
            Resume
          </MenuRow>
          <MenuRow icon={<MapIcon />} kbd="P" active>
            Map
          </MenuRow>
          <MenuRow icon={<CarIcon />} description="Stored, 98% condition" meta="$250" chevron>
            Bravado Buffalo
          </MenuRow>
          <MenuRow icon={<SparklesIcon />} description="Unlocks at reputation 3" disabled>
            Custom wrap
          </MenuRow>
          <Separator className="my-1" />
          <MenuRow icon={<LogOutIcon />} tone="destructive">
            Disconnect
          </MenuRow>
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title="Settings" description="Enter toggles, ← → change" />
        <PanelBody>
          <MenuRow icon={<EyeIcon />} checked={hud} onCheckedChange={setHud}>
            Show HUD
          </MenuRow>
          <MenuRow icon={<MapIcon />} checked={map} onCheckedChange={setMap}>
            Minimap on foot
          </MenuRow>
          <MenuRow
            icon={<MicIcon />}
            value={RANGES[range]}
            onStep={(d) => setRange((r) => (r + d + RANGES.length) % RANGES.length)}
            active
          >
            Voice range
          </MenuRow>
          <MenuRow icon={<RadioIcon />} value="101" onStep={() => {}} disabled>
            Radio channel
          </MenuRow>
        </PanelBody>
      </Panel>
    </>
  );
}

/** Every state, frozen part-way through its time (`elapsed` + `paused`) so the line shows. */
function NoticeStates() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Notice status="success" title="Paid" description="$500 from Lester" elapsed={900} paused />
        <Notice status="info" title="Vehicle stored" description="Your Karin Sultan is in the Legion Square garage." elapsed={2200} paused />
        <Notice status="warning" title="Low fuel" description={"8% left. The nearest station is 400 m away."} elapsed={3400} paused />
        <Notice status="error" title="Couldn't lock it" description="You don't have the keys to this vehicle." elapsed={4500} paused />
      </div>
      <div className="flex flex-col gap-2">
        <Notice status="success" title="Seatbelt on" duration={3000} elapsed={600} paused />
        <Notice status="error" description="You can't do that while handcuffed." elapsed={1800} paused />
        <Notice icon={<LandmarkIcon />} title="Fleeca" description="Transfer received: $1,200 from Lamar Davis" elapsed={3000} paused />
        <Notice status="warning" title="Server restart in 10 minutes" description="Finish what you're doing and park somewhere safe." duration={0} onDismiss={() => {}} />
        <Notice icon={null} title="Welcome to Los Santos" description="Your apartment key is in your pockets." showDuration={false} />
      </div>
    </>
  );
}

const SAMPLES: Record<NoticeStatus, { title: string; description: string }[]> = {
  info: [
    { title: "Vehicle stored", description: "Your Bravado Buffalo is in the Pillbox garage." },
    { title: "New message", description: "Lester: I have a job for you." },
  ],
  success: [
    { title: "Paid", description: "$500 from Lester" },
    { title: "Repaired", description: "Engine back to 100%." },
  ],
  warning: [
    { title: "Hungry", description: "Eat something soon." },
    { title: "Wanted", description: "Two stars. Lose the police." },
  ],
  error: [
    { title: "Couldn't lock it", description: "You don't have the keys." },
    { title: "Not enough cash", description: "You need $250 more." },
  ],
};

const STATUSES: { value: NoticeStatus; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
];

const GRID: { position: NoticePosition | null; icon?: ReactNode; label?: string }[] = [
  { position: "top-left", icon: <ArrowUpLeftIcon />, label: "Top left" },
  { position: "top-center", icon: <ArrowUpIcon />, label: "Top" },
  { position: "top-right", icon: <ArrowUpRightIcon />, label: "Top right" },
  { position: "center-left", icon: <ArrowLeftIcon />, label: "Left" },
  { position: null },
  { position: "center-right", icon: <ArrowRightIcon />, label: "Right" },
  { position: "bottom-left", icon: <ArrowDownLeftIcon />, label: "Bottom left" },
  { position: "bottom-center", icon: <ArrowDownIcon />, label: "Bottom" },
  { position: "bottom-right", icon: <ArrowDownRightIcon />, label: "Bottom right" },
];

function NoticeDemo() {
  const { notices, notify, dismiss, clear } = useNotices();
  const [status, setStatus] = useState<NoticeStatus>("success");
  const [count, setCount] = useState(0);
  const [fuel, setFuel] = useState(12);
  const fire = (position: NoticePosition) => {
    const list = SAMPLES[status];
    notify({ ...list[count % list.length]!, status, position });
    setCount((c) => c + 1);
  };
  const updateFuel = () => {
    const next = fuel > 1 ? fuel - 3 : 12;
    setFuel(next);
    notify({ id: "fuel", status: next <= 3 ? "error" : "warning", title: "Low fuel", description: `${next}% left.`, position: "top-right" });
  };
  return (
    <>
      <Panel size="sm" className="relative z-10">
        <PanelHeader title="Notify" description="Pick a status, then a position" />
        <PanelBody variant="form">
          <Tabs value={status} onValueChange={(v) => setStatus(v as NoticeStatus)}>
            <TabsList className="w-full">
              {STATUSES.map((s) => (
                <TabsTrigger key={s.value} value={s.value}>
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Position">
            {GRID.map((cell, i) =>
              cell.position ? (
                <Button key={cell.position} variant="outline" size="sm" aria-label={cell.label} title={cell.label} onClick={() => fire(cell.position!)}>
                  {cell.icon}
                </Button>
              ) : (
                <span key={i} aria-hidden />
              ),
            )}
          </div>
        </PanelBody>
        <PanelFooter>
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
          <Button size="sm" className="ml-auto" onClick={updateFuel}>
            Update fuel
          </Button>
        </PanelFooter>
      </Panel>
      <Notices notices={notices} onDismiss={dismiss} closable />
    </>
  );
}

