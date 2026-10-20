import { DeathScreenSurface } from "@/components/blocks/death-screen/death-screen";

// The death screen block (npx shadcn add @nuikit/death-screen). It's your code now: the screen is in
// components/blocks/death-screen, its messages in components/blocks/death-screen/nui.ts, and
// client/main.lua decides when it shows and what it says.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <DeathScreenSurface />
    </main>
  );
}
