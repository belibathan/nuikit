// The registry's catalogue on /components: the item list and side navigation, the props and levers tables
// (src/generated/api.json, read from the sources by scripts/api.mjs), and the sections for the items the page
// didn't show before (the Default primitives and the utilities).
import {
  BriefcaseIcon,
  CarIcon,
  CrosshairIcon,
  DropletIcon,
  FuelIcon,
  HeartPulseIcon,
  KeyIcon,
  MicIcon,
  MoveHorizontalIcon,
  PackageIcon,
  RadioIcon,
  ShieldIcon,
  TriangleAlertIcon,
  UtensilsIcon,
  WalletIcon,
  WrenchIcon,
} from "lucide-react";
import { emit } from "nuikit-core/react";
import { useEffect, useState, type ReactNode } from "react";
import { ActionBar, ActionBarItem, ActionBarSep } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CollapseMore, CollapseStack } from "@/components/ui/collapse-stack";
import { EdgeSheet, EdgeSheetBody, EdgeSheetFooter } from "@/components/ui/edge-sheet";
import { Fill } from "@/components/ui/fill";
import { IconText } from "@/components/ui/icon-text";
import { MenuRow, MenuRowList } from "@/components/ui/menu-row";
import { NuiImage } from "@/components/ui/nui-image";
import { SmoothInput, SmoothTextarea } from "@/components/ui/smooth-input";
import { NumberRoll, TextRoll } from "@/components/ui/text-roll";
import { Tile } from "@/components/ui/tile";
import { VitalChip } from "@/components/ui/vital-chip";
import type { SectionComponent } from "@/pages/components";
import registry from "../../../../registry.json";

export const DESCRIPTIONS = new Map((registry.items as { name: string; description?: string }[]).map((i) => [i.name, i.description ?? ""]));

type Curated = {
  group?: string;
  tier?: string;
  hidden?: boolean;
  hiddenReason?: string;
  variants?: { axes: Record<string, string[]>; levers: string[]; hooks: string[] };
};
const CURATED = registry.items as { name: string; type: string; title?: string; meta?: Curated }[];

/** The curated map (docs/design/components.md): registry meta says the group, the tier and what is hidden. */
export const GROUP_ORDER = ["Foundations", "Lists & selection", "Gauges & vitals", "Dialogs & sheets", "Notices & prompts", "Inputs", "HUD", "Layout"];
const UI = CURATED.filter((i) => i.type === "registry:ui");
const byGroup = (hidden: boolean) =>
  GROUP_ORDER.map((group) => ({
    group,
    items: UI.filter((i) => i.meta?.group === group && !!i.meta?.hidden === hidden)
      // foundations first inside a group
      .sort((x, y) => Number(y.meta?.tier === "foundation") - Number(x.meta?.tier === "foundation"))
      .map((i) => [i.name, i.title ?? i.name] as [string, string]),
  })).filter((g) => g.items.length > 0);

/** What the nav and the catalogue list: not hidden, grouped by purpose, foundations first. */
const GROUPS = byGroup(false);
/** Hidden from the site, still installable and still at /components/<name>. */
/** The catalogue's order: the listed items in nav order, everything else after. */
export const ORDER = new Map(GROUPS.flatMap((g) => g.items).map(([name], i) => [name, i] as const));

export const VARIANTS = new Map(UI.flatMap((i) => (i.meta?.variants ? [[i.name, i.meta.variants] as const] : [])));
export const ITEMS = [...GROUPS, ...byGroup(true)].flatMap((g) => g.items.map(([name, title]) => ({ name, title, group: g.group, description: DESCRIPTIONS.get(name) ?? "" })));

/* ─────────────────────────────── New sections ─────────────────────────────── */

/** A level that walks down and refills, for the live previews (still under reduced motion). */
function useWalk(start = 0.7, step = 0.08, ms = 900) {
  const [v, setV] = useState(start);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setV((x) => (x <= step ? 1 : +(x - step).toFixed(3))), ms);
    return () => clearInterval(id);
  }, [step, ms]);
  return v;
}

function Label({ children }: { children: ReactNode }) {
  return <p className="site-eyebrow mb-3 text-white/70">{children}</p>;
}

