import { Chip } from "@/components/ui/chip";
import { Kbd } from "@/components/ui/glyph";
import { useStaggerItem } from "nuikit-core/react";
import { memo, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { ItemImage } from "@/components/item-image";
import { SlotOutline } from "@/components/outline";
import { formatCount, formatMoney } from "@/components/ui/money";
import { useT } from "@/lib/locale";
import type { Side, Slot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { moveItem, useItem } from "@/state/actions";
import { alertThreshold } from "@/lib/level";
import { hasItem, itemImage, itemLabel, rarityOf } from "@/state/inventory";
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
      <Chip>
        <ItemImage src={itemImage(item.currency)} name={item.currency} className="size-3" />
        {formatMoney(item.price, { currency: null, fractionDigits: digits(item.price) })}
      </Chip>
    );
  }
  return (
    <Chip tone={item.currency === "black_money" ? "danger" : undefined}>
      {formatMoney(item.price, { currency: null, prefix: t("$"), fractionDigits: digits(item.price) })}
    </Chip>
  );
}

/**
 * A stack's count: the num text style (tabular), compact past 999 (2,450 reads 2.4k, rounded down; the tooltip has
 * the exact number), on the chip's plate so it reads over any item image. A count of 1 is implied and not drawn.
 */
export function SlotCount({ count, className }: { count: number; className?: string }) {
  if (!(count > 1)) return null;
  const exact = count.toLocaleString("en-US");
  return (
    <span data-slot="inv-count" className={cn("inv-count nk-text-num", className)} aria-label={`${exact}×`}>
      {formatCount(count)}
      <span className="inv-count-x" aria-hidden>
        ×
      </span>
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
  const count = filled && item.count && item.count > 1 ? item.count : 0;
  const stock = shop && filled && item.count !== undefined ? item.count.toLocaleString("en-US") : null;
  const durability = !shop && filled && item.durability !== undefined ? Math.max(0, Math.min(100, item.durability)) : undefined;
  // the level contract: durability as --level (0–1); worn at the theme's alert threshold
  const level = durability !== undefined ? durability / 100 : undefined;
  const rarity = filled ? rarityOf(item) : undefined;
  // an item arrived (a drop, a split, a pick-up): the slot answers with a short pop, never on first paint
  const content = filled ? `${item.name}:${item.count ?? 1}` : "";
  const seen = useRef(content);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (content === seen.current) return;
    seen.current = content;
    if (!content || display) return;
    setLanded(true);
    const t = setTimeout(() => setLanded(false), 260);
    return () => clearTimeout(t);
  }, [content, display]);

  // in the sheet's <Stagger>: slots pop in one after another when it opens, and fold out when it closes
  const stagger = useStaggerItem<HTMLDivElement>(undefined, { appear: !display, animate: display ? false : "pop" });
  return (
    <div
      ref={stagger}
      data-drop={display ? undefined : key}
      data-filled={filled || undefined}
      data-over={isOver || undefined}
      data-source={isSource || undefined}
      data-slot="item-slot"
      data-state={locked ? "disabled" : undefined}
      data-locked={locked || undefined}
      data-display={display || undefined}
      data-worn={level !== undefined && level <= alertThreshold() ? "" : undefined}
      data-hue={rarity}
      data-landed={landed || undefined}
      style={level !== undefined ? ({ "--level": level } as CSSProperties) : undefined}
      onPointerDown={display ? undefined : (e) => filled && !locked && pressSlot(e, { side, slot: item.slot })}
      onPointerEnter={display || !filled ? undefined : () => hoverSlot({ side, slot: item.slot })}
      onPointerLeave={display || !filled ? undefined : () => hoverSlot(null)}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn("inv-slot", display && "nk-hud")}
    >
      {durability !== undefined && <SlotOutline value={durability} />}
      <div className="inv-slot-top">
        {hot ? <Kbd>{item.slot}</Kbd> : <span className="nk-num">{stock}</span>}
        {shop ? <Price item={item} /> : <SlotCount count={count} />}
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
