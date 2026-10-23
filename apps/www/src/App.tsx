import {
  ArrowRightIcon,
  BoxesIcon,
  BriefcaseIcon,
  CarIcon,
  CpuIcon,
  DownloadIcon,
  DropletIcon,
  HeartPulseIcon,
  KeyIcon,
  PaletteIcon,
  PlugIcon,
  RadioIcon,
  ShieldIcon,
  UtensilsIcon,
  WalletIcon,
  WrenchIcon,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CodeBlock, Command } from "@/components/code";
import { Credit } from "@/components/credit";
import { Footer, Nav, REPO, SITE } from "@/components/site";
import { ActionBar, ActionBarItem, ActionBarSep } from "@/components/ui/action-bar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Fill } from "@/components/ui/fill";
import { IconText } from "@/components/ui/icon-text";
import { KeyPrompt } from "@/components/ui/key-prompt";
import { MenuRow, MenuRowList } from "@/components/ui/menu-row";
import { Meter } from "@/components/ui/meter";
import { Notice, type NoticeStatus } from "@/components/ui/notice";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Speedometer } from "@/components/ui/speedometer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tile } from "@/components/ui/tile";
import { VitalChip } from "@/components/ui/vital-chip";
import { applyStageTheme, clearStageTheme } from "@/lib/stage-theme";
import { studioTheme } from "@/lib/theme-studio";
import { cn } from "@/lib/utils";
import { identities } from "@/themes";

export default function App() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <Nav />
      <main>
        <Hero />
        <What />
        <QuickStart />
        <Themes />
        <Showcase />
        <Proof />
        <Bridge />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}

/** True while the visitor asks for less motion: the demos hold still. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** setInterval that stops for reduced motion and while the tab is hidden. */
function useTick(ms: number, fn: () => void) {
  const reduced = useReducedMotion();
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => document.visibilityState === "visible" && ref.current(), ms);
    return () => clearInterval(id);
  }, [ms, reduced]);
}

/* ─────────────────────────────── Hero ─────────────────────────────── */

const TOASTS: { status: NoticeStatus; title: string; description: string }[] = [
  { status: "success", title: "Paid", description: "$500 from Lester" },
  { status: "info", title: "Garage", description: "Zentorno is ready at Legion Square" },
  { status: "warning", title: "Low fuel", description: "8% left. Next station 400 m" },
];

function Hero() {
  return (
    <section className="relative isolate">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] overflow-hidden" aria-hidden>
        <img src="/bg/hero.jpg" alt="" className="size-full object-cover opacity-30" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/80 to-background" />
      </div>
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20">
        <div className="flex flex-wrap items-center gap-3">
          <Credit />
          <a href={`${REPO}/releases/latest`} className="group">
            <Chip fill="hair">
              v0.8 · free and open source <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
            </Chip>
          </a>
        </div>
        <h1 className="ink-display mt-6 max-w-4xl text-[clamp(2.75rem,9vw,6.5rem)] text-balance">
          Every screen on your server. <span className="text-muted-foreground">One look.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-pretty text-muted-foreground sm:text-xl">
          nuikit is the shared layer between FiveM scripts and their screens: one runtime for focus, Escape, camera and theme, themed renderers for
          notifications, menus and input, and adapters that bring ox_lib, QBCore and ESX scripts in unchanged.{" "}
          <span className="text-foreground">Ink is the look it ships with.</span>
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button size="lg" className="h-12 px-6" asChild>
            <a href={`${REPO}/releases/latest`}>
              <DownloadIcon /> Download nuikit.zip
            </a>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-6" asChild>
            <a href="/components">
              Browse components <ArrowRightIcon />
            </a>
          </Button>
          <Command className="h-12 sm:w-80">npm create nuikit@latest</Command>
        </div>
        <HeroFrame className="mt-12 sm:mt-16" />
      </div>
    </section>
  );
}