function TileDemo() {
  const left = useWalk(0.6, 0.05, 120);
  const [held, setHeld] = useState(false);
  return (
    <>
      <div>
        <Label>Sizes and shapes</Label>
        <div className="flex items-end gap-3">
          <Tile size="sm">E</Tile>
          <Tile size="md">E</Tile>
          <Tile size="lg">Esc</Tile>
          <Tile size="lg" shape="square">
            <KeyIcon />
          </Tile>
        </div>
      </div>
      <div>
        <Label>States</Label>
        <div className="flex items-end gap-3">
          <Tile size="lg">F</Tile>
          <Tile size="lg" state="focus">
            F
          </Tile>
          <Tile size="lg" state="hold" level={1 - left}>
            F
          </Tile>
          <Tile size="lg" state="confirm">
            F
          </Tile>
          <Tile size="lg" state="alert" shape="square">
            <TriangleAlertIcon />
          </Tile>
          <Tile size="lg" state="disabled">
            F
          </Tile>
          <Tile size="lg" active>
            F
          </Tile>
        </div>
      </div>
      <div>
        <Label>Tone and hue</Label>
        <div className="flex items-end gap-3">
          <Tile size="lg" shape="square" tone="success">
            <ShieldIcon />
          </Tile>
          <Tile size="lg" shape="square" tone="warning">
            <FuelIcon />
          </Tile>
          <Tile size="lg" shape="square" tone="danger">
            <HeartPulseIcon />
          </Tile>
          <Tile size="lg" shape="square" hue="police">
            <RadioIcon />
          </Tile>
          <Tile size="lg" shape="square" hue="legendary">
            <PackageIcon />
          </Tile>
        </div>
      </div>
      <div>
        <Label>A tag (the plate extending right)</Label>
        <div className="flex flex-col items-start gap-3">
          <Tile size="lg" tag="Open garage" land>
            E
          </Tile>
          <button type="button" onPointerDown={() => setHeld(true)} onPointerUp={() => setHeld(false)} onPointerLeave={() => setHeld(false)} className="text-left">
            <Tile size="lg" tag={held ? "Holding…" : "Press and hold me"} state={held ? "hold" : undefined}>
              G
            </Tile>
          </button>
        </div>
      </div>
    </>
  );
}

function FillDemo() {
  const lv = useWalk(0.8, 0.07, 700);
  return (
    <div className="grid w-full max-w-xl gap-5 text-white">
      {[
        { label: "Default (--nk-fill-color)", el: <Fill level={lv} /> },
        { label: 'hue="health"', el: <Fill level={lv} hue="health" /> },
        { label: 'tone="warning"', el: <Fill level={lv} tone="warning" /> },
        { label: "alertAt (≤ --nk-behavior-alert turns it danger)", el: <Fill level={lv} alertAt /> },
        { label: 'variant="edge"', el: <Fill level={lv} variant="edge" /> },
      ].map((r) => (
        <div key={r.label}>
          <Label>{r.label}</Label>
          {r.el}
        </div>
      ))}
    </div>
  );
}

function ChipDemo() {
  return (
    <>
      <div>
        <Label>Fills</Label>
        <div className="flex flex-wrap gap-2">
          <Chip fill="hair">Hair</Chip>
          <Chip fill="tint">Tint</Chip>
          <Chip fill="solid">Solid</Chip>
        </div>
      </div>
      <div>
        <Label>Tones, icons, counts</Label>
        <div className="flex flex-wrap gap-2">
          <Chip icon={<MicIcon />}>Normal</Chip>
          <Chip icon={<RadioIcon />} tone="info">
            101 MHz
          </Chip>
          <Chip tone="success" fill="tint">
            On duty
          </Chip>
          <Chip tone="warning" fill="tint" icon={<TriangleAlertIcon />}>
            Seatbelt
          </Chip>
          <Chip tone="danger" fill="solid" count={3}>
            Wanted
          </Chip>
          <Chip hue="police" fill="tint">
            LSPD
          </Chip>
        </div>
      </div>
      <div>
        <Label>Dots</Label>
        <div className="flex items-center gap-3">
          <Chip variant="dot" tone="success" aria-label="Online" />
          <Chip variant="dot" tone="warning" aria-label="Away" />
          <Chip variant="dot" tone="danger" aria-label="Busy" />
          <Chip variant="dot" aria-label="Offline" />
        </div>
      </div>
    </>
  );
}

function IconTextDemo() {
  return (
    <div className="flex flex-wrap items-start gap-10 text-white">
      <div className="flex flex-col gap-3">
        <Label>text = num</Label>
        <IconText icon={<WalletIcon />} text="num" size="sm">
          $1,520
        </IconText>
        <IconText icon={<WalletIcon />} text="num">
          $12,480
        </IconText>
        <IconText icon={<WalletIcon />} text="num" size="lg">
          $48,210
        </IconText>
      </div>
      <div className="flex flex-col gap-3">
        <Label>text = label</Label>
        <IconText icon={<CrosshairIcon />} text="label">
          30 / 120
        </IconText>
        <IconText icon={<FuelIcon />} text="label">
          Fuel 64%
        </IconText>
      </div>
      <div className="flex flex-col gap-3">
        <Label>text = body, muted icon</Label>
        <IconText icon={<BriefcaseIcon />} muted>
          LSPD · Sergeant
        </IconText>
        <IconText icon={<CarIcon />} muted>
          Parked at Legion Square
        </IconText>
      </div>
    </div>
  );
}

