import { cn } from "@/lib/utils";

/**
 * The backdrop every HUD shot sits on: a Los Santos-style street, pre-blurred in Figma
 * (docs/brand: "nuikit — Export assets") so it reads as "the game world" behind the UI.
 */
export function Scene({ className, variant = "dusk" }: { className?: string; variant?: "dusk" | "day" }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-neutral-900", className)} aria-hidden>
      <img src={variant === "day" ? "/bg/stage-day.jpg" : "/bg/stage-dusk.jpg"} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 50%, rgba(0,0,0,.5))" }} />
    </div>
  );
}

/** A full-bleed, low-opacity photo behind a page section. Fades into the page at both edges. */
export function Backdrop({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)} aria-hidden>
      <img src={src} alt="" className="size-full object-cover opacity-[0.14]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
}
