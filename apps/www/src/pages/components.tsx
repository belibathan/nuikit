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
  LockIcon,
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
import { closeSurface, openSurface, Surface } from "nuikit-core/react";
import { useState, type ReactNode } from "react";
import { Command } from "@/components/code";
import { Scene } from "@/components/scene";
import { Footer, Nav, SITE, ThemePicker } from "@/components/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HudChip } from "@/components/ui/hud-chip";
import { MenuRow, MenuRowDetails, menuMetadata } from "@/components/ui/menu-row";
import { Meter } from "@/components/ui/meter";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Stat } from "@/components/ui/stat";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Notice, Notices, useNotices, type NoticePosition, type NoticeStatus } from "@/components/ui/notice";
import {
  CheckboxField,
  ColorField,
  DateField,
  NumberField,
  SelectField,
  SliderField,
  TextField,
  validateField,
  type FieldRule,
} from "@/components/ui/form-field";
import { Confirm, ConfirmPanel, type ConfirmTone } from "@/components/ui/confirm";
import { KeyPrompt, KeyPromptStack } from "@/components/ui/key-prompt";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/utils";

export function ComponentsPage() {
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
          name="menu-row"
          title="Menu row: items"
          text="What the menu intent's items carry: an image, a progress line, read-only rows, the details card beside the hovered row, quiet stepper values, and inert rows that ignore hover (CEF keeps :hover after Lua takes focus)."
          install={false}
          stageClassName="min-h-[28rem]"
        >
          <ContextMenuDemo />
          <InertListDemo />
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

        <Section
          name="form-field"
          title="Form field"
          text="One row of a game form, and a preset for each kind of value: text, number, select, checkbox or switch, slider, date, colour. Label, hint, description, error, required, min and max, an inline value and a reset. validateField() decides what's wrong; the form decides when to say it."
        >
          <TransferForm />
          <CharacterForm />
          <FieldStates />
        </Section>

        <Section
          name="confirm"
          title="Confirm"
          text="Are you sure? A title, a sentence on what happens, cancel and one action: the surface's primary, or destructive when something is lost. Enter presses the focused action; Escape cancels through the surface, like every other nuikit UI."
          stageClassName="items-center"
        >
          <ConfirmStates />
          <ConfirmDemo />
        </Section>

        <Section
          name="key-prompt"
          title="Key prompt"
          text="The key and what it does, near what the player can use. One or several, a combination, hold-to-confirm with a line that fills, the active one, a locked one with a reason. On a panel or on the HUD. In game the key is read in Lua; the hold arrives as progress."
          // The stage is smaller than a screen: anchor 2.5rem in (not the in-game 1.5rem) so the
          // edge rows have room inside its rounded border.
          stageClassName="min-h-[34rem] items-center [--nk-edge:2.5rem]"
        >
          <KeyPromptStates />
          <KeyPromptDemo />
        </Section>

        <Section
          name="progress-ring"
          title="Progress ring"
          text="A circle that fills: a level, or a timed run that says when it's done from a timer, so it still finishes with motion off. On the game or on a panel, three sizes, status tones, any centre, a cancel hint. The bar is the meter."
          stageClassName="min-h-[30rem] items-center [--nk-edge:2.5rem]"
        >
          <ProgressRingStates />
          <ProgressRingDemo />
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

const ACCOUNTS = [
  { value: "lamar", label: "Lamar Davis, 4410" },
  { value: "franklin", label: "Franklin Clinton, 2207" },
  { value: "lester", label: "Lester Crest, 0913" },
];

const TRANSFER: Record<string, FieldRule> = {
  to: { kind: "select", required: true },
  amount: { kind: "number", required: true, min: 1, max: 5000 },
  reference: { kind: "text", maxLength: 60 },
  confirm: { kind: "checkbox", required: true },
};

/** A real form: errors appear when you press Send, and clear as you fix them. */
function TransferForm() {
  const [values, setValues] = useState<Record<string, unknown>>({ to: null, amount: null, reference: "", confirm: false });
  const [tried, setTried] = useState(false);
  const errors = Object.fromEntries(Object.entries(TRANSFER).map(([k, rule]) => [k, tried ? validateField(rule, values[k])?.message : undefined]));
  const set = (k: string) => (v: unknown) => setValues((all) => ({ ...all, [k]: v }));
  return (
    <Panel>
      <PanelHeader icon={<LandmarkIcon />} title="Transfer" description="Fleeca, balance $4,210" />
      <PanelBody variant="form">
        <SelectField
          label="To"
          required
          options={ACCOUNTS}
          placeholder="Pick an account"
          value={values.to as string | null}
          onValueChange={set("to")}
          error={errors.to}
        />
        <NumberField
          label="Amount"
          hint="Up to $5,000 a day"
          required
          min={1}
          max={5000}
          step={50}
          placeholder="500"
          value={values.amount as number | null}
          onValueChange={set("amount")}
          error={errors.amount}
        />
        <TextField
          label="Reference"
          hint="Optional"
          multiline
          rows={2}
          maxLength={60}
          placeholder="What it's for"
          value={values.reference as string}
          onValueChange={set("reference")}
          error={errors.reference}
        />
        <CheckboxField
          label="I've checked the account"
          required
          checked={values.confirm as boolean}
          onCheckedChange={set("confirm")}
          error={errors.confirm}
        />
      </PanelBody>
      <PanelFooter>
        <Button variant="ghost" size="sm" onClick={() => (setTried(false), setValues({ to: null, amount: null, reference: "", confirm: false }))}>
          Cancel
        </Button>
        <Button size="sm" className="ml-auto" onClick={() => setTried(true)}>
          Send
        </Button>
      </PanelFooter>
    </Panel>
  );
}

// GTA paint colours: a game palette the theme can't know.
const PAINT = ["#0d1116", "#c2c4c6", "#9c1016", "#ff5c00", "#ffcf20", "#3a8f3a", "#2354a1", "#6b1f7b"];

function CharacterForm() {
  const [nose, setNose] = useState(0.15);
  return (
    <Panel>
      <PanelHeader title="New character" description="Step 1 of 3" />
      <PanelBody variant="form">
        <TextField label="First name" required defaultValue="Niko" />
        <DateField label="Date of birth" hint="Day, month, year" required min="1920-01-01" max="2008-12-31" defaultValue="1990-02-01" />
        <SelectField
          label="Nationality"
          options={[
            { value: "us", label: "American" },
            { value: "rs", label: "Serbian" },
            { value: "mx", label: "Mexican" },
          ]}
          defaultValue="rs"
        />
        <SliderField label="Nose width" hint="Bone width" min={-1} max={1} step={0.01} value={nose} onValueChange={setNose} resetTo={0} />
        <ColorField label="Hair colour" swatches={PAINT} defaultValue="#0d1116" />
      </PanelBody>
      <PanelFooter>
        <Button variant="ghost" size="sm">
          Back
        </Button>
        <Button size="sm" className="ml-auto">
          Next
        </Button>
      </PanelFooter>
    </Panel>
  );
}

/** Errors, disabled, password, switch, multi-select: states straight from props. */
function FieldStates() {
  return (
    <Panel>
      <PanelHeader title="States" description="Every one from props" />
      <PanelBody variant="form">
        <TextField label="Plate" hint="2 to 8 characters" required maxLength={8} defaultValue="Z" error="At least 2 characters" />
        <TextField label="PIN" password defaultValue="4410" description="Four digits, never shared." />
        <NumberField label="Seats" min={1} max={4} defaultValue={0} error="At least 1" />
        <DateField label="Licence issued" max="2026-10-19" defaultValue="2027-01-01" error="On or before 19/10/2026" />
        <SelectField
          label="Licences"
          multiple
          maxSelected={3}
          clearable
          placeholder="None"
          options={[
            { value: "car", label: "Car" },
            { value: "bike", label: "Bike" },
            { value: "truck", label: "Truck" },
            { value: "pilot", label: "Pilot", disabled: true },
          ]}
          defaultValue={["car", "bike"]}
        />
        <CheckboxField variant="switch" label="Show HUD" description="Health, armor and the minimap." defaultChecked />
        <TextField label="Citizen ID" disabled defaultValue="NKT-48210" />
      </PanelBody>
    </Panel>
  );
}

/** Every state from props: primary, destructive with an icon, running, acknowledge only. */
function ConfirmStates() {
  return (
    <div className="grid grid-cols-2 items-start gap-6">
      <ConfirmPanel
        size="sm"
        title="Release your Sultan?"
        description="The impound fee is $250, taken from your bank."
        confirmLabel="Pay $250"
      />
      <ConfirmPanel
        size="sm"
        tone="destructive"
        icon={<TriangleAlertIcon />}
        title="Sell your Zentorno?"
        description="You get $412,000. This can't be undone."
        confirmLabel="Sell"
      />
      <ConfirmPanel
        size="sm"
        tone="destructive"
        title="Leave the server?"
        description="Your car stays where you parked it."
        confirmLabel="Leave"
        loading
      />
      <ConfirmPanel size="sm" title="Server rules updated" description="No random deathmatch in the city. Read the rest in /rules." confirmLabel="Got it" showCancel={false} />
    </div>
  );
}

type Ask = { tone: ConfirmTone; title: string; description: string; confirmLabel: string; icon?: ReactNode; showCancel?: boolean };

const ASKS: Record<string, Ask> = {
  sell: {
    tone: "destructive",
    icon: <TriangleAlertIcon />,
    title: "Sell your Zentorno?",
    description: "You get $412,000. This can't be undone.",
    confirmLabel: "Sell",
  },
  release: { tone: "primary", title: "Release your Sultan?", description: "The impound fee is $250, taken from your bank.", confirmLabel: "Pay $250" },
  rules: { tone: "primary", title: "Server rules updated", description: "No random deathmatch in the city. Read the rest in /rules.", confirmLabel: "Got it", showCancel: false },
};

/**
 * The real thing: each button opens a modal Surface with escape: "back", so Escape reaches
 * onCancel through nuikit's Escape path (the browser manager here, Lua in game).
 */
function ConfirmDemo() {
  const [ask, setAsk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState("Nothing yet");
  const open = (key: string) => {
    setAsk(key);
    void openSurface("components-confirm");
  };
  const done = (answer: string) => {
    setLast(answer);
    setLoading(false);
    void closeSurface("components-confirm");
  };
  const a = ask ? ASKS[ask] : undefined;
  return (
    <>
      <Panel size="sm">
        <PanelHeader title="Try it" description="Enter confirms, Escape cancels" />
        <PanelBody>
          <MenuRow icon={<CarIcon />} tone="destructive" onClick={() => open("sell")}>
            Sell vehicle
          </MenuRow>
          <MenuRow icon={<WarehouseIcon />} onClick={() => open("release")}>
            Release from impound
          </MenuRow>
          <MenuRow icon={<SparklesIcon />} onClick={() => open("rules")}>
            Show the rules
          </MenuRow>
        </PanelBody>
        <PanelFooter>
          <span className="nk-label">Last answer</span>
          <span data-slot="confirm-demo-answer" className="ml-auto text-sm">
            {last}
          </span>
        </PanelFooter>
      </Panel>
      <Surface name="components-confirm" layer="modal" escape="back" onBack={() => !loading && done("Cancelled with Escape")}>
        {a && (
          <Confirm
            key={ask}
            tone={a.tone}
            icon={a.icon}
            title={a.title}
            description={a.description}
            confirmLabel={a.confirmLabel}
            showCancel={a.showCancel}
            loading={loading}
            onCancel={() => done("Cancelled")}
            onConfirm={() => {
              if (ask !== "sell") return done(`${a.confirmLabel}: confirmed`);
              setLoading(true);
              setTimeout(() => done("Sold for $412,000"), 900);
            }}
          />
        )}
      </Surface>
    </>
  );
}

/** Every state from props, where they'd sit in game: a stack on the right, HUD prompts at the bottom. */
function KeyPromptStates() {
  return (
    <>
      <KeyPromptStack position="center-right">
        <KeyPrompt keys="E" label="Open garage" active />
        <KeyPrompt keys="G" label="Rob register" hold={1500} progress={0.6} />
        <KeyPrompt keys={["Shift", "E"]} icon={<CarIcon />} label="Lock vehicle" />
        <KeyPrompt keys="H" label="Hotwire" description="Needs a lockpick" disabled />
      </KeyPromptStack>
      <KeyPromptStack position="bottom-center" className="flex-row">
        <KeyPrompt surface="hud" size="sm" keys="F" label="Enter vehicle" />
        <KeyPrompt surface="hud" size="sm" keys="Y" label="Talk" active />
        <KeyPrompt surface="hud" size="sm" keys="X" label="Hands up" hold={800} progress={0.3} />
      </KeyPromptStack>
    </>
  );
}

/** Press and hold with the pointer, or hold G while the page has focus. */
function KeyPromptDemo() {
  const [robbed, setRobbed] = useState(0);
  const [talked, setTalked] = useState(0);
  return (
    <>
      <KeyPromptStack position="center-left">
        <KeyPrompt keys="G" label="Rob register" description="Hold, or hold G" hold={1500} listen onConfirm={() => setRobbed((n) => n + 1)} />
        <KeyPrompt keys="T" label="Talk to the clerk" listen onConfirm={() => setTalked((n) => n + 1)} />
      </KeyPromptStack>
      <Panel size="sm">
        <PanelHeader title="Try it" description="Hold the prompt on the left" />
        <PanelBody variant="form">
          <Stat label="Registers robbed" value={robbed} size="sm" />
          <Stat label="Times you talked" value={talked} size="sm" />
        </PanelBody>
      </Panel>
    </>
  );
}

/** Levels from props: sizes, tones, centres, on the game and on a panel. */
function ProgressRingStates() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-end gap-8">
        <ProgressRing size="sm" value={25} label="Small" />
        <ProgressRing value={62} label="Downloading" />
        <ProgressRing size="lg" value={100} tone="success" label="Done" />
        <ProgressRing value={18} tone="destructive" label="Signal" center={<RadioIcon className="size-5" />} />
        <ProgressRing value={45} tone="warning" label="Lockpicking" cancelKey="X" />
      </div>
      <Panel size="auto">
        <PanelHeader title="Upgrades" description="On a panel: the theme track" />
        <PanelBody variant="form" className="flex-row gap-6">
          <ProgressRing track="theme" size="sm" value={80} label="Engine" />
          <ProgressRing track="theme" size="sm" value={40} label="Brakes" />
          <ProgressRing
            track="theme"
            size="sm"
            value={0}
            label="Turbo"
            aria-label="Turbo, not installed"
            center={<LockIcon className="size-3.5 text-muted-foreground" />}
          />
        </PanelBody>
      </Panel>
    </div>
  );
}

