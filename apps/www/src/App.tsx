import { ArrowRightIcon, DownloadIcon, DropletIcon, HeartPulseIcon, ShieldIcon, UtensilsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Command } from "@/components/code";
import { Credit } from "@/components/credit";
import { stageBackground } from "@/components/scene";
import { Footer, Nav, REPO, SITE } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import { Tile } from "@/components/ui/tile";
import { VitalChip } from "@/components/ui/vital-chip";

const LINKS = [
  { href: "/start", label: "Start" },
  { href: "/components", label: "Components" },
  { href: "/blocks", label: "Blocks" },
  { href: "/theme", label: "Theme studio" },
  { href: "/adopt", label: "Adopt a script" },
  { href: "/protocol", label: "Protocol" },
];

export default function App() {
  return (
    <div className="min-h-screen overflow-x-clip">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:px-6 sm:pt-20">
        <div className="flex flex-wrap items-center gap-3">
          <Credit />
          <a href={`${REPO}/releases/latest`}>
            <Chip fill="hair">
              v0.8 · free and open source <ArrowRightIcon />
            </Chip>
          </a>
        </div>
        <h1 className="site-display mt-6 max-w-4xl text-[clamp(2.75rem,9vw,6.5rem)] text-balance">
          Every screen on your server. <span className="text-muted-foreground">One look.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-pretty text-muted-foreground sm:text-xl">
          The shared layer between FiveM scripts and their screens: one runtime for focus, Escape, camera and theme, themed renderers for what scripts ask for, and adapters for ox_lib, QBCore and ESX.
        </p>
        <Strip />
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          <Command className="h-12 text-xs">npm create nuikit@latest my-hud</Command>
          <Command className="h-12 text-xs">{`npx shadcn add ${SITE}/r/tile.json`}</Command>
          <Button size="lg" className="h-12" asChild>
            <a href={`${REPO}/releases/latest`}>
              <DownloadIcon /> Download nuikit.zip
            </a>
          </Button>
        </div>
        <nav aria-label="Pages" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </a>
          ))}
          <a href={REPO} className="hover:text-foreground">
            GitHub
          </a>
        </nav>
      </main>
      <Footer />
    </div>
  );
}

/** One live strip of the kit in Default: vitals, a key tile, a toast. */
function Strip() {
  const [v, setV] = useState({ health: 86, armor: 54, hunger: 41, thirst: 18 });
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () =>
        document.visibilityState === "visible" &&
        setV((p) => ({ health: p.health <= 30 ? 92 : p.health - 9, armor: p.armor, hunger: p.hunger <= 12 ? 70 : p.hunger - 4, thirst: p.thirst >= 90 ? 14 : p.thirst + 13 })),
      2600,
    );
    return () => clearInterval(id);
  }, []);
  const vitals = [
    { k: "health", icon: <HeartPulseIcon />, label: "Health" },
    { k: "armor", icon: <ShieldIcon />, label: "Armor" },
    { k: "hunger", icon: <UtensilsIcon />, label: "Hunger" },
    { k: "thirst", icon: <DropletIcon />, label: "Thirst" },
  ] as const;
  return (
    <div className="mt-12 flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-(--nk-r-surface) border p-6 sm:p-10" style={{ background: stageBackground() }} aria-label="nuikit's Default look">
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
      <Tile size="lg" tag="Open garage" land>
        E
      </Tile>
      <Notice status="success" title="Paid" description="$500 from Lester" duration={0} pauseOnHover={false} className="w-full sm:w-80" />
    </div>
  );
}
