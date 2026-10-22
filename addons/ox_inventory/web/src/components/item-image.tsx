import { PackageIcon } from "lucide-react";
import { memo, useState, type CSSProperties } from "react";
import { NuiImage } from "@/components/ui/nui-image";
import { alertThreshold } from "@/lib/level";
import { cn } from "@/lib/utils";

/**
 * An item image: ox_inventory's own path first (the protocol's imagepath, or the item's), then the
 * server's image conventions (nuikit-core resolveImage: qb / ps / lj inventory images, `setr
 * nuikit_images_item`), then a neutral icon.
 */
export const ItemImage = memo(function ItemImage({ src, name, className }: { src?: string; name?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (name) {
    const icon = <PackageIcon className={cn("text-muted-foreground/60", className)} strokeWidth={1.25} />;
    return <NuiImage kind="item" imageKey={name} urls={src ? [src] : []} fallback={icon} className={cn("inv-img", className)} />;
  }
  if (!src || failed === src) return <PackageIcon className={cn("text-muted-foreground/60", className)} strokeWidth={1.25} />;
  return <img src={src} alt="" draggable={false} onError={() => setFailed(src)} className={cn("inv-img object-contain", className)} />;
});

const clamp = (v: number) => Math.max(0, Math.min(100, v || 0));

/**
 * Slim bar. Quiet by default; `destructive` only when the value means trouble: durability at or under
 * the theme's alert threshold (high = good) or weight ≥ 90% (high = bad). The level contract: the value
 * is --level (0–1) on the bar, the fill scales by it.
 */
export function Meter({ value, tone, className }: { value: number; tone: "durability" | "weight"; className?: string }) {
  const v = clamp(value);
  const level = v / 100;
  const danger = tone === "durability" ? level <= alertThreshold() : level >= 0.9;
  return (
    <div className={cn("inv-meter", className)} data-tone={tone} data-danger={danger || undefined} style={{ "--level": level } as CSSProperties}>
      <div className="inv-meter-fill" />
    </div>
  );
}
