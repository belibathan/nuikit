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
import { useEffect, useMemo, useState, type UIEvent } from "react";
import { Meter } from "@/components/item-image";
import { SlotTile } from "@/components/slot-tile";
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

/** Panel width (5 × 5.5rem slots, 0.5rem gaps, 1rem padding, hairline border), for the empty right-hand placeholder. */
export const PANEL_WIDTH = "w-[31.625rem]";

export function InventoryPanel({ side }: { side: Side }) {
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
  const catalogue = inventory.type === "shop" || inventory.type === "crafting";

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (limit < inventory.items.length && el.scrollTop + el.clientHeight > el.scrollHeight - el.clientHeight * 0.5) setLimit((l) => l + PAGE);
  };

  return (
    <section className="nk-panel nk-enter w-max overflow-hidden">
      <header className="nk-panel-header flex-col items-stretch gap-3">
        <div className="flex items-center gap-3">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <h2 className="nk-title min-w-0 flex-1 truncate">{label}</h2>
          {catalogue ? (
            <span className="nk-label nk-num shrink-0">
              {used} {inventory.type === "shop" ? (used === 1 ? "item" : "items") : used === 1 ? "recipe" : "recipes"}
            </span>
          ) : (
            <span className="nk-label nk-num shrink-0">
              {used} / {inventory.slots} slots
            </span>
          )}
          {max > 0 && (
            <span className="nk-label nk-num shrink-0">
              <span className={cn(percent >= 90 ? "text-destructive" : "text-foreground")}>{formatKg(weight)}</span> / {formatKg(max)} kg
            </span>
          )}
        </div>
        {max > 0 && <Meter value={percent} tone="weight" />}
      </header>

      <div className={cn("inv-scroll max-h-[37rem] py-4 pr-2.5 pl-4", busy && "pointer-events-none")} onScroll={onScroll}>
        <div className="grid grid-cols-[repeat(5,5.5rem)] gap-2">
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
      </div>
    </section>
  );
}
