import { PackageIcon } from "lucide-react";
import { memo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** An item image with a neutral fallback when the PNG is missing. */
export const ItemImage = memo(function ItemImage({ src, className }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) return <PackageIcon className={cn("text-muted-foreground/60", className)} strokeWidth={1.25} />;
  return <img src={src} alt="" draggable={false} onError={() => setFailed(src)} className={cn("inv-img object-contain", className)} />;
});

const clamp = (v: number) => Math.max(0, Math.min(100, v || 0));

/**
 * Slim bar. Quiet by default; `destructive` only when the value means trouble:
 * durability ≤ 20 (high = good) or weight ≥ 90% (high = bad). The fill moves by scaleX.
 */
export function Meter({ value, tone, className }: { value: number; tone: "durability" | "weight"; className?: string }) {
  const v = clamp(value);
  const danger = tone === "durability" ? v <= 20 : v >= 90;
  return (
    <div className={cn("inv-meter", className)} data-tone={tone} data-danger={danger || undefined}>
      <div className="inv-meter-fill" style={{ "--v": v / 100 } as CSSProperties} />
    </div>
  );
}
