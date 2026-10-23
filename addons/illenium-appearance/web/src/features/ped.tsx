import { Check, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useMemo, useState } from "react";
import { FieldLabel } from "@/components/controls";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useLoaded } from "@/lib/store";
import { cn } from "@/lib/utils";

const FREEMODE: Record<string, string> = { mp_m_freemode_01: "Freemode male", mp_f_freemode_01: "Freemode female" };

export function PedSection() {
  const { locale, settings, current, stored, actions } = useLoaded();
  const items = settings.ped.model.items;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const res = q ? items.filter((m) => m.toLowerCase().includes(q)) : items;
    return res.slice(0, 300);
  }, [items, query]);

  const choose = async (model: string) => {
    setOpen(false);
    if (model === current.model || busy) return;
    setBusy(true);
    try {
      await actions.changeModel(model);
    } finally {
      setBusy(false);
    }
  };
  const index = items.indexOf(current.model);
  const step = (dir: -1 | 1) => {
    if (!items.length) return;
    const i = index < 0 ? 0 : (index + dir + items.length) % items.length;
    void choose(items[i]!);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <FieldLabel
          label={locale.ped.model}
          hint={FREEMODE[current.model]}
          value={index >= 0 ? `${index + 1} / ${items.length}` : `${items.length}`}
          onReset={stored.model !== current.model ? () => void choose(stored.model) : undefined}
        />
        <ButtonGroup className="mt-1 w-full">
          <Button variant="outline" size="icon-sm" className="text-muted-foreground" onClick={() => step(-1)} disabled={busy || items.length < 2} aria-label="Previous model">
            <ChevronLeft />
          </Button>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-0 flex-1 justify-between rounded-none font-mono nk-label" disabled={busy}>
                <span className="truncate">{current.model}</span>
                {busy ? <Spinner /> : <ChevronsUpDown className="text-muted-foreground" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="nk-panel nk-enter w-80 p-0" align="start" sideOffset={8}>
              <div className="relative border-b p-2">
                <Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input autoFocus placeholder="Search models" value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-9" />
              </div>
              <ScrollArea className="h-72">
                <div className="p-1">
                  {filtered.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => void choose(m)}
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-(--nk-r-control) px-2 text-left font-mono nk-label outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
                        m === current.model && "text-foreground",
                      )}
                    >
                      <Check className={cn("size-4 shrink-0", m === current.model ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{m}</span>
                      {FREEMODE[m] && <span className="nk-label ml-auto shrink-0 font-sans">{FREEMODE[m]}</span>}
                    </button>
                  ))}
                  {!filtered.length && <EmptyState title={`No model matches “${query}”`} description="Try part of the name." />}
                  {filtered.length === 300 && <p className="nk-label px-2 py-2 text-center">Type to narrow the list.</p>}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon-sm" className="text-muted-foreground" onClick={() => step(1)} disabled={busy || items.length < 2} aria-label="Next model">
            <ChevronRight />
          </Button>
        </ButtonGroup>
      </div>
      {!FREEMODE[current.model] && (
        <p className="rounded-(--nk-r-control) bg-muted px-3 py-2 nk-label">
          Heritage, face, makeup and tattoos need a freemode ped. Clothing and accessories still apply.
        </p>
      )}
    </div>
  );
}
