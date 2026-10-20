import { ScoreboardSurface } from "@/components/blocks/scoreboard/scoreboard";

// The scoreboard block (npx shadcn add @nuikit/scoreboard). It's your code now: the board is in
// components/blocks/scoreboard, its messages in components/blocks/scoreboard/nui.ts, and
// client/main.lua + server/main.lua decide what it shows.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <ScoreboardSurface />
    </main>
  );
}
