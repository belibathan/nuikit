import {
  AnchorIcon,
  ArrowDownIcon,
  ArrowDownLeftIcon,
  ArrowDownRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpLeftIcon,
  ArrowUpRightIcon,
  BackpackIcon,
  BandageIcon,
  CarIcon,
  CarFrontIcon,
  CupSodaIcon,
  DropletIcon,
  KeyRoundIcon,
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
import { cloneElement, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Command } from "@/components/code";
import { Scene } from "@/components/scene";
import { Footer, Nav, SITE, ThemePicker } from "@/components/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HudChip } from "@/components/ui/hud-chip";
import { MenuRow, MenuRowDetails, MenuRowList, menuMetadata } from "@/components/ui/menu-row";
import { Meter, meterColor } from "@/components/ui/meter";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Stat } from "@/components/ui/stat";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Notice, NoticeStack, Notices, useNotices, type NoticePosition, type NoticeStatus } from "@/components/ui/notice";
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
import { VariantsDemo } from "@/components/variants-demo";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Speedometer } from "@/components/ui/speedometer";
import { Countdown } from "@/components/ui/countdown";
import { Band } from "@/components/ui/band";
import { VitalChip } from "@/components/ui/vital-chip";
import { Money } from "@/components/ui/money";
import { ItemSlot } from "@/components/ui/item-slot";
import { PlayerCard } from "@/components/ui/player-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SKILL_CHECK_PRESETS, SkillCheck, skillCheckZone } from "@/components/ui/skill-check";
import { RadialMenu, type RadialMenuItem } from "@/components/ui/radial-menu";
import { applyStageTheme, clearStageTheme } from "@/lib/stage-theme";
import { studioTheme } from "@/lib/theme-studio";
import { cn } from "@/lib/utils";
import { identities } from "@/themes";
import registry from "../../../../registry.json";