/** A frame of the game in Ink: vitals, a key tile with its tag, a hold, a toast and the hint bar. */
function HeroFrame({ className }: { className?: string }) {
  const [v, setV] = useState({ health: 86, armor: 54, hunger: 41, thirst: 18 });
  const [hold, setHold] = useState(0);
  const [toast, setToast] = useState(0);
  useTick(2600, () =>
    setV((p) => ({
      health: p.health <= 30 ? 92 : p.health - 9,
      armor: p.armor,
      hunger: p.hunger <= 12 ? 70 : p.hunger - 4,
      thirst: p.thirst >= 90 ? 14 : p.thirst + 13,
    })),
  );
  useTick(90, () => setHold((h) => (h >= 1.35 ? 0 : h + 0.035)));
  useTick(5200, () => setToast((t) => (t + 1) % TOASTS.length));
  const t = TOASTS[toast]!;
  const vitals = [
    { k: "health", icon: <HeartPulseIcon />, label: "Health" },
    { k: "armor", icon: <ShieldIcon />, label: "Armor" },
    { k: "hunger", icon: <UtensilsIcon />, label: "Hunger" },
    { k: "thirst", icon: <DropletIcon />, label: "Thirst" },
  ] as const;
  return (
    <figure className={cn("relative isolate overflow-hidden rounded-(--nk-r-surface) border bg-black", className)} aria-label="nuikit's Ink look on a game frame">
      <img src="/bg/stage-dusk.jpg" alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover" />
      <div className="absolute inset-0 -z-10" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 45%, rgba(0,0,0,.6))" }} />
      <div className="grid min-h-[30rem] gap-6 p-4 sm:aspect-[2/1] sm:min-h-0 sm:grid-cols-[1fr_auto_1fr] sm:grid-rows-[auto_1fr_auto] sm:p-8">
        {/* top left: money and job */}
        <div className="flex flex-col gap-2 text-white sm:col-start-1 sm:row-start-1">
          <IconText icon={<WalletIcon />} text="num" size="lg">
            $12,480
          </IconText>
          <IconText icon={<BriefcaseIcon />} muted>
            LSPD · Sergeant
          </IconText>
        </div>
        {/* top right: the toast */}
        <div className="sm:col-start-3 sm:row-start-1 sm:justify-self-end">
          <Notice key={toast} status={t.status} title={t.title} description={t.description} duration={5000} pauseOnHover={false} className="w-full sm:w-80" />
        </div>
        {/* centre: keycaps with a tag, and a hold */}
        <div className="flex flex-col items-start gap-5 sm:col-start-2 sm:row-start-2 sm:items-center sm:self-center">
          <Tile size="lg" tag="Open garage" land>
            E
          </Tile>
          <div className="flex items-center gap-3">
            <Tile size="lg" state={hold > 1 ? "confirm" : "hold"} level={Math.min(1, hold)}>
              G
            </Tile>
            <span className="ink-eyebrow text-white">{hold > 1 ? "Engine on" : "Hold to start engine"}</span>
          </div>
        </div>
        {/* bottom left: the vitals row */}
        <div className="flex flex-col gap-3 sm:col-start-1 sm:row-start-3 sm:self-end">
          <VitalChip.Row>
            {vitals.map((x) => (
              <VitalChip.Root key={x.k} value={v[x.k]} tone={x.k}>
                <VitalChip.Shape>
                  <VitalChip.Level />
                  <VitalChip.Icon>{x.icon}</VitalChip.Icon>
                  <VitalChip.Label>{x.label}</VitalChip.Label>
                </VitalChip.Shape>
                <VitalChip.Label>{x.label}</VitalChip.Label>
              </VitalChip.Root>
            ))}
          </VitalChip.Row>
          <div className="flex gap-2">
            <Chip icon={<RadioIcon />}>101 MHz</Chip>
            <Chip variant="dot" tone="success" aria-label="On duty" />
          </div>
        </div>
        {/* bottom: the hint bar */}
        <div className="overflow-x-auto sm:col-span-3 sm:col-start-1 sm:row-start-3 sm:justify-self-center sm:self-end sm:overflow-visible">
          <ActionBar plate className="w-max">
            <ActionBarItem keys={["Tab"]} label="Choose" />
            <ActionBarItem keys={["Enter"]} label="Confirm" />
            <ActionBarSep />
            <ActionBarItem keys={["Esc"]} label="Back" />
          </ActionBar>
        </div>
      </div>
    </figure>
  );
}

