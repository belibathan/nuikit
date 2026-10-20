import { applyTheme, clearTheme, emit, type ThemeVars } from "nuikit-core/react";
import { ArrowRightIcon, CarIcon, DownloadIcon, GithubIcon, HeartPulseIcon, KeyIcon, ShieldIcon, WrenchIcon, ZapIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CodeBlock, Command, CopyButton } from "@/components/code";
import { Credit } from "@/components/credit";
import { Footer, Nav, REPO, SITE } from "@/components/site";
import { Backdrop } from "@/components/scene";
import { Stage, radialItems } from "@/components/stage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { KeyHint } from "@/components/ui/key-hint";
import { NuiMenu } from "@/components/ui/nui-menu";
import { RadialMenu } from "@/components/ui/radial-menu";
import { Speedometer } from "@/components/ui/speedometer";
import { TaskProgress } from "@/components/ui/task-progress";
import { Textarea } from "@/components/ui/textarea";
import { Vital } from "@/components/ui/vital";
import { cn } from "@/lib/utils";
import { themes } from "@/themes";

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <Screens />
        <Proof />
        <Themes />
        <Gallery />
        <Bridge />
        <Loop />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden" aria-hidden>
        <img src="/bg/hero.jpg" alt="" className="size-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-16">
      <div className="flex flex-col items-center gap-3">
        <Credit />
        <Badge variant="outline" asChild>
          <a href={`${REPO}/releases/latest`}>
            0.4: the whole kit is out <ArrowRightIcon />
          </a>
        </Badge>
      </div>
      <h1 className="mx-auto mt-6 max-w-3xl text-center text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
        One design system for your whole FiveM server.
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-muted-foreground text-pretty">
        HUD, menus, inventory, pause, loading screen and more, rebuilt in stock shadcn/ui and themed by one file. Drop in a folder, paste a TweakCN
        theme, and every screen on your server matches. Free and open source.
      </p>
      <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
        <Button size="lg" className="h-12 flex-1" asChild>
          <a href={`${REPO}/releases/latest`}>
            <DownloadIcon /> Download nuikit.zip
          </a>
        </Button>
        <Button size="lg" variant="outline" className="h-12" asChild>
          <a href={REPO}>
            <GithubIcon /> GitHub
          </a>
        </Button>
      </div>
      <p className="mx-auto mt-4 text-center text-sm text-muted-foreground">
        Building your own UI? <code className="font-mono text-foreground">npm create nuikit@latest</code>
      </p>
      <div className="mt-14">
        <Stage />
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Live demo. Hold <Kbd>E</Kbd> and click the menu. Every value arrives through <code className="font-mono text-foreground">useNuiEvent</code>, the
          same way Lua sends it in game.
        </p>
      </div>
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, children, id }: { eyebrow: string; title: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <div id={id} className="mx-auto max-w-3xl scroll-mt-24 text-center">
      <Badge variant="secondary">{eyebrow}</Badge>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">{title}</h2>
      {children && <p className="mt-4 text-muted-foreground text-pretty">{children}</p>}
    </div>
  );
}

/** What 0.4 ships, captured from each screen's browser dev mode (scripts/screens.mjs). */
const SCREENS = [
  { src: "/screens/pause.jpg", title: "Pause menu", text: "nuikit_pause replaces GTA's Esc menu." },
  { src: "/screens/hud.jpg", title: "HUD", text: "nuikit_hud: vitals, needs, voice, money, speedometer." },
  { src: "/screens/death.jpg", title: "Death screen", text: "nuikit_death follows your medical resource's timers." },
  { src: "/screens/loading.jpg", title: "Loading screen", text: "nuikit_loading, with the real handover progress." },
  { src: "/screens/ox-lib.jpg", title: "ox_lib", text: "Menus, dialogs, progress and notifications for every Qbox resource." },
  { src: "/screens/ox-inventory.jpg", title: "ox_inventory", text: "Inventory, shops and crafting." },
  { src: "/screens/banking.jpg", title: "Renewed-Banking", text: "Accounts, transfers and history." },
  { src: "/screens/appearance.jpg", title: "illenium-appearance", text: "Character creator, clothing, barber and tattoos." },
];

