import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Bar } from "@/lib/bar";
import { Icon } from "@/lib/icon";
import { debounce, post, useOx } from "@/lib/nui";
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

const CORNER = {
  "top-left": "top-1.5 left-1.5",
  "top-right": "top-1.5 right-1.5",
  "bottom-left": "bottom-1.5 left-1.5",
  "bottom-right": "bottom-1.5 right-1.5",
} as const;

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

  const changeSelected = useMemo(() => debounce((body: unknown[]) => void post("changeSelected", body), 100), []);
  const changeIndex = useMemo(() => debounce((body: unknown[]) => void post("changeIndex", body), 100), []);
  const changeChecked = useMemo(() => debounce((body: unknown[]) => void post("changeChecked", body), 100), []);

  useOx<MenuData>("setMenu", (data) => {
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
  });
  useOx("closeMenu", () => setMenu(null)); // lib.hideMenu: close even when canClose is false, post nothing

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

  if (!menu) return null;
  const items = menu.items ?? [];
  const current = items[selected];
  const currentValue = current && isValues(current) ? current.values![indexes[selected] ?? 0] : undefined;
  const tooltip = (typeof currentValue === "object" && currentValue?.description) || current?.description;

  return (
    <div className={cn("pointer-events-none fixed z-30 flex w-96 gap-2 animate-in fade-in-0 zoom-in-95", CORNER[menu.position ?? "top-left"], menu.position?.endsWith("right") && "flex-row-reverse")}>
      <Card className="w-96 gap-0 overflow-hidden py-0">
        <div className="border-b px-4 py-3 text-center text-lg font-semibold tracking-wide uppercase">{menu.title}</div>
        <div ref={list} className="flex max-h-[415px] flex-col gap-1 overflow-y-hidden p-1.5">
          {items.map((item, i) =>
            item.label ? (
              <Row key={i} index={i} item={item} active={i === selected} scroll={indexes[i] ?? 0} checked={checks[i] ?? false} />
            ) : (
              <span key={i} data-index={i} hidden />
            ),
          )}
        </div>
        {items.length > 6 && selected !== items.length - 1 && (
          <div className="flex justify-center pb-1 text-muted-foreground">
            <ChevronDownIcon className="size-4" />
          </div>
        )}
      </Card>
      {tooltip && <Card className="h-fit w-max max-w-[350px] px-3 py-2 text-sm text-muted-foreground animate-in fade-in-0">{tooltip}</Card>}
    </div>
  );
}

function Row({ index, item, active, scroll, checked }: { index: number; item: MenuItem; active: boolean; scroll: number; checked: boolean }) {
  const value = isValues(item) ? item.values![scroll] : undefined;
  return (
    <div
      data-index={index}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md px-3 py-2 transition-colors",
        active ? "bg-accent text-accent-foreground" : "text-card-foreground",
      )}
    >
      {item.icon && (
        <span className="grid w-8 shrink-0 place-items-center text-muted-foreground">
          <Icon icon={item.icon} color={item.iconColor} animation={item.iconAnimation} allowImage className="size-5 max-w-8" />
        </span>
      )}
      {isValues(item) ? (
        <>
          <div className="min-w-0 flex-1">
            <div className="text-xs tracking-wide text-muted-foreground uppercase">{item.label}</div>
            <div className="truncate text-sm font-medium">{typeof value === "object" ? value?.label : value}</div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
            <ChevronLeftIcon className="size-3.5" />
            {scroll + 1}/{item.values!.length}
            <ChevronRightIcon className="size-3.5" />
          </div>
        </>
      ) : isCheck(item) ? (
        <>
          <div className="flex-1 text-sm font-medium">{item.label}</div>
          <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
        </>
      ) : item.progress !== undefined ? (
        <div className="flex-1">
          <div className="text-sm font-medium">{item.label}</div>
          <Bar value={item.progress} scheme={item.colorScheme} className="mt-1.5" />
        </div>
      ) : (
        <div className="flex-1 text-sm font-medium">{item.label}</div>
      )}
    </div>
  );
}
