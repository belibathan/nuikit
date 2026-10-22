import { useStaggerItem } from "nuikit-core/react";
import { memo, type MouseEvent } from "react";
import { ItemImage } from "@/components/item-image";
import { SlotOutline } from "@/components/outline";
import { formatMoney } from "@/components/ui/money";
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

/** Whole prices show no decimals; a fractional one keeps two. */
const digits = (n: number) => (Number.isInteger(n) ? 0 : 2);

/**
 * Shop price (§5): cash in the kit's money format with ox's own symbol (locale `$`), dirty money
 * destructive, any other currency shows that item's image before the amount.
 */
function Price({ item }: { item: Slot }) {
  const t = useT();
  if (!item.price || item.price <= 0) return null;
  if (item.currency && item.currency !== "money" && item.currency !== "black_money") {
    return (
      <span className="inv-price">
        <ItemImage src={itemImage(item.currency)} name={item.currency} className="size-3" />
        {formatMoney(item.price, { currency: null, fractionDigits: digits(item.price) })}
      </span>
    );
  }
  return (
    <span className={cn("inv-price", item.currency === "black_money" && "text-destructive")}>
      {formatMoney(item.price, { currency: null, prefix: t("$"), fractionDigits: digits(item.price) })}
    </span>
  );
}

/**
 * One slot: a tile in the identity's chip shape (the vitals' family). The hotbar key sits in a key
 * cap, the count top right, the label along the foot; durability is traced along the tile's own
 * outline, like a vital's level on its chip.
 */
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
  const durability = !shop && filled && item.durability !== undefined ? Math.max(0, Math.min(100, item.durability)) : undefined;

  // in the sheet's <Stagger>: slots pop in one after another when it opens, and fold out when it closes
  const stagger = useStaggerItem<HTMLDivElement>(undefined, { appear: !display, animate: display ? false : "pop" });
  return (
    <div
      ref={stagger}
      data-drop={display ? undefined : key}
      data-filled={filled || undefined}
      data-over={isOver || undefined}
      data-source={isSource || undefined}
      data-locked={locked || undefined}
      data-display={display || undefined}
      data-worn={durability !== undefined && durability <= 20 ? "" : undefined}
      onPointerDown={display ? undefined : (e) => filled && !locked && pressSlot(e, { side, slot: item.slot })}
      onPointerEnter={display || !filled ? undefined : () => hoverSlot({ side, slot: item.slot })}
      onPointerLeave={display || !filled ? undefined : () => hoverSlot(null)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn("inv-slot", display && "nk-hud")}
    >
      {durability !== undefined && <SlotOutline value={durability} />}
      <div className="inv-slot-top">
        {hot ? <span className="inv-key">{item.slot}</span> : <span className="nk-num">{stock}</span>}
        {shop ? <Price item={item} /> : count && <span className="inv-count">{count}</span>}
      </div>

      {filled && (
        <>
          <div className="grid min-h-0 flex-1 place-items-center">
            <ItemImage src={itemImage(item, imagepath)} name={item.name} className={display ? "size-9" : "size-10"} />
          </div>
          {!display && <div className="inv-slot-label">{itemLabel(item)}</div>}
        </>
      )}
    </div>
  );
});
