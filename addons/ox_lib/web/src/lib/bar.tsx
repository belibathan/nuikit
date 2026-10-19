import { Progress } from "@/components/ui/progress";
import { schemeColor } from "@/lib/color";
import { cn } from "@/lib/utils";

/** shadcn Progress coloured by an ox_lib colorScheme ('green', 'red.6', a CSS colour) or the theme. */
export function Bar({ value, scheme, fallback = "var(--primary)", className }: { value: number; scheme?: string; fallback?: string; className?: string }) {
  return (
    <Progress
      value={Math.max(0, Math.min(100, value))}
      className={cn("h-1 bg-muted [&_[data-slot=progress-indicator]]:bg-[var(--ox-bar)]", className)}
      style={{ ["--ox-bar" as string]: schemeColor(scheme, fallback) }}
    />
  );
}
