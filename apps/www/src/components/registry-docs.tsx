// The registry's catalogue on /components: the item list and side navigation, the props and levers tables
// (src/generated/api.json, read from the sources by scripts/api.mjs), and the sections for the items the page
// didn't show before (the Default primitives and the utilities).
import {
  BriefcaseIcon,
  CarIcon,
  ChevronDownIcon,
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
import { Command } from "@/components/code";
import { ActionBar, ActionBarItem, ActionBarSep } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CollapseMore, CollapseStack } from "@/components/ui/collapse-stack";
import { EdgeSheet, EdgeSheetBody, EdgeSheetFooter } from "@/components/ui/edge-sheet";
import { Fill } from "@/components/ui/fill";
import { IconText } from "@/components/ui/icon-text";
import { MenuRow, MenuRowList } from "@/components/ui/menu-row";
import { NuiImage } from "@/components/ui/nui-image";
import { NuiMenu } from "@/components/ui/nui-menu";
import { SmoothInput, SmoothTextarea } from "@/components/ui/smooth-input";
import { NumberRoll, TextRoll } from "@/components/ui/text-roll";
import { Tile } from "@/components/ui/tile";
import { Vital } from "@/components/ui/vital";
import { VitalChip } from "@/components/ui/vital-chip";
import { cn } from "@/lib/utils";
import api from "@/generated/api.json";
import type { SectionComponent } from "@/pages/components";
import registry from "../../../../registry.json";

type Prop = { name: string; type: string; default: string | null; doc: string; required: boolean };
type Api = Record<string, { components: { name: string; props: Prop[] }[]; levers: string[] }>;
const API = api as Api;

const DESCRIPTIONS = new Map((registry.items as { name: string; description?: string }[]).map((i) => [i.name, i.description ?? ""]));

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
export const HIDDEN = UI.filter((i) => i.meta?.hidden && i.meta.tier !== "alias").map((i) => ({ name: i.name, title: i.title ?? i.name, reason: i.meta?.hiddenReason ?? "" }));
/** The catalogue's order: the listed items in nav order, everything else after. */
export const ORDER = new Map(GROUPS.flatMap((g) => g.items).map(([name], i) => [name, i] as const));
export const VARIANTS = new Map(UI.flatMap((i) => (i.meta?.variants ? [[i.name, { ...i.meta.variants, tier: i.meta.tier, group: i.meta.group }] as const] : [])));

export const ITEMS = [...GROUPS, ...byGroup(true)].flatMap((g) => g.items.map(([name, title]) => ({ name, title, group: g.group, description: DESCRIPTIONS.get(name) ?? "" })));

/** A card's wiring: the variant axes, the levers it reads and the hooks that make it live. */
export function Wiring({ name }: { name: string }) {
  const v = VARIANTS.get(name);
  if (!v) return null;
  const axes = Object.entries(v.axes);
  const shown = v.levers.slice(0, 8);
  const code = "inline-flex h-6 items-center rounded-(--nk-r-key) border px-1.5 font-mono text-xs text-muted-foreground";
  return (
    <dl data-slot="component-wiring" className="mt-4 grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-2 text-sm">
      {axes.length > 0 && (
        <>
          <dt className="text-muted-foreground">Variants</dt>
          <dd className="flex flex-col gap-1">
            {axes.map(([axis, vals]) => (
              <span key={axis}>
                <span className="font-mono text-xs text-muted-foreground">{axis}</span> {vals.join(" · ")}
              </span>
            ))}
          </dd>
        </>
      )}
      {shown.length > 0 && (
        <>
          <dt className="text-muted-foreground">Levers</dt>
          <dd className="flex flex-wrap gap-1.5">
            {shown.map((l) => (
              <code key={l} className={code}>
                {l}
              </code>
            ))}
            {v.levers.length > shown.length && <span className="self-center text-xs text-muted-foreground">+{v.levers.length - shown.length} more</span>}
          </dd>
        </>
      )}
      {v.hooks.length > 0 && (
        <>
          <dt className="text-muted-foreground">Hooks</dt>
          <dd className="flex flex-wrap gap-1.5">
            {v.hooks.map((h) => (
              <code key={h} className={code}>
                {h}
              </code>
            ))}
          </dd>
        </>
      )}
    </dl>
  );
}

