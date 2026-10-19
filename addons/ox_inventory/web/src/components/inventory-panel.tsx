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
import { Card } from "@/components/ui/card";
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

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (limit < inventory.items.length && el.scrollTop + el.clientHeight > el.scrollHeight - el.clientHeight * 0.5) setLimit((l) => l + PAGE);
  };

  return (
    <Card className="w-[31.25rem] gap-0 overflow-hidden rounded-xl border-border/80 bg-card/95 py-0 inv-elev">
      <div className="flex flex-col gap-2.5 border-b border-border/70 px-4 pt-3.5 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm leading-tight font-semibold">{label}</div>
            <div className="text-xs leading-tight text-muted-foreground tabular-nums">
              {inventory.items.filter((i) => i.name).length} / {inventory.slots}
            </div>
          </div>
          {max > 0 && (
            <div className="shrink-0 text-right text-xs tabular-nums">
              <span className={cn("font-semibold", percent >= 90 ? "text-red-400" : "text-foreground")}>{formatKg(weight)}</span>
              <span className="text-muted-foreground"> / {formatKg(max)} kg</span>
            </div>
          )}
        </div>
        {max > 0 && <Meter value={percent} tone="weight" className="h-1.5" />}
      </div>

      <div className={cn("inv-scroll max-h-[37rem] p-3 pr-1.5", busy && "pointer-events-none")} onScroll={onScroll}>
        <div className="grid grid-cols-5 gap-[0.45rem]">
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
    </Card>
  );
}
