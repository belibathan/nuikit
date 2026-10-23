import { Badge } from "@/components/ui/badge";
import { Footer, Nav } from "@/components/site";
import { cn } from "@/lib/utils";
import arsenal from "../../../../packages/core/arsenal.json";

type Entry = { name: string; kind: string; side: "js" | "lua" | "both"; js?: string; from?: string; lua?: string; signature: { js?: string; lua?: string }; doc: string; only?: string; scope?: string; status: string };
type Event = { name: string; wire?: string; dir: string; payload: string; reply?: string; sender: string; doc: string };
type Domain = { js: string; lua: string; title: string; doc: string; docs?: string; import: string | null; entries: Entry[]; events: Event[]; legacy: { old: string; now: string; removeIn: string }[]; rules: string[] };
type Part = { name: string; title: string; doc: string; system: string; status: string };

const DOMAINS = arsenal.domains as unknown as Domain[];
const COMPONENTS = arsenal.components as Part[];
const BLOCKS = arsenal.blocks as Part[];
const SYSTEMS = [...new Set([...COMPONENTS, ...BLOCKS].map((p) => p.system))];
const SYSTEM_TITLE: Record<string, string> = { foundations: "Foundations", hud: "HUD", menus: "Menus", dialogs: "Dialogs", notices: "Notices", inputs: "Inputs", world: "World and camera", screens: "Screens" };

/** /kit: the whole arsenal on one page, generated from packages/core/arsenal.json (src/spec/api). */
export function KitPage() {
  return (
    <div className="min-h-screen">
      <Nav wide />
      <main className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[12rem_1fr]">
        <aside className="hidden lg:block">
          <nav aria-label="Domains" className="sticky top-20 flex flex-col gap-1 pt-12 text-sm text-muted-foreground">
            {DOMAINS.map((d) => (
              <a key={d.lua} href={`#${d.lua}`} className="hover:text-foreground">
                {d.title}
              </a>
            ))}
            <a href="#components" className="mt-3 hover:text-foreground">Components</a>
            <a href="#blocks" className="hover:text-foreground">Blocks</a>
          </nav>
        </aside>
        <div className="min-w-0">
          <header className="pt-10 pb-4 sm:pt-14">
            <h1 className="site-display text-[clamp(2.5rem,7vw,4.5rem)]">The kit</h1>
            <p className="mt-3 text-muted-foreground">
              nuikit-core {arsenal.version} · {DOMAINS.length} domains · {DOMAINS.reduce((n, d) => n + d.entries.length, 0)} entries · {DOMAINS.reduce((n, d) => n + d.events.length, 0)} events · {COMPONENTS.length} components · {BLOCKS.length} blocks
            </p>
          </header>
          {DOMAINS.map((d) => (
            <DomainSection key={d.lua} d={d} />
          ))}
          <Parts id="components" title="Components" parts={COMPONENTS} href={(n) => `/components/${n}`} />
          <Parts id="blocks" title="Blocks" parts={BLOCKS} href={(n) => `/blocks#${n}`} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function DomainSection({ d }: { d: Domain }) {
  return (
    <section id={d.lua} className="mt-12 scroll-mt-20">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-2">
        <h2 className="site-display text-3xl">{d.title}</h2>
        <code className="text-sm text-muted-foreground">nk.{d.lua}</code>
        {d.import && <code className="text-sm text-muted-foreground">{d.import}</code>}
        {d.docs && (
          <a className="ml-auto text-sm text-muted-foreground hover:text-foreground" href={`https://github.com/belibathan/nuikit/blob/main/${d.docs.replace(/#.*/, "")}`}>
            {d.docs.replace(/#.*/, "")}
          </a>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{d.doc}</p>
      <div className="mt-3 divide-y">
        {d.entries.map((e) => (
          <Row key={e.name} e={e} />
        ))}
      </div>
      {d.events.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">{d.events.length} events</summary>
          <div className="mt-2 divide-y">
            {d.events.map((ev) => (
              <div key={ev.name} className="grid gap-x-4 py-2 md:grid-cols-[16rem_1fr]">
                <div className="min-w-0">
                  <code className="break-all">{ev.name}</code>
                  <div className="text-xs text-muted-foreground">
                    {ev.dir} · {ev.sender}
                    {ev.wire && <> · wire <code>{ev.wire}</code></>}
                  </div>
                </div>
                <div className="min-w-0">
                  <code className="block text-xs break-words text-muted-foreground">{ev.payload}{ev.reply ? ` → ${ev.reply}` : ""}</code>
                  <span>{ev.doc}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
      {d.legacy.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted-foreground">{d.legacy.length} old names</summary>
          <div className="mt-2 flex flex-col gap-1">
            {d.legacy.map((l) => (
              <div key={l.old} className="text-muted-foreground">
                <code>{l.old}</code> → <code className="text-foreground">{l.now}</code> · removed in {l.removeIn}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function Row({ e }: { e: Entry }) {
  const sig = [e.signature.lua, e.signature.js].filter(Boolean);
  return (
    <div className="grid gap-x-4 py-2.5 md:grid-cols-[16rem_1fr]">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <code className="font-medium">{e.lua ?? e.js}</code>
        {e.lua && e.js && <code className="text-xs text-muted-foreground">{e.js}</code>}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm">{e.doc}</span>
          <Side side={e.side} />
          <Badge variant="outline" className="text-muted-foreground">{e.kind}</Badge>
          {e.scope && <Badge variant="outline" className="text-muted-foreground">nuikit resource</Badge>}
          {e.status === "unproven" && <Badge variant="outline">unproven</Badge>}
        </div>
        {sig.map((s) => (
          <code key={s} className="mt-0.5 block text-xs break-words text-muted-foreground">{s}</code>
        ))}
      </div>
    </div>
  );
}

function Side({ side }: { side: Entry["side"] }) {
  return (
    <span className="flex gap-1">
      {(side === "both" ? ["lua", "js"] : [side]).map((s) => (
        <Badge key={s} variant={side === "both" ? "secondary" : "outline"} className={cn(side !== "both" && "text-muted-foreground")}>
          {s === "js" ? "page" : "Lua"}
        </Badge>
      ))}
    </span>
  );
}

function Parts({ id, title, parts, href }: { id: string; title: string; parts: Part[]; href: (name: string) => string }) {
  return (
    <section id={id} className="mt-12 scroll-mt-20">
      <h2 className="site-display border-b pb-2 text-3xl">{title}</h2>
      {SYSTEMS.filter((s) => parts.some((p) => p.system === s)).map((s) => (
        <div key={s} className="mt-4">
          <h3 className="site-eyebrow text-muted-foreground">{SYSTEM_TITLE[s] ?? s}</h3>
          <div className="mt-1 divide-y">
            {parts.filter((p) => p.system === s).map((p) => (
              <a key={p.name} href={href(p.name)} className="grid gap-x-4 py-2 hover:bg-muted/40 md:grid-cols-[16rem_1fr]">
                <code className="font-medium">{p.name}</code>
                <span className="text-sm text-muted-foreground">{p.doc}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
