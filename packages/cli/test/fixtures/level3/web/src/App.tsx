import { Surface, useNuiState, usePlayer } from "nuikit-core/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Don't hard-code colours: #ff0000 in a comment is fine, and so is the apostrophe above.
const onGame = "[text-shadow:0_1px_2px_rgb(0_0_0/0.6)] drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]";

export default function App() {
  const player = usePlayer();
  const vehicle = useNuiState("hud:vehicle", null as null | { speed: number });
  const low = player.health < 25;
  return (
    <Surface name="hud" layer="hud">
      <div className="nk-edge fixed bottom-[var(--nk-edge)] left-[var(--nk-edge)] flex gap-2">
        <span className={cn("nk-chip nk-shadow", onGame, low && "text-destructive")}>
          <span className="nk-num">{player.health}</span> health
        </span>
        <span className="nk-chip bg-[var(--vital-armor)]">Armor {player.armor}</span>
        {vehicle && <Badge variant="secondary">{vehicle.speed} mph</Badge>}
        <svg viewBox="0 0 10 10" className="size-4 text-muted-foreground">
          <path d="M0 0h10v10z" fill="currentColor" />
        </svg>
        <a href="#abc">a link, not a colour</a>
      </div>
    </Surface>
  );
}
