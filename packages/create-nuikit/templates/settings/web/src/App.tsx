import { SettingsSurface } from "@/components/blocks/settings/settings";

// The settings block (npx shadcn add @nuikit/settings). It's your code now: the panel is in
// components/blocks/settings, its messages in components/blocks/settings/nui.ts, and
// client/main.lua builds what it shows from config.lua and saves every change.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <SettingsSurface />
    </main>
  );
}
