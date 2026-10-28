import { onNui } from "nuikit-core";
import { BriefcaseIcon, MailIcon, ShieldIcon } from "@/components/ui/icons";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MenuRow } from "@/components/ui/menu-row";
import { TextRoll } from "@/components/ui/text-roll";

/**
 * The page a world screen shows (client/main.lua draws it in a DUI). As the resource's NUI page it
 * draws nothing; with ?screen=1 it's the demo terminal. A screen's own resource points it at any
 * page and talks to it with exports.nuikit_screen:send(id, action, data) (a window message).
 */
export default function App() {
  if (!new URLSearchParams(location.search).has("screen")) return null;
  return <Terminal />;
}

type Entry = { id: string; title: string; detail: string; icon: "mail" | "job" | "record" };
const ICONS = { mail: MailIcon, job: BriefcaseIcon, record: ShieldIcon };
const DEMO: Entry[] = [
  { id: "1", title: "Delivery to Paleto Bay", detail: "Pick up at the Port of Los Santos, drop at the Paleto warehouse. Pays $850.", icon: "job" },
  { id: "2", title: "Message from Lester", detail: "The usual place, tonight. Bring the drive.", icon: "mail" },
  { id: "3", title: "Record: 46EEK572", detail: "Registered to Niko Bellic. No warrants.", icon: "record" },
];

function Terminal() {
  const [entries, setEntries] = useState<Entry[]>(DEMO);
  const [open, setOpen] = useState<Entry | null>(null);
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  useEffect(() => onNui("screen:entries" as never, (d: unknown) => Array.isArray(d) && setEntries(d as Entry[])), []);
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })), 10000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="dark flex h-screen flex-col bg-background p-(--nk-space-8) text-foreground">
      <header className="flex items-baseline justify-between border-b border-border pb-(--nk-space-6)">
        <h1 className="nk-title text-(length:--nk-text-display)">{open ? open.title : "Terminal"}</h1>
        <span className="nk-num text-(length:--nk-text-title) text-muted-foreground">
          <TextRoll value={clock} />
        </span>
      </header>
      {open ? (
        <div className="flex flex-1 flex-col gap-(--nk-space-8) py-(--nk-space-8)">
          <p className="nk-body text-(length:--nk-text-title)">{open.detail}</p>
          <Button size="lg" variant="outline" className="w-fit" onClick={() => setOpen(null)}>
            Back
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col divide-y divide-border py-(--nk-space-4)">
          {entries.map((e) => {
            const Icon = ICONS[e.icon] ?? MailIcon;
            return (
              <MenuRow key={e.id} icon={<Icon />} chevron className="min-h-(--nk-row-height) text-(length:--nk-text-title)" onClick={() => setOpen(e)}>
                {e.title}
              </MenuRow>
            );
          })}
        </div>
      )}
    </div>
  );
}
