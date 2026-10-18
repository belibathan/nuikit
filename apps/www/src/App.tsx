import { applyTheme, clearTheme, emit, type ThemeVars } from "nuikit-core/react";
import { ArrowRight, Box, Braces, Flame, Gauge, Github, MonitorPlay, Paintbrush, Radar, Sparkles, Zap } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CodeBlock, Command, CopyButton } from "@/components/code";
import { Stage, radialItems } from "@/components/stage";
import { KeyHint } from "@/components/ui/key-hint";
import { NuiMenu } from "@/components/ui/nui-menu";
import { RadialMenu } from "@/components/ui/radial-menu";
import { Speedometer } from "@/components/ui/speedometer";
import { TaskProgress } from "@/components/ui/task-progress";
import { Vital } from "@/components/ui/vital";
import { cn } from "@/lib/utils";
import { themes } from "@/themes";
import { HeartPulse, Shield, Car, Wrench, Key } from "lucide-react";

const REPO = "https://github.com/belibathan/nuikit";
const SITE = "https://nuikit.vercel.app";

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Glow />
      <Nav />
      <Hero />
      <Proof />
      <Themes />
      <Gallery />
      <Bridge />
      <Devtools />
      <Footer />
    </div>
  );
}

function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[900px]">
      <div className="absolute top-[-200px] left-1/2 h-[600px] w-[1100px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute top-[120px] left-[70%] h-[300px] w-[500px] rounded-full bg-chart-2/10 blur-[100px]" />
    </div>
  );
}