/** A timed run: onComplete from a timer, cancel by click (in game Lua reads X). */
function ProgressRingDemo() {
  const [run, setRun] = useState(0);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState("Nothing yet");
  return (
    <>
      <Panel size="sm">
        <PanelHeader title="Try it" description="A 4 second run" />
        <PanelBody>
          <MenuRow
            icon={<WrenchIcon />}
            onClick={() => {
              setRun((r) => r + 1);
              setRunning(true);
            }}
          >
            Repair engine
          </MenuRow>
        </PanelBody>
        <PanelFooter>
          <span className="nk-label">Last result</span>
          <span data-slot="ring-demo-result" className="ml-auto text-sm">
            {last}
          </span>
        </PanelFooter>
      </Panel>
      {running && (
        <ProgressRing
          key={run}
          className="nk-anchor-b nk-enter"
          duration={4000}
          label="Repairing engine"
          cancelKey="X"
          onCancel={() => {
            setRunning(false);
            setLast("Cancelled");
          }}
          onComplete={() => {
            setRunning(false);
            setLast("Repaired");
          }}
        />
      )}
    </>
  );
}

// ox_lib metadata, in two of its shapes (menuMetadata reads all three).
const VEHICLES = [
  {
    name: "Pegassi Zentorno",
    image: "/bg/garage.jpg",
    fuel: 92,
    metadata: [
      { label: "Plate", value: "ZEN 01" },
      { label: "Engine", value: "98%", progress: 98 },
      { label: "Body", value: "71%", progress: 71 },
    ],
  },
  { name: "Karin Sultan", image: "/bg/street.jpg", fuel: 23, metadata: { Plate: "SUL 07", Garage: "Impound", Fee: "$250" } },
];

