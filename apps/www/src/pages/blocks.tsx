import { useRef } from "react";
import { BLOCKS, type BlockPreview } from "@/components/block-previews";
import { Command } from "@/components/code";
import { GameStage } from "@/components/game-stage";
import { Source, StageBar, installLine } from "@/components/preview";
import { Footer, Nav } from "@/components/site";
import registry from "../../../../registry.json";

const HIDDEN = new Set((registry.items as { name: string; type: string; meta?: { hidden?: boolean } }[]).filter((i) => i.type === "registry:block" && i.meta?.hidden).map((i) => i.name));
const SHOWN = BLOCKS.filter((b) => !HIDDEN.has(b.name));

/** /blocks: each block as a live preview on a game screen, the install lines, the source. */
export function BlocksPage() {
  const preview = useRef<HTMLDivElement>(null);
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <header className="max-w-3xl pt-10 pb-6 sm:pt-14">
          <h1 className="site-display text-[clamp(2.5rem,7vw,4.5rem)]">Blocks</h1>
          <p className="mt-4 text-lg text-pretty text-muted-foreground">Whole screens built from the components, with the Lua that runs them. Each one: the live preview, the install line, the source.</p>
        </header>
        <StageBar target={preview} />
        <div ref={preview} className="flex flex-col">
          {SHOWN.map((b) => (
            <Block key={b.name} block={b} />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Block({ block }: { block: BlockPreview }) {
  const first = Object.values(block.states)[0]!;
  return (
    <section id={block.name} className="mt-14 scroll-mt-32">
      <h2 className="site-display text-3xl">{block.title}</h2>
      <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">{block.description}</p>
      <GameStage className="mt-5" scene={block.scene}>
        <div className="absolute inset-0">{first()}</div>
      </GameStage>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Command className="h-10 text-xs">{installLine(block.name)}</Command>
        <Command className="h-10 text-xs">{`npm create nuikit@latest my-${block.name} -- -t ${block.name}`}</Command>
      </div>
      <Source name={block.name} />
    </section>
  );
}