function Gem({ className }: { className?: string }) {
  return <span className={cn("inline-block size-3 rotate-45 rounded-[3px] bg-gradient-to-br from-primary to-chart-2 shadow-[0_0_12px] shadow-primary/60", className)} />;
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-[#07080c]/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6 text-sm">
        <a href="#" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <Gem /> nuikit
        </a>
        <div className="hidden gap-5 text-muted-foreground md:flex">
          <a href="#proof" className="hover:text-foreground">Why</a>
          <a href="#themes" className="hover:text-foreground">Themes</a>
          <a href="#components" className="hover:text-foreground">Components</a>
          <a href="#bridge" className="hover:text-foreground">Lua ↔ React</a>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <img alt="GitHub stars" src="https://img.shields.io/github/stars/belibathan/nuikit?style=flat&label=★&labelColor=0b0e15&color=1e1b2e" className="hidden h-5 sm:block" />
          <a href={REPO} className="inline-flex h-8 items-center gap-2 rounded-lg border bg-card/60 px-3 font-medium hover:bg-accent">
            <Github className="size-4" /> GitHub
          </a>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-16">
      <a href="#proof" className="mx-auto flex w-fit items-center gap-2 rounded-full border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur hover:text-foreground">
        <span className="size-1.5 rounded-full bg-chart-1 shadow-[0_0_8px] shadow-chart-1" />
        FiveM runs Chromium 103. Tailwind v4 needs 111. We fixed that.
        <ArrowRight className="size-3" />
      </a>
      <h1 className="mx-auto mt-6 max-w-4xl text-center text-5xl font-extrabold tracking-[-0.04em] text-balance sm:text-7xl">
        shadcn for FiveM.{" "}
        <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-1 bg-clip-text text-transparent">Rendered right.</span>
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-muted-foreground text-pretty">
        Stock shadcn/ui and Tailwind v4 in your NUI, compiled for the game's browser. Typed Lua ↔ React, browser devtools that fake the game, hot reload in game, and a registry of HUD components.
      </p>
      <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
        <Command className="flex-1">npm create nuikit@latest</Command>
        <a href={REPO} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90">
          <Github className="size-4" /> Star on GitHub
        </a>
      </div>
      <div className="relative mt-14">
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/40 via-border to-transparent" aria-hidden />
        <Stage className="relative" />
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Live. Hold <kbd className="rounded border bg-muted px-1 font-mono">E</kbd>, click the menu. Every value arrives through <code className="font-mono text-foreground">useNuiEvent</code>, the same way Lua sends it in game.
        </p>
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, children, id }: { eyebrow: string; title: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <div id={id} className="mx-auto max-w-3xl scroll-mt-24 text-center">
      <div className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {children && <p className="mt-4 text-muted-foreground text-pretty">{children}</p>}
    </div>
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
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionTitle id="proof" eyebrow="The problem" title="Same code. Same browser. One line of config.">
        FiveM's NUI runs Chromium 103. Modern shadcn and Tailwind v4 assume 111+. nuikit's Vite plugin compiles your CSS down at build time, and our CI renders it in a real Chromium 103 to prove it.
      </SectionTitle>
      <figure className="mt-12 overflow-hidden rounded-2xl border bg-card/40 p-2">
        <img src="/compare.png" alt="Stock shadcn rendered in Chromium 103: no colors, broken layout. With nuikit: correct." className="w-full rounded-xl" />
      </figure>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fixes.map(([t, d]) => (
          <div key={t} className="rounded-xl border bg-card/50 p-5">
            <code className="font-mono text-sm font-semibold text-primary">{t}</code>
            <p className="mt-2 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
      <CodeBlock
        className="mx-auto mt-10 max-w-2xl"
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
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionTitle id="themes" eyebrow="Design system" title="Your theme is the design system.">
        nuikit components use nothing but shadcn tokens. Paste any <a className="text-foreground underline underline-offset-4" href="https://tweakcn.com">TweakCN</a> theme and this whole page, HUD included, follows. At runtime too, in Chromium 103, via <code className="font-mono text-foreground">applyTheme()</code>.
      </SectionTitle>
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {themes.map((t, i) => (
          <button
            key={t.name}
            onClick={() => {
              setActive(i);
              apply(t.css);
            }}
            className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition", active === i ? "border-primary bg-primary/15 text-foreground" : "bg-card/50 text-muted-foreground hover:text-foreground")}
          >
            <span className="flex -space-x-1">
              {t.swatch.map((c) => (
                <span key={c} className="size-3 rounded-full ring-2 ring-background" style={{ background: c }} />
              ))}
            </span>
            {t.name}
          </button>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Stage menu={false} scene="day" />
        <div className="flex flex-col rounded-2xl border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Paintbrush className="size-4 text-primary" /> Paste a theme
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Copy the CSS from tweakcn.com or ui.shadcn.com/themes.</p>
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={themes[1]!.css}
            spellCheck={false}
            className="mt-3 min-h-48 flex-1 resize-none rounded-lg border bg-background/60 p-3 font-mono text-[11px] leading-relaxed outline-none focus:border-primary/60"
          />
          <button
            disabled={!custom.trim()}
            onClick={() => {
              setActive(-1);
              apply(custom);
            }}
            className="mt-3 h-9 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
          >
            Apply to everything
          </button>
        </div>
      </div>
    </section>
  );
}

function Card({ name, title, description, children, className }: { name: string; title: string; description: string; children: ReactNode; className?: string }) {
  const cmd = `npx shadcn add ${SITE}/r/${name}.json`;
  return (
    <div className={cn("group flex flex-col overflow-hidden rounded-2xl border bg-card/40", className)}>
      <div className="relative grid min-h-56 flex-1 place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_0%,var(--accent),transparent_70%)] p-6">{children}</div>
      <div className="border-t bg-card/60 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-semibold">{title}</h3>
          <code className="font-mono text-xs text-muted-foreground">@nuikit/{name}</code>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border bg-background/50 py-1 pr-1 pl-3 font-mono text-[11px] text-muted-foreground">
          <span className="flex-1 truncate">{cmd}</span>
          <CopyButton text={cmd} />
        </div>
      </div>
    </div>
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
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionTitle id="components" eyebrow="Registry" title="Game UI, as shadcn components.">
        Installed with the shadcn CLI you already use. The code lands in your project; you own it. Every one is token-only and Chromium 103 safe.
      </SectionTitle>
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Card name="vital" title="Vital" description="A gem that fills like liquid. Pulses when low.">
          <div className="flex items-center gap-3">
            <Vital value={hp} tone="destructive" icon={<HeartPulse />} size="lg" label="Health" />
            <Vital value={64} tone="chart-2" icon={<Shield />} size="lg" low={-1} label="Armor" />
            <Vital value={88} tone="primary" icon={<Zap />} size="lg" label="Stamina" />
          </div>
        </Card>
        <Card name="key-hint" title="Key Hint" description="Prompts with optional hold-to-confirm.">
          <div className="flex flex-col items-center gap-3">
            <KeyHint keyLabel="E" hold={900} onConfirm={() => emit("nuikit:notify", { title: "Confirmed", type: "success" })}>
              Hold to rob register
            </KeyHint>
            <KeyHint keyLabel="G" variant="ghost">
              Enter vehicle
            </KeyHint>
          </div>
        </Card>
        <Card name="speedometer" title="Speedometer" description="Speed, RPM arc with redline, gear, fuel.">
          <Speedometer speed={hp + 20} rpm={hp / 104} gear={3} fuel={hp / 1.3} size={180} />
        </Card>
        <Card name="nui-menu" title="NUI Menu" description="Keyboard-first list menu. Arrows + Enter." className="md:row-span-2">
          <NuiMenu
            global={false}
            title="Garage"
            subtitle="Legion Square"
            items={[
              { id: "a", label: "Pegassi Zentorno", description: "Stored · 98% condition", icon: <Car />, meta: "ZEN 01" },
              { id: "b", label: "Bravado Buffalo", description: "Impounded · $250 fee", icon: <Car />, meta: "BUF 22" },
              { id: "c", label: "Repair all", description: "Fix everything", icon: <Wrench />, meta: "$900" },
              { id: "d", label: "Give keys", description: "Share with a player", icon: <Key /> },
            ]}
            onSelect={(i) => emit("nuikit:notify", { title: i.label, description: "fetchNui(\"garage:spawn\")" })}
          />
        </Card>
        <Card name="radial-menu" title="Radial Menu" description="The action wheel. Mouse angle or arrow keys." className="md:row-span-2">
          <RadialMenu items={radialItems} size={280} onSelect={(i) => emit("nuikit:notify", { title: i.label })} />
        </Card>
        <Card name="task-progress" title="Task Progress" description="Timed actions with a cancel key. Built on shadcn Progress.">
          <div className="flex flex-col items-center gap-3">
            <TaskProgress key={run} label="Picking lock" duration={2800} cancelKey="X" onComplete={() => setTimeout(() => setRun((r) => r + 1), 900)} />
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <MiniCard icon={<Sparkles className="size-4" />} name="nui-toaster" text="Stock shadcn Sonner wired to NUI.notify() in Lua." />
        <MiniCard icon={<Braces className="size-4" />} name="use-nui-store" text="Merge partial updates from Lua into one object." />
        <MiniCard icon={<Paintbrush className="size-4" />} name="theme" text="The violet theme used here. Or bring any TweakCN theme." />
      </div>
    </section>
  );
}

function MiniCard({ icon, name, text }: { icon: ReactNode; name: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card/40 p-4">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</div>
      <div className="min-w-0">
        <code className="font-mono text-sm font-semibold">@nuikit/{name}</code>
        <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Bridge() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionTitle id="bridge" eyebrow="Runtime" title="Lua and React, typed end to end.">
        One <code className="font-mono text-foreground">nui.d.ts</code> describes every message. <code className="font-mono text-foreground">fetchNui</code> autocompletes and checks payloads; whatever your Lua handler returns is the response. Framework-agnostic: QBCore, Qbox, ESX, ox or standalone.
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
    </section>
  );
}

function Devtools() {
  const items = [
    { icon: <MonitorPlay className="size-5" />, title: "Browser mode", text: "pnpm dev opens your UI in Chrome with fake game data. No FiveM, no alt-tab." },
    { icon: <Radar className="size-5" />, title: "Devtools panel", text: "Press ` to fire typed Lua events, mock callbacks, watch traffic and swap day/night backdrops." },
    { icon: <Flame className="size-5" />, title: "In-game HMR", text: "While dev runs, ui_page points at Vite. ensure once and every save hot-reloads in game." },
    { icon: <Gauge className="size-5" />, title: "nuikit-doctor", text: "Point it at any built NUI to list what won't render in Chromium 103, or --fix it in place." },
    { icon: <Box className="size-5" />, title: "One command", text: "npm create nuikit gives you fxmanifest, Lua, React, shadcn and Tailwind v4, wired." },
    { icon: <Braces className="size-5" />, title: "4 KB runtime", text: "nuikit is framework-agnostic with zero dependencies. React hooks are a separate entry." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionTitle eyebrow="Developer experience" title="The loop is the product." />
      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div key={i.title} className="bg-[#0b0d14] p-6">
            <div className="text-primary">{i.icon}</div>
            <h3 className="mt-3 font-semibold">{i.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{i.text}</p>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 max-w-xl text-center">
        <Command>npm create nuikit@latest my-hud</Command>
        <p className="mt-3 text-sm text-muted-foreground">MIT licensed. Built for the FiveM and RedM community.</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-8 text-sm text-muted-foreground">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <Gem className="size-2.5" /> nuikit
        </span>
        <span>Not affiliated with Cfx.re, Rockstar Games or shadcn.</span>
        <a href={REPO} className="ml-auto hover:text-foreground">GitHub</a>
        <a href={`${REPO}/blob/main/packages/vite/README.md`} className="hover:text-foreground">vite-plugin-nuikit</a>
        <a href={`${REPO}/blob/main/packages/core/README.md`} className="hover:text-foreground">nuikit</a>
      </div>
    </footer>
  );
}
