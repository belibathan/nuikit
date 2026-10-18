import { cn } from "@/lib/utils";

/**
 * The backdrop every HUD shot sits on: Los Angeles (which is what Los Santos is), slightly
 * blurred so it reads as "the game world" without competing with the UI on top.
 * Photo: Jessica Christian on Unsplash (Unsplash License).
 */
export function Scene({ className, variant = "dusk" }: { className?: string; variant?: "dusk" | "day" }) {
  const day = variant === "day";
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-neutral-900", className)} aria-hidden>
      <img
        src="/la.jpg"
        alt=""
        className="absolute -inset-4 size-[calc(100%+2rem)] max-w-none object-cover"
        style={{ filter: day ? "blur(2px) brightness(1.2) saturate(1.15)" : "blur(2px) saturate(1.05)" }}
      />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 50%, rgba(0,0,0,.5))" }} />
    </div>
  );
}
