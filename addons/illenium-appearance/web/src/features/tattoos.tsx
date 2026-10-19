import { Check, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { RangeSlider } from "@/components/controls";
import { Group, Groups } from "@/components/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useLoaded } from "@/lib/store";
import { TATTOO_ZONES, type Tattoo, type TattooZone } from "@/lib/types";
import { cn } from "@/lib/utils";

function Zone({ zone, items }: { zone: TattooZone; items: Tattoo[] }) {
  const { locale, settings, current, actions } = useLoaded();
  const L = locale.tattoos;
  const range = settings.tattoos.opacity;
  const applied = current.tattoos[zone] ?? [];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Tattoo>();
  const [opacity, setOpacity] = useState(range.max);
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState<string>();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((t) => t.label.toLowerCase().includes(q) || t.collection.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const appliedOne = selected && applied.find((t) => t.name === selected.name);

  const select = (t: Tattoo) => {
    const already = applied.find((a) => a.name === t.name);
    const o = already?.opacity ?? opacity;
    setSelected(t);
    setOpacity(o);
    setDeclined(undefined);
    actions.previewTattoo(t, o);
  };

  const apply = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      if (appliedOne) await actions.deleteTattoo(selected);
      else if (!(await actions.applyTattoo(selected, opacity))) setDeclined(selected.name);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={`Search ${items.length} designs`} value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-9" />
      </div>
      <ScrollArea className="h-60 rounded-md border [&_[data-slot=scroll-area-viewport]>div]:!block">
        <div className="p-1">
          {filtered.map((t) => {
            const on = applied.some((a) => a.name === t.name);
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => select(t)}
                className={cn(
                  "nk-row w-full gap-2 px-2 text-left outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                  selected?.name === t.name && "bg-accent text-accent-foreground",
                )}
              >
                <Check className={cn("size-4 shrink-0", on ? "opacity-100" : "opacity-0")} aria-label={on ? "Applied" : undefined} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t.label}</span>
                  <span className="nk-label block truncate">{t.collection}</span>
                </span>
                {typeof t.cost === "number" && !on && <span className="nk-num shrink-0 text-xs text-muted-foreground">${t.cost}</span>}
              </button>
            );
          })}
          {!filtered.length && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing matches “{query}”. Try another word.</p>}
        </div>
      </ScrollArea>
      <RangeSlider
        label={L.opacity}
        value={opacity}
        min={range.min}
        max={range.max}
        step={range.factor ?? 0.1}
        percent
        onChange={(v) => {
          setOpacity(v);
          if (selected && !appliedOne) actions.previewTattoo(selected, v);
        }}
      />
      <Button className="w-full" variant={appliedOne ? "outline" : "secondary"} disabled={!selected || busy} onClick={() => void apply()}>
        {busy && <Spinner />}
        {appliedOne ? L.delete : L.apply}
        {selected && <span className="min-w-0 truncate font-normal text-muted-foreground">{selected.label}</span>}
      </Button>
      {declined && declined === selected?.name && <p className="text-center text-xs text-destructive">Not applied.</p>}
    </div>
  );
}

export function TattoosSection() {
  const { locale, settings, current, isMale, actions } = useLoaded();
  const L = locale.tattoos;
  // Lua filters by gender already; filter again so a model change can't show the wrong set.
  const byZone = useMemo(() => {
    const out: Partial<Record<TattooZone, Tattoo[]>> = {};
    for (const [zone, items] of Object.entries(settings.tattoos.items)) {
      if (zone === "ZONE_HAIR") continue;
      out[zone as TattooZone] = (items ?? []).filter((t) => (isMale ? t.hashMale !== "" : t.hashFemale !== ""));
    }
    return out;
  }, [settings.tattoos.items, isMale]);
  const zones = [...TATTOO_ZONES.filter((z) => byZone[z]), ...(Object.keys(byZone) as TattooZone[]).filter((z) => !(TATTOO_ZONES as readonly string[]).includes(z))];
  const total = Object.entries(current.tattoos).reduce((n, [z, t]) => (z === "ZONE_HAIR" ? n : n + (t?.length ?? 0)), 0);

  return (
    <>
      <Groups open={zones.slice(0, 1)}>
        {zones.map((z) => (
          <Group key={z} value={z} title={(L.items as Record<string, string>)[z] ?? z} meta={current.tattoos[z]?.length ? `${current.tattoos[z]!.length} applied` : undefined}>
            <Zone zone={z} items={byZone[z] ?? []} />
          </Group>
        ))}
      </Groups>
      <div className="px-4 pt-2 pb-4">
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive" disabled={total === 0} onClick={() => void actions.clearTattoos()}>
          <Trash2 />
          {L.deleteAll}
        </Button>
      </div>
    </>
  );
}
