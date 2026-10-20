import { LoadingScreenPage } from "@/components/blocks/loading-screen/loading-screen";

// The loading screen block (npx shadcn add @nuikit/loading-screen). It's your code now: the screen
// is in components/blocks/loading-screen, what it's handed in handover.ts, the game's load events
// in progress.ts, and server/main.lua decides what it shows.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <LoadingScreenPage />
    </main>
  );
}
