import { CharacterSelectSurface } from "@/components/blocks/character-select/character-select";
import { NuiNotices } from "@/components/ui/notice";

// The character-select block (npx shadcn add @nuikit/character-select). It's your code now: the
// slots, card, spawn list and create form are in components/blocks/character-select, its messages
// in components/blocks/character-select/nui.ts, and client/main.lua + server/main.lua decide whose
// characters these are and check every choice. <NuiNotices /> shows nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <CharacterSelectSurface />
      <NuiNotices />
    </main>
  );
}
