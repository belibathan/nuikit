import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Bar } from "@/lib/bar";
import { Icon } from "@/lib/icon";
import { Markdown } from "@/lib/markdown";
import { presenceMotion } from "@/lib/motion";
import { post, useOx } from "@/lib/nui";
import { usePresence } from "@/lib/presence";
import { cn } from "@/lib/utils";

type Metadata = string[] | Record<string, unknown> | Array<string | { label: string; value?: unknown; progress?: number; colorScheme?: string }>;

interface Option {
  title?: string;
  description?: string;
  icon?: string | [string, string];
  iconColor?: string;
  iconAnimation?: string;
  image?: string;
  progress?: number;
  colorScheme?: string;
  arrow?: boolean;
  menu?: string;
  metadata?: Metadata;
  disabled?: boolean;
  readOnly?: boolean;
}

interface ContextData {
  title: string;
  canClose?: boolean;
  menu?: string;
  options: Option[] | Record<string, Option>;
}

/** ox_lib's context menu (lib.registerContext / lib.showContext). Protocol: docs/ox-lib-protocol.md §4. */
export function ContextMenu() {
  const [data, setData] = useState<ContextData | null>(null);
  const [open, setOpen] = useState(false);
  const swap = useRef<ReturnType<typeof setTimeout>>(undefined);
  const presence = usePresence(open, 100);
  const panel = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ key: string; top: number } | null>(null);
  useEffect(() => setHover(null), [data]);

  useOx<ContextData>("showContext", (next) => {
    clearTimeout(swap.current);
    if (open) {
      // Already showing (submenu, back): hide, then swap content after the exit.
      setOpen(false);
      swap.current = setTimeout(() => {
        setData(next);
        setOpen(true);
      }, 100);
    } else {
      setData(next);
      setOpen(true);
    }
  });
  useOx("hideContext", () => setOpen(false));

  const close = () => {
    if (data?.canClose === false) return;
    setOpen(false);
    void post("closeContext");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!presence.mounted || !data) return null;
  // Same order as ox_lib: Object.entries (integer-like keys first, then the rest as received).
  const entries = Object.entries(data.options ?? {});
  const hovered = hover ? (data.options as Record<string, Option>)[hover.key] : undefined;

  const enter = (key: string, e: MouseEvent<HTMLElement>) => {
    const top = e.currentTarget.getBoundingClientRect().top - (panel.current?.getBoundingClientRect().top ?? 0);
    setHover({ key, top });
  };

  return (
    <div data-state={presence.state} className={cn("fixed top-[15%] right-[25%] z-30 w-80", presenceMotion)}>
      <div ref={panel} className="nk-panel relative">
        <header className="nk-panel-header gap-2 pr-3">
          {data.menu && (
            <Button variant="ghost" size="icon-sm" className="-ml-2 shrink-0 text-muted-foreground" onClick={() => post("openContext", { id: data.menu, back: true })} aria-label="Back">
              <ChevronLeftIcon />
            </Button>
          )}
          <Markdown className="nk-title min-w-0 flex-1 truncate">{data.title}</Markdown>
          <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground" disabled={data.canClose === false} onClick={close} aria-label="Close">
            <XIcon />
          </Button>
        </header>
        <div className="nk-panel-body flex max-h-[35rem] flex-col gap-0.5 overflow-y-auto" onScroll={() => setHover(null)}>
          {entries.map(([key, option]) => (
            <ContextOption key={key} id={key} option={option} onEnter={(e) => enter(key, e)} onLeave={() => setHover((h) => (h?.key === key ? null : h))} />
          ))}
        </div>
        {hovered && !hovered.disabled && (hovered.metadata || hovered.image) && <HoverCard key={hover!.key} option={hovered} top={hover!.top} />}
      </div>
    </div>
  );
}

function ContextOption({ id, option, onEnter, onLeave }: { id: string; option: Option; onEnter: (e: MouseEvent<HTMLElement>) => void; onLeave: () => void }) {
  // A missing title on a keyed option shows the key itself (ox_lib does this).
  const title = option.title ?? (Number.isNaN(Number(id)) ? id : undefined);
  const inert = option.disabled || option.readOnly;
  const arrow = (option.menu || option.arrow) && option.arrow !== false;

  const click = () => {
    if (inert) return;
    if (option.menu) void post("openContext", { id: option.menu, back: false });
    else void post("clickContext", id);
  };

  return (
    <button
      type="button"
      disabled={option.disabled}
      onClick={click}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        "nk-row w-full py-2 text-left outline-none",
        !inert && "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent",
        option.readOnly && "cursor-default",
        option.disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {option.icon && (
        <span className="grid size-4 shrink-0 place-items-center text-muted-foreground">
          <Icon icon={option.icon} color={option.iconColor} animation={option.iconAnimation} allowImage className="size-4" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title && <Markdown className="font-medium">{title}</Markdown>}
        {option.description && <Markdown className="nk-label font-normal">{option.description}</Markdown>}
        {option.progress !== undefined && <Bar value={option.progress} scheme={option.colorScheme} fallback="var(--muted-foreground)" className="mt-1.5" />}
      </span>
      {arrow && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />}
    </button>
  );
}

/** Image and metadata, shown beside the hovered option. */
function HoverCard({ option, top }: { option: Option; top: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 200);
    return () => clearTimeout(t);
  }, []);
  if (!shown) return null;
  const meta = option.metadata;
  const rows: Array<{ label?: string; value?: unknown; progress?: number; colorScheme?: string; text?: string }> = !meta
    ? []
    : Array.isArray(meta)
      ? meta.map((m) => (typeof m === "string" ? { text: m } : m))
      : Object.entries(meta).map(([label, value]) => ({ label, value }));

  return (
    <div className="nk-panel nk-enter absolute right-full mr-2 flex w-64 flex-col gap-3 p-4 text-sm" style={{ top }}>
      {option.image && <img src={option.image} alt="" className="max-h-40 w-full rounded-md object-contain" />}
      {rows.map((r, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          {r.text !== undefined ? (
            <span>{r.text}</span>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="nk-num truncate font-medium">{String(r.value ?? "")}</span>
            </div>
          )}
          {r.progress !== undefined && <Bar value={r.progress} scheme={r.colorScheme ?? option.colorScheme} fallback="var(--muted-foreground)" />}
        </div>
      ))}
    </div>
  );
}