/* ─────────────────────────────── Sections ─────────────────────────────── */

function SectionTitle({ eyebrow, title, children, id }: { eyebrow: string; title: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <div id={id} className="max-w-3xl scroll-mt-24">
      <p className="ink-eyebrow">{eyebrow}</p>
      <h2 className="ink-display mt-3 text-[clamp(2rem,5vw,3.25rem)] text-balance">{title}</h2>
      {children && <p className="mt-4 text-pretty text-muted-foreground sm:text-lg">{children}</p>}
    </div>
  );
}

const PARTS = [
  {
    icon: <CpuIcon />,
    title: "One runtime",
    text: "Focus, Escape across resources, the camera, controls, the theme and player context are coordinated once, so two UIs never fight over the cursor.",
  },
  {
    icon: <BoxesIcon />,
    title: "Intents, not screens",
    text: "Scripts ask for notify, menu, input, progress or a prompt. Swappable renderers draw them, so one theme change restyles every script.",
  },
  {
    icon: <PlugIcon />,
    title: "Adapters",
    text: "ox_lib, QBCore and ESX calls route into nuikit with no rewrites. Bespoke screens join through a small, versioned protocol.",
  },
  {
    icon: <PaletteIcon />,
    title: "The kit",
    text: "Stock shadcn/ui on one theme file, compiled for FiveM's Chromium 103. The registry and blocks are how every screen is built.",
  },
];

function What() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionTitle id="what" eyebrow="What it is" title="The layer every UI on the server shares.">
        Install it once. Your HUD, menus, inventory, pause and loading screens, and the scripts you already run, start behaving like one product.
      </SectionTitle>
      <ol className="mt-10 divide-y border-y">
        {PARTS.map((p, i) => (
          <li key={p.title} className="grid gap-x-6 gap-y-2 py-6 sm:grid-cols-[4rem_14rem_1fr] sm:items-center">
            <Tile shape="square" size="lg" aria-hidden>
              {p.icon}
            </Tile>
            <h3 className="ink-display text-2xl">
              <span className="mr-2 text-muted-foreground">0{i + 1}</span>
              {p.title}
            </h3>
            <p className="text-pretty text-muted-foreground">{p.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
      <Tile size="md" shape="square" aria-hidden>
        {n}
      </Tile>
      <h3 className="ink-display self-center text-xl">{title}</h3>
      <div className="col-start-2 min-w-0 text-sm text-muted-foreground">{children}</div>
    </li>
  );
}

function QuickStart() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionTitle id="start" eyebrow="Quick start" title="Running in five minutes." />
      <Tabs defaultValue="server" className="mt-8">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="server">Run a server</TabsTrigger>
          <TabsTrigger value="ui">Build a UI</TabsTrigger>
          <TabsTrigger value="component">Add a component</TabsTrigger>
        </TabsList>
        <TabsContent value="server" className="mt-6">
          <ol className="grid gap-8 md:grid-cols-3">
            <Step n={1} title="Download">
              <p>
                Get <code className="font-mono text-foreground">nuikit.zip</code> from the{" "}
                <a className="text-foreground underline underline-offset-4" href={`${REPO}/releases/latest`}>
                  latest release
                </a>
                .
              </p>
            </Step>
            <Step n={2} title="Drop it in">
              <p className="mb-3">
                Unzip <code className="font-mono text-foreground">[nuikit]</code> into your resources folder, then in server.cfg:
              </p>
              <Command className="h-10 text-xs">ensure [nuikit]</Command>
            </Step>
            <Step n={3} title="Make it yours">
              <p>
                Ink is on by default. Copy another identity over <code className="font-mono text-foreground">nuikit/theme.css</code> or make your own in the{" "}
                <a className="text-foreground underline underline-offset-4" href="/theme">
                  theme studio
                </a>
                .
              </p>
            </Step>
          </ol>
        </TabsContent>
        <TabsContent value="ui" className="mt-6">
          <ol className="grid gap-8 md:grid-cols-3">
            <Step n={1} title="Scaffold">
              <Command className="h-10 text-xs">npm create nuikit@latest my-hud</Command>
            </Step>
            <Step n={2} title="Develop in the browser">
              <p className="mb-3">Fake game data, devtools on the backtick key, hot reload in game while it runs.</p>
              <Command className="h-10 text-xs">npm run dev</Command>
            </Step>
            <Step n={3} title="Ship">
              <p>
                <code className="font-mono text-foreground">npm run build</code> writes a resource FiveM's Chromium 103 renders exactly as your browser did.
              </p>
            </Step>
          </ol>
        </TabsContent>
        <TabsContent value="component" className="mt-6">
          <ol className="grid gap-8 md:grid-cols-3">
            <Step n={1} title="Pick one">
              <p>
                Every component has a live preview, its props and its levers on{" "}
                <a className="text-foreground underline underline-offset-4" href="/components">
                  /components
                </a>
                .
              </p>
            </Step>
            <Step n={2} title="Add it">
              <Command className="h-10 text-xs">{`npx shadcn add ${SITE}/r/tile.json`}</Command>
            </Step>
            <Step n={3} title="Own it">
              <p>The code lands in your project, next to shadcn's. It reads tokens only, so it follows any theme.</p>
            </Step>
          </ol>
        </TabsContent>
      </Tabs>
    </section>
  );
}

