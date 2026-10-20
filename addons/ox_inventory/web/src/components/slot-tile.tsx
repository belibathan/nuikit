import { memo, type MouseEvent } from "react";
import { ItemImage, Meter } from "@/components/item-image";
import { useT } from "@/lib/locale";
import type { Side, Slot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { moveItem, useItem } from "@/state/actions";
import { hasItem, itemImage, itemLabel } from "@/state/inventory";
import { clickSuppressed, closeTooltip, dropKey, hoverSlot, pressSlot, ui } from "@/state/ui";

type Props = {
  side: Side;
  item: Slot;
  invType: string;
  /** Not buyable / not craftable: greyed out and not draggable. */
  locked?: boolean;
  /** Hotbar overlay: no interaction, drawn as a HUD tile on the game. */
  display?: boolean;
  imagepath: string;
  /** Registry revision: re-render when labels/images arrive via getItemData. */
  rev?: number;
};

/** Shop price (§5): cash plain, dirty money destructive, any other currency shows that item's image. */
function Price({ item }: { item: Slot }) {
  const t = useT();
  if (!item.price || item.price <= 0) return null;
  const amount = item.price.toLocaleString("en-US");
  if (item.currency && item.currency !== "money" && item.currency !== "black_money") {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        <ItemImage src={itemImage(item.currency)} className="size-3" />
        {amount}
      </span>
    );
  }
  return (
    <span className={cn("font-medium", item.currency === "black_money" ? "text-destructive" : "text-foreground")}>
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

  // Top row: hotbar key and count, or in a shop the stock and the price. A count of 1 is implied.
  const count = filled && item.count && item.count > 1 ? item.count.toLocaleString("en-US") : null;
  const stock = shop && filled && item.count !== undefined ? item.count.toLocaleString("en-US") : null;

  return (
    <div
      data-drop={display ? undefined : key}
      onPointerDown={display ? undefined : (e) => filled && !locked && pressSlot(e, { side, slot: item.slot })}
      onPointerEnter={display || !filled ? undefined : () => hoverSlot({ side, slot: item.slot })}
      onPointerLeave={display || !filled ? undefined : () => hoverSlot(null)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        "relative flex aspect-square flex-col rounded-md p-2 transition-[background-color,box-shadow,opacity] duration-150",
        display ? "inv-hud" : filled ? "bg-muted/60" : "bg-muted/25",
        !display && filled && !locked && "cursor-grab hover:bg-accent",
        isOver && "bg-accent ring-2 ring-primary ring-inset",
        isSource && "opacity-40",
        locked && "opacity-40 grayscale",
      )}
    >
      <div className={cn("nk-num flex h-3 shrink-0 items-center justify-between gap-1 text-xs leading-none", display ? "text-hud-foreground/70" : "text-muted-foreground")}>
        <span>{hot ? item.slot : stock}</span>
        {shop ? <Price item={item} /> : count && <span className={cn("font-medium", display ? "text-hud-foreground" : "text-foreground")}>{count}</span>}
      </div>

      {filled && (
        <>
          <div className="grid min-h-0 flex-1 place-items-center">
            <ItemImage src={itemImage(item, imagepath)} className={display ? "size-9" : "size-10"} />
          </div>
          {!display && <div className="truncate text-center text-xs leading-4 font-medium">{itemLabel(item)}</div>}
          {!shop && item.durability !== undefined && (
            <Meter value={item.durability} tone="durability" className={cn("absolute inset-x-2 bottom-1 h-0.5 w-auto", display && "bg-white/20")} />
          )}
        </>
      )}
    </div>
  );
});
