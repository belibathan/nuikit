import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bar } from "@/lib/bar";
import { Icon } from "@/lib/icon";
import { Markdown } from "@/lib/markdown";
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

  return (
    <div
      data-state={presence.state}
      className="fixed top-[15%] right-[25%] z-30 w-80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        {data.menu && (
          <Button variant="secondary" size="icon" className="shrink-0" onClick={() => post("openContext", { id: data.menu, back: true })} aria-label="Back">
            <ChevronLeftIcon />
          </Button>
        )}
        <Card className="flex h-9 flex-1 items-center justify-center rounded-md px-3 py-0 text-sm font-medium">
          <Markdown className="truncate text-center">{data.title}</Markdown>
        </Card>
        <Button variant="secondary" size="icon" className="shrink-0" disabled={data.canClose === false} onClick={close} aria-label="Close">
          <XIcon />
        </Button>
      </div>
      <div className="flex max-h-[560px] flex-col gap-1 overflow-y-auto">
        {entries.map(([key, option]) => (
          <ContextOption key={key} id={key} option={option} />
        ))}
      </div>
    </div>
  );
}

function ContextOption({ id, option }: { id: string; option: Option }) {
  const [hover, setHover] = useState(false);
  // A missing title on a keyed option shows the key itself (ox_lib does this).
  const title = option.title ?? (Number.isNaN(Number(id)) ? id : undefined);
  const inert = option.disabled || option.readOnly;
  const card = !option.disabled && (option.metadata || option.image);
  const arrow = (option.menu || option.arrow) && option.arrow !== false;

  const click = () => {
    if (inert) return;
    if (option.menu) void post("openContext", { id: option.menu, back: false });
    else void post("clickContext", id);
  };

  return (
    <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        disabled={option.disabled}
        onClick={click}
        className={cn(
          "flex w-full items-center gap-3 rounded-md border bg-card px-3 py-2.5 text-left text-card-foreground shadow-xs transition-colors",
          !inert && "hover:bg-accent hover:text-accent-foreground active:scale-[0.99]",
          option.readOnly && "cursor-default",
          option.disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {option.icon && (
          <span className="grid w-6 shrink-0 place-items-center text-muted-foreground">
            <Icon icon={option.icon} color={option.iconColor} animation={option.iconAnimation} allowImage className="size-4 max-w-[25px]" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          {title && <Markdown className="text-sm leading-snug font-medium">{title}</Markdown>}
          <Markdown className="mt-0.5 text-xs text-muted-foreground">{option.description}</Markdown>
          {option.progress !== undefined && (
            <Bar value={option.progress} scheme={option.colorScheme} fallback="var(--muted-foreground)" className="mt-1.5" />
          )}
        </span>
        {arrow && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />}
      </button>
      {card && hover && <HoverCard option={option} />}
    </div>
  );
}

/** Image and metadata, shown beside the hovered option. */
function HoverCard({ option }: { option: Option }) {
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
    <Card className="absolute top-0 right-full mr-2 w-64 gap-2 p-3 text-sm animate-in fade-in-0 zoom-in-95">
      {option.image && <img src={option.image} alt="" className="max-h-40 w-full rounded-md object-contain" />}
      {rows.map((r, i) => (
        <div key={i}>
          <div className="text-xs">{r.text ?? `${r.label}: ${r.value ?? ""}`}</div>
          {r.progress !== undefined && (
            <Bar value={r.progress} scheme={r.colorScheme ?? option.colorScheme} fallback="var(--muted-foreground)" className="mt-1" />
          )}
        </div>
      ))}
    </Card>
  );
}
