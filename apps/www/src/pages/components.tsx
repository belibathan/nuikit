import {
  AnchorIcon,
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
} from "@/components/ui/icons";
import { closeSurface, openSurface, Surface } from "nuikit-core/react";
import { cloneElement, createContext, useContext, useLayoutEffect, useState, type ReactElement, type ReactNode } from "react";
import { Footer, Nav } from "@/components/site";
import { Entry, StageBar, useStageRef } from "@/components/preview";
import { ITEMS, NewSections, ORDER } from "@/components/registry-docs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MenuRow, MenuRowList, } from "@/components/ui/menu-row";
import { Meter, } from "@/components/ui/meter";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Stat } from "@/components/ui/stat";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Notice } from "@/components/ui/notice";
import {
  CheckboxField,
  ColorField,
  DateField,
  DateRangeField,
  TimeField,
  dateToEpoch,
  timeToEpoch,
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
import { Speedometer } from "@/components/ui/speedometer";
import { Countdown } from "@/components/ui/countdown";
import { VitalChip } from "@/components/ui/vital-chip";
import { Money } from "@/components/ui/money";
import { ItemSlot } from "@/components/ui/item-slot";
import { PlayerCard } from "@/components/ui/player-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SKILL_CHECK_PRESETS, SkillCheck, skillCheckZone } from "@/components/ui/skill-check";
import { RadialMenu, type RadialMenuItem } from "@/components/ui/radial-menu";
import registry from "../../../../registry.json";

/** The registry item this page is about (/components/<name>), or null for the whole catalogue. */
const Focus = createContext<string | null>(null);

export function ComponentsPage() {
  const preview = useStageRef();
  const focus = location.pathname.match(/^\/components\/([a-z-]+)\/?$/)?.[1] ?? null;
  const item = focus ? ITEMS.find((i) => i.name === focus) : undefined;
  useLayoutEffect(() => {
    document.title = item ? `${item.title}: nuikit components` : "Components: nuikit";
  }, [item]);
  return (
    <div className="min-h-screen overflow-x-clip">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <header className="max-w-3xl pt-10 pb-6 sm:pt-14">
          {item ? (
            <>
              <a href="/components" className="site-eyebrow hover:text-foreground">
                Components /
              </a>
              <h1 className="site-display mt-3 text-[clamp(2.5rem,7vw,4.5rem)]">{item.title}</h1>
            </>
          ) : (
            <>
              <h1 className="site-display text-[clamp(2.5rem,7vw,4.5rem)]">Components</h1>
              <p className="mt-4 text-lg text-pretty text-muted-foreground">Stock shadcn/ui composed with the kit. Each one: the live preview, the install line, the source.</p>
            </>
          )}
        </header>
        <StageBar target={preview} />
        <Focus.Provider value={focus}>
          <div ref={preview} className="flex flex-col">
            <NewSections Section={Section} />
          <NewSections Section={Section} />



        <Section
          name="vital-chip"
          title="Vital chip"
          text="What a chip shows, per server or per player: pill (icon, name, value), value (icon and value), icon (the level as fill), expand (the icon opens to the pill on a change and settles after --nk-behavior-rest). A chip that opens (voice while talking) pushes its neighbours, collapses them to icons, or floats over them."
          stageClassName="flex-col items-center"
        >
          <ChipModesDemo />
        </Section>


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
          name="notice"
          title="Notice"
          text="A notification on the game: status icon, title, description, and a line that empties as its time runs out (it pauses while hovered). A stack pins them to any corner or edge; the newest sits nearest the edge."
        >
          <NoticeStates />
        </Section>

        <Section
          name="form-field"
          title="Form field"
          text="One row of a game form, and a preset for each kind of value: text, number, select, checkbox or switch, slider, date, colour. Label, hint, description, error, required, min and max, an inline value and a reset. validateField() decides what's wrong; the form decides when to say it."
        >
          <TransferForm />
          <CharacterForm />
          <FieldStates />
          <ScheduleForm />
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
          stageClassName="min-h-[34rem] items-center [--nk-screen-edge:2.5rem]"
        >
          <KeyPromptStates />
          <KeyPromptDemo />
        </Section>

        <Section
          name="progress-ring"
          title="Progress ring"
          text="A circle that fills: a level, or a timed run that says when it's done from a timer, so it still finishes with motion off. On the game or on a panel, three sizes, status tones, any centre, a cancel hint. The bar is the meter."
          stageClassName="min-h-[30rem] items-center [--nk-screen-edge:2.5rem]"
        >
          <ProgressRingStates />
          <ProgressRingDemo />
        </Section>

        <Section
          name="speedometer"
          title="Speedometer"
          text="The vehicle gauge, on the HUD tokens: white text with a shadow and a dark track, so it reads over any sky with any theme. RPM in primary, destructive past the redline; the gear on the HUD surface; a fuel line that turns destructive when low. On a panel, the theme's colours."
          stageClassName="items-center"
        >
          <Speedometer speed={87} rpm={0.62} gear={3} fuel={64} />
          <Speedometer speed={132} rpm={0.94} gear={5} fuel={41} />
          <Speedometer speed={18} rpm={0.31} gear="R" fuel={9} unit="km/h" />
          <Panel size="auto">
            <PanelHeader title="Dyno" description="On a panel: the theme surface" />
            <PanelBody variant="form">
              <Speedometer surface="theme" speed={64} rpm={0.48} gear={2} fuel={88} size={160} />
            </PanelBody>
          </Panel>
        </Section>

        <Section
          name="countdown"
          title="Countdown"
          text="A timer that matters: until you can respawn, until the alarm, until the restart. Tabular mm:ss (h:mm:ss past an hour), a label, a line that drains (in a theme tone from the start with lineTone), a warning threshold, a dimmed done state. From Lua's seconds, or running on its own with onComplete from a timer."
          stageClassName="min-h-[36rem] items-center"
        >
          <Countdown size="hero" seconds={154} total={300} label="Until you can respawn" />
          <CountdownStates />
          <CountdownDemo />
        </Section>

        <Section
          name="money"
          title="Money"
          text="Every amount formatted one way: tabular figures, the server's currency and locale, whole units by default, a sign and a direction colour for changes, and a compact form for tight spots. Inline, so it goes in a stat, a row, a chip."
          stageClassName="items-center"
        >
          <MoneyStates />
        </Section>

        <Section
          name="item-slot"
          title="Item slot"
          text="One square of an inventory, a shop or a hotbar: image, name, count, hotkey, a durability line, price and stock, and the states drag and drop needs: empty, active, drop target, dragging, locked. Wells on a panel, the HUD surface on the game."
          stageClassName="min-h-[34rem] items-center"
        >
          <ItemSlotStates />
        </Section>

        <Section
          name="player-card"
          title="Player card"
          text="Who someone is at a glance: avatar or initials, name, job and grade with an on or off duty dot (and the words), a few stats, actions. For a scoreboard's detail, a profile, an ID check."
          stageClassName="items-start"
        >
          <PlayerCard
            name="Niko Bellic"
            job="LSPD"
            grade="Sergeant"
            onDuty
            stats={[
              { label: "Citizen ID", value: "NKT-48210", mono: true },
              { label: "Callsign", value: "1-ADAM-12", mono: true },
              { icon: <WalletIcon />, label: "Cash", value: <Money amount={1520} /> },
              { icon: <LandmarkIcon />, label: "Bank", value: <Money amount={48210} /> },
            ]}
            actions={
              <>
                <Button variant="outline" size="sm">
                  Fine
                </Button>
                <Button size="sm" className="ml-auto">
                  Message
                </Button>
              </>
            }
          />
          <PlayerCard
            name="Lamar Davis"
            job="Grove Street"
            stats={[
              { label: "Citizen ID", value: "LMR-00731", mono: true },
              { label: "Phone", value: "555-0142", mono: true },
            ]}
          />
          <PlayerCard
            name="Dr. Imani Okafor"
            job="EMS"
            grade="Paramedic"
            onDuty={false}
            selected
            columns={3}
            stats={[
              { label: "Revives", value: 128 },
              { label: "Hours", value: 41 },
              { label: "Rank", value: 3 },
            ]}
          />
        </Section>

        <Section
          name="empty-state"
          title="Empty state"
          text="When there's nothing to show, or something went wrong: a short title and one sentence on what to do next, with an optional action. Stock shadcn Empty on the kit's scale; named empty-state because shadcn already has empty."
          stageClassName="items-start"
        >
          <Panel>
            <PanelHeader icon={<WarehouseIcon />} title="Garage" description="Legion Square" />
            <PanelBody>
              <EmptyState
                icon={<CarIcon />}
                title="No cars here"
                description="Buy one at the dealership, or park one inside to store it."
                action={
                  <Button size="sm" variant="outline">
                    <MapIcon /> Mark the dealership
                  </Button>
                }
              />
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader icon={<LandmarkIcon />} title="Fleeca" description="Personal account" />
            <PanelBody>
              <EmptyState
                tone="error"
                title="Couldn't load your account"
                description="The bank didn't answer. Try again in a moment."
                action={<Button size="sm">Try again</Button>}
              />
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader icon={<UsersIcon />} title="Players" description='Search: "zentorno"' />
            <PanelBody>
              <EmptyState icon={<UsersIcon />} title="No one matches" description="Check the spelling, or search by server ID." />
            </PanelBody>
          </Panel>
        </Section>

        <Section
          name="skill-check"
          title="Skill check"
          text="Press the key while the needle is in the zone: one clockwise turn, faster and narrower as it gets harder. It runs itself and reads the key, or takes the angle from outside; a sequence of checks is a sequence of keys."
          stageClassName="min-h-[30rem] items-center"
        >
          <SkillCheckStates />
          <SkillCheckDemo />
        </Section>

        <Section
          name="radial-menu"
          title="Radial menu"
          text="The action wheel: icons and labels in wedges, the highlighted one in accent, its description in the centre. Items can open a submenu (the centre becomes Back); with onClose the centre closes the wheel at the root, as ox_lib's does. Point, or focus it and use the arrows, Enter, 1–9 and Backspace."
          stageClassName="min-h-[30rem] items-center"
        >
          <RadialDemo />
        </Section>

          </div>
        </Focus.Provider>
      </main>
      <Footer />
    </div>
  );
}

const META = new Map((registry.items as { name: string; meta?: { hidden?: boolean } }[]).flatMap((i) => (i.meta ? [[i.name, i.meta] as const] : [])));

function Section({
  name,
  title,
  text,
  stageClassName,
  scene,
  children,
}: {
  name: string;
  title: string;
  text: string;
  scene?: "dusk" | "day";
  install?: boolean;
  stageClassName?: string;
  children: ReactNode;
}) {
  const focus = useContext(Focus);
  if (focus && focus !== name) return null;
  // curated out of the catalogue: still at /components/<name>
  if (!focus && META.get(name)?.hidden) return null;
  return (
    <div style={{ order: ORDER.get(name) ?? 900 }}>
      <Entry name={name} title={title} text={text} scene={scene} stageClassName={stageClassName} focus={!!focus}>
        {children}
      </Entry>
    </div>
  );
}

export type SectionComponent = typeof Section;

function ChipModesDemo() {
  const [display, setDisplay] = useState<"pill" | "value" | "icon" | "expand">("expand");
  const [neighbours, setNeighbours] = useState<"push" | "collapse" | "overlay">("push");
  const [talking, setTalking] = useState(false);
  const [vitals, setVitals] = useState({ health: 82, armor: 46, hunger: 38, thirst: 64 });
  const icons = { health: <HeartPulseIcon />, armor: <ShieldIcon />, hunger: <UtensilsIcon />, thirst: <DropletIcon /> };
  const names = { health: "Health", armor: "Armor", hunger: "Hunger", thirst: "Thirst" };
  const eat = () => setVitals((v) => ({ ...v, hunger: v.hunger >= 90 ? 20 : v.hunger + 25 }));
  // every vital at once: one batch, critical health first, then the biggest change, three open and +1
  const hit = () => setVitals((v) => (v.health < 30 ? { health: 82, armor: 46, hunger: 38, thirst: 64 } : { health: 12, armor: Math.max(0, v.armor - 30), hunger: v.hunger - 4, thirst: v.thirst - 8 }));
  return (
    <>
      <div className="flex flex-wrap justify-center gap-2">
        {(["pill", "value", "icon", "expand"] as const).map((d) => (
          <Button key={d} size="sm" variant={display === d ? "secondary" : "outline"} onClick={() => setDisplay(d)}>
            {d}
          </Button>
        ))}
        <span className="w-4" />
        {(["push", "collapse", "overlay"] as const).map((n) => (
          <Button key={n} size="sm" variant={neighbours === n ? "secondary" : "outline"} onClick={() => setNeighbours(n)}>
            {n}
          </Button>
        ))}
      </div>
      <VitalChip.Row>
        <VitalChip.Root open={talking} neighbours={neighbours}>
          <VitalChip.Shape>
            <VitalChip.Icon>
              <MicIcon />
            </VitalChip.Icon>
            <VitalChip.Label>Normal</VitalChip.Label>
          </VitalChip.Shape>
          <VitalChip.Label>Normal</VitalChip.Label>
        </VitalChip.Root>
        {(Object.keys(vitals) as (keyof typeof vitals)[]).map((k) => (
          <VitalChip.Root key={k} value={vitals[k]} tone={k} display={display}>
            <VitalChip.Shape>
              <VitalChip.Icon>{icons[k]}</VitalChip.Icon>
              <VitalChip.Label>{names[k]}</VitalChip.Label>
            </VitalChip.Shape>
            <VitalChip.Label>{names[k]}</VitalChip.Label>
          </VitalChip.Root>
        ))}
      </VitalChip.Row>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={eat}>
          Eat (+25 hunger)
        </Button>
        <Button size="sm" variant="outline" onClick={hit}>
          Take damage (all change)
        </Button>
        <Button size="sm" variant={talking ? "secondary" : "outline"} onClick={() => setTalking((t) => !t)}>
          {talking ? "Stop talking" : "Talk"}
        </Button>
      </div>
    </>
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
        <MenuRowList active={active}>
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
        </MenuRowList>
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
/**
 * ox_lib's date-range and time rows: values in its shapes (epoch ms), typed boxes, no native
 * picker. The "Value" line shows what Lua would get back.
 */
function ScheduleForm() {
  const [lease, setLease] = useState<[number | null, number | null]>([dateToEpoch("2026-10-24"), dateToEpoch("2026-10-31")]);
  const [meet, setMeet] = useState<number | null>(timeToEpoch("21:30"));
  const leaseError = validateField({ kind: "date-range", required: true, min: "2026-10-20" }, lease)?.message;
  return (
    <Panel>
      <PanelHeader title="Schedule" description="Date ranges and times" />
      <PanelBody variant="form">
        <DateRangeField label="Apartment lease" hint="From, to" required min="2026-10-20" value={lease} onValueChange={setLease} error={leaseError} />
        <TimeField label="Meet at the docks" format="12" value={meet} onValueChange={setMeet} clearable icon={<AnchorIcon />} description="12-hour, with AM and PM; clears without a reset." />
        <DateRangeField label="Empty range" />
        <TimeField label="Shift starts" min="08:00" max="18:00" minuteStep={15} defaultValue={timeToEpoch("06:45")} error="At 08:00 or later" />
        <DateRangeField
          label="Vacation"
          defaultValue={[dateToEpoch("2026-12-28"), dateToEpoch("2026-12-20")]}
          error="The end can't be before the start"
        />
        <p data-slot="schedule-demo-value" className="nk-label font-normal break-all">
          Value: lease {JSON.stringify(lease)}, meet {JSON.stringify(meet)}
        </p>
      </PanelBody>
    </Panel>
  );
}

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
        <KeyPrompt surface="panel" size="sm" keys="Y" label="Talk" active />
        <KeyPrompt size="sm" keys="X" label="Hands up" hold={800} progress={0.3} />
      </KeyPromptStack>
      <KeyPromptStack position="top-center" className="flex-row items-start">
        <KeyPrompt keys={[]} label="Searching the glovebox" />
        <KeyPrompt keys="E" wrap className="max-w-64" label="Talk to the bartender about the job at the Vanilla Unicorn" />
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

// ox_lib metadata, in two of its shapes (menuMetadata reads all three). Each bar keeps its own
// colorScheme, as ox passes it (Mantine names); the fuel line takes a tone.
/**
 * The other states from props.
 */
function CountdownStates() {
  return (
    <div className="flex flex-col items-center gap-8">
      {/* lineTone: a last stand drains in destructive from the start, not only from warnAt */}
      <Countdown seconds={42} total={60} warnAt={10} lineTone="destructive" label="Last stand" />
      <Countdown seconds={8} total={60} warnAt={30} label="Until you bleed out" />
      <Countdown seconds={0} total={300} label="You can respawn" />
      <Countdown size="sm" seconds={3723} label="Until the server restarts" />
    </div>
  );
}

/** Running on its own: 12 s, warning at 5, onComplete from a timer. */
function CountdownDemo() {
  const [run, setRun] = useState(1);
  const [result, setResult] = useState("Running");
  return (
    <Panel size="sm">
      <PanelHeader title="Bank alarm" description="Warning at 5 seconds" />
      <PanelBody variant="form" className="items-center">
        <Countdown key={run} duration={12_000} warnAt={5} warnTone="warning" label="Until the alarm" onComplete={() => setResult("Alarm!")} />
      </PanelBody>
      <PanelFooter>
        <span data-slot="countdown-demo-result" className="text-sm">
          {result}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => {
            setRun((r) => r + 1);
            setResult("Running");
          }}
        >
          Restart
        </Button>
      </PanelFooter>
    </Panel>
  );
}

const TRANSACTIONS = [
  { label: "Paycheck", note: "LSPD, Tuesday", amount: 1850 },
  { label: "Impound fee", note: "Mission Row", amount: -250 },
  { label: "Transfer from Lamar", note: "Fleeca", amount: 1200 },
  { label: "Fuel", note: "Ron, Grove Street", amount: -84 },
];

/** Money in a stat, in rows (signed, direction tones), on the HUD (compact), other locales, chips. */
function MoneyStates() {
  return (
    <>
      <Panel>
        <PanelHeader icon={<LandmarkIcon />} title="Fleeca" description="Personal account" />
        <PanelBody variant="form" className="gap-3">
          <Stat label="Balance" value={<Money amount={48210} />} size="display" />
        </PanelBody>
        <Separator />
        <PanelBody>
          {TRANSACTIONS.map((t) => (
            <MenuRow key={t.label} description={t.note} meta={<Money amount={t.amount} sign="always" tone="direction" className="text-sm" />} readOnly>
              {t.label}
            </MenuRow>
          ))}
        </PanelBody>
      </Panel>
      <div className="flex flex-col items-start gap-6">
        <div className="flex flex-col items-end gap-1">
          <Stat surface="game" align="end" icon={<WalletIcon />} label="Cash" value={<Money amount={1520} />} />
          <Stat surface="game" align="end" icon={<LandmarkIcon />} label="Bank" value={<Money amount={1250000} compact />} size="sm" />
        </div>
        <Panel size="sm">
          <PanelHeader title="Other servers" description="Currency, locale, decimals" />
          <PanelBody variant="form" className="gap-3">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="nk-label">de-DE, EUR</span>
              <Money amount={1234.5} currency="EUR" locale="de-DE" fractionDigits={2} size="sm" />
            </div>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="nk-label">en-GB, GBP</span>
              <Money amount={1234.5} currency="GBP" locale="en-GB" fractionDigits={2} size="sm" />
            </div>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="nk-label">Casino chips</span>
              <Money amount={2500} currency={null} suffix=" chips" size="sm" />
            </div>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="nk-label">A loss, muted</span>
              <Money amount={-3.5} fractionDigits={2} tone="muted" size="sm" />
            </div>
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}

// Lucide icons stand in for an inventory's own item images.
const ITEM_ICON = "size-8 text-muted-foreground";
const POCKETS = [
  { image: <DropletIcon className={ITEM_ICON} />, label: "Water", count: 3 },
  { image: <UtensilsIcon className={ITEM_ICON} />, label: "Sandwich", count: 2 },
  { image: <WrenchIcon className={ITEM_ICON} />, label: "Lockpick", durability: 14 },
  { image: <RadioIcon className={ITEM_ICON} />, label: "Radio", durability: 88 },
  { image: <PillIcon className={ITEM_ICON} />, label: "Painkillers", count: 12 },
];

/** An inventory (every state), a shop (price, stock, locked) and the hotbar on the game. */
function ItemSlotStates() {
  const [selected, setSelected] = useState(1);
  return (
    <>
      <Panel size="auto">
        <PanelHeader icon={<BackpackIcon />} title="Pockets" description="Click to select; the states from props" />
        <PanelBody variant="form" className="gap-0">
          <div className="grid w-[26rem] grid-cols-5 gap-2">
            {POCKETS.map((p, i) => (
              <ItemSlot key={p.label} hotkey={i + 1} {...p} active={selected === i} onClick={() => setSelected(i)} />
            ))}
            <ItemSlot image={<FuelIcon className={ITEM_ICON} />} label="Jerry can" dragging />
            <ItemSlot dropTarget />
            <ItemSlot />
            <ItemSlot image={<ShieldIcon className={ITEM_ICON} />} label="Armor" locked />
            <ItemSlot />
          </div>
        </PanelBody>
      </Panel>
      <div className="flex flex-col items-center gap-6">
        <Panel size="auto">
          <PanelHeader icon={<WalletIcon />} title="24/7" description="Price and stock" />
          <PanelBody variant="form" className="gap-0">
            <div className="grid w-[16rem] grid-cols-3 gap-2">
              <ItemSlot image={<DropletIcon className={ITEM_ICON} />} label="Water" stock={24} price={<Money amount={2} />} onClick={() => {}} />
              <ItemSlot image={<UtensilsIcon className={ITEM_ICON} />} label="Sandwich" stock={8} price={<Money amount={5} />} onClick={() => {}} />
              <ItemSlot image={<RadioIcon className={ITEM_ICON} />} label="Radio" stock={0} price={<Money amount={250} />} locked />
            </div>
          </PanelBody>
        </Panel>
        <div className="flex gap-2">
          {POCKETS.map((p, i) => (
            <ItemSlot
              key={p.label}
              surface="hud"
              size="sm"
              hotkey={i + 1}
              image={cloneElement(p.image as ReactElement<{ className?: string }>, { className: "size-6" })}
              count={p.count}
              durability={p.durability}
              active={selected === i}
            />
          ))}
        </div>
      </div>
    </>
  );
}

/** Every state from props: idle, the needle in the zone, a hit, a miss. */
function SkillCheckStates() {
  return (
    <div className="grid grid-cols-2 place-items-center gap-6">
      <SkillCheck size="sm" zoneStart={200} zoneSize={40} angle={0} />
      <SkillCheck size="sm" zoneStart={200} zoneSize={40} angle={218} keyLabel="F" />
      <SkillCheck size="sm" zoneStart={150} zoneSize={50} angle={170} result="success" />
      <SkillCheck size="sm" zoneStart={260} zoneSize={25} angle={240} result="fail" />
    </div>
  );
}

const PINS = 3;

/** A lockpick: three medium checks in a row; press E (click the stage first so the page has keys). */
function SkillCheckDemo() {
  const [round, setRound] = useState(0);
  const [zone, setZone] = useState(() => skillCheckZone(SKILL_CHECK_PRESETS.medium.zoneSize));
  const [status, setStatus] = useState<"idle" | "running" | "open" | "broke">("idle");
  const restart = () => {
    setRound(0);
    setZone(skillCheckZone(SKILL_CHECK_PRESETS.medium.zoneSize));
    setStatus("running");
  };
  return (
    <div className="flex flex-col items-center gap-6">
      <SkillCheck
        key={`${round}-${zone.start}`}
        zoneStart={zone.start}
        zoneSize={zone.size}
        speed={SKILL_CHECK_PRESETS.medium.speed}
        keyLabel="E"
        running={status === "running"}
        listen
        onResult={(hit) => {
          if (!hit) return setStatus("broke");
          if (round + 1 >= PINS) return setStatus("open");
          setTimeout(() => {
            setRound((r) => r + 1);
            setZone(skillCheckZone(SKILL_CHECK_PRESETS.medium.zoneSize));
          }, 250);
        }}
      />
      <Panel size="sm">
        <PanelHeader title="Lockpick" description={`Pin ${Math.min(round + 1, PINS)} of ${PINS}, press E in the zone`} />
        <PanelFooter>
          <span data-slot="skill-demo-status" className="text-sm">
            {status === "idle" ? "Ready" : status === "running" ? "Picking…" : status === "open" ? "Unlocked" : "The pick broke"}
          </span>
          <Button size="sm" variant={status === "idle" ? "default" : "outline"} className="ml-auto" onClick={restart} disabled={status === "running"}>
            {status === "idle" ? "Start" : "Again"}
          </Button>
        </PanelFooter>
      </Panel>
    </div>
  );
}

const WHEEL: RadialMenuItem[] = [
  { id: "phone", label: "Phone", icon: <RadioIcon />, description: "Open your phone" },
  {
    id: "vehicle",
    label: "Vehicle",
    icon: <CarIcon />,
    items: [
      { id: "lock", label: "Lock", icon: <LockIcon />, description: "Lock the doors" },
      { id: "engine", label: "Engine", icon: <WrenchIcon />, description: "Turn the engine off" },
      { id: "trunk", label: "Trunk", icon: <BackpackIcon />, description: "Open the trunk" },
      { id: "fuel", label: "Fuel", icon: <FuelIcon />, description: "12% left", disabled: true },
    ],
  },
  { id: "wallet", label: "Wallet", icon: <WalletIcon />, description: "Show your ID or pay" },
  { id: "map", label: "Map", icon: <MapIcon />, description: "Set a waypoint" },
  { id: "emote", label: "Emotes", icon: <SparklesIcon />, disabled: true },
  { id: "voice", label: "Voice", icon: <MicIcon />, description: "Normal range" },
];

const BIG_WHEEL: RadialMenuItem[] = Array.from({ length: 10 }, (_, i) => ({
  id: `slot-${i}`,
  label: `Emote ${i + 1}`,
  icon: [<PlayIcon />, <SparklesIcon />, <HeartPulseIcon />, <FlameIcon />, <UsersIcon />][i % 5],
}));

/** A live wheel with a submenu, and a 10-item wheel highlighted from props (labels hidden past 8). */
function RadialDemo() {
  const [last, setLast] = useState("Nothing yet");
  return (
    <>
      <RadialMenu label="Actions" items={WHEEL} onSelect={(item, path) => setLast([...path.map((p) => p.label), item.label].join(" › "))} onClose={() => setLast("Closed")} />
      <div className="flex flex-col items-center gap-6">
        <RadialMenu label="Emotes" items={BIG_WHEEL} defaultActive="slot-3" size={240} onSelect={(item) => setLast(item.label)} />
        <Panel size="sm">
          <PanelHeader title="Last chosen" />
          <PanelBody variant="form">
            <span data-slot="radial-demo-last" className="text-sm">
              {last}
            </span>
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}

