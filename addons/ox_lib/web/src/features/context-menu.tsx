import { ChevronLeftIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { MenuRow, MenuRowDetails, menuMetadata } from "@/components/ui/menu-row";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
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

/**
 * ox_lib's context menu (lib.registerContext / lib.showContext), drawn with the kit's Panel and
 * MenuRow, the components behind the `menu` intent. Protocol: docs/ox-lib-protocol.md §4.
 */
export function ContextMenu() {
  const [data, setData] = useState<ContextData | null>(null);
  const [open, setOpen] = useState(false);
  const swap = useRef<ReturnType<typeof setTimeout>>(undefined);
  const presence = usePresence(open, 100);
  const anchor = useRef<HTMLDivElement>(null);
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
    const top = e.currentTarget.getBoundingClientRect().top - (anchor.current?.getBoundingClientRect().top ?? 0);
    setHover({ key, top });
  };

  // The hover card is a sibling of the panel, not a child: Panel clips its own overflow.
  return (
    <div ref={anchor} data-state={presence.state} className={cn("fixed top-[15%] right-[25%] z-30", presenceMotion)}>
      <Panel animate={false}>
        <PanelHeader
          className="gap-2 pr-3"
          actions={
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground" disabled={data.canClose === false} onClick={close} aria-label="Close">
              <XIcon />
            </Button>
          }
        >
          {data.menu && (
            <Button variant="ghost" size="icon-sm" className="-ml-2 shrink-0 text-muted-foreground" onClick={() => post("openContext", { id: data.menu, back: true })} aria-label="Back">
              <ChevronLeftIcon />
            </Button>
          )}
          <Markdown className="nk-title min-w-0 flex-1 truncate">{data.title}</Markdown>
        </PanelHeader>
        <PanelBody className="max-h-[35rem] overflow-y-auto" onScroll={() => setHover(null)}>
          {entries.map(([key, option]) => (
            <ContextOption key={key} id={key} option={option} onEnter={(e) => enter(key, e)} onLeave={() => setHover((h) => (h?.key === key ? null : h))} />
          ))}
        </PanelBody>
      </Panel>
      {hovered && !hovered.disabled && (hovered.metadata || hovered.image) && <HoverCard key={hover!.key} option={hovered} top={hover!.top} />}
    </div>
  );
}

/** ox's default colorScheme for context bars (protocol §4). menu-row reads Mantine names through meterColor(). */
const OX_BAR = "dark.3";

function ContextOption({ id, option, onEnter, onLeave }: { id: string; option: Option; onEnter: (e: MouseEvent<HTMLElement>) => void; onLeave: () => void }) {
  // A missing title on a keyed option shows the key itself (ox_lib does this).
  const title = option.title ?? (Number.isNaN(Number(id)) ? id : undefined);
  const arrow = Boolean(option.menu || option.arrow) && option.arrow !== false;
  const hasProgress = option.progress !== undefined;

  // menu-row never calls onClick for a disabled or readOnly row
  const click = () => {
    if (option.menu) void post("openContext", { id: option.menu, back: false });
    else void post("clickContext", id);
  };

  return (
    <MenuRow
      disabled={option.disabled}
      readOnly={option.readOnly}
      onClick={click}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      icon={option.icon ? <Icon icon={option.icon} color={option.iconColor} animation={option.iconAnimation} allowImage className="size-4" /> : undefined}
      description={option.description ? <Markdown>{option.description}</Markdown> : undefined}
      // ox shows the bar whenever `progress` is present, 0 included
      progress={hasProgress ? Number(option.progress) : undefined}
      progressColor={option.colorScheme ?? OX_BAR}
      chevron={arrow}
    >
      {title && <Markdown>{title}</Markdown>}
    </MenuRow>
  );
}

/** Image and metadata, shown beside the hovered option (ox opens it after 200 ms). */
function HoverCard({ option, top }: { option: Option; top: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 200);
    return () => clearTimeout(t);
  }, []);
  if (!shown) return null;
  // Each bar keeps its own colorScheme; without one it takes the option's, then ox's default.
  const items = menuMetadata(option.metadata).map((m) => (m.progress !== undefined && !m.color ? { ...m, color: option.colorScheme ?? OX_BAR } : m));
  return <MenuRowDetails image={option.image} items={items} className="absolute right-full mr-2" style={{ top }} />;
}