/** The identities, Ink first; picking one repaints the preview the way nuikit/theme.css repaints the server. */
function Themes() {
  const [active, setActive] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = stage.current;
    const id = identities[active];
    if (!el || !id) return;
    applyStageTheme(studioTheme(id.css), el);
    el.style.fontFamily = "var(--font-sans)";
    return () => {
      clearStageTheme(el);
      el.style.removeProperty("font-family");
    };
  }, [active]);
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionTitle id="themes" eyebrow="Themes" title="Ink by default. Seven more in the box.">
        A theme is one CSS file of values: colour, type, shape, surface, motion and the HUD's style. Ink is the flagship. Pick another and every screen
        follows, in game too. Or paste any TweakCN theme.
      </SectionTitle>
      <div className="mt-10 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div role="radiogroup" aria-label="Theme" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {identities.map((t, i) => (
            <button
              key={t.name}
              role="radio"
              aria-checked={active === i}
              onClick={() => setActive(i)}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-(--nk-r-control) border px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                active === i ? "border-foreground/60 bg-accent text-foreground" : "text-muted-foreground",
              )}
            >
              <span className="flex" aria-hidden>
                {t.swatch.map((c, j) => (
                  <span key={j} className="size-3.5 rounded-(--nk-r-key) border border-white/20" style={{ background: c, marginLeft: j ? -4 : 0 }} />
                ))}
              </span>
              <span className="font-medium">{t.name}</span>
              {i === 0 && <span className="ink-eyebrow ml-auto hidden lg:inline">Default</span>}
            </button>
          ))}
        </div>
        <div ref={stage} className="relative isolate overflow-hidden rounded-(--nk-r-surface) border bg-black">
          <img src="/bg/stage-day.jpg" alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover" />
          <div className="flex flex-wrap items-end justify-center gap-6 p-4 sm:p-8">
            <Panel size="sm" className="w-full max-w-sm">
              <PanelHeader icon={<CarIcon />} title="Garage" description="Legion Square" />
              <PanelBody variant="list">
                <MenuRowList>
                  <MenuRow icon={<CarIcon />} description="Stored, 98% condition" meta="ZEN 01" active>
                    Pegassi Zentorno
                  </MenuRow>
                  <MenuRow icon={<CarIcon />} description="Impounded, $250" meta="SUL 07">
                    Karin Sultan
                  </MenuRow>
                  <MenuRow icon={<WrenchIcon />} description="Fix every car here" meta="$900">
                    Repair all
                  </MenuRow>
                  <MenuRow icon={<KeyIcon />} description="Share with a player" chevron>
                    Give keys
                  </MenuRow>
                </MenuRowList>
              </PanelBody>
            </Panel>
            <div className="flex w-full max-w-xs flex-col gap-4">
              <Notice status="success" title="Paid" description="$500 from Lester" duration={0} animate={false} />
              <KeyPrompt keys="E" label="Open garage" />
              <Meter variant="slab" label="Repairing" value={62} cancelKey="X" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A tile in the component showcase: the live part on the game, its name, a link to its page. */
