/** The backdrop a HUD part sits on: CSS only, no picture. */
export function stageBackground(variant: "dusk" | "day" = "dusk") {
  return variant === "day"
    ? "linear-gradient(180deg,#7fb2d8 0%,#cfe3ee 55%,#8a8f93 55%,#4a4d50 100%)"
    : "linear-gradient(180deg,#1a1f3a 0%,#4a3560 45%,#d9794b 62%,#2a2528 62%,#121214 100%)";
}

export function Scene({ variant = "dusk" }: { variant?: "dusk" | "day" }) {
  return <div className="pointer-events-none absolute inset-0" style={{ background: stageBackground(variant) }} aria-hidden />;
}
