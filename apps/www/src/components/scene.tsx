import { cn } from "@/lib/utils";

/** A stylised Los Santos dusk: the backdrop every HUD shot sits on. Pure CSS + SVG. */
export function Scene({ className, variant = "dusk" }: { className?: string; variant?: "dusk" | "day" }) {
  const day = variant === "day";
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: day
            ? "linear-gradient(180deg,#7fb6e8 0%,#b9dcf5 38%,#f6e6c8 62%,#cfb48f 63%,#8c7a63 100%)"
            : "linear-gradient(180deg,#0b0820 0%,#2a1446 30%,#7a2e5c 50%,#e0705a 61%,#2a1a2e 61.5%,#120d18 100%)",
        }}
      />
      {/* sun */}
      <div
        className="absolute left-[62%] top-[44%] size-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: day ? "radial-gradient(circle,#fffbe8 0 30%,#fff3c4 45%,transparent 70%)" : "radial-gradient(circle,#ffd29a 0 28%,#ff8a5c 42%,transparent 70%)", opacity: 0.85 }}
      />
      <svg viewBox="0 0 1200 400" preserveAspectRatio="none" className="absolute inset-x-0 top-[34%] h-[28%] w-full">
        <path
          d="M0 400V250h40v-40h30v60h25V180h45v90h30v-60h20v-90h50v150h30v-70h40v100h20V140h35v-40h30v170h25v-90h55v120h30V200h40v-70h20v-30h20v140h35v-90h45v110h30v-60h25v-50h40v130h30V180h30v-60h35v170h25v-110h50v150h30v-70h40v80h20v-130h45v140h40v-50h35v110z"
          fill={day ? "#6b7b8c" : "#1a0f24"}
          opacity={day ? 0.55 : 1}
        />
        {!day &&
          Array.from({ length: 90 }, (_, i) => {
            const x = (i * 137) % 1180;
            const y = 170 + ((i * 53) % 210);
            return <rect key={i} x={x + 10} y={y} width="3" height="3" fill={i % 5 ? "#ffcf8a" : "#9fd3ff"} opacity={0.35 + ((i * 7) % 10) / 20} />;
          })}
      </svg>
      {/* road */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background: day ? "linear-gradient(180deg,#8f8778,#4d4a45)" : "linear-gradient(180deg,#1b1420,#09070b)",
          clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0 100%)",
        }}
      />
      <div className="absolute bottom-0 left-1/2 h-[38%] w-1.5 -translate-x-1/2" style={{ background: "repeating-linear-gradient(180deg,#ffd27a 0 18px,transparent 18px 40px)", opacity: day ? 0.7 : 0.5, clipPath: "polygon(40% 0,60% 0,100% 100%,0 100%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,.55))" }} />
    </div>
  );
}
