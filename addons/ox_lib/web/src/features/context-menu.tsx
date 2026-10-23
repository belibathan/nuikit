import { useEffect, useRef, useState, type MouseEvent } from "react";
import { EdgeSheet, EdgeSheetBody } from "@/components/ui/edge-sheet";
import { MenuRow, MenuRowDetails, MenuRowList, menuMetadata } from "@/components/ui/menu-row";
import { Icon } from "@/lib/icon";
import { contextIntent } from "@/lib/intents";
import { useLever } from "@/lib/levers";
import { Markdown } from "@/lib/markdown";
import { post, useOx } from "@/lib/nui";
import { openIntent, type Handle } from "@/lib/route";
import { splitTitle, TITLE_LEVER } from "@/lib/title";

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
 * The kit's EdgeSheet on the right (floating, as tall as its rows), like the other overrides' sheets:
 * it slides in once and its rows rise in sequence; a submenu or Back swaps the page inside it (a short
 * fade) instead of closing and reopening the sheet. Escape, the close button and clicks stay ours
 * (the sheet never dismisses itself), so the posts are exactly ox's: openContext, clickContext,
 * closeContext.
 */
export function ContextMenu() {
  // lever (README): the screen edge the sheet sits on, right by default
  const side = useLever("ox-context-side", "right") === "left" ? "left" : "right";
  // lever (README): a leading emoji and its "|" / "-" become the sheet's or row's icon (lib/title.ts); 0 keeps titles as written
  const normalise = useLever(TITLE_LEVER, "1") !== "0";
  const [data, setData] = useState<ContextData | null>(null);
  const [open, setOpen] = useState(false);
  // Each showContext is a new page of the open sheet (a fade); the rows rise in when the sheet opens.
  const [gen, setGen] = useState(0);
  const [hover, setHover] = useState<{ key: string; top: number } | null>(null);
  useEffect(() => setHover(null), [data]);

  const routed = useRef<Handle | null>(null);

  // Local (no nuikit, or routing off): the sheet. A submenu or Back swaps the column in place.
  const showLocal = (next: ContextData) => {
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
  const head = normalise ? splitTitle(data.title) : null;
  const iconColumn = entries.some(([, o]) => !!o.icon || (normalise && !!splitTitle(o.title)));
  const hovered = hover ? (data.options as Record<string, Option>)[hover.key] : undefined;

  const enter = (key: string, e: MouseEvent<HTMLElement>) => {
    const sheet = e.currentTarget.closest("[data-slot=edge-sheet]");
    const top = e.currentTarget.getBoundingClientRect().top - (sheet?.getBoundingClientRect().top ?? 0);
    setHover({ key, top });
  };

  return (
    <EdgeSheet
      open={open}
      side={side}
      width="26rem"
      fit
      page={gen}
      className="z-30"
      icon={head ? <span aria-hidden>{head.icon}</span> : undefined}
      title={<Markdown className="[&_p]:m-0">{head ? head.title : data.title}</Markdown>}
      onBack={data.menu ? () => post("openContext", { id: data.menu, back: true }) : undefined}
      onClose={data.canClose === false ? undefined : close}
    >
      <EdgeSheetBody scroll onViewportScroll={() => setHover(null)}>
        {/* the baseline: rows breathe (--nk-list-gap) instead of hairlines; one selection Tile slides between them */}
        <MenuRowList>
          {entries.map(([key, option]) => (
            <ContextOption key={key} id={key} option={option} iconColumn={iconColumn} normalise={normalise} onEnter={(e) => enter(key, e)} onLeave={() => setHover((h) => (h?.key === key ? null : h))} />
          ))}
        </MenuRowList>
      </EdgeSheetBody>
      {hovered && !hovered.disabled && (hovered.metadata || hovered.image) && <HoverCard key={hover!.key} option={hovered} top={hover!.top} side={side} />}
    </EdgeSheet>
  );
}

/** ox's default colorScheme for context bars (protocol §4). menu-row reads Mantine names through meterColor(). */
const OX_BAR = "dark.3";

function ContextOption({ id, option, iconColumn, normalise, onEnter, onLeave }: { id: string; option: Option; iconColumn: boolean; normalise: boolean; onEnter: (e: MouseEvent<HTMLElement>) => void; onLeave: () => void }) {
  // A missing title on a keyed option shows the key itself (ox_lib does this).
  const raw = option.title ?? (Number.isNaN(Number(id)) ? id : undefined);
  // a leading emoji in the title is the row's icon when the script gave none (lib/title.ts)
  const split = normalise ? splitTitle(raw) : null;
  const title = split ? split.title : raw;
  const icon = option.icon ? (
    <Icon icon={option.icon} color={option.iconColor} animation={option.iconAnimation} allowImage className="size-4" />
  ) : split ? (
    <span aria-hidden className="text-(length:--nk-icon-md) leading-none">{split.icon}</span>
  ) : undefined;
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
      // when any row has an icon, the others keep the icon column so every title starts on one line
      icon={icon}
      iconSpace={iconColumn}
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
function HoverCard({ option, top, side }: { option: Option; top: number; side: "left" | "right" }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 200);
    return () => clearTimeout(t);
  }, []);
  if (!shown) return null;
  // Each bar keeps its own colorScheme; without one it takes the option's, then ox's default.
  const items = menuMetadata(option.metadata).map((m) => (m.progress !== undefined && !m.color ? { ...m, color: option.colorScheme ?? OX_BAR } : m));
  return <MenuRowDetails image={option.image} items={items} className={side === "right" ? "absolute right-full mr-2" : "absolute left-full ml-2"} style={{ top }} />;
}