/** Installable but not featured: composites that a foundation covers with a prop, and internal helpers. */
export function HiddenList() {
  if (typeof location !== "undefined" && /^\/components\/./.test(location.pathname)) return null;
  return (
    <section id="more" style={{ order: 1001 }} className="mt-20 scroll-mt-20">
      <h2 className="site-display text-3xl">Also installable</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground text-pretty">
        Not featured: a foundation above covers each with a prop, or it is a helper under one. They stay in the registry, and the block that uses one shows it composed.
      </p>
      <ul className="mt-6 divide-y border-y">
        {HIDDEN.map((h) => (
          <li key={h.name} className="grid gap-1 py-3 md:grid-cols-[12rem_1fr] md:gap-6">
            <a href={`/components/${h.name}`} className="font-mono text-sm underline-offset-4 hover:underline">
              {h.name}
            </a>
            <p className="text-sm text-pretty text-muted-foreground">{h.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Sticky on wide screens; a disclosure on phones. */
export function SideNav({ current }: { current: string | null }) {
  const list = (
    <nav aria-label="Components" className="flex flex-col gap-6 text-sm">
      <a href="/components" aria-current={current === null ? "page" : undefined} className={cn("text-muted-foreground hover:text-foreground", current === null && "text-foreground")}>
        All components
      </a>
      {GROUPS.map((g) => (
        <div key={g.group}>
          <p className="site-eyebrow mb-2">{g.group}</p>
          <ul className="flex flex-col">
            {g.items.map(([name, title]) => (
              <li key={name}>
                <a
                  href={`/components/${name}`}
                  aria-current={current === name ? "page" : undefined}
                  className={cn(
                    "-ml-3 block border-l-2 border-transparent py-1 pl-3 text-muted-foreground hover:text-foreground",
                    current === name && "border-foreground font-medium text-foreground",
                  )}
                >
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <a href="/components#hooks" className="text-muted-foreground hover:text-foreground">
        Hooks
      </a>
    </nav>
  );
  return (
    <>
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-48 shrink-0 overflow-y-auto py-14 pr-2 lg:block">{list}</aside>
      <details className="group fixed inset-x-4 bottom-4 z-30 rounded-(--nk-r-surface) border bg-popover shadow-[0_0.125rem_0_rgba(0,0,0,0.6)] lg:hidden">
        <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
          {ITEMS.find((i) => i.name === current)?.title ?? "All components"}
          <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="max-h-[60vh] overflow-y-auto border-t px-4 py-4">{list}</div>
      </details>
    </>
  );
}

/** Props (per exported component) and the --nk-* levers the item reads. */
export function ApiDetails({ name, open = false }: { name: string; open?: boolean }) {
  const a = API[name];
  if (!a) return null;
  const parts = a.components.filter((c) => c.props.length > 0);
  return (
    <details data-slot="component-api" open={open} className="group mt-4 border-y">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon className="size-4 -rotate-90 transition-transform group-open:rotate-0" aria-hidden />
        Props and levers
        <span className="font-normal text-muted-foreground">
          {parts.reduce((n, c) => n + c.props.length, 0)} props · {a.levers.length} levers
        </span>
      </summary>
      <div className="flex flex-col gap-8 pb-6">
        {parts.map((c) => (
          <div key={c.name} className="min-w-0">
            <h3 className="font-mono text-sm">{`<${c.name}>`}</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Prop</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Default</th>
                    <th className="py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {c.props.map((p) => (
                    <tr key={p.name} className="border-b align-top last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap">
                        {p.name}
                        {p.required && <span className="text-muted-foreground">*</span>}
                      </td>
                      <td className="max-w-64 py-2 pr-4 font-mono text-xs break-words text-muted-foreground">{p.type}</td>
                      <td className="py-2 pr-4 font-mono text-xs whitespace-nowrap text-muted-foreground">{p.default ?? "–"}</td>
                      <td className="py-2 text-pretty text-muted-foreground">{p.doc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {a.levers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium">Levers</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The theme values this reads. Set them in <code className="font-mono text-foreground">nuikit/theme.css</code> for the whole server, or on any
              element for one subtree.
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {a.levers.map((l) => (
                <li key={l}>
                  <code className="inline-flex h-6 items-center rounded-(--nk-r-key) border px-1.5 font-mono text-xs text-muted-foreground">{l}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

const HOOKS = [
  { name: "use-linear-run", text: DESCRIPTIONS.get("use-linear-run") ?? "" },
  { name: "use-nui-store", text: "Merge partial updates from Lua into one object: useNuiStore(event, initial)." },
  { name: "use-collapse", text: DESCRIPTIONS.get("use-collapse") ?? "" },
];

export function Hooks() {
  if (typeof location !== "undefined" && /^\/components\/./.test(location.pathname)) return null;
  return (
    <section id="hooks" style={{ order: 1000 }} className="mt-16 scroll-mt-24">
      <h2 className="site-display text-3xl">Hooks</h2>
      <ul className="mt-6 divide-y border-y">
        {HOOKS.map((h) => (
          <li key={h.name} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <code className="font-mono text-sm">{h.name}</code>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">{h.text}</p>
            </div>
            <Command className="h-10 w-full text-xs md:w-[28rem]">{`npx shadcn add https://nuikit.vercel.app/r/${h.name}.json`}</Command>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
        { label: "alertAt (≤ --nk-alert-threshold turns it danger)", el: <Fill level={lv} alertAt /> },
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

function VitalDemo() {
  const hp = useWalk(0.72, 0.07, 900);
  return (
    <div className="flex w-56 flex-col gap-3">
      <Vital value={hp * 100} tone="destructive" icon={<HeartPulseIcon />} label="Health" />
      <Vital value={64} icon={<ShieldIcon />} label="Armor" low={-1} />
      <Vital value={38} tone="chart-2" icon={<UtensilsIcon />} label="Hunger" />
      <Vital value={14} tone="chart-3" icon={<DropletIcon />} label="Thirst" size="sm" />
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

function NuiMenuDemo() {
  return (
    <NuiMenu
      global={false}
      title="Garage"
      description="Legion Square"
      items={[
        { id: "a", label: "Pegassi Zentorno", description: "Stored · 98% condition", icon: <CarIcon />, meta: "ZEN 01" },
        { id: "b", label: "Bravado Buffalo", description: "Impounded · $250 fee", icon: <CarIcon />, meta: "BUF 22" },
        { id: "c", label: "Repair all", description: "Fix everything", icon: <WrenchIcon />, meta: "$900" },
        { id: "d", label: "Give keys", description: "Share with a player", icon: <KeyIcon /> },
      ]}
      onSelect={(i) => emit("nuikit:notify", { title: i.label, description: 'fetchNui("garage:spawn")' })}
    />
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
        <NuiImage kind="vehicle" imageKey="zentorno" urls={["/screens/garage-missing.png", "/bg/garage.jpg"]} className="aspect-video w-56 rounded-(--nk-r-control) object-cover" />
        <figcaption className="text-xs text-white/70">The second URL loads after the first fails</figcaption>
      </figure>
      <figure className="flex flex-col items-center gap-2">
        <NuiImage kind="item" imageKey="water" urls={["/missing-water.png"]} className="size-24 rounded-(--nk-r-control) bg-black/40" />
        <figcaption className="text-xs text-white/70">None load: the fallback icon</figcaption>
      </figure>
    </div>
  );
}

/** The sections for items the page didn't show: the Default primitives first, then the rest, by group. */
export function NewSections({ Section }: { Section: SectionComponent }) {
  return (
    <>
      <Section name="tile" title="Tile" text="The one key language: keys, notice icons, tab marks, checked boxes, gears and telltales. A face slanted by --nk-tile-skew on a hard plate straight below it; sizes, shapes, states, tone and hue, a hold fill and a tag." stageClassName="items-start justify-start gap-10">
        <TileDemo />
      </Section>
      <Section name="fill" title="Fill" text="Status as a level filling left to right: a track, a bar scaled from the left (transform only) and a bright leading edge. Hue, then tone, then --nk-fill-color; at or under the alert threshold it turns danger." stageClassName="items-center">
        <FillDemo />
      </Section>
      <Section name="chip" title="Chip" text="A short status on one line: --nk-h-chip tall, --nk-r-chip corners (never a pill), the label role. Hair, tint or solid; tone or hue only when the colour means something; a count; a status dot." stageClassName="items-start justify-start gap-10">
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
      <Section name="nui-menu" title="NUI menu" text="A keyboard menu on a panel: arrows move, Enter selects, the highlight follows the theme. Items carry an icon, a description and meta." stageClassName="items-center">
        <NuiMenuDemo />
      </Section>
      <Section name="vital" title="Vital" text="The compact vital: an icon and a bar, coloured by a theme token, pulsing when low. The HUD's chips are VitalChip; this is the bar form." stageClassName="items-center">
        <VitalDemo />
      </Section>
      <Section name="collapse-stack" title="Collapse stack" text="Clustered indicators on the collapse engine: icons at rest, a change opens a chip for --nk-rest-delay, changes within 400 ms open together, critical first, at most max, then +N." stageClassName="items-center">
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