function Part({ name, title, text, children, className }: { name: string; title: string; text: string; children: ReactNode; className?: string }) {
  return (
    <a href={`/components/${name}`} className={cn("group ink-plate flex flex-col overflow-hidden transition-colors hover:bg-accent", className)}>
      <div className="relative isolate grid min-h-44 flex-1 place-items-center overflow-hidden border-b bg-black p-6">
        <img src="/bg/stage-dusk.jpg" alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover opacity-60" />
        <div className="pointer-events-none">{children}</div>
      </div>
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <h3 className="ink-display text-xl">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{text}</p>
        </div>
        <ArrowRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </a>
  );
}

function Showcase() {
  const [lv, setLv] = useState(0.62);
  useTick(1400, () => setLv((l) => (l <= 0.14 ? 0.9 : l - 0.12)));
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionTitle id="components" eyebrow="Components" title="The parts every screen is made of.">
        Thirty-odd registry components on stock shadcn/ui, installed with the shadcn CLI you already use. Every state is a prop, every look is a token.
      </SectionTitle>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Part name="tile" title="Tile" text="The one key language: keys, icons, gears, telltales.">
          <div className="flex items-center gap-3">
            <Tile size="lg">E</Tile>
            <Tile size="lg" active>
              F
            </Tile>
            <Tile size="lg" shape="square" tone="danger" state="alert">
              <HeartPulseIcon />
            </Tile>
            <Tile size="lg" state="hold" level={lv}>
              G
            </Tile>
          </div>
        </Part>
        <Part name="fill" title="Fill" text="Status as a level filling left to right. No rings.">
          <div className="flex w-48 flex-col gap-3">
            <Fill level={lv} />
            <Fill level={0.46} hue="armor" />
            <Fill level={lv / 4} alertAt />
          </div>
        </Part>
        <Part name="chip" title="Chip" text="A tag, a count or a status dot. Never a pill.">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Chip icon={<RadioIcon />}>101 MHz</Chip>
            <Chip tone="success" fill="tint">
              On duty
            </Chip>
            <Chip tone="danger" fill="solid" count={3}>
              Wanted
            </Chip>
            <Chip variant="dot" tone="warning" aria-label="Away" />
          </div>
        </Part>
        <Part name="action-bar" title="Action bar" text="Key hints, back and close: one bar.">
          <ActionBar plate>
            <ActionBarItem keys={["Enter"]} label="Buy" />
            <ActionBarItem keys={["Esc"]} label="Back" />
          </ActionBar>
        </Part>
        <Part name="icon-text" title="Icon text" text="Money, job, fuel, ammo: an icon next to a value.">
          <div className="flex flex-col gap-2 text-white">
            <IconText icon={<WalletIcon />} text="num" size="lg">
              $48,210
            </IconText>
            <IconText icon={<BriefcaseIcon />} muted>
              EMS · Paramedic
            </IconText>
          </div>
        </Part>
        <Part name="notice" title="Notice" text="A tile, a title, a line that drains.">
          <Notice status="error" title="Engine failure" description="Pull over before it stalls" duration={0} animate={false} className="w-72" />
        </Part>
        <Part name="key-prompt" title="Key prompt" text="The key and what it does, with hold to confirm.">
          <KeyPrompt keys="E" label="Hold to rob register" progress={lv} />
        </Part>
        <Part name="meter" title="Meter" text="A level on a bar, a threshold, a timed slab.">
          <div className="w-60">
            <Meter variant="slab" label="Picking lock" value={lv * 100} cancelKey="X" />
          </div>
        </Part>
        <Part name="speedometer" title="Speedometer" text="The vehicle gauge, legible over any sky.">
          <Speedometer speed={Math.round(40 + lv * 90)} rpm={lv} gear={3} fuel={64} size={150} />
        </Part>
      </div>
      <div className="mt-8">
        <Button variant="outline" asChild>
          <a href="/components">
            All components <ArrowRightIcon />
          </a>
        </Button>
      </div>
    </section>
  );
}

