import { ChevronDownIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties } from "react";
import { MenuRow } from "@/components/ui/menu-row";
import { ActionBar, ActionBarItem } from "@/components/ui/action-bar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Meter, meterColor } from "@/components/ui/meter";
import { Icon } from "@/lib/icon";
import { changeSelectedBody, confirmSelectedBody, listIntent } from "@/lib/intents";
import { debounce, post, useOx } from "@/lib/nui";
import { openIntent, type Handle } from "@/lib/route";
import { cn } from "@/lib/utils";

type Value = string | { label: string; description?: string };

interface MenuItem {
  label?: string;
  icon?: string | [string, string];
  iconColor?: string;
  iconAnimation?: string;
  values?: Value[];
  defaultIndex?: number;
  checked?: boolean;
  progress?: number;
  colorScheme?: string;
  description?: string;
  close?: boolean;
}

interface MenuData {
  title: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  canClose?: boolean;
  items: MenuItem[];
  startItemIndex?: number;
}

const isValues = (i: MenuItem) => Array.isArray(i.values);
const isCheck = (i: MenuItem) => !isValues(i) && i.checked !== undefined;

/**
 * ox_lib's keyboard list menu (lib.registerMenu / lib.showMenu). No mouse: the cursor is off and the
 * game keeps input. Protocol: docs/ox-lib-protocol.md §5.
 */
