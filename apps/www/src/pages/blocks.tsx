import { type CompiledTheme } from "nuikit-core/react";
import { ArrowRightIcon, CircleAlertIcon } from "lucide-react";
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BLOCKS, type BlockPreview } from "@/components/block-previews";
import { Command } from "@/components/code";
import { GameStage } from "@/components/game-stage";
import { Footer, Nav, SITE } from "@/components/site";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { applyStageTheme, clearStageTheme } from "@/lib/stage-theme";
import { studioTheme } from "@/lib/theme-studio";
import { cn } from "@/lib/utils";
import { identities, themes } from "@/themes";
import registry from "../../../../registry.json";

// registry.json meta: which blocks the site shows, and the line on what each demonstrates
const BLOCK_META = new Map(
  (registry.items as { name: string; type: string; meta?: { hidden?: boolean; demonstrates?: string } }[]).filter((i) => i.type === "registry:block").map((i) => [i.name, i.meta ?? {}] as const),
);
const SHOWN = BLOCKS.filter((b) => !BLOCK_META.get(b.name)?.hidden);

const PRESETS = [...identities, ...themes];

/**
 * /blocks: every block as a live preview on a game screen, in whichever theme you pick (a preset or
 * your own paste, compiled like the server compiles it), with the commands that install it.
 */
export function BlocksPage() {
  const [css, setCss] = useState(PRESETS[0]!.css);
  const [preset, setPreset] = useState<number | null>(0);
  const [pasting, setPasting] = useState(false);
  const theme = useMemo(() => studioTheme(css), [css]);


  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight">Blocks</h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Finished screens that show the system: the{" "}
            <a href="/components" className="text-foreground underline underline-offset-4">
              components
            </a>
            , each wired to typed NUI messages with Lua that runs, shown in Default, any other identity or your own
            theme. Add one to your UI with the shadcn CLI, or start a resource from it with{" "}
            <code className="font-mono text-foreground">npm create nuikit</code>. Every preview is its real size at 1080p.
          </p>
        </header>

        <section aria-label="Theme" className="sticky top-14 z-30 -mx-6 mt-8 border-b bg-background/90 px-6 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-muted-foreground">Identity</span>
            {PRESETS.map((t, i) => (
              <Fragment key={t.name}>
              {i === identities.length && <span className="mx-1 h-5 w-px bg-border" aria-hidden />}
              <Button
                variant={preset === i ? "secondary" : "outline"}
                size="sm"
                onClick={() => {
                  setPreset(i);
                  setCss(t.css);
                  setPasting(false);
                }}
              >
                <span className="flex -space-x-1">
                  {t.swatch.map((c, j) => (
                    <span key={j} className="size-3 rounded-(--nk-r-key) ring-2 ring-background" style={{ background: c }} />
                  ))}
                </span>
                {t.name}
              </Button>
              </Fragment>
            ))}
            <Button variant={preset === null ? "secondary" : "outline"} size="sm" onClick={() => setPasting((p) => !p)}>
              Paste your own
            </Button>
            {theme.warnings.length > 0 && (
              <a href="/theme" className="ml-auto flex items-center gap-1.5 text-sm text-warning hover:underline">
                <CircleAlertIcon className="size-4" />
                {theme.warnings.length} {theme.warnings.length === 1 ? "thing" : "things"} to check in the theme studio
              </a>
            )}
          </div>
          {pasting && (
            <Textarea
              aria-label="Theme CSS"
              autoFocus
              placeholder="Paste the CSS from tweakcn.com or ui.shadcn.com/themes, with its .dark block."
              onChange={(e) => {
                setCss(e.target.value);
                setPreset(null);
              }}
              spellCheck={false}
              className="mt-3 h-32 resize-y font-mono text-xs"
            />
          )}
        </section>

        <div className="flex flex-col">
          {SHOWN.map((b) => (
            <Block key={b.name} block={b} theme={theme} />
          ))}
        </div>

        <p className="mt-16 flex items-center gap-2 text-muted-foreground">
          Making your own theme?
          <a href="/theme" className="flex items-center gap-1 text-foreground underline underline-offset-4">
            Open the theme studio <ArrowRightIcon className="size-4" />
          </a>
        </p>
      </main>
      <Footer />
    </div>
  );
}

function Block({ block, theme }: { block: BlockPreview; theme: CompiledTheme }) {
  const names = Object.keys(block.states);
  const [state, setState] = useState(names[0]!);
  const render = block.states[state] ?? block.states[names[0]!]!;

  // The theme paints the game screen only; the page around it keeps the site's own.
  const stage = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (stage.current) applyStageTheme(theme, stage.current);
  }, [theme]);
  useLayoutEffect(() => {
    const el = stage.current;
    return () => void (el && clearStageTheme(el));
  }, []);
  return (
    <section id={block.name} className="mt-20 scroll-mt-32">
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight">{block.title}</h2>
        <p className="mt-2 text-muted-foreground text-pretty">{block.description}</p>
        {BLOCK_META.get(block.name)?.demonstrates && (
          <p className="mt-2 text-sm text-pretty">
            <span className="text-muted-foreground">Shows </span>
            {BLOCK_META.get(block.name)?.demonstrates}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label={`${block.title} states`}>
        {names.map((n) => (
          <button
            key={n}
            role="tab"
            aria-selected={state === n}
            onClick={() => setState(n)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm transition-colors",
              state === n ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <GameStage className="mt-3" scene={block.scene} stageRef={stage}>
        {/* keyed: each state is a fresh still, as the game would open it */}
        <div key={state} className="absolute inset-0">
          {render()}
        </div>
      </GameStage>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Command className="h-10 text-xs">{`npx shadcn add ${SITE}/r/${block.name}.json`}</Command>
        <Command className="h-10 text-xs">{`npm create nuikit@latest my-${block.name} -- -t ${block.name}`}</Command>
      </div>
    </section>
  );
}