function ActionBarDemo() {
  const [hold, setHold] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setHold((h) => (h >= 1.3 ? 0 : h + 0.05)), 80);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center gap-6">
      <ActionBar plate>
        <ActionBarItem keys={["Tab"]} label="Choose" />
        <ActionBarItem keys={["Enter"]} label="Confirm" />
        <ActionBarItem keys={["Esc"]} label="Back" onClick={() => emit("nuikit:notify", { title: "Back" })} />
        <ActionBarSep />
        <ActionBarItem icon={<MoveHorizontalIcon />} label="Drag to look around" />
      </ActionBar>
      <ActionBar>
        <ActionBarItem keys={["Shift", "E"]} label="Open trunk" />
        <ActionBarItem keys={["X"]} label={hold > 1 ? "Cancelled" : "Hold to cancel"} level={Math.min(1, hold)} state={hold > 1 ? "confirm" : "hold"} />
        <ActionBarItem keys={["G"]} label="Locked" disabled />
      </ActionBar>
    </div>
  );
}

function EdgeSheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4 text-center text-white">
      <p className="max-w-sm text-sm text-white/80">It sits on a screen edge, so it opens over this page. Close it with its back key or the button.</p>
      <Button onClick={() => setOpen((o) => !o)}>{open ? "Close the sheet" : "Open the sheet"}</Button>
      <EdgeSheet open={open} onOpenChange={setOpen} side="left" title="Garage" description="Legion Square, 4 of 10 spaces" meter={40} back onBack={() => setOpen(false)}>
        <EdgeSheetBody scroll>
          <MenuRowList>
            <MenuRow icon={<CarIcon />} description="Stored, 98% condition" meta="ZEN 01" active>
              Pegassi Zentorno
            </MenuRow>
            <MenuRow icon={<CarIcon />} description="Out, last seen in Vinewood" meta="BUF 22">
              Bravado Buffalo
            </MenuRow>
            <MenuRow icon={<WrenchIcon />} description="Fix every car here" meta="$900">
              Repair all
            </MenuRow>
          </MenuRowList>
        </EdgeSheetBody>
        <EdgeSheetFooter>
          <ActionBar>
            <ActionBarItem keys={["Enter"]} label="Take out" />
            <ActionBarItem keys={["Esc"]} label="Back" onClick={() => setOpen(false)} />
          </ActionBar>
        </EdgeSheetFooter>
      </EdgeSheet>
    </div>
  );
}

function CollapseDemo() {
  const [v, setV] = useState({ health: 82, armor: 46, hunger: 38, thirst: 64, stress: 12 });
  const icons: Record<string, ReactNode> = {
    health: <HeartPulseIcon />,
    armor: <ShieldIcon />,
    hunger: <UtensilsIcon />,
    thirst: <DropletIcon />,
    stress: <TriangleAlertIcon />,
  };
  const items = Object.entries(v).map(([key, value]) => ({ key, value, critical: key === "health" && value < 25 }));
  return (
    <div className="flex flex-col items-center gap-6">
      <CollapseStack
        max={3}
        items={items}
        renderItem={(item, { open }) => (
          <VitalChip.Root value={item.value} tone={item.key} open={open}>
            <VitalChip.Shape>
              <VitalChip.Level />
              <VitalChip.Icon>{icons[item.key]}</VitalChip.Icon>
            </VitalChip.Shape>
            <VitalChip.Label>{item.key}</VitalChip.Label>
          </VitalChip.Root>
        )}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setV((p) => ({ ...p, hunger: p.hunger >= 90 ? 20 : p.hunger + 25 }))}>
          Eat
        </Button>
        <Button size="sm" variant="outline" onClick={() => setV((p) => ({ ...p, health: p.health < 25 ? 82 : 12, armor: Math.max(0, p.armor - 20), stress: p.stress + 20 }))}>
          Take damage (three change)
        </Button>
      </div>
      <CollapseMore count={2} />
    </div>
  );
}

const WORDS = ["Legion Square", "Vinewood", "Del Perro", "Sandy Shores"];