export function ComponentsPage() {
  const preview = useRef<HTMLDivElement>(null);
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
          <IdentityPicker target={preview} className="mt-3" />
        </header>

        <div ref={preview}>

        <Section
          name="variants"
          title="Variants"
          text="The knobs every kit component takes, per component, over the theme's identity: size, density (compact, comfortable), shape (square, round) and motion (off or reduced). Props on the component; attributes (data-nk-density, data-nk-shape, data-nk-motion) on any element for a whole subtree. Nothing set: the theme decides."
          install={false}
          stageClassName="items-start"
        >
          <VariantsDemo />
        </Section>

        <Section
          name="legibility"
          title="Legibility"
          text="The fixture every HUD part is checked against: the brightest, busiest frame the game draws (midday sun, sky and palms). Text on the game must still read, chips must still separate from the sky, levels must still show. Switch the identity above to check yours."
          install={false}
          scene="day"
          stageClassName="items-end justify-between"
        >
          <LegibilityDemo />
        </Section>

        <Section
          name="vital-chip"
          title="Vital chip: display modes"
          text="What a chip shows, per server or per player: pill (icon, name, value), value (icon and value), icon (the level as fill), expand (the icon opens to the pill on a change and settles after --nk-rest-delay). A chip that opens (voice while talking) pushes its neighbours, collapses them to icons, or floats over them."
          install={false}
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
          name="menu-row"
          title="Menu row: items"
          text="What the menu intent's items carry: an image, a progress line in any tone or colour, read-only rows, trailing actions (promote, fire) a list reaches with Tab, the details card beside the hovered row (each metadata bar in its own colour), quiet stepper values, and inert rows that ignore hover (CEF keeps :hover after Lua takes focus)."
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
          name="meter"
          title="Meter: tones, colours, timed"
          text="Status tones from the theme; a library's colour through meterColor() (Mantine names become theme tones, CSS colours pass through); and a timed bar whose onComplete fires from a timer, so it still finishes with motion off."
          install={false}
          stageClassName="items-center"
        >
          <MeterTones />
          <MeterTimed />
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
          name="notice"
          title="Slabs"
          text="Transient feedback on the game, one anatomy for every script: an item added or removed (icon tile, name, change; changes to the same item within 1.5 s merge), a prompt (key chip, verb), a timed progress (label, thin line, cancel key), and a full-width band for a state. notice, key-prompt, meter and band draw them."
          install={false}
          stageClassName="min-h-[36rem] [--nk-edge:2.5rem]"
        >
          <SlabStates />
        </Section>

        <Section
          name="band"
          title="Band"
          text="A full-width band for a state the player is in: incapacitated, cuffed, spectating. The game darkened and tinted by the tone, hairlines above and below, a title in the display face and a caption. Pinned to the bottom or top, or in the flow."
          stageClassName="min-h-[30rem] flex-col items-stretch justify-center gap-6 px-0"
        >
          <Band position="inline" title="You are incapacitated" subtitle="Wait for EMS" />
          <Band position="inline" tone="warning" title="Cuffed" subtitle="Officer Vale has you in custody" />
          <Band position="inline" tone="neutral" title="Spectating" subtitle="Niko Bellic">
            <Countdown surface="game" size="sm" seconds={42} label="Back in" className="mt-2" />
          </Band>
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
          <Countdown surface="game" size="hero" seconds={154} total={300} label="Until you can respawn" />
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
            avatar="/screens/appearance.jpg"
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

        <section id="removed" className="mt-20 scroll-mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Removed</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground text-pretty">
            Deprecated in 0.6.0 and removed from the registry in 0.9.0. Copies already in a project keep working; new UI uses the component that replaced them.
          </p>
          <div className="mt-6 divide-y rounded-xl border">
            {REMOVED.map((d) => (
              <div key={d.name} data-slot="removed-item" className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
                <div className="min-w-48">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm">{d.name}</code>
                    <Badge variant="outline">Removed</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{d.what}</p>
                </div>
                <p className="flex-1 text-sm">
                  Use{" "}
                  {d.use.map((u, i) => (
                    <span key={u}>
                      {i > 0 && " or "}
                      <a href={`#${u}`} className="font-mono underline underline-offset-4">
                        {u}
                      </a>
                    </span>
                  ))}
                  {d.how && <span className="text-muted-foreground"> ({d.how})</span>}
                </p>
              </div>
            ))}
          </div>
        </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// registry.json meta (docs/design/contract.md, "Registry metadata"): status and the release it shipped in
type ItemSpec = { role: string; anatomy: string[]; props?: string[]; level?: string; rules: string[] };
type ItemMeta = { since: string; status: string; replaces: string[]; removeIn: string | null; replacedBy?: string[]; spec?: ItemSpec };
const META = new Map((registry.items as { name: string; meta?: ItemMeta }[]).flatMap((i) => (i.meta ? [[i.name, i.meta] as const] : [])));

/** The spec template (Foundation 2): role, anatomy, props, what the level means, rules. */
function SpecDetails({ spec }: { spec: ItemSpec }) {
  return (
    <details data-slot="component-spec" className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted-foreground select-none">Spec{spec.level ? `: level is ${spec.level}` : ""}</summary>
      <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted-foreground">Role</dt>
        <dd>{spec.role}</dd>
        <dt className="text-muted-foreground">Anatomy</dt>
        <dd>{spec.anatomy.join(" · ")}</dd>
        {spec.props && (
          <>
            <dt className="text-muted-foreground">Props</dt>
            <dd className="font-mono text-xs leading-5">{spec.props.join(", ")}</dd>
          </>
        )}
        {spec.level && (
          <>
            <dt className="text-muted-foreground">Level means</dt>
            <dd>{spec.level}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Rules</dt>
        <dd>
          <ul className="list-disc pl-4">
            {spec.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </dd>
      </dl>
    </details>
  );
}

function MetaBadges({ meta }: { meta: ItemMeta }) {
  return (
    <>
      {meta.status === "deprecated" ? (
        <Badge variant="destructive">
          Deprecated{meta.replacedBy?.length ? `: use ${meta.replacedBy.join(" or ")}` : ""}
          {meta.removeIn ? `, removed in ${meta.removeIn}` : ""}
        </Badge>
      ) : meta.status === "experimental" ? (
        <Badge variant="secondary">Experimental</Badge>
      ) : null}
      <Badge variant="outline" className="text-muted-foreground">
        {meta.since === "unreleased" ? "Unreleased" : `Since ${meta.since}`}
      </Badge>
    </>
  );
}

function Section({
  name,
  title,
  text,
  install = true,
  stageClassName,
  scene,
  children,
}: {
  name: string;
  title: string;
  text: string;
  /** The world behind the stage (day: the bright legibility fixture). */
  scene?: "dusk" | "day";
  /** false for a second section of the same item (one id, one install command). */
  install?: boolean;
  stageClassName?: string;
  children: ReactNode;
}) {
  const meta = install ? META.get(name) : undefined;
  return (
    <section id={install ? name : undefined} className="mt-20 scroll-mt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            {meta && <MetaBadges meta={meta} />}
          </div>
          <p className="mt-2 text-muted-foreground text-pretty">{text}</p>
          {install && meta?.spec && <SpecDetails spec={meta.spec} />}
        </div>
        {install && <Command className="h-10 w-full max-w-md text-xs">{`npx shadcn add ${SITE}/r/${name}.json`}</Command>}
      </div>
      <div className="relative isolate mt-6 overflow-hidden rounded-xl border bg-black">
        <Scene variant={scene} />
        <div className={cn("relative flex min-h-80 flex-wrap items-start justify-center gap-8 p-10", stageClassName)}>{children}</div>
      </div>
    </section>
  );
}

/**
 * Every component under one identity (all of packages/core/themes): its type, shape, surface, density,
 * motion and HUD, painted on the previews only, so the page around them stays the site's. "Site": none.
 */
function IdentityPicker({ target, className }: { target: React.RefObject<HTMLDivElement | null>; className?: string }) {
  const [active, setActive] = useState(-1);
  useLayoutEffect(() => {
    const el = target.current;
    const id = identities[active];
    if (!el || !id) return;
    applyStageTheme(studioTheme(id.css), el);
    // the site's font-sans is a literal (@theme inline): read the identity's own
    el.style.fontFamily = "var(--font-sans)";
    return () => {
      clearStageTheme(el);
      el.style.removeProperty("font-family");
    };
  }, [active, target]);
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="radiogroup" aria-label="Identity">
      <span className="mr-1 text-sm text-muted-foreground">Identity</span>
      {[{ name: "Site", swatch: [] as string[] }, ...identities].map((t, i) => (
        <Button key={t.name} role="radio" aria-checked={active === i - 1} variant={active === i - 1 ? "secondary" : "ghost"} size="sm" onClick={() => setActive(i - 1)}>
          {t.swatch.length > 0 && (
            <span className="flex -space-x-1">
              {t.swatch.map((c) => (
                <span key={c} className="size-3 rounded-full ring-2 ring-background" style={{ background: c }} />
              ))}
            </span>
          )}
          {t.name}
        </Button>
      ))}
    </div>
  );
}

/** HUD parts as they sit on the game: vitals, chips, a notice, a prompt, a timed slab, a band. */
function LegibilityDemo() {
  const vitals = [
    { tone: "health", value: 82, icon: <HeartPulseIcon /> },
    { tone: "armor", value: 46, icon: <ShieldIcon /> },
    { tone: "hunger", value: 18, icon: <UtensilsIcon /> },
    { tone: "thirst", value: 64, icon: <DropletIcon /> },
  ];
  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {vitals.map((v) => (
            <VitalChip.Root key={v.tone} value={v.value} tone={v.tone}>
              <VitalChip.Shape>
                <VitalChip.Level />
                <VitalChip.Icon>{v.icon}</VitalChip.Icon>
              </VitalChip.Shape>
            </VitalChip.Root>
          ))}
        </div>
        <div className="flex gap-2">
          <HudChip icon={<MicIcon />} active>
            Normal
          </HudChip>
          <HudChip icon={<RadioIcon />}>101 MHz</HudChip>
          <HudChip icon={<TriangleAlertIcon />} state="warning">
            Seatbelt
          </HudChip>
        </div>
        <Stat surface="game" icon={<WalletIcon />} label="Cash" value="$12,480" />
      </div>
      <div className="flex flex-col items-center gap-4">
        <KeyPrompt keys="E" label="Open garage" />
        <div className="w-80">
          <Meter variant="slab" label="Repairing" value={62} cancelKey="X" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-3">
        <Notice status="warning" title="Low fuel" description="8% left" duration={0} />
        <Notice item={{ name: "Water bottle", count: 2, icon: <CupSodaIcon /> }} duration={0} />
      </div>
      <Band position="inline" tone="destructive" title="You are incapacitated" subtitle="Hold E to call for help" className="basis-full" />
    </>
  );
}

/** The vital chip's display modes and the voice chip's neighbour option, live. */
function ChipModesDemo() {
  const [display, setDisplay] = useState<"pill" | "value" | "icon" | "expand">("expand");
  const [neighbours, setNeighbours] = useState<"push" | "collapse" | "overlay">("push");
  const [talking, setTalking] = useState(false);
  const [vitals, setVitals] = useState({ health: 82, armor: 46, hunger: 38, thirst: 64 });
  const icons = { health: <HeartPulseIcon />, armor: <ShieldIcon />, hunger: <UtensilsIcon />, thirst: <DropletIcon /> };
  const names = { health: "Health", armor: "Armor", hunger: "Hunger", thirst: "Thirst" };
  const eat = () => setVitals((v) => ({ ...v, hunger: v.hunger >= 90 ? 20 : v.hunger + 25 }));
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
              <VitalChip.Level />
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

/** The four slabs, every state from props, plus a live item queue that merges. */
function SlabStates() {
  const { notices, notify, dismiss } = useNotices();
  const [run, setRun] = useState(0);
  return (
    <>
      <NoticeStack position="center-left">
        <Notice animate={false} duration={0} item={{ name: "Water bottle", count: 2, icon: <CupSodaIcon /> }} />
        <Notice animate={false} duration={0} item={{ name: "Bandage", count: 1, icon: <BandageIcon /> }} />
        <Notice animate={false} duration={0} item={{ name: "Lockpick", count: -1, icon: <KeyRoundIcon /> }} />
      </NoticeStack>
      <Notices notices={notices} onDismiss={dismiss} />
      <KeyPromptStack position="center-right">
        <KeyPrompt keys="E" label="Clean dishes" />
        <KeyPrompt keys="G" label="Search the counter" hold={1200} progress={0.45} />
      </KeyPromptStack>
      <div className="nk-anchor-b bottom-[9rem]!">
        <Meter
          key={run}
          variant="slab"
          label="Raw crystals"
          duration={run ? 6000 : undefined}
          value={run ? undefined : 45}
          cancelKey="Esc"
          onCancel={() => setRun(0)}
        />
      </div>
      <Band title="You are incapacitated" subtitle="Wait for EMS" />
      <Panel size="sm" className="self-start">
        <PanelHeader title="Try it" description="Quick presses merge" />
        <PanelBody variant="form" className="flex-row flex-wrap">
          <Button size="sm" onClick={() => notify({ item: { name: "Water bottle", count: 1, icon: <CupSodaIcon /> }, position: "top-right", duration: 3000 })}>
            Add water
          </Button>
          <Button size="sm" variant="outline" onClick={() => notify({ item: { name: "Water bottle", count: -1, icon: <CupSodaIcon /> }, position: "top-right", duration: 3000 })}>
            Drink one
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRun((n) => n + 1)}>
            Start progress
          </Button>
        </PanelBody>
      </Panel>
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
const VEHICLES = [
  {
    name: "Pegassi Zentorno",
    image: "/bg/garage.jpg",
    fuel: 92,
    fuelColor: "success",
    metadata: [
      { label: "Plate", value: "ZEN 01" },
      { label: "Engine", value: "98%", progress: 98, colorScheme: "green" },
      { label: "Body", value: "41%", progress: 41, colorScheme: "yellow.6" },
      { label: "Tyres", value: "12%", progress: 12, colorScheme: "red" },
      { label: "Clutch", value: "80%", progress: 80 },
    ],
  },
  {
    name: "Karin Sultan",
    image: "/bg/street.jpg",
    fuel: 23,
    fuelColor: "destructive",
    metadata: { Plate: "SUL 07", Garage: "Impound", Fee: "$250" },
  },
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
              progressColor={c.fuelColor}
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
          <MenuRow
            readOnly
            icon={<span className="size-1.5 rounded-full bg-success" />}
            description="Mechanic, on duty"
            actions={
              <>
                <Button variant="ghost" size="icon-sm" aria-label="Promote Lee">
                  <ArrowUpIcon />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Demote Lee">
                  <ArrowDownIcon />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Fire Lee" className="text-destructive hover:text-destructive">
                  <LogOutIcon />
                </Button>
              </>
            }
          >
            Lee
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

/** Status tones, and colours as a library sends them (ox colorScheme), through meterColor(). */
function MeterTones() {
  return (
    <Panel>
      <PanelHeader title="Tones and colours" description="Status from the theme; library colours mapped" />
      <PanelBody variant="form">
        <Meter label="Paid off" value={80} valueText="80%" tone="success" />
        <Meter label="Fuel reserve" value={35} valueText="35%" tone="warning" />
        <Meter label="Download" value={55} valueText="55%" tone="info" />
        <Separator />
        <Meter label='colorScheme "green"' value={64} valueText="64%" {...meterColor("green")} />
        <Meter label='colorScheme "red.6"' value={42} valueText="42%" {...meterColor("red.6")} />
        <Meter label='colorScheme "#4dabf7"' value={70} valueText="70%" segments={5} {...meterColor("#4dabf7")} />
      </PanelBody>
    </Panel>
  );
}

/**
 * A timed bar (ox progressBar): fills over its duration, full exactly at the end; onComplete from
 * a timer. Like ox, the full bar stays a moment before it goes.
 */
function MeterTimed() {
  const [run, setRun] = useState(0);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState("Nothing yet");
  const current = useRef(0);
  return (
    <div className="flex w-80 flex-col gap-4">
      <Panel size="default">
        <PanelHeader title="Try it" description="A 3 second search" />
        <PanelBody>
          <MenuRow
            icon={<BackpackIcon />}
            onClick={() => {
              current.current = run + 1;
              setRun((r) => r + 1);
              setRunning(true);
            }}
          >
            Search the glovebox
          </MenuRow>
        </PanelBody>
        <PanelFooter>
          <span className="nk-label">Last result</span>
          <span data-slot="meter-demo-result" className="ml-auto text-sm">
            {last}
          </span>
        </PanelFooter>
      </Panel>
      {running && (
        <Panel size="default" className="nk-enter">
          <PanelBody variant="form">
            <Meter
              key={run}
              label="Searching the glovebox"
              duration={3000}
              onComplete={() => {
                setLast("Found $120");
                const done = run;
                setTimeout(() => current.current === done && setRunning(false), 500);
              }}
            />
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}

/**
 * The other states from props, straight on the game (surface="game": HUD text with a shadow).
 * On a panel or a tinted full-screen surface, the default theme surface (the Bank alarm panel).
 */
function CountdownStates() {
  return (
    <div className="flex flex-col items-center gap-8">
      {/* lineTone: a last stand drains in destructive from the start, not only from warnAt */}
      <Countdown surface="game" seconds={42} total={60} warnAt={10} lineTone="destructive" label="Last stand" />
      <Countdown surface="game" seconds={8} total={60} warnAt={30} label="Until you bleed out" />
      <Countdown surface="game" seconds={0} total={300} label="You can respawn" />
      <Countdown surface="game" size="sm" seconds={3723} label="Until the server restarts" />
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

const REMOVED: { name: string; what: string; use: string[]; how?: string }[] = [
  { name: "nui-toaster", what: "Sonner toasts wired to NUI.notify()", use: ["notice"], how: "<NuiNotices />, or useNotices() + <Notices>" },
  { name: "task-progress", what: "A timed action in a Card", use: ["meter", "progress-ring"], how: 'variant="slab" + duration, cancelKey, onCancel' },
  { name: "key-hint", what: '"[E] Talk" with hold-to-confirm', use: ["key-prompt"] },
];

