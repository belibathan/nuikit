import { DialogueSurface } from "@/components/blocks/npc-dialogue/npc-dialogue";
import { NuiNotices } from "@/components/ui/notice";

// The NPC dialogue block (npx shadcn add @nuikit/npc-dialogue). It's your code now: the screen is in
// components/blocks/npc-dialogue, its messages in components/blocks/npc-dialogue/nui.ts, and
// client/main.lua + server/main.lua hold the conversation tree and check every choice. <NuiNotices />
// shows nk.notify() from Lua.
export default function App() {
  return (
    <main className="fixed inset-0 overflow-hidden">
      <DialogueSurface />
      <NuiNotices />
    </main>
  );
}