function Proof() {
  const fixes = [
    ["oklch() colours", "Every shadcn theme since v4 is oklch. Chromium 103 drops it, so buttons and cards render with no background."],
    ["bg-primary/50", "Tailwind v4 opacity is color-mix() of a variable. nuikit gives each token live RGB channels instead."],
    ["md: breakpoints", "Tailwind v4 emits media range syntax (width >= 48rem), added in Chromium 104. Lowered to min-width."],
    ["translate / scale", "Individual transform properties are 104+, so centred dialogs drift. Lowered to one transform."],
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionTitle id="proof" eyebrow="Built for FiveM" title="Modern shadcn, in a 2022 browser.">
        FiveM's NUI runs Chromium 103; Tailwind v4 assumes 111+. vite-plugin-nuikit compiles your CSS down at build time, and CI renders it in a real
        Chromium 103 to prove it. This site goes through the same plugin.
      </SectionTitle>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_26rem]">
        <dl className="divide-y border-y">
          {fixes.map(([t, d]) => (
            <div key={t} className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <dt className="font-mono text-sm">{t}</dt>
              <dd className="text-sm text-muted-foreground">{d}</dd>
            </div>
          ))}
        </dl>
        <CodeBlock
          title="vite.config.ts"
          lang="ts"
          code={`import tailwindcss from "@tailwindcss/vite";
import { nuikit } from "vite-plugin-nuikit";

export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit()],
});`}
        />
      </div>
    </section>
  );
}

function Bridge() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionTitle id="bridge" eyebrow="Lua ↔ React" title="Typed end to end.">
        One <code className="font-mono text-foreground">nui.d.ts</code> describes every message. <code className="font-mono text-foreground">fetchNui</code>{" "}
        autocompletes and checks payloads; whatever your Lua handler returns is the response. QBCore, Qbox, ESX, ox or standalone.
      </SectionTitle>
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <CodeBlock
          title="web/src/App.tsx"
          lang="ts"
          code={`const vitals = useNuiState("hud:vitals", { health: 100, armor: 0 });
const { visible } = useNuiVisibility(); // Escape closes

async function buy(id: string) {
  const { ok, cash } = await fetchNui("shop:buy", { id });
}`}
        />
        <CodeBlock
          title="client/main.lua"
          lang="lua"
          code={`NUI.on('shop:buy', function(data)
  local ok = BuyVehicle(data.id)
  return { ok = ok, cash = GetCash() }
end)

NUI.send('hud:vitals', { health = 80, armor = 50 })
NUI.notify({ title = 'Paid', type = 'success' })`}
        />
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6">
      <div className="ink-plate flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:p-10">
        <div className="flex-1">
          <h2 className="ink-display text-[clamp(2rem,5vw,3rem)]">Give your server one look.</h2>
          <p className="mt-2 text-muted-foreground">Free, MIT licensed, built in the open.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" className="h-12 px-6" asChild>
            <a href={`${REPO}/releases/latest`}>
              <DownloadIcon /> Download
            </a>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-6" asChild>
            <a href={REPO}>Star on GitHub</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
