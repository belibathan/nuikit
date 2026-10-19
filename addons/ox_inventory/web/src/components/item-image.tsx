import { PackageIcon } from "lucide-react";
import { memo, useState } from "react";
import { cn } from "@/lib/utils";

/** An item image with a neutral fallback when the PNG is missing. */
export const ItemImage = memo(function ItemImage({ src, className }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <PackageIcon className={cn("text-muted-foreground/60", className)} strokeWidth={1.25} />;
  return <img src={src} alt="" draggable={false} onError={() => setFailed(src)} className={cn("inv-img object-contain", className)} />;
});

/**
 * Slim bar. Quiet by default; `destructive` only when the value means trouble:
 * durability ≤ 20 (high = good) or weight ≥ 90% (high = bad). Weight is the panel's one progress
 * fill, so it uses `primary`; durability bars repeat per slot, so they stay neutral.
 */
export function Meter({ value, tone, className }: { value: number; tone: "durability" | "weight"; className?: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  const danger = tone === "durability" ? v <= 20 : v >= 90;
  const fill = danger ? "bg-destructive" : tone === "weight" ? "bg-primary" : "bg-muted-foreground";
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-300", fill)} style={{ width: `${v}%`, visibility: v > 0 ? "visible" : "hidden" }} />
    </div>
  );
}
