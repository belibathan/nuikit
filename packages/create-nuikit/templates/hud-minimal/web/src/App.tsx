import { HudMinimalSurface } from "@/components/blocks/hud-minimal/hud-minimal";

// The minimal HUD block (npx shadcn add @nuikit/hud-minimal). It's your code now: the HUD is in
// components/blocks/hud-minimal, its messages in components/blocks/hud-minimal/nui.ts, and
// client/main.lua decides when it shows and sends the vehicle.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <HudMinimalSurface />
    </main>
  );
}