/** A context menu: image rows with a fuel line, a read-only row, the details card beside the hovered row. */
function ContextMenuDemo() {
  const [hovered, setHovered] = useState<number | null>(0);
  const v = hovered === null ? undefined : VEHICLES[hovered];
  return (
    <div className="flex items-start gap-3">
      <Panel>
        <PanelHeader icon={<WarehouseIcon />} title="Garage" description="Hover a car" />
        <PanelBody>
          {VEHICLES.map((c, i) => (
            <MenuRow
              key={c.name}
              image={c.image}
              description="Fuel"
              progress={c.fuel}
              meta={`${c.fuel}%`}
              chevron
              active={hovered === i}
              onMouseEnter={() => setHovered(i)}
            >
              {c.name}
            </MenuRow>
          ))}
          <Separator className="my-1" />
          <MenuRow readOnly icon={<UsersIcon />} description="Set by your job" meta="2 of 4">
            Garage slots
          </MenuRow>
        </PanelBody>
      </Panel>
      {v && <MenuRowDetails key={v.name} image={v.image} title={v.name} items={menuMetadata(v.metadata)} />}
    </div>
  );
}

const SETTINGS = [
  { label: "Voice range", values: ["Whisper", "Normal", "Shouting"] },
  { label: "Radio volume", values: ["20%", "40%", "60%", "80%"] },
  { label: "Minimap", values: ["Off", "In vehicles", "Always"] },
];

