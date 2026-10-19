import { memo, type MouseEvent } from "react";
import { ItemImage, Meter } from "@/components/item-image";
import { useT } from "@/lib/locale";
import type { Side, Slot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { moveItem, useItem } from "@/state/actions";
import { formatWeight, hasItem, itemImage, itemLabel } from "@/state/inventory";
import { clickSuppressed, closeTooltip, dropKey, hoverSlot, pressSlot, ui } from "@/state/ui";

type Props = {
  side: Side;
  item: Slot;
  invType: string;
  /** Not buyable / not craftable: greyed out and not draggable. */
  locked?: boolean;
  /** Hotbar overlay: no interaction. */
  display?: boolean;
  imagepath: string;
  /** Registry revision: re-render when labels/images arrive via getItemData. */
  rev?: number;
};

/** Shop price (§5): cash green, dirty money red, any other currency shows that item's image. */
function Price({ item }: { item: Slot }) {
  const t = useT();
  if (!item.price || item.price <= 0) return null;
  const amount = item.price.toLocaleString("en-US");
  if (item.currency && item.currency !== "money" && item.currency !== "black_money") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-sm bg-background/80 px-1 text-[0.7rem] font-semibold tabular-nums text-foreground">
        <ItemImage src={itemImage(item.currency)} className="size-[1.05rem]" />
        {amount}
      </span>
    );
  }
  const dirty = item.currency === "black_money";
  return (
    <span
      className={cn(
        "rounded-sm px-1 text-[0.7rem] font-semibold tabular-nums",
        dirty ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400",
      )}
    >
      {t("$")}
      {amount}
    </span>
  );
}

export const SlotTile = memo(function SlotTile({ side, item, invType, locked, display, imagepath }: Props) {
  const key = dropKey(side, item.slot);
  const isOver = ui.use((s) => !display && s.over === key);
  const isSource = ui.use((s) => !display && s.drag?.from.side === side && s.drag.from.slot === item.slot);
  const filled = hasItem(item);
  const hot = side === "left" && item.slot <= 5 && (invType === "player" || display);
  const shop = invType === "shop";

  const onClick = (e: MouseEvent) => {
    closeTooltip();
    if (display || clickSuppressed() || !filled) return;
    if (e.ctrlKey && invType !== "shop" && invType !== "crafting") moveItem({ side, slot: item.slot });
    else if (e.altKey && side === "left" && invType === "player") useItem(item.slot);
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (display || side !== "left" || invType !== "player" || !filled) return;
    closeTooltip();
    ui.set({ menu: { slot: item.slot, x: e.clientX, y: e.clientY } });
  };

  return (
    <div
      data-drop={display ? undefined : key}
      onPointerDown={display ? undefined : (e) => filled && !locked && pressSlot(e, { side, slot: item.slot })}
      onPointerEnter={display || !filled ? undefined : () => hoverSlot({ side, slot: item.slot })}
      onPointerLeave={display || !filled ? undefined : () => hoverSlot(null)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "group/slot relative flex aspect-square flex-col overflow-hidden rounded-lg border px-1.5 pt-1 pb-1.5 transition-[border-color,background-color,box-shadow,opacity] duration-150",
        filled
          ? "border-border/70 bg-gradient-to-b from-foreground/[0.09] to-foreground/[0.03]"
          : "border-border/40 bg-foreground/[0.025]",
        !display && filled && !locked && "cursor-grab hover:border-foreground/30 hover:from-foreground/[0.13]",
        isOver && "border-primary bg-primary/10 ring-2 ring-primary/40",
        isSource && "opacity-35",
        locked && "opacity-45 grayscale",
      )}
    >
      <div className="absolute inset-x-1.5 top-1 z-10 flex h-[1.05rem] items-center gap-1 text-[0.62rem] leading-none">
        {hot && (
          <span className="-ml-0.5 grid size-[1.05rem] shrink-0 place-items-center rounded-[0.3rem] bg-foreground/90 text-[0.62rem] leading-none font-bold text-background">
            {item.slot}
          </span>
        )}
        {filled && !!item.weight && item.weight > 0 && <span className="min-w-0 truncate text-muted-foreground tabular-nums inv-shadow">{formatWeight(item.weight)}</span>}
        {filled && !!item.count && (
          <span className="ml-auto shrink-0 font-semibold text-foreground tabular-nums inv-shadow">{item.count.toLocaleString("en-US")}x</span>
        )}
      </div>

      {filled && (
        <>
          <div className="relative mt-[0.55rem] min-h-0 flex-1">
            <ItemImage src={itemImage(item, imagepath)} className="absolute inset-x-[6%] top-0 h-full w-[88%]" />
            {shop && item.price !== undefined && item.price > 0 && (
              <div className="absolute right-0 bottom-0">
                <Price item={item} />
              </div>
            )}
          </div>
          <div className="truncate text-center text-[0.68rem] leading-tight font-medium text-foreground/90">{itemLabel(item)}</div>
          {!shop && item.durability !== undefined && <Meter value={item.durability} tone="durability" className="mt-1 h-[0.2rem] shrink-0" />}
        </>
      )}
    </div>
  );
});