function Screens() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle id="screens" eyebrow="0.4" title="Every screen on the server, one look.">
        Drop the [nuikit] folder into resources and these replace the stock interfaces. Paste a TweakCN theme into nuikit/theme.css and all of them
        change together.
      </SectionTitle>
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {SCREENS.map((s) => (
          <figure key={s.src} className="overflow-hidden rounded-xl border bg-card">
            <img src={s.src} alt={s.title} loading="lazy" className="aspect-video w-full bg-muted object-cover" />
            <figcaption className="px-4 py-3 text-sm">
              <span className="font-medium">{s.title}</span> <span className="text-muted-foreground">{s.text}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Proof() {
  const fixes = [
    ["oklch() colors", "Every shadcn theme since v4 is oklch. Chromium 103 throws it away, so buttons and cards render with no background."],
    ["bg-primary/50", "Tailwind v4 opacity is color-mix() of a CSS variable, which no build tool can resolve. nuikit gives each token live RGB channels."],
    ["md: breakpoints", "Tailwind v4 emits media range syntax (width >= 48rem), which Chromium 104 added. Lowered to min-width."],
    ["translate / scale / rotate", "Individual transform properties are 104+. Every centered Dialog is off-center. Lowered to one transform."],
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle id="proof" eyebrow="The problem" title="Same code. Same browser. One line of config.">
        FiveM's NUI runs Chromium 103. Modern shadcn and Tailwind v4 assume 111+. vite-plugin-nuikit compiles your CSS down at build time, and CI renders it in a
        real Chromium 103 to prove it.
      </SectionTitle>
      <Card className="mt-12 p-2">
        <img src="/compare.png" alt="Stock shadcn rendered in Chromium 103: no colors, broken layout. With nuikit: correct." className="w-full rounded-lg" />
      </Card>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fixes.map(([t, d]) => (
          <Card key={t} className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle className="font-mono text-sm">{t}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 text-sm text-muted-foreground">{d}</CardContent>
          </Card>
        ))}
      </div>
      <CodeBlock
        className="mx-auto mt-8 max-w-2xl"
        title="vite.config.ts"
        lang="ts"
        code={`import tailwindcss from "@tailwindcss/vite";
import { nuikit } from "vite-plugin-nuikit";

export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit()], // ← that's it
});`}
      />
    </section>
  );
}

function Themes() {
  const [active, setActive] = useState(0);
  const [custom, setCustom] = useState("");
  const applied = useRef<ThemeVars | null>(null);

  const apply = (css: string) => {
    if (applied.current) clearTheme(applied.current);
    applied.current = applyTheme(css, document.documentElement, "dark");
  };

  useEffect(() => () => void (applied.current && clearTheme(applied.current)), []);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle id="themes" eyebrow="Theming" title="shadcn's tokens are the design system.">
        nuikit components use nothing but shadcn tokens. Paste any{" "}
        <a className="text-foreground underline underline-offset-4" href="https://tweakcn.com">
          TweakCN
        </a>{" "}
        theme and this whole page, HUD included, follows. At runtime too, in Chromium 103, via <code className="font-mono text-foreground">applyTheme()</code>.
      </SectionTitle>
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {themes.map((t, i) => (
          <Button
            key={t.name}
            variant={active === i ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              setActive(i);
              apply(t.css);
            }}
          >
            <span className="flex -space-x-1">
              {t.swatch.map((c) => (
                <span key={c} className="size-3 rounded-full ring-2 ring-background" style={{ background: c }} />
              ))}
            </span>
            {t.name}
          </Button>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Stage menu={false} scene="day" />
        <Card>
          <CardHeader>
            <CardTitle>Paste a theme</CardTitle>
            <CardDescription>The CSS from tweakcn.com or ui.shadcn.com/themes.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <Textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={themes[1]!.css}
              spellCheck={false}
              className="h-full min-h-48 resize-none font-mono text-xs"
            />
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              disabled={!custom.trim()}
              onClick={() => {
                setActive(-1);
                apply(custom);
              }}
            >
              Apply to everything
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}

function Showcase({ name, title, description, children, className }: { name: string; title: string; description: string; children: ReactNode; className?: string }) {
  const cmd = `npx shadcn add ${SITE}/r/${name}.json`;
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <div className="grid min-h-56 flex-1 place-items-center border-b bg-muted/30 p-6">{children}</div>
      <CardHeader className="pt-5">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="pt-3 pb-5">
        <div className="flex w-full items-center gap-2 rounded-md border bg-muted/40 py-1 pr-1 pl-3 font-mono text-xs text-muted-foreground">
          <span className="flex-1 truncate">{cmd}</span>
          <CopyButton text={cmd} />
        </div>
      </CardFooter>
    </Card>
  );
}

function Gallery() {
  const [hp, setHp] = useState(72);
  const [run, setRun] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHp((h) => (h <= 12 ? 100 : h - 7)), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="relative">
      <Backdrop src="/bg/garage.jpg" />
      <div className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle id="components" eyebrow="Registry" title="Game UI, composed from shadcn's own components.">
        Installed with the shadcn CLI you already use; their shadcn dependencies (Card, Item, Kbd, Progress, Badge) come with them. The code lands in your project
        and every piece is token-only and Chromium 103 safe.
      </SectionTitle>
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Showcase name="vital" title="Vital" description="Icon + Progress, colored by a theme token. Pulses when low.">
          <div className="flex w-full max-w-48 flex-col gap-3">
            <Vital value={hp} tone="destructive" icon={<HeartPulseIcon />} label="Health" />
            <Vital value={64} icon={<ShieldIcon />} label="Armor" low={-1} />
            <Vital value={88} tone="chart-2" icon={<ZapIcon />} label="Stamina" />
          </div>
        </Showcase>
        <Showcase name="key-hint" title="Key Hint" description="Kbd + label, with hold-to-confirm on Progress.">
          <div className="flex flex-col items-center gap-3">
            <KeyHint keys="E" hold={900} onConfirm={() => emit("nuikit:notify", { title: "Confirmed", type: "success" })}>
              Hold to rob register
            </KeyHint>
            <KeyHint keys="G" variant="default">
              Enter vehicle
            </KeyHint>
          </div>
        </Showcase>
        <Showcase name="speedometer" title="Speedometer" description="SVG arc in primary/destructive; gear is a Badge, fuel a Progress.">
          <Speedometer speed={hp + 20} rpm={hp / 104} gear={3} fuel={hp / 1.3} size={180} />
        </Showcase>
        <Showcase name="nui-menu" title="NUI Menu" description="Card + Item. Arrows and Enter; the highlight is accent." className="md:row-span-2">
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
        </Showcase>
        <Showcase name="radial-menu" title="Radial Menu" description="The action wheel. SVG, styled like shadcn's menus." className="md:row-span-2">
          <RadialMenu items={radialItems} size={280} onSelect={(i) => emit("nuikit:notify", { title: i.label })} />
        </Showcase>
        <Showcase name="task-progress" title="Task Progress" description="Card + Progress + Kbd. Timed actions with a cancel key.">
          <TaskProgress key={run} label="Picking lock" duration={2800} cancelKey="X" onComplete={() => setTimeout(() => setRun((r) => r + 1), 900)} />
        </Showcase>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <MiniCard name="nui-toaster" text="The stock shadcn Sonner Toaster, wired to NUI.notify() in Lua." />
        <MiniCard name="use-nui-store" text="Merge partial updates from Lua into one object." />
      </div>
      </div>
    </section>
  );
}

function MiniCard({ name, text }: { name: string; text: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4">
        <CardTitle className="font-mono text-sm">@nuikit/{name}</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Bridge() {
  return (
    <section className="relative">
      <Backdrop src="/bg/street.jpg" />
      <div className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle id="bridge" eyebrow="Runtime" title="Lua and React, typed end to end.">
        One <code className="font-mono text-foreground">nui.d.ts</code> describes every message. <code className="font-mono text-foreground">fetchNui</code> autocompletes
        and checks payloads; whatever your Lua handler returns is the response. Framework-agnostic: QBCore, Qbox, ESX, ox or standalone.
      </SectionTitle>
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        <CodeBlock
          title="web/src/nui.d.ts"
          lang="ts"
          code={`declare module "nuikit-core" {
  // Lua → UI
  interface NuiEvents {
    "hud:vitals": { health: number; armor: number };
  }
  // UI → Lua
  interface NuiCallbacks {
    "shop:buy": {
      req: { id: string };
      res: { ok: boolean; cash: number };
    };
  }
}`}
        />
        <CodeBlock
          title="web/src/App.tsx"
          lang="ts"
          code={`const vitals = useNuiState("hud:vitals", {
  health: 100, armor: 0,
});
const { visible } = useNuiVisibility(); // Esc closes

async function buy(id: string) {
  const { ok, cash } = await fetchNui("shop:buy", { id });
  //      ^ typed            typo here = compile error
}`}
        />
        <CodeBlock
          title="client/main.lua"
          lang="lua"
          code={`RegisterCommand('shop', function() NUI.open() end)

NUI.on('shop:buy', function(data)
  local ok = BuyVehicle(data.id)
  return { ok = ok, cash = GetCash() }
end)  -- errors become NuiError in JS

NUI.send('hud:vitals', { health = 80, armor = 50 })
NUI.notify({ title = 'Paid', type = 'success' })`}
        />
      </div>
      </div>
    </section>
  );
}

function Loop() {
  const items = [
    ["Browser mode", "npm run dev opens your UI in Chrome with fake game data. No FiveM, no alt-tab."],
    ["Devtools panel", "Press ` to fire typed Lua events, mock callbacks, watch traffic and swap day/night backdrops."],
    ["In-game HMR", "While dev runs, ui_page points at Vite. ensure once and every save hot-reloads in game."],
    ["nuikit-doctor", "Point it at any built NUI to list what won't render in Chromium 103, or --fix it in place."],
    ["One command", "npm create nuikit gives you fxmanifest, Lua, React, shadcn and Tailwind v4, wired."],
    ["Tiny runtime", "nuikit-core has zero dependencies. React hooks and devtools are separate entries."],
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <SectionTitle eyebrow="Developer experience" title="The loop is the product." />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([title, text]) => (
          <Card key={title} className="gap-2 py-5">
            <CardHeader className="px-5">
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 text-sm text-muted-foreground">{text}</CardContent>
          </Card>
        ))}
      </div>
      <div className="mx-auto mt-14 max-w-xl text-center">
        <Command>npm create nuikit@latest my-hud</Command>
        <p className="mt-3 text-sm text-muted-foreground">MIT licensed. Built for the FiveM and RedM community.</p>
      </div>
    </section>
  );
}