export function ListMenu() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [selected, setSelected] = useState(0);
  const [indexes, setIndexes] = useState<Record<number, number>>({});
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  const touched = useRef(false); // changeIndex/changeChecked stay quiet until the first key press
  const list = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLDivElement>(null);

  const changeSelected = useMemo(() => debounce((body: unknown[]) => void post("changeSelected", body), 100), []);
  const changeIndex = useMemo(() => debounce((body: unknown[]) => void post("changeIndex", body), 100), []);
  const changeChecked = useMemo(() => debounce((body: unknown[]) => void post("changeChecked", body), 100), []);

  const routed = useRef<Handle | null>(null);

  const showLocal = (data: MenuData) => {
    const items = data.items ?? [];
    let start = data.startItemIndex || 0;
    if (start < 0) start = 0;
    if (start >= items.length) start = Math.max(0, items.length - 1);
    const idx: Record<number, number> = {};
    const chk: Record<number, boolean> = {};
    items.forEach((it, i) => {
      if (isValues(it)) idx[i] = (it.defaultIndex || 1) - 1;
      else if (isCheck(it)) chk[i] = it.checked || false;
    });
    touched.current = false;
    setIndexes(idx);
    setChecks(chk);
    setSelected(start);
    setMenu(data);
  };

  // Routed (docs/adapters/ox-lib.md §3): the frame draws it as a keyboard menu and reports every
  // highlight, step and toggle as events; this page turns them into ox's debounced callbacks.
  useOx<MenuData>("setMenu", (data) => {
    const items = (data.items ?? []) as Record<string, unknown>[];
    const handle = openIntent("menu", listIntent(data as unknown as Record<string, unknown>), {
      key: "menu",
      onEvent: (event, raw) => {
        const d = raw as { index: number; value?: number; checked?: boolean };
        if (event === "change") changeSelected(changeSelectedBody(items, d));
        else if (event === "scroll") changeIndex([d.index - 1, (d.value ?? 1) - 1]);
        else if (event === "check") changeChecked([d.index - 1, d.checked ?? false]);
        else if (event === "select") void post("confirmSelected", confirmSelectedBody(items, d)); // close = false: stays open
      },
      onEnd: (a) => {
        if (routed.current?.id === a.id) routed.current = null;
        if (a.result && typeof a.result === "object") return void post("confirmSelected", confirmSelectedBody(items, a.result as { index: number; value?: number }));
        if (a.reason === "escape" || a.reason === "stopped") void post("closeMenu", "Escape");
        else if (a.reason === "close") void post("closeMenu", "Backspace"); // the renderer's Backspace
      },
      onLocal: () => showLocal(data),
    });
    if (handle) {
      routed.current = handle;
      setMenu(null);
    }
  });
  // lib.hideMenu: close even when canClose is false, post nothing
  useOx("closeMenu", () => {
    routed.current?.cancel();
    routed.current = null;
    setMenu(null);
  });

  // changeSelected fires (debounced) on every highlight change, including once when the menu opens.
  useEffect(() => {
    if (!menu) return;
    const item = menu.items[selected];
    if (!item) return;
    if (isValues(item)) changeSelected([selected, indexes[selected] ?? 0, "isScroll"]);
    else if (item.checked) changeSelected([selected, checks[selected] ?? false, "isCheck"]);
    else changeSelected([selected, null, null]);
    list.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`)?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, selected]);

  useEffect(() => {
    if (!menu) return;
    const items = menu.items;
    const onKey = (e: KeyboardEvent) => {
      const item = items[selected];
      switch (e.code) {
        case "ArrowDown":
          touched.current = true;
          setSelected((s) => (s + 1 >= items.length ? 0 : s + 1));
          break;
        case "ArrowUp":
          touched.current = true;
          setSelected((s) => (s - 1 < 0 ? items.length - 1 : s - 1));
          break;
        case "ArrowRight":
        case "ArrowLeft": {
          touched.current = true;
          if (!item || !isValues(item)) break;
          const n = item.values!.length;
          const cur = indexes[selected] ?? 0;
          const next = e.code === "ArrowRight" ? (cur + 1 >= n ? 0 : cur + 1) : cur - 1 < 0 ? n - 1 : cur - 1;
          setIndexes((x) => ({ ...x, [selected]: next }));
          changeIndex([selected, next]);
          break;
        }
        case "Enter": {
          touched.current = true;
          if (!item) break;
          if (isCheck(item)) {
            const next = !checks[selected];
            setChecks((x) => ({ ...x, [selected]: next }));
            changeChecked([selected, next]);
            break;
          }
          void post("confirmSelected", [selected, isValues(item) ? (indexes[selected] ?? 0) : null]);
          if (item.close !== false) setMenu(null);
          break;
        }
        case "Escape":
        case "Backspace":
          if (menu.canClose === false) break;
          setMenu(null);
          void post("closeMenu", e.code);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, selected, indexes, checks, changeIndex, changeChecked]);

  // The last menu stays drawn while the sheet slides out (closing sets `menu` to null at once, so the
  // keys stop at once, as before).
  const last = useRef<MenuData | null>(null);
  if (menu) last.current = menu;
  const view = menu ?? last.current;

  // One indicator glides behind the rows to the selected one (nk-indicator, docs/design.md motion 2): placed
  // from the selected row's own box every time, so it can never be left on a stale row. Moves sooner than
  // the panel time apart glide fast; the third in a row jumps (it never trails a held key).
  const lastMove = useRef({ at: 0, streak: 0 });
  useLayoutEffect(() => {
    const el = indicator.current;
    const row = list.current?.querySelector<HTMLElement>(`.nk-row[data-index="${selected}"]`);
    if (!el) return;
    el.toggleAttribute("data-hidden", !row);
    if (!row) return;
    const now = performance.now();
    const m = lastMove.current;
    m.streak = now - m.at < 140 ? m.streak + 1 : 0;
    m.at = now;
    if (m.streak >= 2) el.setAttribute("data-repeat", "jump");
    else if (m.streak === 1) el.setAttribute("data-repeat", "fast");
    else el.removeAttribute("data-repeat");
    el.style.transform = `translateY(${row.offsetTop}px)`;
    el.style.height = `${row.offsetHeight}px`;
  });

  // Hover moves the selection, exactly as the arrow keys do (the same changeSelected), so only one row
  // is ever lit. Pointer movement only: a row scrolling under a still cursor doesn't steal it.
  const hoverTo = (i: number) => {
    if (!menu || i === selected) return;
    touched.current = true;
    setSelected(i);
  };

  if (!view) return null;
  const items = view.items ?? [];
  const current = items[selected];
  const currentValue = current && isValues(current) ? current.values![indexes[selected] ?? 0] : undefined;
  const tooltip = (typeof currentValue === "object" && currentValue?.description) || current?.description;
  const position = view.position ?? "top-left";
  const right = position.endsWith("right");
  const bottom = position.startsWith("bottom");

  return (
    <Sheet open={!!menu} modal={false}>
      <SheetContent
        side={right ? "right" : "left"}
        showCloseButton={false}
        aria-describedby={undefined}
        // keys are the window listener above; Radix never closes, focuses or traps anything here
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className={cn(
          // a floating sheet: the panel recipe, --nk-edge off the screen edges, as tall as its content
          "ox-sheet-float ox-list nk-panel z-30 h-auto w-[25rem] gap-0 sm:max-w-[25rem]",
          bottom ? "top-auto bottom-(--nk-edge,1.5rem)" : "top-(--nk-edge,1.5rem) bottom-auto",
          right ? "right-(--nk-edge,1.5rem) left-auto" : "left-(--nk-edge,1.5rem) right-auto",
        )}
      >
        <TooltipProvider delayDuration={0}>
          <div className="flex min-h-0 flex-col p-6 pb-0">
            <header className="pb-4">
              <SheetTitle className="ox-sheet-title nk-title truncate">{view.title}</SheetTitle>
            </header>
            {/* Exactly 7 rows tall (7 × 48px), so scrollIntoView({ block: "nearest" }) always lands on a
                whole row. The rows change state instantly; only the indicator moves. */}
            <div ref={list} className="ox-rows relative flex max-h-[21rem] flex-col overflow-y-hidden border-t border-border">
              {/* hairlines between rows, drawn under the indicator so they never cut through it */}
              <div aria-hidden className="ox-rules" style={{ "--rows": items.filter((it) => it.label).length } as CSSProperties} />
              <div ref={indicator} className="nk-indicator ox-indicator" />
              {items.map((item, i) =>
                item.label ? (
                  <Tooltip key={i} open={i === selected && !!tooltip && !!menu}>
                    <TooltipTrigger asChild>
                      <Row
                        index={i}
                        item={item}
                        active={i === selected}
                        scroll={indexes[i] ?? 0}
                        checked={checks[i] ?? false}
                        // rows rise in, staggered, when the sheet opens (they stay mounted while menus swap)
                        stagger={Math.min(i, 5)}
                        onPointerMove={() => hoverTo(i)}
                      />
                    </TooltipTrigger>
                    <TooltipContent side={right ? "left" : "right"} align="center" sideOffset={rem() * 2.25} className="ox-tip nk-panel max-w-64 px-3 py-2 text-sm text-muted-foreground">
                      {tooltip}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span key={i} data-index={i} hidden />
                ),
              )}
            </div>
            {items.length > 7 && selected !== items.length - 1 && (
              <div className="flex justify-center pt-1 text-muted-foreground">
                <ChevronDownIcon className="size-4" />
              </div>
            )}
          </div>
          <ActionBar className="nk-panel-footer mt-4 flex-wrap">
            <ActionBarItem keys={["↑", "↓"]} label="Move" />
            {current && isValues(current) && <ActionBarItem keys={["←", "→"]} label="Change" />}
            <ActionBarItem keys={["Enter"]} label={current && isCheck(current) ? "Toggle" : "Select"} />
            {view.canClose !== false && <ActionBarItem className="ml-auto" keys={["Esc"]} label="Close" />}
          </ActionBar>
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}

const noStep = () => {};

/**
 * One item as a MenuRow: a stepper for `values`, a checkbox for `checked`, a bar for `progress`.
 * The rows only show state; every key is handled by the window listener above (the cursor is off
 * and the container ignores the pointer), so the rows' own handlers never post anything.
 */
function Row({
  index,
  item,
  active,
  scroll,
  checked,
  stagger,
  className,
  style,
  ...rest
}: { index: number; item: MenuItem; active: boolean; scroll: number; checked: boolean; stagger?: number } & Omit<ComponentProps<"div">, "children">) {
  const value = isValues(item) ? item.values![scroll] : undefined;
  // Only the highlighted row's value is bright; the others stay muted, as on the rest of the kit.
  const valueLabel = typeof value === "object" ? value?.label : value;
  const kind = isValues(item)
    ? { value: <span className={active ? undefined : "text-muted-foreground"}>{valueLabel}</span>, onStep: noStep }
    : isCheck(item)
      ? { checked }
      : item.progress !== undefined
        ? { meta: <Meter {...meterColor(item.colorScheme)} value={item.progress} size="sm" aria-label={item.label} className="w-24" /> }
        : {};
  return (
    <MenuRow
      {...(rest as object)}
      data-index={index}
      tabIndex={-1}
      active={active}
      // no hover look of its own: hover moves the selection (ListMenu), so the selected row is the only lit one
      hover={false}
      className={cn("shrink-0 text-base", stagger !== undefined && "nk-rise nk-stagger", className)}
      style={stagger !== undefined ? ({ "--i": stagger, ...style } as CSSProperties) : style}
      icon={item.icon ? <Icon icon={item.icon} color={item.iconColor} animation={item.iconAnimation} allowImage className="size-4" /> : undefined}
      {...kind}
    >
      {item.label}
    </MenuRow>
  );
}

/** 1rem in px now (the NUI scale follows the resolution); Radix offsets are in px. */
const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
