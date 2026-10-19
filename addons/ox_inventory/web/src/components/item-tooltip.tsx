import { CheckIcon, ClockIcon, XIcon } from "lucide-react";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import Markdown from "react-markdown";
import { ItemImage, Meter } from "@/components/item-image";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/lib/locale";
import type { Slot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Items, formatWeight, hasIngredient, hasItem, inv, itemImage, sideInventory } from "@/state/inventory";
import { onPointerMove, pointer, ui } from "@/state/ui";

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-xs">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className="min-w-0 truncate text-right font-medium text-popover-foreground tabular-nums">{children}</span>
    </div>
  );
}

function Ingredients({ item }: { item: Slot }) {
  const entries = Object.entries(item.ingredients ?? {}).sort((a, b) => Number(a[1]) - Number(b[1]));
  return (
    <div className="flex flex-col gap-1.5">
      {entries.map(([name, raw]) => {
        const n = Number(raw);
        const label = Items[name]?.label || name;
        const text = n >= 1 ? `${n}x ${label}` : n === 0 ? label : `${Math.round(n * 100)}% ${label}`;
        const ok = hasIngredient(name, n);
        return (
          <div key={name} className="flex items-center gap-2 text-xs">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-foreground/[0.06]">
              <ItemImage src={itemImage(name)} className="size-5" />
            </span>
            <span className="min-w-0 flex-1 truncate">{text}</span>
            {ok ? <CheckIcon className="size-3.5 text-emerald-400" /> : <XIcon className="size-3.5 text-red-400" />}
          </div>
        );
      })}
    </div>
  );
}

function TooltipBody({ item, invType }: { item: Slot; invType: string }) {
  const t = useT();
  const extra = inv.use((s) => s.extraMeta);
  const data = item.name ? Items[item.name] : undefined;
  if (!data) return <div className="text-sm font-semibold">{item.name}</div>;

  const meta = item.metadata ?? {};
  const description = (meta.description as string) || data.description;
  const ammoName = data.ammoName && Items[data.ammoName]?.label;
  const components: string[] = Array.isArray(meta.components) ? meta.components : [];
  const crafting = invType === "crafting";

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm leading-tight font-semibold">{meta.label || data.label || item.name}</div>
          {!!item.weight && <div className="mt-0.5 text-[0.7rem] text-muted-foreground tabular-nums">{formatWeight(item.weight)}</div>}
        </div>
        {crafting ? (
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[0.7rem] font-medium text-secondary-foreground tabular-nums">
            <ClockIcon className="size-3" />
            {(item.duration !== undefined ? item.duration : 3000) / 1000}s
          </span>
        ) : (
          meta.type && (
            <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[0.7rem] font-medium text-secondary-foreground">{String(meta.type)}</span>
          )
        )}
      </div>
      <Separator className="my-2.5" />
      {description && (
        <div className="inv-md mb-2.5 text-xs leading-relaxed text-muted-foreground">
          <Markdown>{String(description)}</Markdown>
        </div>
      )}
      {crafting ? (
        <Ingredients item={item} />
      ) : (
        <div className="flex flex-col gap-1.5">
          {item.durability !== undefined && (
            <div className="flex flex-col gap-1">
              <Row k={t("ui_durability")}>{Math.trunc(item.durability)}</Row>
              <Meter value={item.durability} tone="durability" />
            </div>
          )}
          {meta.ammo !== undefined && <Row k={t("ui_ammo")}>{meta.ammo}</Row>}
          {ammoName && <Row k={t("ammo_type")}>{ammoName}</Row>}
          {meta.serial && <Row k={t("ui_serial")}>{meta.serial}</Row>}
          {components.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t("ui_components")}</span>
              <div className="flex flex-wrap gap-1">
                {components.map((c, i) => (
                  <span key={`${c}-${i}`} className="rounded-md bg-secondary px-1.5 py-0.5 text-[0.7rem] font-medium text-secondary-foreground">
                    {Items[c]?.label ?? c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!!meta.weapontint && <Row k={t("ui_tint")}>{meta.weapontint}</Row>}
          {extra.map((e, i) => (meta[e.metadata] ? <Row key={`${e.metadata}-${i}`} k={e.value}>{String(meta[e.metadata])}</Row> : null))}
        </div>
      )}
    </>
  );
}

/** Floating item details that follow the cursor (§8). */
export function ItemTooltip() {
  const tip = ui.use((s) => s.tooltip);
  const item = inv.use((s) => (tip ? sideInventory(tip.side, s).items[tip.slot - 1] : undefined));
  const invType = inv.use((s) => (tip ? sideInventory(tip.side, s).type : ""));
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const pad = 12;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let x = pointer.x + 18;
      let y = pointer.y + 14;
      if (x + w > window.innerWidth - pad) x = pointer.x - w - 14;
      if (y + h > window.innerHeight - pad) y = Math.max(pad, window.innerHeight - h - pad);
      el.style.transform = `translate3d(${Math.max(pad, x)}px, ${y}px, 0)`;
    };
    place();
    return onPointerMove(place);
  }, [tip, item]);

  if (!tip || !hasItem(item)) return null;
  return (
    <div ref={ref} className="pointer-events-none fixed top-0 left-0 z-[60]">
      <div
        className={cn(
          "inv-fade-in w-[16.5rem] rounded-lg border border-border bg-popover p-3 text-popover-foreground inv-elev",
        )}
      >
        <TooltipBody item={item} invType={invType} />
      </div>
    </div>
  );
}

