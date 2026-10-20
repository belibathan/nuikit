import { ChevronLeftIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { MenuRow, MenuRowDetails, menuMetadata } from "@/components/ui/menu-row";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { schemeColor } from "@/lib/color";
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

/**
 * ox's colorScheme on menu-row's bars. menu-row draws its progress without a colour option, so the
 * colour rides in --ox-bar (ox's default 'dark.3' is the theme's muted foreground).
 * TODO(components): drop once menu-row / MenuRowDetails take a progress colour (Requests in the PR).
 */
const barColour = "[&_[data-slot=progress-indicator]]:bg-(--ox-bar)";
const barStyle = (scheme?: string) => ({ ["--ox-bar" as string]: schemeColor(scheme, "var(--muted-foreground)") }) as CSSProperties;

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
      chevron={arrow}
      className={cn(hasProgress && barColour)}
      style={hasProgress ? barStyle(option.colorScheme) : undefined}
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
  const items = menuMetadata(option.metadata);
  // One colour for the card's bars: the first metadata bar's colorScheme, else the option's.
  const meta = Array.isArray(option.metadata) ? option.metadata : [];
  const scheme = meta.find((m): m is { label: string; progress: number; colorScheme: string } => typeof m === "object" && m !== null && "progress" in m && !!m.colorScheme)?.colorScheme ?? option.colorScheme;
  return (
    <MenuRowDetails
      image={option.image}
      items={items}
      className={cn("absolute right-full mr-2", barColour)}
      style={{ top, ...barStyle(scheme) }}
    />
  );
}
