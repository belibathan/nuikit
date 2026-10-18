"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * NuiMenu — the keyboard-first list menu every server needs (garages, jobs, interactions).
 * Arrow keys / W S to move, Enter / E to select, Escape handled by useNuiVisibility.
 *
 *   <NuiMenu title="Garage" items={cars} onSelect={(car) => fetchNui("garage:spawn", car)} />
 */
export interface NuiMenuItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  /** Right-aligned meta, e.g. "$500" or "3/5". */
  meta?: React.ReactNode;
  disabled?: boolean;
}

export interface NuiMenuProps<T extends NuiMenuItem> extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  items: T[];
  onSelect: (item: T) => void;
  /** Capture keys globally (default true; NUI usually has nothing else focused). */
  global?: boolean;
}

export function NuiMenu<T extends NuiMenuItem>({ title, subtitle, items, onSelect, global = true, className, ...props }: NuiMenuProps<T>) {
  const [active, setActive] = React.useState(() => Math.max(0, items.findIndex((i) => !i.disabled)));
  const listRef = React.useRef<HTMLDivElement>(null);

  const move = React.useCallback(
    (dir: 1 | -1) => {
      setActive((i) => {
        for (let step = 1; step <= items.length; step++) {
          const next = (i + dir * step + items.length) % items.length;
          if (!items[next]?.disabled) return next;
        }
        return i;
      });
    },
    [items],
  );

  const onKey = React.useCallback(
    (e: KeyboardEvent | React.KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowdown" || k === "s") (e.preventDefault(), move(1));
      else if (k === "arrowup" || k === "w") (e.preventDefault(), move(-1));
      else if (k === "enter" || k === "e") {
        const item = items[active];
        if (item && !item.disabled) (e.preventDefault(), onSelect(item));
      }
    },
    [active, items, move, onSelect],
  );

  React.useEffect(() => {
    if (!global) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [global, onKey]);

  // Keep the active row visible without scrolling the page around it.
  React.useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }, [active]);

  return (
    <div
      className={cn("flex w-80 flex-col overflow-hidden rounded-xl border bg-card/90 text-card-foreground shadow-xl backdrop-blur-sm", className)}
      onKeyDown={global ? undefined : onKey}
      tabIndex={global ? undefined : 0}
      {...props}
    >
      {(title || subtitle) && (
        <div className="border-b px-4 py-3">
          {title && <div className="text-sm font-semibold tracking-tight">{title}</div>}
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      )}
      <div ref={listRef} role="listbox" className="relative flex max-h-96 flex-col gap-0.5 overflow-y-auto p-1.5">
        {items.map((item, i) => {
          const selected = i === active;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-disabled={item.disabled}
              data-index={i}
              disabled={item.disabled}
              onMouseEnter={() => !item.disabled && setActive(i)}
              onClick={() => !item.disabled && onSelect(item)}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors",
                selected ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                item.disabled && "opacity-40",
              )}
            >
              {item.icon && (
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-md [&_svg]:size-4", selected ? "bg-primary-foreground/15" : "bg-muted text-muted-foreground")}>
                  {item.icon}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.label}</span>
                {item.description && selected && <span className="block truncate text-xs opacity-80">{item.description}</span>}
              </span>
              {item.meta && <span className={cn("shrink-0 font-mono text-xs tabular-nums", selected ? "opacity-90" : "text-muted-foreground")}>{item.meta}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