function TextRollDemo() {
  const [i, setI] = useState(0);
  const [cash, setCash] = useState(12480);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setI((x) => (x + 1) % WORDS.length);
      setCash((c) => c + Math.round(Math.random() * 900 - 300));
    }, 1800);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-wrap items-center justify-center gap-12 text-white">
      <div>
        <Label>TextRoll</Label>
        <TextRoll value={WORDS[i]!} className="site-display text-3xl" />
      </div>
      <div>
        <Label>NumberRoll</Label>
        <NumberRoll value={cash} format={(n) => `$${n.toLocaleString("en-US")}`} className="site-display text-3xl" />
      </div>
    </div>
  );
}

function SmoothInputDemo() {
  return (
    <div className="grid w-full max-w-md gap-4">
      <SmoothInput placeholder="Type a plate, e.g. ZEN 01" aria-label="Plate" />
      <SmoothTextarea placeholder="A note for dispatch" aria-label="Note" rows={3} />
    </div>
  );
}

function NuiImageDemo() {
  return (
    <div className="flex flex-wrap items-end justify-center gap-6 text-white">
      <figure className="flex flex-col items-center gap-2">
        <NuiImage kind="item" imageKey="water" urls={["/missing-water.png"]} className="size-24 rounded-(--nk-radius-control) bg-black/40" />
        <figcaption className="text-xs text-white/70">None load: the fallback icon</figcaption>
      </figure>
    </div>
  );
}

/** The sections for items the page didn't show: the Default primitives first, then the rest, by group. */
export function NewSections({ Section }: { Section: SectionComponent }) {
  return (
    <>
      <Section name="tile" title="Tile" text="The one key language: keys, notice icons, tab marks, checked boxes, gears and telltales. A face slanted by --nk-tile-face-skew on a hard plate straight below it; sizes, shapes, states, tone and hue, a hold fill and a tag." stageClassName="items-start justify-start gap-10">
        <TileDemo />
      </Section>
      <Section name="fill" title="Fill" text="Status as a level filling left to right: a track, a bar scaled from the left (transform only) and a bright leading edge. Hue, then tone, then --nk-fill-color; at or under the alert threshold it turns danger." stageClassName="items-center">
        <FillDemo />
      </Section>
      <Section name="chip" title="Chip" text="A short status on one line: --nk-height-chip tall, --nk-radius-chip corners (never a pill), the label role. Hair, tint or solid; tone or hue only when the colour means something; a count; a status dot." stageClassName="items-start justify-start gap-10">
        <ChipDemo />
      </Section>
      <Section name="icon-text" title="Icon text" text="An icon and a value on one centre line: one gap, one icon size per step, the text in a role (num, label or body). Money, job, fuel, ammo and notes all use it." stageClassName="items-start justify-start">
        <IconTextDemo />
      </Section>
      <Section name="action-bar" title="Action bar" text="The one hint, close and back pattern: an optional plate, items gap-items apart, each keys (Tiles) or an icon plus a label. An item that acts is a button; a hold fills under it." stageClassName="items-center">
        <ActionBarDemo />
      </Section>
      <Section name="edge-sheet" title="Edge sheet" text="A full-height sheet on a screen edge: the pause menu's backdrop and the context sheet as one component. A back key, a level traced along the header, sub-pages that swap in place, a staggered slide-in and a faster exit." stageClassName="items-center">
        <EdgeSheetDemo />
      </Section>
      <Section name="collapse-stack" title="Collapse stack" text="Clustered indicators on the collapse engine: icons at rest, a change opens a chip for --nk-behavior-rest, changes within 400 ms open together, critical first, at most max, then +N." stageClassName="items-center">
        <CollapseDemo />
      </Section>
      <Section name="text-roll" title="Text roll" text="A value that changes like a slot reel: the old one rolls out, the new one in, masked to the line. NumberRoll rolls each digit on its own. Swaps at once when motion is off." stageClassName="items-center">
        <TextRollDemo />
      </Section>
      <Section name="smooth-input" title="Smooth input" text="Drop-ins for shadcn Input and Textarea: a caret that glides, typed characters that ease in. The real field underneath (selection, IME, paste); the native caret when motion is off." stageClassName="items-center">
        <SmoothInputDemo />
      </Section>
      <Section name="nui-image" title="NUI image" text="The picture of an item, clothing, vehicle or weapon by the conventions servers already use: candidate URLs from resolveImage, tried in turn, a quiet icon when none load. Never a broken image." stageClassName="items-center">
        <NuiImageDemo />
      </Section>
    </>
  );
}
