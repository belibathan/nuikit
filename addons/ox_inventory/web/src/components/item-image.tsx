import { PackageIcon } from "lucide-react";
import { memo, useState } from "react";
import { cn } from "@/lib/utils";

/** An item image with a neutral fallback when the PNG is missing. */
export const ItemImage = memo(function ItemImage({ src, className }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <PackageIcon className={cn("text-muted-foreground/60", className)} strokeWidth={1.25} />;
  return <img src={src} alt="" draggable={false} onError={() => setFailed(src)} className={cn("inv-img object-contain", className)} />;
});

/** Thin bar. `tone` picks the fill from percent: durability (high = good) or weight (high = bad). */
export function Meter({ value, tone, className }: { value: number; tone: "durability" | "weight"; className?: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const fill =
    tone === "durability"
      ? v > 50
        ? "bg-emerald-500"
        : v > 20
          ? "bg-amber-500"
          : "bg-red-500"
      : v >= 90
        ? "bg-red-500"
        : v >= 70
          ? "bg-amber-500"
          : "bg-primary";
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-foreground/10", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-300", fill)} style={{ width: `${v}%`, visibility: v > 0 ? "visible" : "hidden" }} />
    </div>
  );
}
