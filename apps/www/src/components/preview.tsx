import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "lucide-react";
import { CodeBlock, Command } from "@/components/code";
import { stageBackground } from "@/components/scene";
import { SITE } from "@/components/site";
import { Button } from "@/components/ui/button";
import { applyStageTheme, clearStageTheme } from "@/lib/stage-theme";
import { studioTheme, TREATMENTS, TREATMENT_INFO, withTreatment, type Treatment } from "@/lib/theme-studio";
import { cn } from "@/lib/utils";
import { identities } from "@/themes";
import registry from "../../../../registry.json";

type Variants = { axes: Record<string, string[]>; levers: string[]; hooks: string[] };
type Item = { name: string; type: string; title?: string; description?: string; files?: { path: string }[]; meta?: { variants?: Variants } };
const ITEMS = registry.items as Item[];
export const itemOf = (name: string) => ITEMS.find((i) => i.name === name);

/** Every registry source file, loaded on demand (only when a source is opened). */
const SOURCES = import.meta.glob("../../../../registry/nuikit/{ui,hooks,blocks}/**/*.{ts,tsx}", { query: "?raw", import: "default" }) as Record<string, () => Promise<string>>;
const sourceOf = (path: string) => SOURCES[`../../../../${path}`]?.();

/**
 * One identity and one treatment for every preview below the bar: painted on the previews only
 * (the `target` subtree), so the page around them keeps the site's own look. Default paints nothing.
 */
export function StageBar({ target, className }: { target: React.RefObject<HTMLElement | null>; className?: string }) {
  const [id, setId] = useState(0);
  const [treatment, setTreatment] = useState<Treatment | null>(null);
  const css = useMemo(() => withTreatment(identities[id]!.css, treatment), [id, treatment]);
  useLayoutEffect(() => {
    const el = target.current;
    if (!el || (id === 0 && !treatment)) return;
    applyStageTheme(studioTheme(css), el);
    // the site's font-sans is a literal (@theme inline): read the identity's own
    el.style.fontFamily = "var(--font-sans)";
    return () => {
      clearStageTheme(el);
      el.style.removeProperty("font-family");
    };
  }, [css, id, treatment, target]);
  return (
    <div className={cn("sticky top-14 z-30 -mx-4 flex flex-col gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6", className)}>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Theme">
        <span className="site-eyebrow mr-1 w-20">Theme</span>
        {identities.map((t, i) => (
          <Button key={t.name} role="radio" aria-checked={id === i} variant={id === i ? "secondary" : "ghost"} size="sm" onClick={() => setId(i)}>
            <span className="flex" aria-hidden>
              {t.swatch.map((c, j) => (
                <span key={j} className="size-3 rounded-(--nk-radius-key) border border-white/20" style={{ background: c, marginLeft: j ? -3 : 0 }} />
              ))}
            </span>
            {t.name}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Treatment">
        <span className="site-eyebrow mr-1 w-20">Treatment</span>
        <Button role="radio" aria-checked={!treatment} variant={!treatment ? "secondary" : "ghost"} size="sm" onClick={() => setTreatment(null)}>
          Theme's own
        </Button>
        {TREATMENTS.map((t) => (
          <Button key={t} role="radio" aria-checked={treatment === t} title={TREATMENT_INFO[t]} variant={treatment === t ? "secondary" : "ghost"} size="sm" onClick={() => setTreatment(t)}>
            {t}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** The wiring line from registry.json meta: variant axes, the levers it reads, the hooks that make it live. */
export function Wiring({ name }: { name: string }) {
  const v = itemOf(name)?.meta?.variants;
  if (!v) return null;
  const axes = Object.entries(v.axes).map(([k, o]) => `${k}: ${o.join(" | ")}`);
  const levers = v.levers.filter((l) => !/-(a|rgb)$/.test(l));
  const rows: [string, string][] = [
    ["Variants", axes.join(" · ")],
    ["Levers", levers.join(" ")],
    ["Hooks", v.hooks.join(" · ")],
  ];
  return (
    <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[5rem_1fr]">
      {rows.filter(([, t]) => t).map(([k, t]) => (
        <div key={k} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="font-mono text-xs leading-5 break-words">{t}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The registry file(s), highlighted, with a copy button. Fetched when opened. */
export function Source({ name }: { name: string }) {
  const files = itemOf(name)?.files ?? [];
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(0);
  const [code, setCode] = useState<Record<string, string>>({});
  const file = files[pick];
  const load = (i: number) => {
    const f = files[i];
    if (f && code[f.path] === undefined) void sourceOf(f.path)?.then((c) => setCode((m) => ({ ...m, [f.path]: c })));
  };
  if (!file) return null;
  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          load(pick);
        }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronDownIcon className={cn("size-4 transition-transform", !open && "-rotate-90")} aria-hidden /> Source
      </button>
      {open && (
        <div className="mt-3">
          {files.length > 1 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <Button
                  key={f.path}
                  variant={i === pick ? "secondary" : "ghost"}
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => {
                    setPick(i);
                    load(i);
                  }}
                >
                  {f.path.split("/").pop()}
                </Button>
              ))}
            </div>
          )}
          <CodeBlock title={file.path} lang="ts" code={code[file.path] ?? "// loading"} className="max-h-[32rem] overflow-y-auto" />
        </div>
      )}
    </div>
  );
}

export const installLine = (name: string) => `npx shadcn add ${SITE}/r/${name}.json`;

/** One registry item: its line, the live preview on a CSS stage, the install line, the wiring, the source. */
export function Entry({ name, title, text, scene, stageClassName, children, focus = false }: { name: string; title: string; text: string; scene?: "dusk" | "day"; stageClassName?: string; children: ReactNode; focus?: boolean }) {
  return (
    <section id={name} className="mt-14 scroll-mt-32">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl min-w-0">
          <h2 className={cn("site-display text-3xl", focus && "sr-only")}>{focus ? title : <a href={`/components/${name}`} className="hover:underline hover:underline-offset-4">{title}</a>}</h2>
          <p className="mt-2 text-pretty text-muted-foreground">{text}</p>
        </div>
        <Command className="h-10 w-full max-w-md text-xs">{installLine(name)}</Command>
      </div>
      <div className="relative isolate mt-5 overflow-hidden rounded-(--nk-radius-surface) border" style={{ background: stageBackground(scene) }}>
        {/* phones: the stage scrolls sideways rather than squeezing a 1080p part */}
        <div className="overflow-x-auto">
          <div className={cn("relative flex min-h-64 flex-wrap items-start justify-center gap-8 p-4 sm:p-10", stageClassName)}>{children}</div>
        </div>
      </div>
      <Wiring name={name} />
      <Source name={name} />
    </section>
  );
}

export function useStageRef() {
  return useRef<HTMLDivElement>(null);
}
