import {
  ArchiveIcon,
  BackpackIcon,
  BoxIcon,
  CarFrontIcon,
  HammerIcon,
  MapPinIcon,
  SearchIcon,
  StoreIcon,
  Trash2Icon,
  UserIcon,
  WarehouseIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SlotTile } from "@/components/slot-tile";
import { EdgeSheet, EdgeSheetBody } from "@/components/ui/edge-sheet";
import { NumberRoll } from "@/components/ui/text-roll";
import type { Side } from "@/lib/types";
import { cn } from "@/lib/utils";
import { canCraft, canPurchase, formatKg, inv, totalWeight } from "@/state/inventory";

const KINDS: Record<string, { icon: LucideIcon; name: string }> = {
  player: { icon: UserIcon, name: "Player" },
  otherplayer: { icon: UserIcon, name: "Player" },
  inspect: { icon: SearchIcon, name: "Inspect" },
  newdrop: { icon: MapPinIcon, name: "Ground" },
  drop: { icon: MapPinIcon, name: "Drop" },
  stash: { icon: WarehouseIcon, name: "Stash" },
  trunk: { icon: CarFrontIcon, name: "Trunk" },
  glovebox: { icon: CarFrontIcon, name: "Glovebox" },
  container: { icon: BackpackIcon, name: "Container" },
  shop: { icon: StoreIcon, name: "Shop" },
  crafting: { icon: HammerIcon, name: "Crafting" },
  dumpster: { icon: Trash2Icon, name: "Dumpster" },
  policeevidence: { icon: ArchiveIcon, name: "Evidence" },
};

const PAGE = 60;

/** What this inventory holds and, for the empty or catalogue ones, what to do with it (rule 9). */
function caption(type: string, used: number, slots: number): string {
  const count = `${used} / ${slots} slots`;
  if (type === "shop") return `${used} ${used === 1 ? "item" : "items"}. Drag one to your inventory to buy it.`;
  if (type === "crafting") return `${used} ${used === 1 ? "recipe" : "recipes"}. Drag one to your inventory to craft it.`;
  if (type === "newdrop" && !used) return "Drag items here to drop them.";
  if (!used && type !== "player") return `${count}. Drag items here to store them.`;
  return count;
}

/**
 * One side of the inventory: a full-height edge sheet (the pause menu's backdrop, shared as
 * registry `edge-sheet`), the weight traced along its header's edge, and the slots below. The
 * secondary inventory slides in just after the player's.
 */
export function InventoryPanel({ side, open }: { side: Side; open: boolean }) {
  const inventory = inv.use((s) => (side === "left" ? s.left : s.right));
  const imagepath = inv.use((s) => s.imagepath);
  const busy = inv.use((s) => s.busy);
  // craft/buy checks depend on the registry counts and the player's own slots and groups
  const registry = inv.use((s) => s.registry);
  const playerItems = inv.use((s) => (inventory.type === "crafting" || inventory.type === "shop" ? s.left : null));

  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [inventory.id, inventory.type]);

  const weight = useMemo(() => Math.floor(totalWeight(inventory.items) * 1000) / 1000, [inventory.items]);
  const locked = useMemo(
    () => inventory.items.map((it) => !canPurchase(it, inventory) || !canCraft(it, inventory)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventory, registry, playerItems],
  );

  const kind = KINDS[inventory.type] ?? { icon: BoxIcon, name: inventory.type ? inventory.type[0].toUpperCase() + inventory.type.slice(1) : "" };
  const Icon = kind.icon;
  const label = inventory.label || kind.name;
  const max = inventory.maxWeight || 0;
  const percent = max ? (weight / max) * 100 : 0;
  const used = inventory.items.filter((i) => i.name).length;

  // Page in more slots as the grid scrolls (the stock ScrollArea's viewport).
  const onScroll = (el: HTMLDivElement) => {
    if (limit < inventory.items.length && el.scrollTop + el.clientHeight > el.scrollHeight - el.clientHeight * 0.5) setLimit((l) => l + PAGE);
  };

  return (
    <EdgeSheet
      open={open}
      side={side === "left" ? "left" : "right"}
      delay={side === "left" ? 0 : 60}
      width="var(--inv-sheet-width)"
      icon={<Icon />}
      title={label}
      description={caption(inventory.type, used, inventory.slots)}
      meter={max > 0 ? percent : undefined}
      actions={
        max > 0 && (
          <span className="nk-num text-sm text-muted-foreground">
            <NumberRoll value={weight} format={formatKg} className={cn("font-semibold", percent >= 90 ? "text-destructive" : "text-foreground")} /> / {formatKg(max)} kg
          </span>
        )
      }
    >
      <EdgeSheetBody scroll onViewportScroll={onScroll}className={cn(busy && "pointer-events-none")}>
        <div className="inv-grid">
          {inventory.items.slice(0, limit).map((item, i) => (
            <SlotTile
              key={`${inventory.type}-${inventory.id}-${item.slot}`}
              side={side}
              item={item}
              invType={inventory.type}
              locked={locked[i]}
              imagepath={imagepath}
              rev={registry}
            />
          ))}
        </div>
      </EdgeSheetBody>
    </EdgeSheet>
  );
}
