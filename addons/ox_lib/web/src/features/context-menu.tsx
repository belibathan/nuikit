import { ChevronLeftIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { MenuRow, MenuRowDetails, menuMetadata } from "@/components/ui/menu-row";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Icon } from "@/lib/icon";
import { contextIntent } from "@/lib/intents";
import { Markdown } from "@/lib/markdown";
import { post, useOx } from "@/lib/nui";
import { openIntent, type Handle } from "@/lib/route";
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
 * ox_lib's context menu (lib.registerContext / lib.showContext). Protocol: docs/ox-lib-protocol.md §4.
 *
 * shadcn's Sheet (Radix Dialog, non-modal) on the right edge, dressed like the pause menu's backdrop:
 * the panel surface flush to the top, right and bottom, a hairline on its open edge, the title in the
 * display face, 48px rows with hairlines between them. The sheet slides in once; a submenu or Back
 * swaps the column inside it (a short fade) instead of closing and reopening the sheet. Escape, the
 * close button and clicks stay ours (Radix's own dismissals are turned off), so the posts are
 * exactly ox's: openContext, clickContext, closeContext.
 */
export function ContextMenu() {
  const [data, setData] = useState<ContextData | null>(null);
  const [open, setOpen] = useState(false);
  // Each showContext is a new column; the rows rise in (staggered) only when the sheet itself opens.
  const [gen, setGen] = useState(0);
  const [fresh, setFresh] = useState(true);
  const column = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ key: string; top: number } | null>(null);
  useEffect(() => setHover(null), [data]);

  const routed = useRef<Handle | null>(null);

  // Local (no nuikit, or routing off): the sheet. A submenu or Back swaps the column in place.
  const showLocal = (next: ContextData) => {
    setFresh(!open);
    setData(next);
    setGen((g) => g + 1);
    setOpen(true);
  };

  // Routed (docs/adapters/ox-lib.md §3): the frame's menu renderer draws it as a cursor menu. Rows keep
  // ox's keys as ids and `close = false`, so a click is a `select` event → clickContext and the menu
  // stays until Lua hides it, as ox does. Submenu / back / Escape come back as reasons.
  useOx<ContextData>("showContext", (next) => {
    const handle = openIntent("menu", contextIntent(next as unknown as Record<string, unknown>), {
      key: "context",
      onEvent: (event, data) => {
        if (event === "select") void post("clickContext", String((data as { id: string }).id));
      },
      onEnd: (a) => {
        if (routed.current?.id === a.id) routed.current = null;
        const menu = (a.data as { menu?: string } | undefined)?.menu;
        switch (a.reason) {
          case "submenu":
            return void post("openContext", { id: menu, back: false });
          case "back":
            return void post("openContext", { id: menu, back: true });
          case "escape":
          case "close":
          case "stopped": // nuikit stopped under the menu: ox's Lua must release focus
            return void post("closeContext");
          default:
            // a result can't happen (every row has close = false, or is a submenu); cancel/replaced came from here
            if (a.result && typeof a.result === "object") void post("clickContext", String((a.result as { id: string }).id));
        }
      },
      onLocal: () => showLocal(next),
    });
    if (handle) {
      routed.current = handle;
      setOpen(false);
    }
  });
  useOx("hideContext", () => {
    routed.current?.cancel();
    routed.current = null;
    setOpen(false);
  });

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

  if (!data) return null;
  // Same order as ox_lib: Object.entries (integer-like keys first, then the rest as received).
  const entries = Object.entries(data.options ?? {});
  const hovered = hover ? (data.options as Record<string, Option>)[hover.key] : undefined;

  const enter = (key: string, e: MouseEvent<HTMLElement>) => {
    const top = e.currentTarget.getBoundingClientRect().top - (column.current?.getBoundingClientRect().top ?? 0);
    setHover({ key, top });
  };

  return (
    <Sheet open={open} modal={false}>
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-describedby={undefined}
        // ours, not Radix's: Escape is the window listener above (one closeContext), clicks outside do nothing
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="ox-sheet z-30 w-[26rem] gap-0 sm:max-w-[26rem]"
      >
        <div ref={column} key={gen} className={cn("relative flex h-full min-h-0 flex-col py-12 pr-6 pl-8", !fresh && "nk-enter")}>
          <header className="flex items-center gap-2 pb-6">
            {data.menu && (
              <Button variant="ghost" size="icon-sm" className="-ml-2 shrink-0 text-muted-foreground" onClick={() => post("openContext", { id: data.menu, back: true })} aria-label="Back">
                <ChevronLeftIcon />
              </Button>
            )}
            <SheetTitle asChild>
              <div className="ox-sheet-title nk-title min-w-0 flex-1 truncate">
                <Markdown>{data.title}</Markdown>
              </div>
            </SheetTitle>
            <Button variant="ghost" size="icon-sm" className="-mr-2 shrink-0 text-muted-foreground" disabled={data.canClose === false} onClick={close} aria-label="Close">
              <XIcon />
            </Button>
          </header>
          <ScrollArea className="ox-sheet-scroll min-h-0 flex-1 border-t border-border" onScrollCapture={() => setHover(null)}>
            <div className="flex flex-col divide-y divide-border">
              {entries.map(([key, option], i) => (
                <ContextOption
                  key={key}
                  id={key}
                  option={option}
                  index={fresh ? i : undefined}
                  onEnter={(e) => enter(key, e)}
                  onLeave={() => setHover((h) => (h?.key === key ? null : h))}
                />
              ))}
            </div>
          </ScrollArea>
          {hovered && !hovered.disabled && (hovered.metadata || hovered.image) && <HoverCard key={hover!.key} option={hovered} top={hover!.top} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** ox's default colorScheme for context bars (protocol §4). menu-row reads Mantine names through meterColor(). */
const OX_BAR = "dark.3";

function ContextOption({ id, option, index, onEnter, onLeave }: { id: string; option: Option; index?: number; onEnter: (e: MouseEvent<HTMLElement>) => void; onLeave: () => void }) {
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
      // the first open: the first five rows rise in, one after another (design.md, motion 7)
      className={cn("min-h-12 text-base", index !== undefined && "nk-rise nk-stagger")}
      style={index !== undefined ? ({ "--i": Math.min(index, 5) } as CSSProperties) : undefined}
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
