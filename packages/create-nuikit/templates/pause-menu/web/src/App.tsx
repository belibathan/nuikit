import { PauseMenuSurface } from "@/components/blocks/pause-menu/pause-menu";

// The pause menu block (npx shadcn add @nuikit/pause-menu). It's your code now: the menu is in
// components/blocks/pause-menu, its messages in components/blocks/pause-menu/nui.ts, and
// client/main.lua decides when it opens and what each action does.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <PauseMenuSurface />
    </main>
  );
}