/**
 * A keyboard-driven list (ox_lib's list menu): arrows move the highlight, values are quiet until
 * their row is highlighted. Inert on: the pointer's hover changes nothing.
 */
function InertListDemo() {
  const [index, setIndex] = useState(0);
  const [inert, setInert] = useState(true);
  const [picked, setPicked] = useState([1, 2, 1]);
  return (
    <Panel
      size="sm"
      tabIndex={0}
      className="outline-none"
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setIndex((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + SETTINGS.length) % SETTINGS.length);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const d = e.key === "ArrowRight" ? 1 : -1;
          setPicked((all) => all.map((p, j) => (j === index ? (p + d + SETTINGS[j]!.values.length) % SETTINGS[j]!.values.length : p)));
        }
      }}
    >
      <PanelHeader title="Settings" description="Click here, then use the arrows" />
      <PanelBody>
        {SETTINGS.map((s, i) => (
          <MenuRow
            key={s.label}
            inert={inert}
            active={index === i}
            value={s.values[picked[i]!]}
            valueTone="muted"
            onStep={(d) => setPicked((all) => all.map((p, j) => (j === i ? (p + d + s.values.length) % s.values.length : p)))}
            tabIndex={-1}
          >
            {s.label}
          </MenuRow>
        ))}
        <Separator className="my-1" />
        {/* A library-supplied icon colour (ox iconColor) set inline: it survives hover and highlight. */}
        <MenuRow icon={<EyeIcon style={{ color: "#4dabf7" }} />} checked={inert} onCheckedChange={setInert} tabIndex={-1}>
          Inert (ignore hover)
        </MenuRow>
      </PanelBody>
    </Panel>
  );
}

